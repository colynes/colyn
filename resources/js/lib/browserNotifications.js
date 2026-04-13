import { getFirebaseMessaging } from './firebase';

const STORAGE_KEY = 'amanibrew:fcm-token';
const STATUS_KEY = 'amanibrew:fcm-status';

export function getBrowserNotificationStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

export function getStoredNotificationToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredNotificationStatus(status) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STATUS_KEY, status);
}

export function getStoredNotificationStatus() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(STATUS_KEY);
}

function setStoredNotificationToken(token) {
  if (typeof window === 'undefined') {
    return;
  }

  if (token) {
    window.localStorage.setItem(STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export async function registerPushServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

export async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();
  setStoredNotificationStatus(permission);

  return permission;
}

export function showBrowserNotification({
  title = 'Notification',
  body = '',
  link = '/notifications',
  icon = '/images/amani_brew_mark.png',
} = {}) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const notification = new Notification(title, {
    body,
    icon,
    badge: icon,
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = link;
    notification.close();
  };

  return notification;
}

export async function syncNotificationToken() {
  try {
    const messaging = await getFirebaseMessaging();

    if (!messaging) {
      return { ok: false, reason: 'unsupported', message: 'Firebase messaging is not supported in this browser.' };
    }

    if (getBrowserNotificationStatus() !== 'granted') {
      return { ok: false, reason: 'permission', message: 'Browser notification permission has not been granted.' };
    }

    const registration = await registerPushServiceWorker();
    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { ok: false, reason: 'token', message: 'Firebase did not return a browser push token.' };
    }

    await window.axios.post('/api/save-notification-token', { token });
    setStoredNotificationToken(token);

    return { ok: true, token };
  } catch (error) {
    return {
      ok: false,
      reason: 'exception',
      message: error?.message || 'Unknown Firebase push registration error.',
    };
  }
}

export async function removeNotificationToken(tokenOverride = null) {
  const token = tokenOverride || getStoredNotificationToken();

  if (!token) {
    return;
  }

  try {
    await window.axios.delete('/api/remove-notification-token', {
      data: { token },
    });
  } catch (error) {
    // Ignore network issues on logout/unsubscribe. Local cleanup still matters.
  }

  try {
    const messaging = await getFirebaseMessaging();

    if (messaging) {
      const { deleteToken } = await import('firebase/messaging');
      await deleteToken(messaging);
    }
  } catch (error) {
    // Best-effort cleanup only.
  }

  setStoredNotificationToken(null);
}
