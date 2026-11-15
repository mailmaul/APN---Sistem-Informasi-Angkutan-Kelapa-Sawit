"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, UserCog } from "lucide-react";
import { toast } from "sonner";
import { apiJson } from "@/lib/api-client";
import { STATUS_BOLEH_BATAL, type StatusRit } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bidang } from "./bidang";
import type { OpsiArmada } from "./form-terbit-do";

const KOSONG = "";

export function AksiRit({
  ritId,
  noDo,
  status,
  trukId,
  supirId,
  truk,
  supir,
}: {
  ritId: string;
  noDo: string;
  status: StatusRit;
  trukId: string | null;
  supirId: string | null;
  truk: OpsiArmada[];
  supir: OpsiArmada[];
}) {
  const router = useRouter();
  const [bukaAlokasi, setBukaAlokasi] = useState(false);
  const [bukaBatal, setBukaBatal] = useState(false);
  const [pilihTruk, setPilihTruk] = useState(trukId ?? KOSONG);
  const [pilihSupir, setPilihSupir] = useState(supirId ?? KOSONG);
  const [alasan, setAlasan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const bolehAlokasi = status === "DITERBITKAN" || status === "DITUGASKAN";
  const bolehBatal = STATUS_BOLEH_BATAL.includes(status);

  const simpanAlokasi = async () => {
    setSibuk(true);
    try {
      await apiJson(`/api/rit/${ritId}`, {
        method: "PATCH",
        body: { trukId: pilihTruk, supirId: pilihSupir },
      });
      toast.success(
        pilihTruk && pilihSupir ? "Alokasi tersimpan, supir diberi notifikasi" : "Alokasi tersimpan",
      );
      setBukaAlokasi(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan alokasi");
    } finally {
      setSibuk(false);
    }
  };

  const batalkan = async () => {
    setSibuk(true);
    try {
      await apiJson(`/api/rit/${ritId}/batal`, { method: "POST", body: { alasan } });
      toast.success(`DO ${noDo} dibatalkan`);
      setBukaBatal(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membatalkan DO");
    } finally {
      setSibuk(false);
    }
  };

  if (!bolehAlokasi && !bolehBatal) return null;

  return (
    <div className="flex items-center gap-2">
      {bolehAlokasi && (
        <Dialog open={bukaAlokasi} onOpenChange={setBukaAlokasi}>
          <DialogTrigger render={<Button variant="outline" size="lg" />}>
            <UserCog data-icon="inline-start" />
            Alokasi armada
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alokasi armada DO {noDo}</DialogTitle>
              <DialogDescription>
                Truk dan supir terisi sekaligus membuat rit berstatus Ditugaskan dan mengirim
                notifikasi ke supir.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <Bidang label="Truk">
                <Select
                  items={Object.fromEntries(truk.map((t) => [t.id, t.label]))}
                  value={pilihTruk || null}
                  onValueChange={(v) => setPilihTruk(v ?? KOSONG)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Belum dialokasikan" />
                  </SelectTrigger>
                  <SelectContent>
                    {truk.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Bidang>

              <Bidang label="Supir">
                <Select
                  items={Object.fromEntries(supir.map((s) => [s.id, s.label]))}
                  value={pilihSupir || null}
                  onValueChange={(v) => setPilihSupir(v ?? KOSONG)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Belum dialokasikan" />
                  </SelectTrigger>
                  <SelectContent>
                    {supir.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Bidang>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setBukaAlokasi(false)} disabled={sibuk}>
                Batal
              </Button>
              <Button onClick={simpanAlokasi} disabled={sibuk}>
                {sibuk ? "Menyimpan…" : "Simpan alokasi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {bolehBatal && (
        <Dialog open={bukaBatal} onOpenChange={setBukaBatal}>
          <DialogTrigger render={<Button variant="destructive" size="lg" />}>
            <Ban data-icon="inline-start" />
            Batalkan DO
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Batalkan DO {noDo}?</DialogTitle>
              <DialogDescription>
                Rit yang dibatalkan tidak masuk settlement supir dan tidak dihitung di laporan.
                Alasan wajib diisi dan tercatat di riwayat status.
              </DialogDescription>
            </DialogHeader>

            <Bidang label="Alasan pembatalan">
              <Textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                rows={3}
                placeholder="mis. shipper menunda pengiriman"
              />
            </Bidang>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setBukaBatal(false)} disabled={sibuk}>
                Jangan batalkan
              </Button>
              <Button variant="destructive" onClick={batalkan} disabled={sibuk || alasan.trim().length < 5}>
                {sibuk ? "Membatalkan…" : "Ya, batalkan DO"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/** Tanda terima slip fisik — dicentang admin saat kertas slipnya sampai kantor. */
export function TandaSlipFisik({
  ritId,
  diterima,
}: {
  ritId: string;
  diterima: boolean;
}) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);

  const ubah = async (nilai: boolean) => {
    setSibuk(true);
    try {
      await apiJson(`/api/rit/${ritId}`, {
        method: "PATCH",
        body: { slipFisikDiterima: nilai },
      });
      toast.success(nilai ? "Slip fisik ditandai diterima" : "Tanda slip fisik dibatalkan");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui slip fisik");
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="slip-fisik"
        checked={diterima}
        disabled={sibuk}
        onCheckedChange={(nilai) => ubah(nilai === true)}
      />
      <Label htmlFor="slip-fisik" className="text-xs text-muted-foreground">
        Slip fisik sudah diterima kantor
      </Label>
    </div>
  );
}
