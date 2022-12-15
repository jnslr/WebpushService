self.addEventListener("push", e => {
    const data = e.data.json();
    const promiseChain = self.registration.showNotification( data.title, data.options );
    e.waitUntil(promiseChain);
});
self.addEventListener("install", () => {
    self.skipWaiting();
});