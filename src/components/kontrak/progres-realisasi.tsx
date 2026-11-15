import { formatTon } from "@/lib/perhitungan";
import { cn } from "@/lib/utils";

/**
 * Batang realisasi tonase kontrak.
 * `realisasiKg` = total netto bongkar seluruh rit berstatus SELESAI.
 */
export function ProgresRealisasi({
  realisasiKg,
  totalTonase,
  ringkas = false,
  className,
}: {
  realisasiKg: number;
  totalTonase: number;
  ringkas?: boolean;
  className?: string;
}) {
  const targetKg = Math.round(totalTonase * 1000);
  const persen = targetKg > 0 ? Math.min(100, (realisasiKg / targetKg) * 100) : 0;
  const sisaKg = Math.max(0, targetKg - realisasiKg);
  const lewatTarget = realisasiKg > targetKg;

  return (
    <div className={cn("space-y-1", className)}>
      {!ringkas && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="angka font-medium">{formatTon(realisasiKg)}</span>
          <span className="angka text-xs text-muted-foreground">
            dari {formatTon(targetKg)} · sisa {formatTon(sisaKg)}
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", lewatTarget ? "bg-peringatan" : "bg-primary")}
          style={{ width: `${Math.max(persen, realisasiKg > 0 ? 2 : 0)}%` }}
        />
      </div>
      <p className="angka text-xs text-muted-foreground">
        {persen.toFixed(1)}% terealisasi
        {lewatTarget ? " · melebihi tonase kontrak" : ""}
        {ringkas ? ` · sisa ${formatTon(sisaKg)}` : ""}
      </p>
    </div>
  );
}
