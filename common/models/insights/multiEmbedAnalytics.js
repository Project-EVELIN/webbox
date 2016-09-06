import { EventEmitter } from 'events';
import assert from '../../util/assert';
import Debug from 'debug';
const debug = Debug('webbox:MultiEmbedAnalytics');

import { ErrorFilter } from './errorFilter';
import { ErrorClusters } from './errorclusters';
import { TestResultsOverview } from './testResultsOverview';

import { normalizeDate } from '../../util/dateUtils';
import { RemoteDispatcher, Action as RemoteAction, RemoteEventTypes } from './remoteDispatcher';
import { RemoteActions } from '../../constants/Embed';

export class EmbedAnalytics extends EventEmitter {
  constructor(embedId, remoteDispatcher) {
    super();

    this.remoteDispatcher = remoteDispatcher;
    this.id = embedId;

    this.errorFilter = new ErrorFilter();
    this.errors = [];
    this.events = [];
    this.dateMaps = this.getInitialDateClusterMaps();
    this.errorClusters = new ErrorClusters();

    this.dateClusterResolution = 'day';
    this.dateClusterStart = null;
    this.dateClusterEnd = null;

    this.eventStartDate = null; // display only events older than this date

    this.isSubscribed = false;

    //this.testResultsOverview = new TestResultsOverview(this._connection, this._project);

    // Context binding
    this.subscribeToEvents = this.subscribeToEvents.bind(this);
    this.getEvents = this.getEvents.bind(this);
  }

  getId() {
    return this.id;
  }

  getDispatcher() {
    return this.remoteDispatcher;
  }

  /**
   * Create an object holding Maps for mapping events to dates
   *
   * @returns
   */
  getInitialDateClusterMaps() {
    return {
      run: new Map(),
      failure: new Map(),
      error: new Map(),
      test: new Map(),
      rest: new Map()
    };
  }

  reset() {
    this.dateMaps = this.getInitialDateClusterMaps();
    this.errorClusters.reset();
    this.errors = {};
    this.events = {};
  }

  getEvents() {
    let remoteAction = new RemoteAction(RemoteActions.GetEvents, {}, {}, result => {
      debug('getEvents->remoteAction result:', result);
      this.onEvents(result.events);
    });

    // Set the context for the current embed
    remoteAction.setContext({
      embedId: this.getId()
    });
    this.getDispatcher().sendAction(remoteAction, true);
  }

  subscribeToEvents() {
    if (this.isSubscribed) {
      return;
    }

    let remoteAction = new RemoteAction(RemoteActions.SubscribeToEvents, {}, {}, result => {
      debug('subscribeToEvents->remoteAction result:', result);
      if (result.error) {
        debug('Error while subscribing to events', result.error);
        this.isSubscribed = false;
        return;
      }

      this.isSubscribed = true;
    });
    // Set the context for the current embed
    remoteAction.setContext({
      embedId: this.getId()
    });
    this.getDispatcher().sendAction(remoteAction, true);

    this.getDispatcher().addSocketEventListener(RemoteEventTypes.IdeEvent, event => {
      debug('Received event(s)', event);
    });
  }

  onEvents(events, reset=false) {
    assert(Array.isArray(events), 'Insights.onEvents expected array of events');

    debug('Received ide-events: ', events, reset);

    // Reset the date maps
    if (reset === true) {
      this.reset();
    }

    let hasNewErrors = false;

    for (let event of events) {
      // Add only events for this embed!
      if (event.embedId !== this.getId()) {
        continue;
      }

      if (event && event.name === 'error') {
        this.errors.push(event);
        hasNewErrors = true;
      } else {
        this.events.push(event);
      }
    }

    // Update the clusters
    if (hasNewErrors) {
      this.errorClusters.cluster(events);
      this.emit('newErrors');
    }

    this.clusterDates(events);

    this.emit('change');
  }

  changeDatesClusterSettings(startDate, endDate, resolution) {
    let isChange = startDate !== this.dateClusterStart || resolution !== this.dateClusterResolution || endDate !== this.dateClusterEnd;

    if (isChange) {
      this.dateClusterStart = startDate;
      this.dateClusterResolution = resolution;
      this.dateClusterEnd = endDate;

      // Recluster
      this.dateMaps = this.getInitialDateClusterMaps();
      this.clusterDates(this.events.concat(this.errors));
      this.emit('change');
    }
  }

  /**
   * Clusters a event to the dates maps. The clustering is based on the event name and
   * the current cluster interval (day, hour, month) and date bounds.
   *
   * @param {EventLog} event Event to cluster
   * @returns
   */
  clusterEventOnDates(event) {
    assert(event != null, 'Received invalid event');

    let eventKey;
    let date = normalizeDate(event.timeStamp, this.dateClusterResolution);

    // Check if date is outside the date bounds
    if (this.dateClusterStart && date < this.dateClusterStart) {
      return;
    } else if (this.dateClusterEnd && date > this.dateClusterEnd) {
      return;
    }

    let dateStr = date.toISOString();

    eventKey = this.dateMaps[event.name] != null ? event.name : 'rest';

    // Create index, if not present
    if (!this.dateMaps[eventKey].has(dateStr)) {
      this.dateMaps[eventKey].set(dateStr, 0);
    }

    // Increment count of the event on date cluster
    this.dateMaps[eventKey].set(dateStr, this.dateMaps[eventKey].get(dateStr) + 1);
  }

  /**
   * Clusters all given events to the current date clusters.
   *
   * @param {any} events
   */
  clusterDates(events) {
    for (let event of events) {
      this.clusterEventOnDates(event);
    }
  }

  /**
   * Returns the date clusters as series date to be consumed by the visualization. The series data
   * is an array based representation.
   *
   * @returns {Array} array of data series, that contain values
   */
  dateClustersToSeries() {
    let lineData = [];

    let names = ['Ausführungen', 'Fehler', 'Probleme', 'Testversuche', 'Sonstige'];
    let events = ['run', 'error', 'failure', 'test', 'rest'];
    let maps = [this.dateMaps.run, this.dateMaps.error, this.dateMaps.failure, this.dateMaps.test, this.dateMaps.rest];
    let lineStyles = [{
      strokeWidth: 3,
      strokeDashArray: "5,5"
    }, {
      strokeWidth: 2,
      stroke: '#e74c3c'
    }];

    let values;
    for (let i = 0; i < names.length; i += 1) {
      values = [];

      for (let dataPoint of maps[i]) {
        values.push({
          x: new Date(dataPoint[0]).getTime(),
          y: dataPoint[1]
        });
      }

      // Add a dummy date to force displaying of lines
      if (values.length === 1) {
        values.push({
          x: Date.now(),
          y: 0
        });
      }

      lineData.push({
        name: names[i],
        title: names[i],
        event: events[i],
        values: values
      });

      // Apply line styles if available
      if (lineStyles[i] != null) {
        lineData[i] = Object.assign({}, lineData[i], lineStyles[i]);
      }
    }

    return lineData;
  }

  dispose() {
    // ToDo: should we unsubscribe here?
  }
}

export class MultiEmbedAnalytics extends EventEmitter {
  constructor(embedCellsArray) {
    super();
    debug('AnalyticsDashboard constructor: ', embedCellsArray, window.__WEBSOCKET__);

    this._embeds = embedCellsArray; // ImmutableJS Object

    this.remoteDispatcher = new RemoteDispatcher({
      jwt: window.__WEBSOCKET__.authToken,
      url: window.__WEBSOCKET__.server
    });

    this.remoteDispatcher.connect();

    this.embedAnalytics = new Map();

    // Bindings
    this.onChange = this.onChange.bind(this);
  }

  init() {
    for (let embedCell of this._embeds) {
      let embedId = embedCell.get('source');
      let embedAnalytics = new EmbedAnalytics(embedId, this.getDispatcher());
      embedAnalytics.on('change', this.onChange);
      this.embedAnalytics.set(embedId, embedAnalytics);

      embedAnalytics.getEvents();
      embedAnalytics.subscribeToEvents();

    }
  }

  onChange() {
    debug('onChange');
    this.emit('change');
  }

  /**
   * Returns a map of embedId->EmbedAnalytics entries
   *
   * @returns {Map}
   */
  getEntries() {
    return this.embedAnalytics;
  }

  /**
   * ToDo: use this for lazy init
   *
   * @returns
   */
  getDispatcher() {
    return this.remoteDispatcher;
  }

  dispose() {
    this.embedAnalytics.forEach(value => {
      value.dispose();
    });
  }
}