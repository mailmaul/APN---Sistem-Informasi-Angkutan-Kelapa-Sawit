"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { apiJson } from "@/lib/api-client";
import type { Peran } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Dipakai supir sambil berdiri di samping truk: kolom besar, papan ketik angka
// untuk nomor HP, dan hanya satu tombol.

const skema = z.object({
  hp: z.string().trim().min(6, "Nomor HP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

type IsiLogin = z.infer<typeof skema>;

export function FormLogin() {
  const router = useRouter();
  const [lihatSandi, setLihatSandi] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const form = useForm<IsiLogin>({
    resolver: zodResolver(skema),
    defaultValues: { hp: "", password: "" },
  });

  async function masuk(isi: IsiLogin) {
    setGalat(null);
    try {
      const hasil = await apiJson<{ user: { peran: Peran } }>("/api/auth/login", {
        method: "POST",
        body: isi,
      });
      // Supir dan kantor punya area berbeda; peran menentukan tujuannya.
      router.replace(hasil.user.peran === "SUPIR" ? "/supir" : "/");
      router.refresh();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal masuk, coba lagi");
    }
  }

  const sibuk = form.formState.isSubmitting;

  return (
    <form
      onSubmit={form.handleSubmit(masuk)}
      className="space-y-4 rounded-lg border bg-card p-5 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor="hp" className="text-sm">
          Nomor HP
        </Label>
        <Input
          id="hp"
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          placeholder="08xxxxxxxxxx"
          className="angka h-12 text-base"
          {...form.register("hp")}
        />
        {form.formState.errors.hp ? (
          <p className="text-xs text-bahaya">{form.formState.errors.hp.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={lihatSandi ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-12 pr-12 text-base"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setLihatSandi((v) => !v)}
            aria-label={lihatSandi ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground"
          >
            {lihatSandi ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {form.formState.errors.password ? (
          <p className="text-xs text-bahaya">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      {galat ? (
        <p className="rounded-lg border border-bahaya/25 bg-bahaya/5 px-3 py-2 text-sm text-bahaya">
          {galat}
        </p>
      ) : null}

      <Button type="submit" className="h-13 w-full rounded-[10px] text-base font-semibold" disabled={sibuk}>
        {sibuk ? <LoaderCircle className="size-5 animate-spin" /> : <LogIn className="size-5" />}
        Masuk
      </Button>
    </form>
  );
}
