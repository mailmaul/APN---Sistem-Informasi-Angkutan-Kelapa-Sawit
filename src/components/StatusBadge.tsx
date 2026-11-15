import { STATUS_RIT_LABEL, STATUS_RIT_WARNA, type StatusRit } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Satu-satunya cara menampilkan status rit. Warna dikunci di constants supaya
// status yang sama tidak pernah tampil beda warna di layar yang berbeda.

const KELAS: Record<string, string> = {
  netral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/10 text-info border-info/25",
  accent: "bg-primary/10 text-primary border-primary/25",
  peringatan: "bg-peringatan/10 text-peringatan border-peringatan/25",
  oranye: "bg-oranye/10 text-oranye border-oranye/25",
  sukses: "bg-sukses/10 text-sukses border-sukses/25",
  bahaya: "bg-bahaya/10 text-bahaya border-bahaya/25",
};

export function StatusBadge({
  status,
  className,
}: {
  status: StatusRit;
  className?: string;
}) {
  const warna = STATUS_RIT_WARNA[status] ?? "netral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        KELAS[warna],
        status === "DIBATALKAN" && "line-through",
        className,
      )}
    >
      {STATUS_RIT_LABEL[status] ?? status}
    </span>
  );
}
