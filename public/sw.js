// Service worker APN.
//
// Sengaja TIDAK meng-cache halaman: data rit harus selalu segar, dan mode
// offline penuh masuk fase 2. Tugas SW di sini hanya dua: menerima push dan
// membuka halaman yang tepat saat notifikasi diketuk.

const BASE = "/apn";

self.addEventListener("install", () => {
  // Versi baru langsung dipakai — supir tidak akan menutup semua tab sendiri.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let isi = {};
  try {
    isi = event.data ? event.data.json() : {};
  } catch {
    isi = { judul: "APN", pesan: event.data ? event.data.text() : "" };
  }

  const judul = isi.judul || "APN";
  const url = isi.url ? `${BASE}${isi.url}` : `${BASE}/`;

  event.waitUntil(
    self.registration.showNotification(judul, {
      body: isi.pesan || "",
      icon: `${BASE}/icons/icon-192.png`,
      badge: `${BASE}/icons/badge-72.png`,
      tag: isi.tag || undefined,
      renotify: Boolean(isi.tag),
      vibrate: [120, 60, 120],
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || `${BASE}/`;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((daftar) => {
      // Kalau aplikasi sudah terbuka, pakai tab itu supaya tidak menumpuk tab.
      for (const klien of daftar) {
        if (klien.url.includes(BASE) && "focus" in klien) {
          klien.navigate(url);
          return klien.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
