/* global importScripts, firebase */
// Firebase config arrives as query params from src/lib/fcm.ts so it lives only in .env
importScripts('https://www.gstatic.com/firebasejs/13.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/13.3.0/firebase-messaging-compat.js');

firebase.initializeApp(Object.fromEntries(new URL(self.location.href).searchParams));
// Background messages with a `notification` payload are shown by the SDK automatically.
firebase.messaging();
