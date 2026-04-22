import { useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { dispatchNotificationEvent, normalizeIncomingNotification } from '@/lib/notificationEvents';
import { startEcho } from '@/lib/echo';

export default function NotificationRealtimeBridge() {
  const { auth } = usePage().props;
  const userId = auth?.user?.id;
  const recentIdsRef = useRef(new Set());

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let active = true;
    let channelName = null;

    startEcho().then((echo) => {
      if (!active || !echo) {
        return;
      }

      channelName = `App.Models.User.${userId}`;
      const channel = echo.private(channelName);

      channel.notification((notification) => {
        const incoming = normalizeIncomingNotification(notification);
        const id = incoming.id || `${incoming.kind || 'notification'}-${incoming.created_at || Date.now()}`;

        if (recentIdsRef.current.has(id)) {
          return;
        }

        recentIdsRef.current.add(id);
        window.setTimeout(() => recentIdsRef.current.delete(id), 10000);
        dispatchNotificationEvent(incoming);
      });
    });

    return () => {
      active = false;

      if (channelName && window.Echo) {
        window.Echo.leave(channelName);
      }
    };
  }, [userId]);

  return null;
}
