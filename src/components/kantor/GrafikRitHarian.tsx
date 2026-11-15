"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { BatangHarian } from "@/lib/statistik";

// Ritme bulan berjalan: berapa DO terbit dan berapa rit tuntas tiap hari.
// Hari tanpa aktivitas tetap muncul supaya pola kosong ikut terlihat.

const KONFIG = {
  diterbitkan: { label: "Diterbitkan", color: "var(--chart-1)" },
  selesai: { label: "Selesai", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function GrafikRitHarian({ data }: { data: BatangHarian[] }) {
  return (
    <ChartContainer config={KONFIG} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          interval="preserveStartEnd"
          minTickGap={4}
        />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={36} tickMargin={4} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={(v) => `Tanggal ${v}`} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="diterbitkan" fill="var(--color-diterbitkan)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="selesai" fill="var(--color-selesai)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
