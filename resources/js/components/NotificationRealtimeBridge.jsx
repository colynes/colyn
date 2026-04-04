import { useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { BellRing, PackagePlus, PackageSearch, ShoppingBag, Tag, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

function normalizeNotification(notification) {
  return {
    ...notification,
    read_at: null,
    created_at_human: notification.created_at_human || 'Just now',
  };
}

function resolveToast(notification) {
  const kind = String(notification.kind || '').toLowerCase();
  const status = String(notification.status || '').toLowerCase();

  if (kind === 'new_order') {
    return {
      method: 'success',
      icon: <ShoppingBag size={18} />,
    };
  }

  if (kind === 'order_cancelled' || status === 'cancelled') {
    return {
      method: 'error',
      icon: <XCircle size={18} />,
    };
  }

  if (kind === 'order_dispatched' || status === 'dispatched') {
    return {
      method: 'success',
      icon: <Truck size={18} />,
    };
  }

  if (kind === 'order_delivered' || status === 'delivered') {
    return {
      method: 'success',
      icon: <Truck size={18} />,
    };
  }

  if (kind === 'low_stock') {
    return {
      method: 'warning',
      icon: <PackageSearch size={18} />,
    };
  }

  if (kind === 'out_of_stock') {
    return {
      method: 'error',
      icon: <PackageSearch size={18} />,
    };
  }

  if (kind === 'new_promotion') {
    return {
      method: 'success',
      icon: <Tag size={18} />,
    };
  }

  if (kind === 'new_pack') {
    return {
      method: 'success',
      icon: <PackagePlus size={18} />,
    };
  }

  return {
    method: 'info',
    icon: <BellRing size={18} />,
  };
}

export default function NotificationRealtimeBridge() {
  const { auth } = usePage().props;
  const userId = auth?.user?.id;
  const recentIdsRef = useRef(new Set());

  useEffect(() => {
    if (!userId || !window.Echo) {
      return undefined;
    }

    const channelName = `App.Models.User.${userId}`;
    const channel = window.Echo.private(channelName);

    channel.notification((notification) => {
      const incoming = normalizeNotification(notification);
      const id = incoming.id || `${incoming.kind || 'notification'}-${incoming.created_at || Date.now()}`;

      if (recentIdsRef.current.has(id)) {
        return;
      }

      recentIdsRef.current.add(id);
      window.setTimeout(() => recentIdsRef.current.delete(id), 10000);

      window.dispatchEvent(new CustomEvent('app:notification-received', { detail: incoming }));

      const toastConfig = resolveToast(incoming);
      const title = incoming.title || 'Notification';
      const description = incoming.message || '';
      const method = toast[toastConfig.method] || toast;

      method(title, {
        id,
        description,
        icon: toastConfig.icon,
        duration: 4500,
      });
    });

    return () => {
      window.Echo.leave(channelName);
    };
  }, [userId]);

  return null;
}
