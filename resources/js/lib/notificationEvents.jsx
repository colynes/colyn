import { BellRing, Package2, PackagePlus, PackageSearch, ShoppingBag, Tag, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const recentIds = new Set();

export function normalizeIncomingNotification(notification = {}) {
  return {
    ...notification,
    read_at: notification.read_at ?? null,
    created_at_human: notification.created_at_human || 'Just now',
  };
}

function resolveToast(notification) {
  const kind = String(notification.kind || '').toLowerCase();
  const status = String(notification.status || '').toLowerCase();

  if (kind === 'new_order') {
    return { method: 'success', icon: <ShoppingBag size={18} /> };
  }

  if (kind === 'order_cancelled' || status === 'cancelled') {
    return { method: 'error', icon: <XCircle size={18} /> };
  }

  if (kind === 'order_dispatched' || status === 'dispatched') {
    return { method: 'success', icon: <Truck size={18} /> };
  }

  if (kind === 'order_delivered' || kind === 'order_completed' || status === 'delivered' || status === 'completed') {
    return { method: 'success', icon: <Truck size={18} /> };
  }

  if (kind === 'low_stock' || kind === 'out_of_stock') {
    return { method: kind === 'out_of_stock' ? 'error' : 'warning', icon: <PackageSearch size={18} /> };
  }

  if (kind === 'new_promotion') {
    return { method: 'success', icon: <Tag size={18} /> };
  }

  if (kind === 'new_pack') {
    return { method: 'success', icon: <PackagePlus size={18} /> };
  }

  if (kind === 'subscription_request_created') {
    return { method: 'success', icon: <PackagePlus size={18} /> };
  }

  if (kind === 'subscription_created') {
    return { method: 'success', icon: <Package2 size={18} /> };
  }

  if (kind === 'subscription_quote_sent') {
    return { method: 'success', icon: <Tag size={18} /> };
  }

  if (kind === 'subscription_quote_accepted') {
    return { method: 'success', icon: <Package2 size={18} /> };
  }

  if (kind === 'subscription_quote_rejected') {
    return { method: 'error', icon: <XCircle size={18} /> };
  }

  return { method: 'info', icon: <BellRing size={18} /> };
}

export function dispatchNotificationEvent(notification) {
  const incoming = normalizeIncomingNotification(notification);
  const id = incoming.id || `${incoming.kind || 'notification'}-${incoming.created_at || Date.now()}`;

  if (recentIds.has(id)) {
    return;
  }

  recentIds.add(id);
  window.setTimeout(() => recentIds.delete(id), 10000);

  window.dispatchEvent(new CustomEvent('app:notification-received', { detail: incoming }));

  const toastConfig = resolveToast(incoming);
  const method = toast[toastConfig.method] || toast;

  method(incoming.title || 'Notification', {
    id,
    description: incoming.message || '',
    icon: toastConfig.icon,
    duration: 4500,
  });
}
