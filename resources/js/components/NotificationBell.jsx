import React, { useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, Check, Package2, PackagePlus, PackageSearch, ShoppingBag, Tag, Truck, XCircle } from 'lucide-react';
import PushNotificationToggle from '@/components/PushNotificationToggle';

function formatAmount(amount) {
  if (amount == null) {
    return null;
  }

  return new Intl.NumberFormat('en-TZ').format(Number(amount));
}

function iconForNotification(item) {
  const kind = String(item.kind || '').toLowerCase();
  const status = String(item.status || '').toLowerCase();

  if (kind === 'new_order') {
    return ShoppingBag;
  }

  if (kind === 'new_pack') {
    return PackagePlus;
  }

  if (kind === 'new_promotion') {
    return Tag;
  }

  if (kind === 'pickup_reminder') {
    return Bell;
  }

  if (kind === 'low_stock' || kind === 'out_of_stock') {
    return PackageSearch;
  }

  if (kind === 'order_cancelled' || status === 'cancelled') {
    return XCircle;
  }

  if (kind === 'order_dispatched' || kind === 'order_delivered' || status === 'dispatched' || status === 'delivered') {
    return Truck;
  }

  return Package2;
}

function mergeNotifications(currentItems, incoming) {
  const next = [incoming, ...currentItems.filter((item) => item.id !== incoming.id)];
  return next.slice(0, 8);
}

export default function NotificationBell({ className = '', compact = false }) {
  const { auth, notifications: pageNotifications } = usePage().props;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(pageNotifications?.items ?? []);
  const [unreadCount, setUnreadCount] = useState(pageNotifications?.unread_count ?? 0);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef(null);
  const userId = auth?.user?.id;

  useEffect(() => {
    setItems(pageNotifications?.items ?? []);
    setUnreadCount(pageNotifications?.unread_count ?? 0);
  }, [pageNotifications]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [open]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const handleIncomingNotification = (event) => {
      const incoming = event.detail;

      if (!incoming) {
        return;
      }

      setItems((current) => mergeNotifications(current, incoming));
      setUnreadCount((count) => count + 1);
    };

    window.addEventListener('app:notification-received', handleIncomingNotification);

    return () => {
      window.removeEventListener('app:notification-received', handleIncomingNotification);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      router.reload({
        only: ['notifications'],
        preserveScroll: true,
        preserveState: true,
      });
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [userId]);

  const hasNotifications = items.length > 0;
  const buttonClasses = compact
    ? 'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-sys-border)] bg-white text-[var(--color-brand-dark)] shadow-sm'
    : 'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-sys-border)] bg-white text-[var(--color-brand-dark)] shadow-sm';

  const dropdownWidth = compact ? 'w-[20rem] max-w-[calc(100vw-2rem)]' : 'w-[24rem] max-w-[calc(100vw-2rem)]';
  const unreadLabel = useMemo(() => (unreadCount > 99 ? '99+' : unreadCount), [unreadCount]);

  const markAsRead = async (notificationId, actionUrl = null) => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      await window.axios.post(`/notifications/${notificationId}/read`);
      setItems((current) => current.filter((item) => item.id !== notificationId));
      setUnreadCount((count) => Math.max(0, count - 1));

      if (actionUrl) {
        setOpen(false);
        router.visit(actionUrl);
      }
    } finally {
      setBusy(false);
    }
  };

  const markAllAsRead = async () => {
    if (!unreadCount || busy) {
      return;
    }

    setBusy(true);

    try {
      await window.axios.post('/notifications/read-all');
      setItems([]);
      setUnreadCount(0);
    } finally {
      setBusy(false);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((value) => !value)} className={buttonClasses} aria-label="Open notifications">
        <Bell size={compact ? 18 : 19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#a42828] px-1 text-[10px] font-bold text-white">
            {unreadLabel}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 top-full z-[120] mt-3 overflow-hidden rounded-[1.5rem] border border-[var(--color-sys-border)] bg-white shadow-[0_24px_80px_rgba(44,30,22,0.16)] ${dropdownWidth}`}>
          <div className="flex items-center justify-between border-b border-[var(--color-sys-border)] px-4 py-4">
            <div>
              <p className="text-sm font-black text-[var(--color-sys-text-primary)]">Notifications</p>
              <p className="mt-1 text-xs text-[var(--color-sys-text-secondary)]">
                {unreadCount > 0 ? `${unreadCount} unread` : 'Everything is up to date'}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={!unreadCount || busy}
              className="inline-flex items-center gap-2 rounded-full bg-[#f3ede3] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-dark)] disabled:opacity-50"
            >
              <Check size={14} />
              Mark all read
            </button>
          </div>

          <div className="border-b border-[var(--color-sys-border)] px-3 py-3">
            <PushNotificationToggle compact />
          </div>

          {hasNotifications ? (
            <div className="max-h-[28rem] overflow-y-auto px-3 py-3">
              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = iconForNotification(item);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => markAsRead(item.id, item.action_url)}
                      className="w-full rounded-[1.25rem] border border-[#eadbc4] bg-[#fcf7ef] px-4 py-3 text-left transition hover:bg-[#f8f0e4]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-brand-dark)] shadow-sm ring-1 ring-[var(--color-sys-border)]">
                          <Icon size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-sys-text-primary)]">{item.title}</p>
                              <p className="mt-1 text-sm leading-5 text-[var(--color-sys-text-secondary)]">{item.message}</p>
                            </div>
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#a42828]" />
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-sys-text-secondary)]">
                            {item.display_order_number && <span>Order {item.display_order_number}</span>}
                            {item.amount != null && <span>TSh {formatAmount(item.amount)}</span>}
                            <span>{item.created_at_human || 'Just now'}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f3ede3] text-[var(--color-brand-dark)]">
                <Bell size={20} />
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--color-sys-text-primary)]">No notifications yet</p>
              <p className="mt-1 text-sm text-[var(--color-sys-text-secondary)]">New order and delivery updates will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
