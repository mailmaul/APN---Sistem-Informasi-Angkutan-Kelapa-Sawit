"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { jumlahAntrian, kirimAntrian } from "./antrian";

// Pengirim ulang aksi yang tertahan saat sinyal putus. Dipasang sekali di
// layout supir supaya berjalan di layar mana pun.

export function PenyinkronAntrian() {
  const router = useRouter();
  const sedang = useRef(false);

  useEffect(() => {
    async function sinkron() {
      if (sedang.current || jumlahAntrian() === 0) return;
      sedang.current = true;
      try {
        const hasil = await kirimAntrian();
        if (hasil.terkirim > 0) {
          toast.success(`${hasil.terkirim} aksi tersimpan berhasil dikirim`);
          router.refresh();
        } else if (hasil.basi > 0) {
          router.refresh();
        }
      } finally {
        sedang.current = false;
      }
    }

    sinkron();
    window.addEventListener("online", sinkron);
    return () => window.removeEventListener("online", sinkron);
  }, [router]);

  return null;
}
