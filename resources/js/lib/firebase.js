import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported as isMessagingSupported, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
let messagingInstancePromise = null;

export async function getFirebaseMessaging() {
  const supported = await isMessagingSupported();

  if (!supported) {
    return null;
  }

  if (!messagingInstancePromise) {
    messagingInstancePromise = Promise.resolve(getMessaging(firebaseApp));
  }

  return messagingInstancePromise;
}

export async function subscribeToForegroundMessages(handler) {
  const messaging = await getFirebaseMessaging();

  if (!messaging) {
    return () => {};
  }

  return onMessage(messaging, handler);
}

export { firebaseApp, firebaseConfig };
