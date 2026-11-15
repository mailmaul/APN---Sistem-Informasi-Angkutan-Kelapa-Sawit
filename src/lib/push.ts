import "server-only";
// web-push adalah CJS tanpa default export — namespace import, bukan default.
import * as webpush from "web-push";
import { db } from "./db";

// Web push. Kunci VAPID dibuat sekali lewat `npx web-push generate-vapid-keys`
// dan disimpan di .env. Kalau kunci tidak ada, notifikasi dilewati diam-diam —
// aplikasi tetap jalan normal tanpa push (dev lokal tidak wajib punya kunci).

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const aktif = Boolean(PUBLIC_KEY && PRIVATE_KEY);

if (aktif) {
  webpush.setVapidDetails("mailto:ops@mauldev.my.id", PUBLIC_KEY, PRIVATE_KEY);
}

export type IsiNotifikasi = {
  judul: string;
  pesan: string;
  /** Path internal tanpa basePath, mis. "/supir/rit/abc". */
  url?: string;
  tag?: string;
};

/**
 * Kirim notifikasi ke semua perangkat milik user.
 * Langganan yang sudah mati (404/410) dibersihkan otomatis.
 */
export async function kirimNotifikasi(userId: string, isi: IsiNotifikasi): Promise<number> {
  if (!aktif) return 0;

  const langganan = await db.pushSubscription.findMany({ where: { userId } });
  if (langganan.length === 0) return 0;

  const payload = JSON.stringify(isi);
  let terkirim = 0;

  await Promise.all(
    langganan.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        terkirim++;
      } catch (err) {
        // Endpoint mati (404/410) harus dibuang, selain itu diamkan supaya
        // satu perangkat bermasalah tidak menggagalkan pengiriman lainnya.
        const mati =
          typeof err === "object" &&
          err !== null &&
          "statusCode" in err &&
          (err.statusCode === 404 || err.statusCode === 410);
        if (mati) {
          await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    }),
  );

  return terkirim;
}

/** Kirim ke semua user dengan peran tertentu (mis. semua admin). */
export async function kirimKePeran(peran: string[], isi: IsiNotifikasi): Promise<number> {
  const users = await db.user.findMany({
    where: { peran: { in: peran }, aktif: true },
    select: { id: true },
  });
  const hasil = await Promise.all(users.map((u) => kirimNotifikasi(u.id, isi)));
  return hasil.reduce((a, b) => a + b, 0);
}

export const vapidPublicKey = PUBLIC_KEY;
