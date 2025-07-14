self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'SY Closeouts';
  const options = {
    body: data.body,
    icon: '/generated-icon.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
