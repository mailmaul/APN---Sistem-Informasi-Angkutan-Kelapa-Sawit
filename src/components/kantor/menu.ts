import {
  Building2,
  ChartColumn,
  FileText,
  LayoutDashboard,
  MapPin,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Peran } from "@/lib/constants";

// Satu daftar menu dipakai sidebar desktop, sheet mobile, dan judul header.
// Menambah halaman kantor = menambah satu baris di sini.

export type ItemMenu = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Kalau diisi, menu hanya tampil untuk peran tersebut. */
  hanyaPeran?: Peran[];
};

export type GrupMenu = {
  /** null = tanpa judul grup. */
  judul: string | null;
  item: ItemMenu[];
};

export const MENU_KANTOR: GrupMenu[] = [
  {
    judul: null,
    item: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/kontrak", label: "Kontrak", icon: FileText },
      { href: "/rit", label: "Rit / DO", icon: Truck },
      { href: "/settlement", label: "Settlement", icon: Wallet },
      { href: "/laporan", label: "Laporan", icon: ChartColumn },
    ],
  },
  {
    judul: "Master",
    item: [
      { href: "/master/shipper", label: "Shipper", icon: Building2 },
      { href: "/master/lokasi", label: "Lokasi", icon: MapPin },
      { href: "/master/truk", label: "Armada", icon: Truck },
      { href: "/master/pengguna", label: "Pengguna", icon: Users, hanyaPeran: ["OWNER"] },
    ],
  },
];

export function menuUntukPeran(peran: Peran): GrupMenu[] {
  return MENU_KANTOR.map((g) => ({
    judul: g.judul,
    item: g.item.filter((i) => !i.hanyaPeran || i.hanyaPeran.includes(peran)),
  })).filter((g) => g.item.length > 0);
}

/** Dashboard hanya aktif pada "/" persis; menu lain ikut sub-halamannya. */
export function menuAktif(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Judul khusus untuk sub-halaman yang bukan item menu. */
const JUDUL_TAMBAHAN: Record<string, string> = {
  "/kontrak/baru": "Kontrak Baru",
  "/rit/baru": "Terbitkan DO",
  "/master/truk/baru": "Armada Baru",
  "/master/pengguna/baru": "Pengguna Baru",
};

/**
 * Judul header dari path. Segmen id mentah (cuid) tidak pernah ditampilkan —
 * halaman detail memakai judul bagian induknya.
 */
export function judulHalaman(pathname: string): string {
  const tambahan = JUDUL_TAMBAHAN[pathname];
  if (tambahan) return tambahan;

  if (pathname.startsWith("/settlement/")) return "Rincian Settlement";

  let cocok: ItemMenu | null = null;
  for (const grup of MENU_KANTOR) {
    for (const item of grup.item) {
      if (!menuAktif(item.href, pathname)) continue;
      if (!cocok || item.href.length > cocok.href.length) cocok = item;
    }
  }
  return cocok?.label ?? "APN";
}
