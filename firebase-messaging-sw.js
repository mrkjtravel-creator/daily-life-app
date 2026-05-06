importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDLp4IpoQppGXSrB5vr1b30qBmzw2OFM1I",
  authDomain: "daily-life-app-2218c.firebaseapp.com",
  projectId: "daily-life-app-2218c",
  storageBucket: "daily-life-app-2218c.firebasestorage.app",
  messagingSenderId: "788285088322",
  appId: "1:788285088322:web:7e6b8b84f47284352d43db"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'Daily Life';
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icons/apple-touch-icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
