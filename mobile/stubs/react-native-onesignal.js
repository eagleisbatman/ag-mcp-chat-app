// Stub for react-native-onesignal when the native module is not installed.
// This allows Metro to bundle without errors.
const noop = () => {};
const noopPromise = () => Promise.resolve();

export default {
  initialize: noop,
  setAppId: noop,
  promptForPushNotificationsWithUserResponse: noopPromise,
  setNotificationOpenedHandler: noop,
  setNotificationWillShowInForegroundHandler: noop,
  getDeviceState: noopPromise,
  setExternalUserId: noopPromise,
  removeExternalUserId: noopPromise,
  setEmail: noopPromise,
  setLanguage: noop,
  addTrigger: noop,
  sendTags: noop,
  getTags: noopPromise,
  disablePush: noop,
};
