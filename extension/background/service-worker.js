// ============================================================
//  Service Worker (Manifest V3)
//  Manages UserSession in chrome.storage.session
//  chrome.storage.session: RAM only, cleared when browser closes
//  NOTE: CryptoKey is NOT serializable → stored only in popup.js memory
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Must return true to indicate async response
  handleMessage(message).then(sendResponse).catch(err => {
    console.error('[SW] Message error:', err);
    sendResponse({ error: err.message });
  });
  return true;
});

async function handleMessage(message) {
  switch (message.type) {

    case 'SET_SESSION': {
      // Split session data:
      // 1. Persistent data (local): survives browser restart
      // 2. Sensitive data (session): RAM only, cleared on browser close
      const { masterKeyBase64, ...persistentData } = message.data;

      const tasks = [chrome.storage.local.set({ session: persistentData })];
      if (masterKeyBase64) {
        tasks.push(chrome.storage.session.set({ masterKeyBase64 }));
      }
      
      await Promise.all(tasks);
      return { success: true };
    }

    case 'GET_SESSION': {
      const [localResult, sessionResult] = await Promise.all([
        chrome.storage.local.get('session'),
        chrome.storage.session.get('masterKeyBase64')
      ]);

      return { 
        session: {
          ...(localResult.session || {}),
          masterKeyBase64: sessionResult.masterKeyBase64 || null
        }
      };
    }

    case 'CLEAR_SESSION': {
      await Promise.all([
        chrome.storage.local.remove('session'),
        chrome.storage.session.clear()
      ]);
      return { success: true };
    }

    case 'GET_ENTRY_FOR_DOMAIN': {
      const result = await chrome.storage.session.get('session');
      if (!result.session?.vaultData?.items) {
        return { entries: [] };
      }
      const domain  = message.domain.toLowerCase();
      const matches = result.session.vaultData.items.filter(item => {
        if (!item.siteUrl) return false;
        try {
          const url = new URL(item.siteUrl.startsWith('http') ? item.siteUrl : 'https://' + item.siteUrl);
          return url.hostname.includes(domain) || domain.includes(url.hostname.replace('www.', ''));
        } catch {
          return item.siteUrl.toLowerCase().includes(domain);
        }
      });
      return { entries: matches };
    }

    default:
      return { error: 'Unknown message type: ' + message.type };
  }
}
