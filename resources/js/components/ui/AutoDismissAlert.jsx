import React, { useEffect, useState } from 'react';

const DEFAULT_DURATION_MS = 5000;

export default function AutoDismissAlert({
  message,
  type = 'success',
  duration = DEFAULT_DURATION_MS,
  className = '',
}) {
  const [visibleMessage, setVisibleMessage] = useState(message || '');

  useEffect(() => {
    setVisibleMessage(message || '');

    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleMessage('');
    }, duration);

    return () => window.clearTimeout(timeoutId);
  }, [message, duration]);

  if (!visibleMessage) {
    return null;
  }

  const isError = type === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border px-5 py-4 text-sm font-medium ${
        isError
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      } ${className}`}
    >
      {visibleMessage}
    </div>
  );
}
