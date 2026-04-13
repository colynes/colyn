const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseMessagingConfig = Boolean(
  firebaseConfig.apiKey
    && firebaseConfig.projectId
    && firebaseConfig.messagingSenderId
    && firebaseConfig.appId,
);

let firebaseAppPromise = null;
let messagingInstancePromise = null;

async function getFirebaseApp() {
  if (!firebaseAppPromise) {
    firebaseAppPromise = import('firebase/app').then(({ initializeApp }) => initializeApp(firebaseConfig));
  }

  return firebaseAppPromise;
}

export async function getFirebaseMessaging() {
  if (!hasFirebaseMessagingConfig) {
    return null;
  }

  const { getMessaging, isSupported } = await import('firebase/messaging');

  const supported = await isSupported();

  if (!supported) {
    return null;
  }

  if (!messagingInstancePromise) {
    messagingInstancePromise = getFirebaseApp().then((firebaseApp) => getMessaging(firebaseApp));
  }

  return messagingInstancePromise;
}

export async function subscribeToForegroundMessages(handler) {
  const messaging = await getFirebaseMessaging();

  if (!messaging) {
    return () => {};
  }

  const { onMessage } = await import('firebase/messaging');

  return onMessage(messaging, handler);
}

export { firebaseConfig };
