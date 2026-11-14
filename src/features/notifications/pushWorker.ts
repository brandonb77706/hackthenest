// Served as JavaScript by a thin route. No fetch handler or offline caching.
// Ignore arbitrary payload text and URLs: this demo always uses a generic message.
export const pushWorkerSource = `
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  event.waitUntil(self.registration.showNotification('Bridge check-in', {
    body: 'Open Bridge to check in.', tag: 'bridge-local-test'
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL('/notifications/test', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => client.url === target);
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  })());
});
`;
