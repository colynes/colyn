import React, { useEffect, useState } from 'react';
import { Bell, BellOff, LoaderCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import {
  getBrowserNotificationStatus,
  getStoredNotificationToken,
  getStoredNotificationStatus,
  removeNotificationToken,
  requestBrowserNotificationPermission,
  syncNotificationToken,
} from '@/lib/browserNotifications';

export default function PushNotificationToggle({ compact = false }) {
  const [status, setStatus] = useState('default');
  const [hasToken, setHasToken] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const liveStatus = getBrowserNotificationStatus();
    setStatus(liveStatus === 'default' ? (getStoredNotificationStatus() || liveStatus) : liveStatus);
    setHasToken(Boolean(getStoredNotificationToken()));
  }, []);

  const enableNotifications = async () => {
    setBusy(true);

    try {
      const permission = await requestBrowserNotificationPermission();
      setStatus(permission);

      if (permission !== 'granted') {
        toast.info('Browser notifications stay off', {
          description: 'You can still receive the normal in-app notifications.',
        });
        return;
      }

      const result = await syncNotificationToken();

      if (!result.ok) {
        setHasToken(false);
        toast.error('Could not enable browser notifications', {
          description: result.message || 'Please check your Firebase web configuration and try again.',
        });
        return;
      }

      setHasToken(true);
      toast.success('Browser notifications enabled', {
        description: 'You will now receive system notifications on this device.',
      });
    } finally {
      setBusy(false);
    }
  };

  const disconnectThisDevice = async () => {
    setBusy(true);

    try {
      await removeNotificationToken();
      setHasToken(false);
      toast.success('This browser has been unsubscribed');
    } finally {
      setBusy(false);
    }
  };

  const wrapperClass = compact
    ? 'rounded-2xl border border-[#eadbc4] bg-[#fcf7ef] p-4'
    : 'rounded-2xl border border-[#eadbc4] bg-[#fcf7ef] p-4';

  return (
    <div className={wrapperClass}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-brand-dark)] shadow-sm ring-1 ring-[var(--color-sys-border)]">
          <Smartphone size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-sys-text-primary)]">Browser notifications</p>
          <p className="mt-1 text-sm text-[var(--color-sys-text-secondary)]">
            {status === 'granted' && hasToken && 'Enabled in this browser.'}
            {status === 'granted' && !hasToken && 'Browser permission is allowed, but push is not fully connected yet.'}
            {status === 'denied' && 'Blocked in this browser. You can still use in-app notifications.'}
            {status === 'default' && 'Enable system notifications for order updates and alerts.'}
            {status === 'unsupported' && 'This browser does not support web push notifications.'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {(status === 'default' || (status === 'granted' && !hasToken)) ? (
              <button
                type="button"
                onClick={enableNotifications}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-dark)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                Enable Notifications
              </button>
            ) : null}

            {status === 'granted' && hasToken ? (
              <button
                type="button"
                onClick={disconnectThisDevice}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-sys-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-brand-dark)] disabled:opacity-60"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                Disable Notifications
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
