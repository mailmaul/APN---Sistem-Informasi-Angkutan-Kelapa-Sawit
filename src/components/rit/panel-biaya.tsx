"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiJson } from "@/lib/api-client";
import { JENIS_BIAYA, JENIS_BIAYA_LABEL, type JenisBiaya } from "@/lib/constants";
import { formatRupiah } from "@/lib/perhitungan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BarisBiaya = {
  id: string;
  jenis: string;
  nominal: number;
  tanggal: Date;
  catatan: string | null;
};

export function PanelBiaya({
  ritId,
  biaya,
  terkunci,
}: {
  ritId: string;
  biaya: BarisBiaya[];
  terkunci: boolean;
}) {
  const router = useRouter();
  const [jenis, setJenis] = useState<JenisBiaya>("BBM");
  const [nominal, setNominal] = useState("");
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const total = biaya.reduce((t, b) => t + b.nominal, 0);

  const tambah = async () => {
    if (!nominal.trim()) {
      toast.error("Nominal biaya wajib diisi");
      return;
    }
    setSibuk(true);
    try {
      await apiJson(`/api/rit/${ritId}/biaya`, {
        method: "POST",
        body: { jenis, nominal, catatan },
      });
      setNominal("");
      setCatatan("");
      toast.success(`${JENIS_BIAYA_LABEL[jenis]} dicatat`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah biaya");
    } finally {
      setSibuk(false);
    }
  };

  const hapus = async (id: string) => {
    setSibuk(true);
    try {
      await apiJson(`/api/rit/${ritId}/biaya?biayaId=${id}`, { method: "DELETE" });
      toast.success("Biaya dihapus");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus biaya");
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="space-y-3">
      {biaya.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          Belum ada BBM atau uang makan yang dicatat. Biaya ini milik perusahaan dan tidak
          memotong ongkos supir.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {biaya.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm">{JENIS_BIAYA_LABEL[b.jenis as JenisBiaya] ?? b.jenis}</p>
                <p className="angka truncate text-xs text-muted-foreground">
                  {format(b.tanggal, "d MMM yyyy", { locale: localeId })}
                  {b.catatan ? ` · ${b.catatan}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="angka text-sm font-medium">{formatRupiah(b.nominal)}</span>
                {!terkunci && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Hapus biaya"
                    disabled={sibuk}
                    onClick={() => hapus(b.id)}
                  >
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="text-xs text-muted-foreground">Total biaya</span>
        <span className="angka text-sm font-semibold">{formatRupiah(total)}</span>
      </div>

      {!terkunci && (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
          <Select
            items={JENIS_BIAYA_LABEL}
            value={jenis}
            onValueChange={(v) => setJenis((v as JenisBiaya) ?? "BBM")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JENIS_BIAYA.map((j) => (
                <SelectItem key={j} value={j}>
                  {JENIS_BIAYA_LABEL[j]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
            type="number"
            min="0"
            step="1"
            placeholder="Nominal (Rp)"
            className="angka"
          />
          <Input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan (opsional)"
            className="sm:col-span-2"
          />
          <Button onClick={tambah} disabled={sibuk} className="sm:col-span-2">
            <Plus data-icon="inline-start" />
            Tambah biaya
          </Button>
        </div>
      )}
    </div>
  );
}
