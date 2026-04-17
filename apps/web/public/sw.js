self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Inti.mate", {
      body:  data.body ?? "",
      icon:  data.icon ?? "/icon-192.png",
      badge: "/icon-72.png",
      data:  data.url ? { url: data.url } : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/feed";
  event.waitUntil(clients.openWindow(url));
});
