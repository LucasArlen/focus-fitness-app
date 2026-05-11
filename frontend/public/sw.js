// Focus Fitness — Service Worker

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(clients.claim()));

self.addEventListener("push", e => {
  let data = {};
  try { data = e.data?.json() ?? {}; } catch {}

  const title   = data.title ?? "Focus Fitness";
  const options = {
    body:     data.body ?? "Novo treino disponível!",
    icon:     "/logo.png",
    badge:    "/logo.png",
    vibrate:  [120, 60, 120],
    tag:      data.tag ?? "notif",   // cada tipo tem sua própria tag
    renotify: true,                  // sempre vibra, mesmo com mesma tag
    data:     { url: "/" },
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const existing = list.find(w => w.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow("/");
    })
  );
});
