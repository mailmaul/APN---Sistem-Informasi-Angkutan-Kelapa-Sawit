"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormKontrak, type KontrakAwal, type OpsiLokasi, type OpsiPilihan } from "./form-kontrak";

export function AksiKontrak({
  kontrak,
  shipper,
  lokasi,
  jumlahRit,
}: {
  kontrak: KontrakAwal;
  shipper: OpsiPilihan[];
  lokasi: OpsiLokasi[];
  jumlahRit: number;
}) {
  const router = useRouter();
  const [bukaUbah, setBukaUbah] = useState(false);
  const [bukaHapus, setBukaHapus] = useState(false);
  const [menghapus, setMenghapus] = useState(false);

  const hapus = async () => {
    setMenghapus(true);
    try {
      await apiJson(`/api/kontrak/${kontrak.id}`, { method: "DELETE" });
      toast.success(`Kontrak ${kontrak.noSpk} dihapus`);
      router.push("/kontrak");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus kontrak");
      setMenghapus(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={bukaUbah} onOpenChange={setBukaUbah}>
        <DialogTrigger render={<Button variant="outline" size="lg" />}>
          <Pencil data-icon="inline-start" />
          Ubah
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ubah kontrak {kontrak.noSpk}</DialogTitle>
            <DialogDescription>
              Perubahan tarif hanya berlaku untuk DO yang terbit setelah ini. {jumlahRit} DO yang
              sudah ada tetap memakai tarif lamanya.
            </DialogDescription>
          </DialogHeader>
          <FormKontrak
            kontrak={kontrak}
            shipper={shipper}
            lokasi={lokasi}
            onSelesai={() => setBukaUbah(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={bukaHapus} onOpenChange={setBukaHapus}>
        <DialogTrigger render={<Button variant="destructive" size="lg" disabled={jumlahRit > 0} />}>
          <Trash2 data-icon="inline-start" />
          Hapus
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus kontrak {kontrak.noSpk}?</DialogTitle>
            <DialogDescription>
              Kontrak ini belum punya DO sama sekali, jadi aman dihapus. Tindakan ini tidak bisa
              dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBukaHapus(false)} disabled={menghapus}>
              Batal
            </Button>
            <Button variant="destructive" onClick={hapus} disabled={menghapus}>
              {menghapus ? "Menghapus…" : "Ya, hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
