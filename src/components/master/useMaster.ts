"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiJson } from "@/lib/api-client";

// Keempat master data memakai bentuk endpoint yang sama, jadi aksinya cukup
// ditulis sekali. Daftar di layar selalu dibaca ulang dari server lewat
// router.refresh() supaya tidak ada salinan data yang bisa basi.

export function useMaster(basis: string) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);

  async function kirim(
    jalan: string,
    method: "POST" | "PATCH" | "DELETE",
    body: unknown,
    sukses: string,
  ): Promise<boolean> {
    setSibuk(true);
    try {
      await apiJson(jalan, { method, body });
      toast.success(sukses);
      router.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan data");
      return false;
    } finally {
      setSibuk(false);
    }
  }

  return {
    sibuk,
    buat: (body: unknown) => kirim(basis, "POST", body, "Data baru tersimpan"),
    ubah: (id: string, body: unknown) =>
      kirim(`${basis}/${id}`, "PATCH", body, "Perubahan tersimpan"),
    hapus: (id: string) => kirim(`${basis}/${id}`, "DELETE", undefined, "Data dihapus"),
    setAktif: (id: string, aktif: boolean) =>
      kirim(
        `${basis}/${id}`,
        "PATCH",
        { aktif },
        aktif ? "Data diaktifkan kembali" : "Data dinonaktifkan",
      ),
  };
}
