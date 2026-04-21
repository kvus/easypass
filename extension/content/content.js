// ============================================================
//  Content Script — Auto-fill form on web pages
//  Runs in the context of every visited web page
//  Communicates with extension popup to fill credentials
// ============================================================

// Listen for auto-fill requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTO_FILL' && message.entry) {
    autoFillForm(message.entry);
    sendResponse({ success: true });
  }
  return true;
});

/**
 * Inject username + password into the visible login form
 */
function autoFillForm(entry) {
  try {
    const usernameField = findUsernameField();
    const passwordField = document.querySelector('input[type="password"]');

    if (usernameField && entry.username) {
      setNativeValue(usernameField, entry.username);
    }
    if (passwordField && entry.password) {
      setNativeValue(passwordField, entry.password);
    }
  } catch (err) {
    console.warn('[EasyPass] Auto-fill failed:', err.message);
  }
}

/**
 * Find the most likely username field on the page
 */
function findUsernameField() {
  const selectors = [
    'input[name="username"]', 'input[name="email"]', 'input[name="user"]',
    'input[name="login"]', 'input[type="email"]', 'input[autocomplete="username"]'
  ];
  return selectors.map(s => document.querySelector(s)).find(el => el !== null);
}

/**
 * Set value and dispatch events for React/Vue compatibility
 */
function setNativeValue(element, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input',  { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
