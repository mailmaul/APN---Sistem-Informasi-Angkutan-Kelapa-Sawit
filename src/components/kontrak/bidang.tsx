import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Pembungkus label + kontrol + pesan galat supaya tinggi baris form seragam. */
export function Bidang({
  label,
  galat,
  petunjuk,
  className,
  children,
}: {
  label: string;
  galat?: string;
  petunjuk?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {galat ? (
        <p className="text-xs text-bahaya">{galat}</p>
      ) : petunjuk ? (
        <p className="text-xs text-muted-foreground">{petunjuk}</p>
      ) : null}
    </div>
  );
}
