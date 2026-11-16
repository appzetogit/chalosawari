import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import apiService from '@/services/api';

type Role = 'user' | 'driver';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  appId: env.VITE_FIREBASE_APP_ID,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const endpoint = (role: Role) => (role === 'driver' ? '/auth/driver/fcm-token' : '/auth/fcm-token');
const storageKey = (role: Role) => `fcmToken_${role}`;

let messaging: Messaging | null = null;

// Ask permission, get this browser's FCM token and store it on the backend (platform: web).
export async function registerFcmToken(role: Role) {
  try {
    if (!config.apiKey || !config.appId || !('Notification' in window) || !(await isSupported())) return;
    if ((await Notification.requestPermission()) !== 'granted') return;

    messaging ??= getMessaging(initializeApp(config));
    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${new URLSearchParams(config)}`
    );
    const token = await getToken(messaging, {
      vapidKey: env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return;

    await apiService.request(endpoint(role), {
      method: 'POST',
      body: JSON.stringify({ token, platform: 'web' }),
    }, role);
    localStorage.setItem(storageKey(role), token);
  } catch (error) {
    console.warn('FCM token registration failed:', error);
  }
}

// Call BEFORE clearing the auth token. keepalive lets it finish across the logout redirect.
export function unregisterFcmToken(role: Role) {
  const token = localStorage.getItem(storageKey(role));
  if (!token) return;
  localStorage.removeItem(storageKey(role));
  fetch(`${apiService.baseURL}${endpoint(role)}`, {
    method: 'DELETE',
    headers: apiService.getHeaders(role),
    body: JSON.stringify({ token }),
    keepalive: true,
  }).catch(() => {});
}
