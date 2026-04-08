import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

export function startEcho() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.Echo) {
    return window.Echo;
  }

  const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
  const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;

  window.Pusher = Pusher;

  if (!pusherKey || !pusherCluster) {
    return null;
  }

  window.Echo = new Echo({
    broadcaster: 'pusher',
    key: pusherKey,
    cluster: pusherCluster,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
  });

  return window.Echo;
}
