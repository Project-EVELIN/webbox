/**
 * Projects need to support multiple modes:
 *  - Default: allows all operations
 *  - Readonly: allows running, etc, but no file changes
 *  - NoSave: allows to running and file changes but not saving those
 *  (- ViewDocument: only view a document with editing but no saving)
 */
export const MODES = {
  'Default': 'Default', /* default mode */
  'Readonly': 'Readonly', /* prevents editing the embed */
  'NoSave': 'NoSave', /* disables saving for the current IDE, e. g. viewing a different document */
  'ViewDocument': 'ViewDocument', /* allows to view a different document for this embed */
  'RunMode': 'RunMode' /* disables saving for the current IDE */,
  'Unknown': 'Unknown'
};

export const EmbedTypes = {
  Sourcebox: 'sourcebox',
  Skulpt: 'skulpt'
};

export const RunModeDefaults = {
  id: 'EXPERIMENTAL_RUN_MODE_WITH_ID'
};

export const TESTS_KEY = 'tests';

export const RemoteActions = {
  GetEvents: 'get-events',
  SubscribeToEvents: 'subscribe',
  UnsubscribeFromEvents: 'unsubscribe',
  Submission: 'submission',
  TestResult: 'testresult',
  GetTestResults: 'get-testresults'
};