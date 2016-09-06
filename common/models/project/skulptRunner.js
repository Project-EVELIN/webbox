import { EventEmitter } from 'events';
import { PassThrough, Transform } from 'stream';

import Bluebird from 'bluebird';
import { EventLog } from '../insights/remoteDispatcher';
import { TerminalTransform } from '../../util/streamUtils';

// Disable warnings in production
let BLUEBIRD_WARNINGS = true;
if (process.env.NODE_ENV === 'production') {
  BLUEBIRD_WARNINGS = false;
}

Bluebird.config({
  cancellation: true,
  warnings: BLUEBIRD_WARNINGS
});

class SkulptInputTransform extends Transform{
  _transform(chunk, encoding, callback) {

    let str = chunk.toString();

    if (str && str.length > 0 && str.charCodeAt(0) === 13) {
      this.skulptBuffer.push('');
      this.push('\n\r');
      this.skulptInputDone();
    } else {
      this.skulptBuffer.push(str);
      this.push(chunk);
    }

    callback();
  }
}

let CANVAS_ID_COUNTER = 0;

// this class pretends to be a "Process", so it can be "displayed" by
// ProcessPanel and ProcessTab
export default class Runner extends EventEmitter {
  constructor(project) {
    super();

    this.project = project;
    this.sourcebox = project.sourcebox;

    this.stdin = new PassThrough();
    this.stdout = new PassThrough({
      decodeStrings: false,
      objectMode: true,
    });
    this.stderr = this.stdout;

    this.stdio = [this.stdin, this.stdout, this.stderr];
  }

  defaultFileRead(x) {
    // Try to read local fileObject
    let file = this.project.readFile(x);

    if (file != null) {
      return file;
    }

    if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) {
        throw new Error('File not found: \'' + x + '\'');
    }
    return Sk.builtinFiles.files[x];
  }

  _fileWrite(pyFile, str) {
    if (pyFile.mode === 'r') {
      throw new Sk.builtin.IOError("File is in readonly mode, cannot write");
    }

    let name = pyFile.name.replace('./', '');
    let file = this.project.getFileForName(name);

    if (file != null) {
      let value = file.getValue();
      file.setValue(value + str);
    } else {
      // error
      throw new Sk.builtin.IOError("File has been deleted, cannot write.");
    }
  }

  _fileRead(x, mode='r') {
    let name = x.replace('./', '');
    let file = this.project.getFileForName(name);

    // Check mode
    if (mode === 'w') {
      if (file != null) {
        file.setValue('');
      } else {
        // Create new file
        this.project.addFile(name, '', undefined, false);
      }

      return '';
    }

    if (file == null && mode === 'x') {
      // Create new file
      this.project.addFile(name, '', undefined, false);
      return '';
    }

    if (mode === 'b') {
      throw new Sk.builtin.IOError("Binary mode is not supported");
    }

    if (file != null) {
      return file.getValue();
    }
  }

  getMainFile() {
    let name = this.project.projectData.embed.meta.mainFile;
    let fileObject = this.project.getFileForName(name); // ToDo:
    let code = '';

    if (fileObject) {
      code = fileObject.getValue();
    }

    return {
      code: code,
      name: name
    };
  }

  getOrCreateCanvasContainer() {
    if (this.canvas == null) {
      this.canvas = document.createElement('div');
      this.canvas.id = `canvas-container-${CANVAS_ID_COUNTER}`;
      CANVAS_ID_COUNTER += 1;
    }

    return this.canvas;
  }

  showTurtleTab() {
    // add a new tab with the turtle canvas
    this.project.tabManager.addTab('turtle', {item: {canvas: this.canvas}});
  }


  onAfterImport(name) {
    switch (name) {
      case 'turtle':
        this.showTurtleTab();
        break;
      default:
        break;
    }
  }

  readPrompt() {
    // We need to use here the original Promise and not bluebird,
    // otherwise the skulpt checks for promises are failing
    return new Promise((resolve, reject) => {
      this.readPromptRejectFunction = reject;
      // Now read from stdin.
      let inputStr = '';

      let skulptInputTransform = new SkulptInputTransform();
      skulptInputTransform.skulptBuffer = [];
      skulptInputTransform.skulptInputDone = () => {
        inputStr = skulptInputTransform.skulptBuffer.join('');
        this.stdin.unpipe(skulptInputTransform);
        this.stdin.unpipe(this.stdoutTransform);

        resolve(inputStr);
      };

      this.stdin.pipe(skulptInputTransform, { end: false }).pipe(this.stdoutTransform, { end: false });
    });
  }

  run() {
    if (this.isRunning()) {
      return;
    }

    this.config = this.project.config;
    this.files = this.project.getFiles();

    // Reset annotations
    this.files.forEach((file) => {
      file.setAnnotations([]);
    });

    let emitChange = () => {
      process.nextTick(() => {
        this.project.emitChange();
      });
    };

    emitChange();

    // Check for python2/python3
    let isPython3 = this.project.projectData.embed.meta.language === 'python3';

    // Create a new canvas
    this.canvas = this.getOrCreateCanvasContainer();
    (Sk.TurtleGraphics || (Sk.TurtleGraphics = {width: 800, height: 600})).target = this.canvas;
    Sk.onAfterImport = this.onAfterImport.bind(this);

    // ToDo: add timeout handling here, skulpt reset stuff
    Sk.configure({
      output: text => {
        this._output(text);
      },
      inputfun: this.readPrompt.bind(this),
      read: x => {
        return this.defaultFileRead(x);
      },
      fileread: (x, mode) => {
        return this._fileRead(x, mode);
      },
      filewrite: (pyFile, x) => {
        this._fileWrite(pyFile, x);
      },
      fileopen: pyFile => {
        //console.info(pyFile);
      },
      nonreadopen: true,
      python3: isPython3,
      execLimit: null,/*RUN_DEFAULTS.execLimit,*/
      killableWhile: true,
      killableFor: true
    });

    this.stdoutTransform = new TerminalTransform({
      decodeStrings: false,
      objectMode: true
    });
    //this.stdoutTransform = this.stdout;
    this.stdoutTransform.pipe(this.stdout, {end: false});

    // Wrap Skulpt native Promise with Bluebird
    this.promiseChain = this._exec()
    .tap(this._done.bind(this))
    .catch(this.handleSkulptError.bind(this))
    .finally(() => {
      //this.stdout.end();
      emitChange();
    });
  }

  /**
   * Handles skulpt errors that occur during execution.
   *
   * @param {any} err
   */
  handleSkulptError(err) {
    let annotationMap = {};
    let errObj = this.skulptErrorToErrorObject(err);

    // Special Handling of Keyboard Interrupts
    // Avoid logging and exposing the real error
    if (errObj.error === "KeyboardInterrupt") {
      this._error('Ausführung abgebrochen');
      return;
    }

    // Normal error handling with logging, etc
    this._error(errObj.raw);

    let tabIndex = this.project.getIndexForFilename(errObj.file.replace('./', ''));
    let fileContent = tabIndex > -1 ? this.project.tabManager.getTabs()[tabIndex].item.getValue() : '';

    let errorEvent = new EventLog(EventLog.NAME_ERROR, Object.assign({}, errObj, { fileContent: fileContent }));

    // Log error event
    this.project.sendEvent(errorEvent);

    let normalizedFileName = errObj.file.replace('./', '');

    if (annotationMap[normalizedFileName] == null) {
      annotationMap[normalizedFileName] = [];
    }

    // Add annotation for code editor
    annotationMap[normalizedFileName].push({
      row: errObj.line - 1,
      column: errObj.column != null ? errObj.column  : 0,
      text: errObj.message,
      type: 'error'
    });

    // Display annotations
    this.files.forEach((file) => {
      let annotations = annotationMap[file.getName()];
      file.setAnnotations(annotations || []);
    });
  }

  /**
   * Transforms the error/exception to a common format, that
   * is used within sourcebox/webbox.
   *
   * @param {any} err Skulpt Exception
   * @returns
   */
  skulptErrorToErrorObject(err) {
    let ret = err.toString(); // Simple output message

    // Create stacktrace message
    if (err.traceback) {
      for (let i = 0; i < err.traceback.length; i++) {
        ret += "\n  at " + err.traceback[i].filename + " line " + err.traceback[i].lineno;
        if ("colno" in err.traceback[i]) {
          ret += " column " + err.traceback[i].colno;
        }
      }
    }

    let fileName = this.getMainFile().name;
    let lineno = 0;
    let colno = 0;

    if (err.traceback && err.traceback.length > 0) {
      fileName = err.traceback[0].filename;
      lineno = err.traceback[0].lineno;
      colno = err.traceback[0].colno;
    }

    return {
      file: fileName,
      line: lineno,
      column: colno,
      error: err.tp$name || 'Error',
      message: err.toString(),
      errorHint: ret,
      raw: ret
    };
  }

  _output(text) {
    this.stdoutTransform.write(text);
  }

  _done() {
    this._status('Ausführung Beendet');
    this.stdoutTransform.end();
  }

  _exec() {
    if (!this.config.exec) {
      throw new Error('No exec command');
    }

    let command = ['python3']; //this._commandArray(this.config.exec);

    let mainFile = this.getMainFile();

    let runEvent = new EventLog(EventLog.NAME_RUN, { execCommand: [command, mainFile].join(' ') });
    this.project.sendEvent(runEvent);

    this._status(command.join(' '), false); // output run call

    let processPromise = new Bluebird((resolve, reject) => {
      Sk.misceval.asyncToPromise(() => {
        return Sk.importMainWithBody(mainFile.name.replace('.py',''), false, mainFile.code, true);
      }, {'*': this.handleInterrupt.bind(this)})
      .then(() => {
        resolve();
      },  err => {
        reject(err);
      });
    });

    return processPromise;
  }

  handleInterrupt() {
    if (this.isRunning() && this.throwInterrupt === true) {
      this.throwInterrupt = false;
      throw new Sk.builtin.KeyboardInterrupt('Programm beendet');
    }
  }

  stop() {
    if (this.isRunning()) {
      this.throwInterrupt = true;
      if (this.readPromptRejectFunction != null) {
        this.readPromptRejectFunction();
        this.readPromptRejectFunction = null;
      }
    }
  }

  _error(msg) {
    this.stdoutTransform.write(`\x1b[31m${msg}\x1b[m\r\n`);
  }

  _status(msg) {
    this.stdoutTransform.write(`\x1b[34m ---- ${msg} ---- \x1b[m\r\n`);
  }

  isRunning() {
    return this.promiseChain && this.promiseChain.isPending();
  }

  /**
   * Stub implementation, otherwise the ProcessPanel would fail
   *
   * @param {any} cols
   * @param {any} rows
   * @returns
   */
  resize(cols, rows) {
    return;
  }

  kill() {
    this.stop();
  }
}
