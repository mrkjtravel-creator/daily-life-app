const firebaseConfig = {
  apiKey: "AIzaSyDLp4IpoQppGXSrB5vr1b30qBmzw2OFM1I",
  authDomain: "daily-life-app-2218c.firebaseapp.com",
  projectId: "daily-life-app-2218c",
  storageBucket: "daily-life-app-2218c.firebasestorage.app",
  messagingSenderId: "788285088322",
  appId: "1:788285088322:web:7e6b8b84f47284352d43db"
};

// Initialize Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
const messaging = typeof firebase !== 'undefined' && firebase.messaging.isSupported() ? firebase.messaging() : null;

// Replace this with your VAPID key from Firebase Console -> Project Settings -> Cloud Messaging
const VAPID_KEY = "BCFjsLq2_jpoyswRYKMK3v-57FtNRso7czFt9TiczBAALSxlaijkr3h6mSJTV7sl14CFZvvWA6_8liaq6qCbOUA";

const FcmModule = (() => {
  
  async function requestPushPermission(userEmail) {
    if (!messaging) {
      alert("您的瀏覽器不支援推播通知");
      return false;
    }

    try {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        
        // Get FCM Token
        const token = await messaging.getToken({ vapidKey: VAPID_KEY });
        if (token) {
          console.log('FCM Token received:', token);
          // Save to Firestore
          await saveTokenToDatabase(token, userEmail);
          return true;
        } else {
          console.log('No registration token available.');
          return false;
        }
      } else {
        console.log('Notification permission denied or dismissed.');
        return false;
      }
    } catch (error) {
      console.error('An error occurred while retrieving token:', error);
      return false;
    }
  }

  async function saveTokenToDatabase(token, email) {
    if (!db) return;
    try {
      await db.collection('fcm_tokens').doc(token).set({
        token: token,
        email: email || 'anonymous',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        deviceInfo: navigator.userAgent
      });
      console.log('Token saved to Firestore');
    } catch (error) {
      console.error('Error saving token to Firestore:', error);
    }
  }

  async function removeTokenFromDatabase() {
    if (!messaging) return;
    try {
      const token = await messaging.getToken({ vapidKey: VAPID_KEY });
      if (token && db) {
        await db.collection('fcm_tokens').doc(token).delete();
        console.log('Token removed from Firestore');
      }
    } catch (err) {
      console.log('Error removing token', err);
    }
  }

  // Handle incoming messages when the app is OPEN (foreground)
  if (messaging) {
    messaging.onMessage((payload) => {
      console.log('Message received in foreground: ', payload);
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/icons/apple-touch-icon.png'
      };
      
      // If the browser supports showing notifications while active
      if (Notification.permission === 'granted') {
        new Notification(notificationTitle, notificationOptions);
      }
    });
  }

  return {
    requestPushPermission,
    removeTokenFromDatabase
  };
})();
