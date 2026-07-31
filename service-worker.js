const CACHE_NAME = "lecteur-rsvp-v11c";

const FILES_TO_CACHE = [
  "/RSVP/",
  "/RSVP/index.html",
  "/RSVP/manifest.json",
  "/RSVP/styles2.css",
  "/RSVP/script.js",
  "/RSVP/jszip.min.js",
  "/RSVP/icon-180.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
	
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(FILES_TO_CACHE);
      })
  );
});


self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});