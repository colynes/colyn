/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

let messagingPromise = null;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function getMessaging() {
  if (messagingPromise) {
    return messagingPromise;
  }

  messagingPromise = fetch('/push/config', { credentials: 'same-origin' })
    .then((response) => response.json())
    .then((config) => {
      firebase.initializeApp(config);
      return firebase.messaging();
    })
    .catch(() => null);

  return messagingPromise;
}

getMessaging().then((messaging) => {
  if (!messaging) {
    return;
  }

  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || payload?.data?.title || 'Notification';
    const body = payload?.notification?.body || payload?.data?.message || payload?.data?.body || '';
    const link = payload?.data?.link || payload?.data?.action_url || '/notifications';

    self.registration.showNotification(title, {
      body,
      icon: '/images/amani_brew_mark.png',
      badge: '/images/amani_brew_mark.png',
      data: { link },
    });
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.link || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
