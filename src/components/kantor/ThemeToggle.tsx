"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Tema disimpan next-themes (ThemeProvider ada di root layout). Ikon baru
// dirender setelah mount supaya markup server & klien tidak berbeda.

const PILIHAN = [
  { nilai: "light", label: "Terang", ikon: Sun },
  { nilai: "dark", label: "Gelap", ikon: Moon },
  { nilai: "system", label: "Ikuti sistem", ikon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [siap, setSiap] = useState(false);

  useEffect(() => setSiap(true), []);

  const gelap = siap && resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Ubah tema" />}
      >
        {gelap ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        {PILIHAN.map((p) => {
          const Ikon = p.ikon;
          return (
            <DropdownMenuItem
              key={p.nilai}
              onClick={() => setTheme(p.nilai)}
              className={siap && theme === p.nilai ? "bg-accent text-accent-foreground" : undefined}
            >
              <Ikon className="size-4" />
              {p.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
