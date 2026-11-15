"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiJson } from "@/lib/api-client";
import { STATUS_KLAIM, STATUS_KLAIM_LABEL, type StatusKlaim } from "@/lib/constants";
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

export type KlaimRit = {
  nominal: number;
  status: string;
  tanggal: Date;
  catatan: string | null;
};

export function PanelKlaim({
  ritId,
  klaim,
  nilaiSelisihUsulan,
  terkunci,
}: {
  ritId: string;
  klaim: KlaimRit | null;
  /** Nilai selisih rit, dipakai sebagai usulan nominal klaim. */
  nilaiSelisihUsulan: number | null;
  terkunci: boolean;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [nominal, setNominal] = useState(
    klaim ? String(klaim.nominal) : nilaiSelisihUsulan ? String(nilaiSelisihUsulan) : "",
  );
  const [status, setStatus] = useState<StatusKlaim>((klaim?.status as StatusKlaim) ?? "DIAJUKAN");
  const [catatan, setCatatan] = useState(klaim?.catatan ?? "");
  const [sibuk, setSibuk] = useState(false);

  const simpan = async () => {
    if (!nominal.trim()) {
      toast.error("Nominal klaim wajib diisi");
      return;
    }
    setSibuk(true);
    try {
      await apiJson(`/api/rit/${ritId}/klaim`, {
        method: "POST",
        body: { nominal, status, catatan },
      });
      toast.success("Klaim shipper tersimpan");
      setBuka(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan klaim");
    } finally {
      setSibuk(false);
    }
  };

  const hapus = async () => {
    setSibuk(true);
    try {
      await apiJson(`/api/rit/${ritId}/klaim`, { method: "DELETE" });
      toast.success("Klaim dihapus");
      setBuka(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus klaim");
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="space-y-3">
      {klaim ? (
        <div className="rounded-md border border-border px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="angka text-sm font-semibold text-bahaya">
              {formatRupiah(klaim.nominal)}
            </span>
            <span className="text-xs text-muted-foreground">
              {STATUS_KLAIM_LABEL[klaim.status as StatusKlaim] ?? klaim.status}
            </span>
          </div>
          <p className="angka text-xs text-muted-foreground">
            {format(klaim.tanggal, "d MMM yyyy", { locale: localeId })}
            {klaim.catatan ? ` · ${klaim.catatan}` : ""}
          </p>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          Belum ada klaim dari shipper atas rit ini.
          {nilaiSelisihUsulan
            ? ` Nilai selisih tercatat ${formatRupiah(nilaiSelisihUsulan)} dan bisa dipakai sebagai dasar klaim.`
            : ""}
        </p>
      )}

      {!terkunci &&
        (buka ? (
          <div className="grid gap-2">
            <Input
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              type="number"
              min="0"
              step="1"
              placeholder="Nominal klaim (Rp)"
              className="angka"
            />
            <Select
              items={STATUS_KLAIM_LABEL}
              value={status}
              onValueChange={(v) => setStatus((v as StatusKlaim) ?? "DIAJUKAN")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_KLAIM.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_KLAIM_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan (opsional)"
            />
            <div className="flex items-center gap-2">
              <Button onClick={simpan} disabled={sibuk}>
                {sibuk ? "Menyimpan…" : "Simpan klaim"}
              </Button>
              <Button variant="ghost" onClick={() => setBuka(false)} disabled={sibuk}>
                Batal
              </Button>
              {klaim && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hapus klaim"
                  className="ml-auto"
                  onClick={hapus}
                  disabled={sibuk}
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setBuka(true)}>
            {klaim ? "Ubah klaim" : "Catat klaim shipper"}
          </Button>
        ))}
    </div>
  );
}
