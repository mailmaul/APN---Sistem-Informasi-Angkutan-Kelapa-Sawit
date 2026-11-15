"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_RIT, STATUS_RIT_LABEL } from "@/lib/constants";

const SEMUA = "SEMUA";

export type OpsiFilter = { id: string; label: string };

export function FilterRit({
  kontrak,
  supir,
  truk,
}: {
  kontrak: OpsiFilter[];
  supir: OpsiFilter[];
  truk: OpsiFilter[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const terapkan = (kunci: string, nilai: string) => {
    const baru = new URLSearchParams(params.toString());
    if (nilai && nilai !== SEMUA) baru.set(kunci, nilai);
    else baru.delete(kunci);
    router.push(`/rit${baru.size ? `?${baru}` : ""}`);
  };

  const nilai = (kunci: string) => params.get(kunci) ?? SEMUA;
  const adaFilter = Array.from(params.keys()).length > 0;

  const petaOpsi = (opsi: OpsiFilter[], semua: string) => ({
    [SEMUA]: semua,
    ...Object.fromEntries(opsi.map((o) => [o.id, o.label])),
  });

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const isi = new FormData(e.currentTarget).get("q");
        terapkan("q", typeof isi === "string" ? isi.trim() : "");
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="Cari nomor DO…"
          className="h-8 w-48 pl-8"
        />
      </div>

      <Select
        items={{ [SEMUA]: "Semua status", ...STATUS_RIT_LABEL }}
        value={nilai("status")}
        onValueChange={(v) => terapkan("status", v ?? SEMUA)}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SEMUA}>Semua status</SelectItem>
          {STATUS_RIT.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_RIT_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={petaOpsi(kontrak, "Semua kontrak")}
        value={nilai("kontrakId")}
        onValueChange={(v) => terapkan("kontrakId", v ?? SEMUA)}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SEMUA}>Semua kontrak</SelectItem>
          {kontrak.map((k) => (
            <SelectItem key={k.id} value={k.id}>
              {k.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={petaOpsi(supir, "Semua supir")}
        value={nilai("supirId")}
        onValueChange={(v) => terapkan("supirId", v ?? SEMUA)}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SEMUA}>Semua supir</SelectItem>
          {supir.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={petaOpsi(truk, "Semua truk")}
        value={nilai("trukId")}
        onValueChange={(v) => terapkan("trukId", v ?? SEMUA)}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SEMUA}>Semua truk</SelectItem>
          {truk.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        aria-label="Tanggal mulai"
        className="angka h-8 w-36"
        value={params.get("dari") ?? ""}
        onChange={(e) => terapkan("dari", e.target.value)}
      />
      <span className="text-xs text-muted-foreground">s/d</span>
      <Input
        type="date"
        aria-label="Tanggal akhir"
        className="angka h-8 w-36"
        value={params.get("sampai") ?? ""}
        onChange={(e) => terapkan("sampai", e.target.value)}
      />

      <Button type="submit" variant="outline">
        Cari
      </Button>
      {adaFilter ? (
        <Button type="button" variant="ghost" onClick={() => router.push("/rit")}>
          Reset
        </Button>
      ) : null}
    </form>
  );
}
