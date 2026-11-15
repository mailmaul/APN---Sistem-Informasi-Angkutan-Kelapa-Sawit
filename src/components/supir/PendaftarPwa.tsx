"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { apiJson } from "@/lib/api-client";
import { withBasePath } from "@/lib/base-path";
import { Button } from "@/components/ui/button";

// Pemasang service worker + langganan notifikasi.
//
// Catatan iOS: push hanya bekerja kalau PWA sudah dipasang ke home screen
// (iOS 16.4+). Karena itu di iOS yang masih dibuka lewat Safari, yang
// ditawarkan bukan tombol notifikasi melainkan ajakan memasang dulu.

const KUNCI_VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Kunci VAPID base64url → Uint8Array seperti yang diminta PushManager. */
// Tipe kembalian sengaja Uint8Array<ArrayBuffer>, bukan Uint8Array biasa:
// PushManager.subscribe menolak buffer yang mungkin SharedArrayBuffer.
function kunciKeByte(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const biner = atob(padded);
  const byte = new Uint8Array(new ArrayBuffer(biner.length));
  for (let i = 0; i < biner.length; i++) byte[i] = biner.charCodeAt(i);
  return byte;
}

type Tawaran = "tidak-ada" | "nyalakan-notifikasi" | "pasang-dulu";

export function PendaftarPwa({
  ajakan = "Nyalakan pemberitahuan supaya tugas baru langsung terlihat tanpa membuka aplikasi.",
  urlPanduan = "/supir/panduan",
}: {
  ajakan?: string;
  /** null untuk area yang tidak boleh membuka panduan supir (mis. layar kantor). */
  urlPanduan?: string | null;
}) {
  const [tawaran, setTawaran] = useState<Tawaran>("tidak-ada");
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    let batal = false;

    async function siapkan() {
      if (!("serviceWorker" in navigator)) return;

      const reg = await navigator.serviceWorker
        .register(withBasePath("/sw.js"), { scope: withBasePath("/") })
        .catch(() => null);
      if (!reg || batal) return;

      if (!("PushManager" in window) || !KUNCI_VAPID) return;

      const langganan = await reg.pushManager.getSubscription();
      if (langganan) {
        // Server bisa saja kehilangan catatannya (mis. basis data direset);
        // mengirim ulang itu murah dan idempoten.
        await simpanLangganan(langganan).catch(() => {});
        return;
      }

      if (batal) return;
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      // Safari iOS memakai navigator.standalone, browser lain display-mode.
      const terpasang =
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && navigator.standalone === true);

      if (ios && !terpasang) {
        setTawaran("pasang-dulu");
        return;
      }
      if (Notification.permission === "granted") {
        await berlangganan(reg).catch(() => {});
        return;
      }
      if (Notification.permission === "default") setTawaran("nyalakan-notifikasi");
    }

    siapkan();
    return () => {
      batal = true;
    };
  }, []);

  async function simpanLangganan(langganan: PushSubscription) {
    await apiJson("/api/push/subscribe", { method: "POST", body: langganan.toJSON() });
  }

  async function berlangganan(reg: ServiceWorkerRegistration) {
    const langganan = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: kunciKeByte(KUNCI_VAPID),
    });
    await simpanLangganan(langganan);
  }

  async function nyalakan() {
    setSibuk(true);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        toast.error("Notifikasi tidak diizinkan di pengaturan HP");
        setTawaran("tidak-ada");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      await berlangganan(reg);
      setTawaran("tidak-ada");
      toast.success("Notifikasi dinyalakan");
    } catch {
      toast.error("Notifikasi gagal dinyalakan");
    } finally {
      setSibuk(false);
    }
  }

  if (tawaran === "tidak-ada") return null;

  if (tawaran === "pasang-dulu") {
    return (
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="space-y-2 text-sm">
          <p className="leading-relaxed">
            Pasang APN ke layar utama iPhone supaya pemberitahuan bisa masuk.
          </p>
          {urlPanduan ? (
            <Button variant="outline" size="lg" render={<Link href={urlPanduan} />}>
              Lihat cara pasang
            </Button>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Buka menu Bagikan di Safari, lalu pilih &ldquo;Tambah ke Layar Utama&rdquo;.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
      <Bell className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="space-y-2 text-sm">
        <p className="leading-relaxed">{ajakan}</p>
        <Button size="lg" disabled={sibuk} onClick={nyalakan}>
          Nyalakan Pemberitahuan
        </Button>
      </div>
    </div>
  );
}
