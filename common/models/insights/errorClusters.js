import { EventEmitter } from 'events';
import assert from '../../util/assert';

export class ErrorClusters extends EventEmitter {
  constructor() {
    super();

    this._errorClusters = new Map();
    this.isDirty = false;
    this.barData = [];
  }

  clusterErrorOnType(error){
    assert(error != null, 'clusterErrorOnType failed due to invalid error');

    let key = error.type || 'unknown';

    if (!this._errorClusters.has(key)) {
      this._errorClusters.set(key, 0);
    }

    // Increment cluster by one
    this._errorClusters.set(key, this._errorClusters.get(key) + 1);
  }

  cluster(events) {
    let hasChanged = false;

    for (let event of events) {
      if (event && event.name === 'error') {
        this.clusterErrorOnType(event);
        hasChanged = true;
      }
    }

    if (hasChanged) {
      this.isDirty = true;
      this.emit('change');
    }
  }

  reset() {
    this._errorClusters = new Map();

    this.emit('change');
  }

  getClusters() {
    return this._errorClusters;
  }

  toSeries(name="Fehlertypen") {
    if (this.isDirty === false) {
      return this.barData;
    }

    this.barData = [];

    let series = {
      name: name,
      values: []
    };

    for (let cluster of this._errorClusters) {
      series.values.push({
        x: cluster[0],
        y: cluster[1]
      });
    }

    this.barData.push(series);
    this.isDirty = false;

    return this.barData;
  }
}