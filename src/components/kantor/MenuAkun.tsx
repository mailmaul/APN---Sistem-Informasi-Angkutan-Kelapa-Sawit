"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiJson } from "@/lib/api-client";
import { PERAN_LABEL, type Peran } from "@/lib/constants";

function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/).slice(0, 2);
  return bagian.map((b) => b[0]?.toUpperCase() ?? "").join("") || "?";
}

export function MenuAkun({ nama, peran }: { nama: string; peran: Peran }) {
  const router = useRouter();
  const [keluar, setKeluar] = useState(false);

  async function logout() {
    setKeluar(true);
    try {
      await apiJson("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      setKeluar(false);
      toast.error(e instanceof Error ? e.message : "Gagal keluar");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="h-9 gap-2 pr-1.5 pl-1.5" />}>
        <Avatar size="sm">
          <AvatarFallback className="text-[11px]">{inisial(nama)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-36 truncate text-sm sm:inline">{nama}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-52">
        <div className="px-1.5 py-1">
          <p className="truncate text-sm font-medium">{nama}</p>
          <p className="text-xs text-muted-foreground">{PERAN_LABEL[peran]}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={keluar} onClick={logout}>
          <LogOut className="size-4" />
          {keluar ? "Keluar…" : "Keluar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
