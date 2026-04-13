export async function startEcho() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.Echo) {
    return window.Echo;
  }

  const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
  const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;

  if (!pusherKey || !pusherCluster) {
    return null;
  }

  const [{ default: Echo }, { default: Pusher }] = await Promise.all([
    import('laravel-echo'),
    import('pusher-js'),
  ]);

  window.Pusher = Pusher;

  window.Echo = new Echo({
    broadcaster: 'pusher',
    key: pusherKey,
    cluster: pusherCluster,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
  });

  return window.Echo;
}
