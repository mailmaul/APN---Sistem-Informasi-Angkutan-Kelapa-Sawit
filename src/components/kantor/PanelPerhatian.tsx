"use client";

import Link from "next/link";
import { CameraOff, ChevronRight, CircleAlert, Clock, Scale } from "lucide-react";
import { formatDurasi } from "@/lib/perhitungan";
import { AMBANG_ANTRIAN_JAM } from "@/lib/constants";
import type { PerhatianDasbor } from "@/lib/statistik";
import { AMBANG_SLIP_JAM } from "@/lib/ambang";
import { formatTanggalJam } from "./format";

// Daftar hal yang menahan uang atau menahan rit. Setiap baris mengarah ke
// halaman yang bisa menindaklanjutinya — panel ini bukan sekadar hitungan.

const MAKS_BARIS = 4;

function Baris({
  href,
  utama,
  kanan,
  bawah,
}: {
  href: string;
  utama: string;
  kanan: string;
  bawah?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{utama}</span>
        {bawah && <span className="block truncate text-xs text-muted-foreground">{bawah}</span>}
      </span>
      <span className="angka shrink-0 text-xs text-muted-foreground">{kanan}</span>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function Bagian({
  ikon: Ikon,
  warna,
  judul,
  jumlah,
  children,
}: {
  ikon: typeof Clock;
  warna: string;
  judul: string;
  jumlah: number;
  children?: React.ReactNode;
}) {
  if (jumlah === 0) return null;
  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center gap-2 px-2 pt-3 pb-1">
        <Ikon className={`size-4 shrink-0 ${warna}`} />
        <span className="flex-1 text-sm font-medium">{judul}</span>
        <span className={`angka text-sm font-semibold ${warna}`}>{jumlah}</span>
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}

export function PanelPerhatian({ data }: { data: PerhatianDasbor }) {
  const total =
    data.menungguInput + data.kendala.length + data.slipTertunda.length + data.antrian.length;

  if (total === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-10 text-center">
        <p className="text-sm font-medium">Semua beres</p>
        <p className="text-xs text-muted-foreground">
          Tidak ada rit yang tertahan, tanpa slip, atau mengantre lama.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Bagian
        ikon={Scale}
        warna="text-oranye"
        judul="Menunggu input timbangan"
        jumlah={data.menungguInput}
      >
        <Baris
          href="/rit?status=MENUNGGU_INPUT"
          utama="Buka daftar rit menunggu input"
          kanan={`${data.menungguInput} rit`}
          bawah="Angka timbang belum dimasukkan admin"
        />
      </Bagian>

      <Bagian
        ikon={CircleAlert}
        warna="text-bahaya"
        judul="Rit berkendala"
        jumlah={data.kendala.length}
      >
        {data.kendala.slice(0, MAKS_BARIS).map((k) => (
          <Baris
            key={k.ritId}
            href={`/rit/${k.ritId}`}
            utama={`${k.noDo} · ${k.nopol}`}
            kanan={formatTanggalJam(k.waktu)}
            bawah={k.catatan || k.supir}
          />
        ))}
        {data.kendala.length > MAKS_BARIS && (
          <Baris
            href="/rit?status=KENDALA"
            utama="Lihat semua rit berkendala"
            kanan={`${data.kendala.length} rit`}
          />
        )}
      </Bagian>

      <Bagian
        ikon={CameraOff}
        warna="text-peringatan"
        judul={`Slip bongkar belum masuk >${AMBANG_SLIP_JAM} jam`}
        jumlah={data.slipTertunda.length}
      >
        {data.slipTertunda.slice(0, MAKS_BARIS).map((s) => (
          <Baris
            key={s.ritId}
            href={`/rit/${s.ritId}`}
            utama={`${s.noDo} · ${s.nopol}`}
            kanan={formatDurasi(s.menitTertunda)}
            bawah={`${s.supir} · selesai bongkar ${formatTanggalJam(s.selesaiBongkar)}`}
          />
        ))}
        {data.slipTertunda.length > MAKS_BARIS && (
          <Baris
            href="/rit?status=SELESAI_BONGKAR"
            utama="Lihat semua rit tanpa slip"
            kanan={`${data.slipTertunda.length} rit`}
          />
        )}
      </Bagian>

      <Bagian
        ikon={Clock}
        warna="text-peringatan"
        judul={`Antrian lewat ${AMBANG_ANTRIAN_JAM} jam`}
        jumlah={data.antrian.length}
      >
        {data.antrian.slice(0, MAKS_BARIS).map((a) => (
          <Baris
            key={`${a.ritId}-${a.lokasi}`}
            href={`/rit/${a.ritId}`}
            utama={`${a.noDo} · ${a.nopol}`}
            kanan={formatDurasi(a.menit)}
            bawah={`${a.lokasi}${a.masihBerjalan ? " · masih berlangsung" : ""} · sejak ${formatTanggalJam(a.mulai)}`}
          />
        ))}
        {data.antrian.length > MAKS_BARIS && (
          <Baris href="/rit" utama="Lihat semua rit" kanan={`${data.antrian.length} antrian`} />
        )}
      </Bagian>
    </div>
  );
}
