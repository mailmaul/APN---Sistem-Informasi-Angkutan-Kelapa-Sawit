import Link from "next/link";
import { Bell, ChevronLeft, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Panduan pasang PWA. Wajib bergambar: supir memasangnya sendiri di lapangan,
// sering tanpa pendampingan, dan istilah "PWA" tidak berarti apa-apa baginya.

export const metadata = { title: "Panduan Pasang — APN Supir" };

export default function HalamanPanduan() {
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
        render={<Link href="/supir" />}
      >
        <ChevronLeft className="size-4" />
        Tugas sekarang
      </Button>

      <header className="space-y-2">
        <h1 className="text-xl font-semibold">Pasang APN di Layar Utama</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Setelah dipasang, aplikasi dibuka seperti aplikasi biasa — tanpa mengetik alamat, layar
          penuh, dan pemberitahuan tugas baru bisa masuk.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-lg border border-peringatan/30 bg-peringatan/5 p-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-peringatan" />
        <p className="text-sm leading-relaxed">
          <strong className="font-semibold">Pengguna iPhone wajib memasang dulu.</strong> Di iPhone,
          pemberitahuan hanya bisa masuk kalau APN sudah ada di layar utama. Dibuka lewat Safari
          saja, pemberitahuan tidak akan pernah muncul.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Android (Chrome)</h2>
        <GambarAndroid />
        <Langkah
          nomor={1}
          judul="Buka APN di Chrome"
          isi="Pastikan alamatnya mauldev.my.id/apn dan Anda sudah masuk dengan nomor HP sendiri."
        />
        <Langkah
          nomor={2}
          judul="Ketuk tombol titik tiga di pojok kanan atas"
          isi="Menu Chrome akan terbuka dari atas layar."
        />
        <Langkah
          nomor={3}
          judul={'Pilih "Tambahkan ke Layar utama"'}
          isi='Pada sebagian HP tertulis "Instal aplikasi". Keduanya sama saja.'
        />
        <Langkah
          nomor={4}
          judul='Ketuk "Tambahkan" / "Instal"'
          isi="Ikon truk APN muncul di layar utama. Buka aplikasi dari ikon itu seterusnya."
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">iPhone (Safari)</h2>
        <GambarIos />
        <Langkah
          nomor={1}
          judul="Buka APN di Safari"
          isi="Harus Safari — Chrome di iPhone tidak bisa memasang aplikasi ke layar utama."
        />
        <Langkah
          nomor={2}
          judul="Ketuk ikon Bagikan di bawah layar"
          isi="Ikon kotak dengan panah ke atas, biasanya di tengah bawah."
        />
        <Langkah
          nomor={3}
          judul={'Gulir, lalu pilih "Tambah ke Layar Utama"'}
          isi='Dalam bahasa Inggris tertulis "Add to Home Screen".'
        />
        <Langkah
          nomor={4}
          judul={'Ketuk "Tambah"'}
          isi="Tutup Safari, lalu buka APN dari ikon barunya di layar utama."
        />
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Bell className="size-4 text-primary" />
          Terakhir: nyalakan pemberitahuan
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Buka APN dari ikon di layar utama, lalu ketuk{" "}
          <strong className="font-medium text-foreground">Nyalakan Pemberitahuan</strong> saat
          ditawarkan dan pilih <strong className="font-medium text-foreground">Izinkan</strong>.
          Setelah itu tugas baru, pengingat slip, dan kabar dari kantor langsung masuk ke HP.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Izinkan juga akses <strong className="font-medium text-foreground">Lokasi</strong> supaya
          perjalanan terekam otomatis dan kantor tidak perlu menelepon menanyakan posisi.
        </p>
        <Button className="h-13 w-full rounded-[10px] text-base" render={<Link href="/supir" />}>
          Kembali ke Tugas
        </Button>
      </section>
    </div>
  );
}

function Langkah({ nomor, judul, isi }: { nomor: number; judul: string; isi: string }) {
  return (
    <div className="flex gap-3">
      <span className="angka flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {nomor}
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{judul}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{isi}</p>
      </div>
    </div>
  );
}

/** Rangka ponsel untuk kedua ilustrasi. */
function Ponsel({ children, keterangan }: { children: React.ReactNode; keterangan: string }) {
  return (
    <figure className="space-y-2">
      <div className="flex justify-center rounded-lg border bg-muted/30 py-4">
        <svg
          viewBox="0 0 160 300"
          className="h-56 w-auto"
          role="img"
          aria-label={keterangan}
          fill="none"
        >
          <rect
            x="4"
            y="4"
            width="152"
            height="292"
            rx="20"
            className="fill-background stroke-border"
            strokeWidth="2"
          />
          <rect x="58" y="12" width="44" height="6" rx="3" className="fill-border" />
          {children}
        </svg>
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">{keterangan}</figcaption>
    </figure>
  );
}

function GambarAndroid() {
  return (
    <Ponsel keterangan="Chrome: ketuk titik tiga di kanan atas, lalu Tambahkan ke Layar utama">
      {/* Bilah alamat Chrome */}
      <rect x="16" y="28" width="100" height="18" rx="9" className="fill-muted" />
      <text x="26" y="41" className="fill-muted-foreground" fontSize="9">
        mauldev.my.id/apn
      </text>
      {/* Tombol titik tiga yang harus diketuk */}
      <circle cx="134" cy="37" r="14" className="fill-primary/15" />
      <circle cx="134" cy="31" r="2" className="fill-primary" />
      <circle cx="134" cy="37" r="2" className="fill-primary" />
      <circle cx="134" cy="43" r="2" className="fill-primary" />
      {/* Menu yang terbuka */}
      <rect
        x="56"
        y="56"
        width="92"
        height="86"
        rx="8"
        className="fill-card stroke-border"
        strokeWidth="1.5"
      />
      <rect x="66" y="68" width="60" height="5" rx="2.5" className="fill-border" />
      <rect x="66" y="84" width="70" height="5" rx="2.5" className="fill-border" />
      <rect x="60" y="96" width="84" height="20" rx="6" className="fill-primary/15" />
      <text x="66" y="109" className="fill-primary" fontSize="8" fontWeight="600">
        Tambahkan ke Layar
      </text>
      <rect x="66" y="126" width="54" height="5" rx="2.5" className="fill-border" />
      {/* Isi halaman */}
      <rect x="16" y="156" width="128" height="40" rx="8" className="fill-muted" />
      <rect x="16" y="206" width="128" height="26" rx="8" className="fill-primary/25" />
    </Ponsel>
  );
}

function GambarIos() {
  return (
    <Ponsel keterangan="Safari: ketuk ikon Bagikan di bawah, lalu Tambah ke Layar Utama">
      {/* Isi halaman */}
      <rect x="16" y="36" width="128" height="40" rx="8" className="fill-muted" />
      <rect x="16" y="86" width="128" height="26" rx="8" className="fill-primary/25" />
      {/* Lembar bagikan */}
      <rect
        x="12"
        y="128"
        width="136"
        height="110"
        rx="10"
        className="fill-card stroke-border"
        strokeWidth="1.5"
      />
      <rect x="66" y="136" width="28" height="4" rx="2" className="fill-border" />
      <rect x="22" y="150" width="60" height="5" rx="2.5" className="fill-border" />
      <rect x="18" y="166" width="124" height="22" rx="6" className="fill-primary/15" />
      <text x="26" y="180" className="fill-primary" fontSize="8" fontWeight="600">
        Tambah ke Layar Utama
      </text>
      <rect x="22" y="198" width="80" height="5" rx="2.5" className="fill-border" />
      <rect x="22" y="214" width="66" height="5" rx="2.5" className="fill-border" />
      {/* Bilah bawah Safari + ikon bagikan yang harus diketuk */}
      <rect x="12" y="250" width="136" height="34" rx="10" className="fill-muted" />
      <circle cx="80" cy="267" r="14" className="fill-primary/15" />
      <path
        d="M80 260v12"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M75 265l5-5 5 5"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M72 268v6h16v-6"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Ponsel>
  );
}
