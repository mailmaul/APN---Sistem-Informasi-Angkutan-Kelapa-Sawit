"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { apiJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function TombolKeluar() {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);

  async function keluar() {
    setSibuk(true);
    try {
      await apiJson("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Gagal keluar, coba lagi");
      setSibuk(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label="Keluar"
      disabled={sibuk}
      onClick={keluar}
      className="text-muted-foreground"
    >
      <LogOut className="size-5" />
    </Button>
  );
}
