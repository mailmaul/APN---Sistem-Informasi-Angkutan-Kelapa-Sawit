import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AlertTriangle, CircleDashed, CircleCheck } from "lucide-react";
import { AMBANG_ANTRIAN_JAM } from "@/lib/constants";
import { formatDurasi, lamaProsesMenit } from "@/lib/perhitungan";
import { cn } from "@/lib/utils";

export type Checkpoint = {
  kunci: "tibaMuat" | "selesaiMuat" | "tibaBongkar" | "selesaiBongkar";
  label: string;
  waktu: Date | null;
  lokasi?: string;
};

const AMBANG_MENIT = AMBANG_ANTRIAN_JAM * 60;

function Jeda({ label, menit }: { label: string; menit: number | null }) {
  if (menit === null) return null;
  const lama = menit > AMBANG_MENIT;
  return (
    <div className="ml-[7px] border-l border-dashed border-border py-1 pl-5">
      <span
        className={cn(
          "angka inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs",
          lama ? "bg-peringatan/10 font-medium text-peringatan" : "text-muted-foreground",
        )}
      >
        {lama && <AlertTriangle className="size-3" />}
        {label} {formatDurasi(menit)}
        {lama ? ` · lebih dari ${AMBANG_ANTRIAN_JAM} jam` : ""}
      </span>
    </div>
  );
}

/**
 * Linimasa 4 checkpoint rit. Lama antri dibaca dari selisih tiba→selesai di
 * tiap lokasi; di atas AMBANG_ANTRIAN_JAM ditandai kuning (SPEC §4).
 */
export function LinimasaRit({
  tibaMuat,
  selesaiMuat,
  tibaBongkar,
  selesaiBongkar,
  lokasiMuat,
  lokasiBongkar,
}: {
  tibaMuat: Date | null;
  selesaiMuat: Date | null;
  tibaBongkar: Date | null;
  selesaiBongkar: Date | null;
  lokasiMuat: string;
  lokasiBongkar: string;
}) {
  const titik: Checkpoint[] = [
    { kunci: "tibaMuat", label: "Tiba di lokasi muat", waktu: tibaMuat, lokasi: lokasiMuat },
    { kunci: "selesaiMuat", label: "Selesai muat", waktu: selesaiMuat, lokasi: lokasiMuat },
    { kunci: "tibaBongkar", label: "Tiba di lokasi bongkar", waktu: tibaBongkar, lokasi: lokasiBongkar },
    { kunci: "selesaiBongkar", label: "Selesai bongkar", waktu: selesaiBongkar, lokasi: lokasiBongkar },
  ];

  const antriMuat = lamaProsesMenit(tibaMuat, selesaiMuat);
  const perjalanan = lamaProsesMenit(selesaiMuat, tibaBongkar);
  const antriBongkar = lamaProsesMenit(tibaBongkar, selesaiBongkar);

  return (
    <div className="space-y-0.5">
      {titik.map((t, i) => (
        <div key={t.kunci}>
          <div className="flex items-start gap-2">
            {t.waktu ? (
              <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-sukses" />
            ) : (
              <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", !t.waktu && "text-muted-foreground")}>{t.label}</p>
              <p className="angka text-xs text-muted-foreground">
                {t.waktu
                  ? `${format(t.waktu, "d MMM yyyy HH:mm", { locale: localeId })}${t.lokasi ? ` · ${t.lokasi}` : ""}`
                  : "belum tercatat"}
              </p>
            </div>
          </div>
          {i === 0 && <Jeda label="Antri + muat" menit={antriMuat} />}
          {i === 1 && <Jeda label="Perjalanan" menit={perjalanan} />}
          {i === 2 && <Jeda label="Antri + bongkar" menit={antriBongkar} />}
        </div>
      ))}
    </div>
  );
}
