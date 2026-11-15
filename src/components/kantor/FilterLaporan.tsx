"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEMUA, type ParamLaporan, type PilihanLaporan } from "@/lib/laporan-tipe";

// Filter laporan disimpan di URL supaya hasil saringan bisa dibagikan,
// di-bookmark, dan di-refresh tanpa kehilangan konteks.

function kunci(d: Date): string {
  const b = `${d.getMonth() + 1}`.padStart(2, "0");
  const h = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${b}-${h}`;
}

export function FilterLaporan({
  pilihan,
  awal,
}: {
  pilihan: PilihanLaporan;
  awal: Required<ParamLaporan>;
}) {
  const router = useRouter();
  const [dari, setDari] = useState(awal.dari);
  const [sampai, setSampai] = useState(awal.sampai);
  const [kontrak, setKontrak] = useState(awal.kontrak);
  const [supir, setSupir] = useState(awal.supir);
  const [truk, setTruk] = useState(awal.truk);

  function buka(p: ParamLaporan) {
    const q = new URLSearchParams({
      dari: p.dari ?? dari,
      sampai: p.sampai ?? sampai,
      kontrak: p.kontrak ?? kontrak,
      supir: p.supir ?? supir,
      truk: p.truk ?? truk,
    });
    router.push(`/laporan?${q.toString()}`);
  }

  function pakaiRentang(mundurBulan: number) {
    const kini = new Date();
    const awalBulan = new Date(kini.getFullYear(), kini.getMonth() - mundurBulan, 1);
    const akhir =
      mundurBulan === 0 ? kini : new Date(kini.getFullYear(), kini.getMonth(), 0);
    setDari(kunci(awalBulan));
    setSampai(kunci(akhir));
    buka({ dari: kunci(awalBulan), sampai: kunci(akhir) });
  }

  function aturUlang() {
    const kini = new Date();
    const awalBulan = kunci(new Date(kini.getFullYear(), kini.getMonth(), 1));
    setDari(awalBulan);
    setSampai(kunci(kini));
    setKontrak(SEMUA);
    setSupir(SEMUA);
    setTruk(SEMUA);
    buka({
      dari: awalBulan,
      sampai: kunci(kini),
      kontrak: SEMUA,
      supir: SEMUA,
      truk: SEMUA,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dari" className="text-xs text-muted-foreground">
            Dari tanggal
          </Label>
          <Input
            id="dari"
            type="date"
            value={dari}
            max={sampai}
            onChange={(e) => setDari(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sampai" className="text-xs text-muted-foreground">
            Sampai tanggal
          </Label>
          <Input
            id="sampai"
            type="date"
            value={sampai}
            min={dari}
            onChange={(e) => setSampai(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Kontrak</Label>
          <Select value={kontrak} onValueChange={(v) => setKontrak(String(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua kontrak" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua kontrak</SelectItem>
              {pilihan.kontrak.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Supir</Label>
          <Select value={supir} onValueChange={(v) => setSupir(String(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua supir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua supir</SelectItem>
              {pilihan.supir.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Truk</Label>
          <Select value={truk} onValueChange={(v) => setTruk(String(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua truk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua truk</SelectItem>
              {pilihan.truk.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => buka({})}>
          <Filter className="size-4" />
          Terapkan
        </Button>
        <Button variant="outline" onClick={() => pakaiRentang(0)}>
          Bulan ini
        </Button>
        <Button variant="outline" onClick={() => pakaiRentang(1)}>
          Bulan lalu
        </Button>
        <Button variant="ghost" onClick={aturUlang} className="ml-auto">
          <RotateCcw className="size-4" />
          Atur ulang
        </Button>
      </div>
    </div>
  );
}
