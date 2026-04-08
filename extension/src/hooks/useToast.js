import { useState, useCallback } from 'react';

/**
 * useToast — quản lý trạng thái thông báo nổi (toast)
 * @returns {{ toast: {msg, type}, showToast: Function }}
 */
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'info', duration = 2500) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  return { toast, showToast };
}
