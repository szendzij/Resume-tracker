import { useState, useCallback } from 'react';

export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string, durationMs: number = 3500) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, durationMs);
  }, []);

  const hideToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  return { toastMessage, showToast, hideToast };
}
