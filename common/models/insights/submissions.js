import { EventEmitter } from 'events';
import UUID from 'uuid';

import assert from '../../util/assert';
import { RemoteEventTypes } from './remoteDispatcher';

/**
 * A submission is a user/student sent object that contains
 * a link to the student code and its context.
 *
 * @export
 * @class Submission
 */
export class Submission {
  constructor(shareableLink, user={}, timeStamp, message='') {
    this.shareableLink = shareableLink;
    this.username = user.username;
    this.userId = user.id;
    this.timeStamp = timeStamp;
    this.message = message;
    this.id = UUID.v4(); // generate a unique id
    this.revision = 1;
  }
}

/**
 * Create a new Submission instance from an action.
 *
 * @param {any} action
 * @returns
 */
Submission.fromAction = function (action) {
  assert(action, 'Received invalid action');
  assert(action.actionData, 'Received inavlid action data');
  assert(action.actionUser, 'received invalid action user');

  return new Submission(action.actionData.shareableLink, action.actionUser, action.timeStamp, action.actionData.message);
};


/**
 * Handles the receiving and storing of submissions
 *
 * @export
 * @class Submissions
 * @extends {EventEmitter}
 */
export class Submissions extends EventEmitter {
  constructor(connection) {
    super();
    this._connection = connection;
    this.isActivated = false;

    this.onSubmission = this.onSubmission.bind(this);

    this.submissions = [];
  }

  allowSubmissions() {
    this.isActivated = true;
  }

  disallowSubmissions() {
    this.isActivated = false;
  }

  /**
   * @returns {Boolean} submissions are accepted or not
   */
  isActive() {
    return this.isActivated;
  }

  /**
   * Toggles the acceptance of submissions.
   */
  toggle() {
    if  (this.isActive()) {
      this.unsubscribe();
    } else {
      this.subscribe();
    }

    this.emit('change');
  }

  /**
   * Listens to submission events on the socket.
   *
   * @returns
   */
  subscribe() {
    if (this.isActivated) {
      return;
    }

    this._connection.addSocketEventListener(RemoteEventTypes.Submission, this.onSubmission);

    this.allowSubmissions();
  }

  /**
   * Unsubscribe to submission events
   *
   * @returns
   */
  unsubscribe() {
    if (!this.isActivated) {
      return;
    }

    this._connection.removeSocketEventListener(RemoteEventTypes.Submission, this.onSubmission);

    this.disallowSubmissions();
  }

  /**
   * Event handler for submitted entries from students
   *
   * @param {any} event
   */
  onSubmission(event) {

    let submission = Submission.fromAction(event);
    this.updateOrAddSubmission(submission);

    this.emit('change');
  }

  updateOrAddSubmission(submission) {
    let index = this.submissions.findIndex(value => {
      return value.userId === submission.userId;
    });

    // We need to update!
    if (index >= 0) {
      let revision = this.submissions[index].revision += 1;
      this.submissions[index] = submission;

      // Update revision, so teacher can see that student has submitted multiple times
      this.submissions[index].revision = revision;
    } else {
      this.submissions.push(submission);
    }
  }

  /**
   * Get the current list of submissions
   *
   * @returns {Array} of {Submission} objects
   */
  get() {
    return this.submissions;
  }
}