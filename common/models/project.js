import { EventEmitter } from 'events';

import File from './file';
import isString from 'lodash/isString';
import uniqueId from 'lodash/uniqueId';
import throttle from 'lodash/throttle';
import { API } from '../services';
import { Status } from './status';
import { MessageWithAction } from './messages';
import { Severity  } from './severity';
import { Action } from './actions';
import { MODES } from '../constants/Embed';
import { SocketCommunication } from './socketCommunication';

/**
 * User Rights limit the operations:
 *  - Default
 *  - Author (modify the codeEmbed directly and also the options)
 *  - ViewDocument
 *
 */
export default class Project extends EventEmitter {
  constructor(data) {
    super();
    this.name = data.meta.name || '';
    // save original data
    this.data = data;
    this.mode = data.mode || MODES.Default;
    this._userData = undefined; // we store here user data later

    this.unnamedTabCounter = 0;
    this.tabs = [];
    this.running = false;

    // load from data
    this.fromInitialData(this.data);

    // switch tab to first one
    this.status = new Status();

    // Project state variables
    this.isConsistent = true;
    this.pendingSave = false;

    // Handle throttling and debouncing
    this.saveEmbed = throttle(this._saveEmbed, 800);
  }

  /**
   * Setup our project wide message system (notifications)
   */
  setMessageList(messageList) {
    this.messageList = messageList;
  }

  /**
   * Show a message as a box
   */
  showMessage(severity, message) {
    if (this.messageList) {
      this.messageList.showMessage(severity, message);
    }
  }

  /**
   * Hide a specific message from the message list
   */
  hideMessage(obj) {
    if (this.messageList) {
      this.messageList.hideMessage(obj);
    }
  }

  // callback is called when tab is closed
  addTab(type, {item, active=true, callback}={}) {
    let index = this.tabs.findIndex(tab => {
      return tab.type === type && tab.item === item;
    });

    if (index < 0) {
      index = this.tabs.push({
        type,
        item,
        callback,
        active: false,
        uniqueId: uniqueId('tab-')
      }) - 1;
    }

    if (active) {
      this.switchTab(index);
    } else {
      this.emitChange();
    }

    return index;
  }

  /**
   * Return all tabs of the project
   */
  getTabs() {
    return this.tabs;
  }

  /**
   * Closing a tab, basically removes currently the tab/file from the project
   * Maybe we should prevent the closing of files until we have an file explorer
   * or add an message with actions
   */
  closeTab(index) {
    // get tab
    // change this, because this deletes the tab from the list already
    let tab = this.tabs[index];

    if (!tab) {
      return;
    }

    if (tab.type === 'file') {
      // ask user what todo if he wants to close/delete a file tab
      let messageObj;
      let deleteAction = new Action('delete.message.action', 'Löschen', null, true, () => {
        this.removeTab(tab, index);

        // cleanup
        tab.item.dispose();

        this.hideMessage(messageObj); // hide message
      });

      let cancelAction = new Action('cancel.message.action', 'Abbrechen', null, true, () => {
        this.hideMessage(messageObj);
      });

      messageObj = new MessageWithAction('Wollen Sie diese Datei wirklich löschen?',
        [deleteAction, cancelAction]);

      this.showMessage(Severity.Warning, messageObj);
    } else {
      // handle other tab types (e.g. stats that the user can reopen)
      this.removeTab(tab, index);
    }
  }

  /**
   * Removes a tab from the internal tabs array. When deleted it's gone!
   */
  removeTab(tab, index) {
    // try to remove from list
    this.tabs.splice(index, 1);

    if (!tab) {
      return;
    }

    // handle other tab types (e.g. stats that the user can reopen)
    if (tab.callback) {
      tab.callback();
    }

    if (tab.active && this.tabs.length && !this.tabs.some(tab => tab.active)) {
      this.switchTab(Math.min(this.tabs.length - 1, index));
    } else {
      this.emitChange();
    }
  }

  /**
   * Switch to tab at the given index
   */
  switchTab(index) {
    let tab = this.tabs[index];

    if (tab) {
      this.tabs.forEach(tab => tab.active = false);
      tab.active = true;
      this.emitChange();
    }
  }

  toggleTab(index) {
    let tab = this.tabs[index];

    if (tab) {
      tab.active = !tab.active;
      this.emitChange();
    }
  }

  /**
   * Set internal project consistency. Are there any weird files, etc?
   */
  setConsistency(val) {
    this.isConsistent = val;
    this.emitChange();
  }

  getConsistency() {
    return this.isConsistent;
  }

  /**
   * Handles renaming of files and filters out duplicates and shows a message with possible actions
   */
  onChangedFileName(e) {
    let messageObj;
    let duplicateTab;
    let tab = this.getTabForFileOrNull(e.file);

    // update the syntax highlighting for this tab
    tab.item.autoDetectMode();

    // later on we could do this on the file system maybe and just scan on dir
    let duplicates = this.getFiles().filter(file => file.getName() === e.newName && file !== e.file);

    // Currently, we do handle only one duplicate file and prevent more
    if (duplicates.length > 0) {
      this.setConsistency(false); // inconsisten project state
      // get the tab
      duplicateTab = this.getTabForFileOrNull(duplicates[0]);
      let index = this.tabs.findIndex(tab => tab === duplicateTab);
      let replaceAction = new Action('replace.message.action', 'Ersetzen', null, true, () => {
        // remove old file & tab
        this.removeTab(duplicateTab, index);

        this.setConsistency(true);
        this.hideMessage(messageObj); // hide message
      });

      let renameAction = new Action('rename.message.action', 'Umbenennen', null, true, () => {
        // enable renaming mode again
        tab.item.setNameEdtiable(true);

        this.setConsistency(true);
        this.hideMessage(messageObj);
      });

      messageObj = new MessageWithAction('Es existiert bereits eine Datei mit diesem Namen. Was möchten Sie machen?',
        [replaceAction, renameAction]);

      this.showMessage(Severity.Warning, messageObj);
    }
  }

  /**
   * Adds a new file(-tab) to the project. It checks for duplicates and asks the user what to do.
   */
  addFile(name, text, mode, active=true) {
    let file;
    let filename = name;

    if (name == null) {
      filename = 'Unbenannt' + this.unnamedTabCounter++ + '.txt';
      file = new File(filename, text, mode);
      file.setNameEdtiable(true); // enable file renaming immediatelly
    } else {
      file = new File(filename, text, mode);
    }

    // filename change handler
    file.on('changedName', this.onChangedFileName.bind(this));

    this.addTab('file', { item: file, active: active});
  }

  /**
   * Tries to resolve a tab for the given file or returns null
   */
  getTabForFileOrNull(file) {
    let tab = null;
    let matchingTabs = this.tabs.filter(tab => tab.type === 'file').filter(tab => tab.item === file);
    if (matchingTabs.length === 1) {
      // found a tab (there should be only one now)
      tab = matchingTabs[0];
    } else if (matchingTabs.length > 1) {
      // inconsistent state, should throw an error
      this.showMessage(Severity.Error, 'Inkonsistentes Projekt. Bitte Seite neu laden!');
    }

    return tab;
  }

  /**
   * Try to get the tab for the given name or return null
   */
  getTabForFilenameOrNull(name) {
    let tab = null;
    let matchingTabs = this.tabs.filter(tab => tab.type === 'file').filter(tab => tab.item.getName() === name);
    if (matchingTabs.length === 1) {
      // found a tab
      tab = matchingTabs[0];
    } else if (matchingTabs.length > 1) {
      // inconsistent state, should throw an error
      this.showMessage(Severity.Error, 'Inkonsistentes Projekt. Bitte Seite neu laden!');
      // ToDo: could be interesiting to log this thing?
    }

    return tab;
  }

  getIndexForFilename(name) {
    let index = this.tabs.findIndex(tab => {
      return tab.type === 'file' && tab.item.getName() === name;
    });

    return index;
  }

  /**
   * Checks if there is a file with the given name
   */
  hasFile(name) {
    return this.getFiles().filter(file => file.getName() === name).length > 0;
  }

  /**
   * Returns all files
   */
  getFiles() {
    return this.tabs
      .filter(tab => tab.type === 'file')
      .map(tab => tab.item);
  }

  emitChange() {
    this.emit('change');
  }

  /**
   * Setup the websocket communicaton for sending events and actions to the server
   */
  setCommunicationData(jwt, url) {
    this.socketCommunication = new SocketCommunication(jwt, url);
  }

  sendEvent(eventLog) {
    if (this.socketCommunication instanceof SocketCommunication) {
      eventLog.setContext(this.getContextData());
      this.socketCommunication.sendEvent(eventLog, eventLog);
    } else {
      console.warn('Project.SocketCommunication not configured. Cannot send events.');
    }
  }

  sendAction(action) {
    if (this.socketCommunication instanceof SocketCommunication) {
      action.setContext(this.getContextData());
      this.socketCommunication.sendAction(action);
    } else {
      console.warn('Project.SocketCommunication not configured. Cannot send events.');
    }
  }

  /**
   * Returns an object containing all relevant context information about the current project (code embed)
   */
  getContextData() {
    const embedName = this.name;
    const embedId = this.data.id;
    const embedDocument = this.data.document ? this.data.document.id : undefined;
    const embedUser = this._userData && this._userData.email ? this._userData.email : 'anonymous';

    return {
      embedName,
      embedId,
      embedDocument,
      embedUser
    };
  }

  /**
   * Sets the user data associated with the trinket
   */
  setUserData(data) {
    this._userData = data;
    this.status.setUsername(data.email || data.username); // display username or email if available
  }

  /**
   * Return true if the current user can save the embed
   */
  canUserSave() {
    if (!this._userData) {
      return false;
    }

    switch(this._userData.mode) {
      case MODES.RunMode:
      case MODES.Readonly:
      case MODES.NoSave:
      case MODES.Unknown:
        return false;
      default:
        return true;
    }
  }

  /**
   * Init the project from the given data object
   */
  fromInitialData(data) {
    // TODO: add some basic checks maybe
    // ToDo: load _document data and do not change original embed no server
    for (let file in data.code) {
      let fileData = data.code[file];
      if (isString(fileData)) {
        this.addFile(file, fileData);
      } else {
        // handle complicated type
        this.addFile(file, fileData.content);
      }
    }

    let index = 0;
    let mainFile = data.meta.mainFile || 'main.py'; // ToDo: change this
    // switch to specified mainFile
    if (mainFile) {
      index = this.getIndexForFilename(mainFile);

      index = index > -1 ? index : 0;
    }

    // switch to first tab
    if (this.tabs.length > 1) {
      this.switchTab(index);
    }
  }

  /**
   * Save file changes, but nothing more
   */
  saveEmbed() {
    this._saveEmbed();
  }

  /**
   * Internal save logic
   */
  _saveEmbed() {
    if (this.pendingSave) {
      return; // pending save request
    }

    // 1. Check current mode
    if (this.mode === MODES.Default) {
      this.pendingSave = true;
      this.status.setStatusMessage('Speichere...', '', Severity.Ignore);

      const params = {
        id: this.data.id
      };

      const payload = {
        data: {
          code: this.toCodeDocument()
        }
      };


      // trigger save
      API.embed.saveEmbed(params, payload).then(res => {
        //this.showMessage(Severity.Info, 'Gespeichert!');
        // ToDo: Maybe we should also use something similar to showMessage for the StatusBar
        this.status.setStatusMessage('Gespeichert.', '', Severity.Info);

        // ToDo: update document, if received any
      }).catch(err => {
        this.showMessage(Severity.Error, 'Speichern fehlgeschlagen!');
        console.log(err);
      }).then(() => {
        this.pendingSave = false;
      });
    } else {
      // ToDo: Add action to open the same embed in edit mode
      this.showMessage(Severity.Warning, 'Sie können dieses Beispiel nicht speichern, da es in der Leseansicht geöffnet wurde.');
    }
  }

  toCodeEmbed() {
    // ToDo: return all files and assets as to be saved for server side representation
    //
  }

  toCodeDocument() {
    // Return all files (altered by an user [not owner]) to be saved
    let code = { };
    this.getFiles().map((item) => {
      code[item.getName()] = item.getValue();
    });

    return code;
  }

  resetProject() {
    // ToDo: resets the project to the initial state from the server
  }
}
