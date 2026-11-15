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
import { STATUS_KONTRAK, STATUS_KONTRAK_LABEL } from "@/lib/constants";

const SEMUA = "SEMUA";

export function FilterKontrak() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status") ?? SEMUA;
  const q = params.get("q") ?? "";

  const terapkan = (kunci: string, nilai: string) => {
    const baru = new URLSearchParams(params.toString());
    if (nilai && nilai !== SEMUA) baru.set(kunci, nilai);
    else baru.delete(kunci);
    router.push(`/kontrak${baru.size ? `?${baru}` : ""}`);
  };

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
          defaultValue={q}
          placeholder="Cari nomor SPK…"
          className="h-8 w-56 pl-8"
        />
      </div>

      <Select
        items={{ [SEMUA]: "Semua status", ...STATUS_KONTRAK_LABEL }}
        value={status}
        onValueChange={(v) => terapkan("status", v ?? SEMUA)}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SEMUA}>Semua status</SelectItem>
          {STATUS_KONTRAK.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_KONTRAK_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="submit" variant="outline" size="default">
        Cari
      </Button>
      {q || status !== SEMUA ? (
        <Button type="button" variant="ghost" onClick={() => router.push("/kontrak")}>
          Reset
        </Button>
      ) : null}
    </form>
  );
}
