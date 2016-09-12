import Debug from 'debug';

const debug = Debug('webbox:trackingUtils');

export function trackUserInteraction(event, data) {
  // Record an event
  if (window.KEEN_CLIENT != null) {
    window.KEEN_CLIENT.recordEvent(event, data);
  } else {
    debug('Keen client is not available');
  }
}