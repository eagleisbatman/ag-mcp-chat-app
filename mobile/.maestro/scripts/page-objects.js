// Page Object Model — FarmerChat Maestro Selectors
// Maps logical names to testID values (used with id: selector in flows).
//
// Usage in flows:
//   - runScript: ../../scripts/page-objects.js
//   - tapOn:
//       id: ${output.chat.input}
//
// All values are testID strings — use with `id:` selector in YAML.
// Navigation: Chat is home screen. Hamburger menu (header-settings) opens Settings.
// Settings rows navigate to My Farms, My Livestock, Chat History, Profile, etc.

// ── Welcome / Onboarding ──────────────────────────────────────────────────────
output.welcome = {
  getStarted: 'welcome-get-started',
  languageSwitcher: 'language-switcher',
}

// ── Location Screen ───────────────────────────────────────────────────────────
output.location = {
  enable: 'location-enable',
  skip: 'location-skip',
}

// ── Language Screen ───────────────────────────────────────────────────────────
output.language = {
  search: 'language-search',
  continueBtn: 'language-continue',
}

// ── Chat ──────────────────────────────────────────────────────────────────────
output.chat = {
  input: 'chat-input',
  send: 'chat-send',     // same id regardless of voice vs send state
  attach: 'chat-attach',
  history: 'chat-history',
  newChat: 'header-new-chat',
  settings: 'header-settings',  // hamburger menu button → opens Settings
}

// ── Profile ───────────────────────────────────────────────────────────────────
output.profile = {
  name: 'profile-name',
  save: 'profile-save',
  genderMale: 'profile-gender-male',
  genderFemale: 'profile-gender-female',
  genderOther: 'profile-gender-other',
  genderPreferNotToSay: 'profile-gender-preferNotToSay',
  roleFarmer: 'profile-role-farmer',
  roleExtensionWorker: 'profile-role-extension_worker',
}

// ── Farm ──────────────────────────────────────────────────────────────────────
output.farm = {
  add: 'farm-add',          // header button on FarmListScreen
  name: 'farm-name',        // TextInput on FarmEditScreen
  location: 'farm-location', // GPS detect button on FarmEditScreen
  save: 'farm-save',        // Save button on FarmEditScreen
}

// ── Livestock ─────────────────────────────────────────────────────────────────
output.livestock = {
  add: 'livestock-add',     // header button on LivestockListScreen
  name: 'livestock-name',   // TextInput on LivestockEditScreen
  save: 'livestock-save',   // Save button on LivestockEditScreen
}

// ── Settings ──────────────────────────────────────────────────────────────────
output.settings = {
  history: 'settings-history',
  profile: 'settings-profile',
  language: 'settings-language',
  mcp: 'settings-mcp',
  tts: 'settings-tts',
  reset: 'settings-reset',
  deleteAccount: 'settings-delete-account',
}

// ── History Screen ────────────────────────────────────────────────────────────
output.historyScreen = {
  newChat: 'history-new-chat',
  search: 'history-search',
}

// ── Extension Worker (EW) ─────────────────────────────────────────────────────
output.ew = {
  addFarmer: 'farmers-add',
  search: 'farmers-search',
  verify: 'connect-verify',
  skip: 'connect-skip',
  otpInput: 'otp-input',
  otpVerify: 'otp-verify',
  otpResend: 'otp-resend',
}
