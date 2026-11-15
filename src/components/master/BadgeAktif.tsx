import { cn } from "@/lib/utils";

/** Penanda aktif/nonaktif untuk baris master data (bukan status rit). */
export function BadgeAktif({ aktif }: { aktif: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        aktif
          ? "border-sukses/25 bg-sukses/10 text-sukses"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  );
}
