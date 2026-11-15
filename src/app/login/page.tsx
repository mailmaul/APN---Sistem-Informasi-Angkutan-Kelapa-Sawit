import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Truck } from "lucide-react";
import { ambilSesi } from "@/lib/session";
import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Masuk — APN" };

// Satu halaman masuk untuk semua peran. Yang sudah punya sesi tidak perlu
// melihat formulir lagi — langsung diarahkan ke areanya.

export default async function HalamanLogin() {
  const sesi = await ambilSesi();
  if (sesi) redirect(sesi.peran === "SUPIR" ? "/supir" : "/");

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-muted/30 px-4 py-10">
      <div className="mx-auto w-full max-w-sm space-y-7">
        <div className="space-y-3 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Truck className="size-7" />
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">APN</h1>
            <p className="text-sm text-muted-foreground">
              Sistem angkutan Palm Kernel &amp; Palm Shell
            </p>
          </div>
        </div>

        <FormLogin />

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Akun dibuat oleh kantor. Lupa password atau nomor HP berubah? Hubungi admin.
        </p>
      </div>
    </div>
  );
}
