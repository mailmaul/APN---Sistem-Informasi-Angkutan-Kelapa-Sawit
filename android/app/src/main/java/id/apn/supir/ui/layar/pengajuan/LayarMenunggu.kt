package id.apn.supir.ui.layar.pengajuan

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EventBusy
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.ThumbDown
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.apn.supir.domain.StatusPengajuan
import id.apn.supir.ui.komponen.BarisData
import id.apn.supir.ui.komponen.KartuApn
import id.apn.supir.ui.komponen.LayarKosong
import id.apn.supir.ui.komponen.Memuat
import id.apn.supir.ui.komponen.PesanGalat
import id.apn.supir.ui.komponen.TautanTeks
import id.apn.supir.ui.komponen.TombolAksiBawah
import id.apn.supir.ui.komponen.TombolUtama

@Composable
fun LayarMenunggu(
    onDisetujui: (String) -> Unit,
    onKembali: () -> Unit,
    vm: VmMenunggu = hiltViewModel(),
) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()
    val pengajuan = keadaan.pengajuan

    LaunchedEffect(pengajuan?.status, pengajuan?.ritId) {
        if (pengajuan?.status == StatusPengajuan.DISETUJUI && pengajuan.ritId != null) {
            onDisetujui(pengajuan.ritId)
        }
    }

    Scaffold(
        bottomBar = {
            TombolAksiBawah {
                keadaan.galat?.let { PesanGalat(it, offline = keadaan.offline) }
                when (pengajuan?.status) {
                    StatusPengajuan.DITOLAK, StatusPengajuan.KEDALUWARSA ->
                        TombolUtama(teks = "Kembali ke Daftar PO", onKlik = onKembali)

                    else -> {
                        TombolUtama(
                            teks = "Periksa Sekarang",
                            keterangan = "Layar ini juga memeriksa sendiri tiap 10 detik",
                            onKlik = vm::periksaSekarang,
                        )
                        TautanTeks(
                            teks = "Batalkan pemantauan",
                            modifier = Modifier.align(Alignment.CenterHorizontally),
                        ) {
                            vm.batalkanPantauan()
                            onKembali()
                        }
                    }
                }
            }
        },
    ) { isi ->
        if (keadaan.sedangMuat && pengajuan == null) {
            Memuat(Modifier.padding(isi))
            return@Scaffold
        }

        Column(modifier = Modifier.padding(isi).fillMaxSize()) {
            when (pengajuan?.status) {
                StatusPengajuan.DITOLAK -> {
                    LayarKosong(
                        ikon = Icons.Default.ThumbDown,
                        judul = "Pengajuan ditolak",
                        pesan = "Anda boleh memperbaiki data lalu mengajukan ulang pada PO yang sama.",
                        modifier = Modifier.weight(1f),
                    )
                    KartuApn(modifier = Modifier.padding(16.dp)) {
                        Text("Alasan kantor", style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(6.dp))
                        Text(
                            pengajuan.alasanTolak ?: "Tidak ada catatan dari kantor.",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }

                StatusPengajuan.KEDALUWARSA -> LayarKosong(
                    ikon = Icons.Default.EventBusy,
                    judul = "Pengajuan kedaluwarsa",
                    pesan = "Kuota PO keburu penuh atau pengajuan tidak direspons dalam 1×24 jam. " +
                        "Pilih PO lain yang masih punya sisa kuota.",
                    modifier = Modifier.weight(1f),
                )

                else -> {
                    LayarKosong(
                        ikon = Icons.Default.HourglassTop,
                        judul = "Menunggu persetujuan kantor",
                        pesan = "Kantor memutuskan lewat Telegram atau web admin. Begitu disetujui, " +
                            "layar ini berpindah sendiri ke rit Anda. Pengajuan yang tidak direspons " +
                            "1×24 jam otomatis kedaluwarsa dan kuotanya dilepas.",
                        modifier = Modifier.weight(1f),
                    )
                    if (pengajuan != null) {
                        KartuApn(modifier = Modifier.padding(16.dp)) {
                            BarisData("No SPK", pengajuan.noSpk)
                            BarisData("Shipper", pengajuan.shipper)
                            BarisData("Truk", pengajuan.nopol)
                            BarisData("Menunggu", lamaMenunggu(pengajuan.dibuatPada))
                        }
                    }
                }
            }
        }
    }
}

private fun lamaMenunggu(sejak: Long): String {
    val menit = ((System.currentTimeMillis() - sejak) / 60_000L).coerceAtLeast(0)
    return when {
        menit < 1 -> "baru saja"
        menit < 60 -> "$menit menit"
        else -> "${menit / 60} jam ${menit % 60} menit"
    }
}
