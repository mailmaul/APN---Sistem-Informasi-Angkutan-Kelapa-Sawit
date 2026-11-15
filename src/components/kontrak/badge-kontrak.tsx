import { STATUS_KONTRAK_LABEL, type StatusKontrak } from "@/lib/constants";
import { cn } from "@/lib/utils";

const KELAS: Record<StatusKontrak, string> = {
  AKTIF: "bg-sukses/10 text-sukses border-sukses/25",
  SELESAI: "bg-muted text-muted-foreground border-border",
  DIBATALKAN: "bg-bahaya/10 text-bahaya border-bahaya/25",
};

export function BadgeKontrak({ status, className }: { status: StatusKontrak; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        KELAS[status],
        status === "DIBATALKAN" && "line-through",
        className,
      )}
    >
      {STATUS_KONTRAK_LABEL[status]}
    </span>
  );
}
