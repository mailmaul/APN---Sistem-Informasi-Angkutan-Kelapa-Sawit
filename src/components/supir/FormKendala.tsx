"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, LoaderCircle, TriangleAlert } from "lucide-react";
import { apiJson } from "@/lib/api-client";
import { JENIS_KENDALA, JENIS_KENDALA_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { siapkanFoto, unggahFoto } from "./foto";
import type { Titik } from "./gunakan-gps";

// Lapor kendala: nol ketikan sebisa mungkin. Jenis dipilih dengan tombol besar,
// catatan tetap wajib supaya kantor tahu harus mengirim bantuan apa.

const skema = z.object({
  jenis: z.enum(JENIS_KENDALA, { message: "Pilih dulu jenis kendalanya" }),
  catatan: z.string().trim().min(5, "Ceritakan kendalanya sedikit lebih jelas"),
});

type IsiForm = z.infer<typeof skema>;

export function FormKendala({
  ritId,
  ambilTitik,
  onSelesai,
}: {
  ritId: string;
  ambilTitik: () => Promise<Titik | null>;
  onSelesai: () => void;
}) {
  const router = useRouter();
  const inputFoto = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<string | null>(null);

  const form = useForm<IsiForm>({
    resolver: zodResolver(skema),
    defaultValues: { catatan: "" },
  });
  const jenisTerpilih = form.watch("jenis");
  const sibuk = form.formState.isSubmitting;

  async function pilihFoto(berkas: File | undefined) {
    if (!berkas) return;
    try {
      setFoto(await siapkanFoto(berkas));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Foto gagal dibaca");
    }
  }

  async function kirim(isi: IsiForm) {
    try {
      const titik = await ambilTitik();
      const fotoUrl = foto ? await unggahFoto(foto) : undefined;
      await apiJson(`/api/rit/${ritId}/kendala`, {
        method: "POST",
        body: { ...isi, fotoUrl, lat: titik?.lat, lng: titik?.lng },
      });
      toast.success("Kendala terkirim ke kantor");
      onSelesai();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kendala gagal dikirim");
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(kirim)}>
      <div className="space-y-2">
        <Label>Apa kendalanya?</Label>
        <div className="grid grid-cols-2 gap-2">
          {JENIS_KENDALA.map((j) => (
            <button
              key={j}
              type="button"
              onClick={() => form.setValue("jenis", j, { shouldValidate: true })}
              className={cn(
                "h-12 rounded-[10px] border px-3 text-sm font-medium transition-colors",
                jenisTerpilih === j
                  ? "border-bahaya bg-bahaya/10 text-bahaya"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              {JENIS_KENDALA_LABEL[j]}
            </button>
          ))}
        </div>
        {form.formState.errors.jenis ? (
          <p className="text-xs text-bahaya">{form.formState.errors.jenis.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="catatan-kendala">Ceritakan singkat</Label>
        <Textarea
          id="catatan-kendala"
          rows={3}
          className="text-base"
          placeholder="Contoh: ban belakang kiri pecah di KM 42, butuh bantuan."
          {...form.register("catatan")}
        />
        {form.formState.errors.catatan ? (
          <p className="text-xs text-bahaya">{form.formState.errors.catatan.message}</p>
        ) : null}
      </div>

      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pilihFoto(e.target.files?.[0])}
      />

      {foto ? (
        <img src={foto} alt="Foto kendala" className="w-full rounded-lg border object-cover" />
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={() => inputFoto.current?.click()}
        disabled={sibuk}
      >
        <Camera className="size-4" />
        {foto ? "Ganti Foto" : "Tambah Foto (opsional)"}
      </Button>

      <Button
        type="submit"
        className="h-13 w-full rounded-[10px] bg-bahaya text-base font-semibold text-white hover:bg-bahaya/90"
        disabled={sibuk}
      >
        {sibuk ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : (
          <TriangleAlert className="size-5" />
        )}
        Kirim Laporan Kendala
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Kantor langsung menerima pemberitahuan. Perjalanan bisa dilanjutkan setelah kendala beres.
      </p>
    </form>
  );
}
