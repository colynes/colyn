import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import {
  syncNotificationToken,
  getBrowserNotificationStatus,
  showBrowserNotification,
} from '@/lib/browserNotifications';
import { dispatchNotificationEvent } from '@/lib/notificationEvents';
import { subscribeToForegroundMessages } from '@/lib/firebase';

export default function PushNotificationBridge() {
  const { auth } = usePage().props;
  const userId = auth?.user?.id;

  useEffect(() => {
    if (!userId || typeof window === 'undefined') {
      return undefined;
    }

    if (getBrowserNotificationStatus() === 'granted') {
      syncNotificationToken().catch(() => {});
    }

    let unsubscribe = () => {};

    subscribeToForegroundMessages((payload) => {
      const notification = {
        id: payload?.data?.id || payload?.messageId,
        title: payload?.notification?.title || payload?.data?.title || 'Notification',
        message: payload?.notification?.body || payload?.data?.message || payload?.data?.body || '',
        kind: payload?.data?.kind || 'general',
        status: payload?.data?.status || null,
        action_url: payload?.data?.action_url || payload?.data?.link || null,
        display_order_number: payload?.data?.display_order_number || null,
        order_number: payload?.data?.order_number || null,
        amount: payload?.data?.amount || null,
        created_at: payload?.data?.created_at || new Date().toISOString(),
        created_at_human: 'Just now',
      };

      showBrowserNotification({
        title: notification.title,
        body: notification.message,
        link: notification.action_url || '/notifications',
      });

      dispatchNotificationEvent(notification);
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return null;
}
