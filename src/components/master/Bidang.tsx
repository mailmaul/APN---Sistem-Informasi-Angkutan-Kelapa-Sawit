"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Satu baris form: label, kolom isian, lalu pesan galat atau petunjuk. */
export function Bidang({
  label,
  htmlFor,
  galat,
  petunjuk,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  galat?: string;
  petunjuk?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {galat ? (
        <p className="text-xs text-bahaya">{galat}</p>
      ) : petunjuk ? (
        <p className="text-xs text-muted-foreground">{petunjuk}</p>
      ) : null}
    </div>
  );
}
