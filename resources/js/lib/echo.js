import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

export function startEcho() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.Echo) {
    return window.Echo;
  }

  const key = import.meta.env.VITE_PUSHER_APP_KEY;
  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;

  if (!key || !cluster) {
    return null;
  }

  window.Pusher = Pusher;

  window.Echo = new Echo({
    broadcaster: 'pusher',
    key,
    cluster,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
  });

  return window.Echo;
}
