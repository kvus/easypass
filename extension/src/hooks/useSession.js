import { useCallback } from 'react';

/**
 * useSession — giao tiếp với service worker để lưu/lấy session
 * Dùng chrome.runtime.sendMessage nếu đang chạy trong extension context.
 */
export function useSession() {
  const sendMsg = useCallback((type, data) => {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type, data }, (response) => {
          resolve(response);
        });
      } catch {
        resolve(null);
      }
    });
  }, []);

  const saveSession = useCallback(
    (sessionData) => sendMsg('SET_SESSION', sessionData),
    [sendMsg]
  );

  const getSession = useCallback(() => sendMsg('GET_SESSION'), [sendMsg]);

  const clearSession = useCallback(() => sendMsg('CLEAR_SESSION'), [sendMsg]);

  const getEntryForDomain = useCallback(
    (domain) => sendMsg('GET_ENTRY_FOR_DOMAIN', { domain }),
    [sendMsg]
  );

  return { saveSession, getSession, clearSession, getEntryForDomain };
}
