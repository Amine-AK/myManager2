// This public key should ideally come from an environment variable injected by Vite.
// For now, it matches the one configured in server.js.
const PUBLIC_VAPID_KEY = 'BHTJaTxsiheEu5rBiciJzAzpkAGul4LE_IbGKepSFza1LWDAfO-bM3rpskzExn3KbwfKHoTHpCpeHyTs6YYkxnM';

// Utility to convert base64 VAPID key to Uint8Array required by pushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported by this browser.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted.');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });
    }

    return subscription;
  } catch (err) {
    console.error('Failed to subscribe to push notifications:', err);
    return null;
  }
}

export async function testServerPush() {
  const subscription = await subscribeToPushNotifications();
  if (!subscription) return false;

  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription })
    });
    return res.ok;
  } catch (err) {
    console.error('Test push failed:', err);
    return false;
  }
}

export async function scheduleServerPush(title: string, body: string, targetTimestamp: number) {
  const subscription = await subscribeToPushNotifications();
  if (!subscription) {
    console.warn('Could not schedule push: No push subscription active.');
    return false;
  }

  try {
    const response = await fetch('/api/push/schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription,
        payload: { title, body },
        targetTimestamp
      })
    });

    return response.ok;
  } catch (err) {
    console.error('Failed to schedule push notification on server:', err);
    return false;
  }
}
