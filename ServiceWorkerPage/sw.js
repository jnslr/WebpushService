self.addEventListener("push", e => {
    const data = e.data.json();
    self.registration.showNotification( data.title, data.options );
});
self.addEventListener("install", () => {
    self.skipWaiting();
});