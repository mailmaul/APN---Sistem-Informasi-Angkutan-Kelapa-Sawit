"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type Konfirmasi = {
  judul: string;
  pesan: string;
  labelAksi: string;
  destruktif?: boolean;
  jalankan: () => Promise<boolean>;
};

/** Dialog tanya-dulu untuk aksi yang mengubah data (nonaktifkan/hapus/reset). */
export function KonfirmasiDialog({
  konfirmasi,
  onTutup,
  sibuk,
}: {
  konfirmasi: Konfirmasi | null;
  onTutup: () => void;
  sibuk: boolean;
}) {
  return (
    <Dialog open={konfirmasi !== null} onOpenChange={(buka) => !buka && onTutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{konfirmasi?.judul}</DialogTitle>
          <DialogDescription>{konfirmasi?.pesan}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onTutup} disabled={sibuk}>
            Batal
          </Button>
          <Button
            variant={konfirmasi?.destruktif ? "destructive" : "default"}
            disabled={sibuk}
            onClick={async () => {
              if (await konfirmasi?.jalankan()) onTutup();
            }}
          >
            {konfirmasi?.labelAksi}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
