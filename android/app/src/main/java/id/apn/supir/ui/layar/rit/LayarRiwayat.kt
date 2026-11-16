package id.apn.supir.ui.layar.rit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.apn.supir.domain.RincianPotongan
import id.apn.supir.domain.RitRiwayat
import id.apn.supir.ui.komponen.Angka
import id.apn.supir.ui.komponen.BarisData
import id.apn.supir.ui.komponen.BilahAtas
import id.apn.supir.ui.komponen.ChipStatus
import id.apn.supir.ui.komponen.KartuApn
import id.apn.supir.ui.komponen.LayarKosong
import id.apn.supir.ui.komponen.Memuat
import id.apn.supir.ui.komponen.PesanGalat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val formatTanggal = SimpleDateFormat("d MMM yyyy", Locale("id", "ID"))

@Composable
fun LayarRiwayat(onKembali: () -> Unit, vm: VmRiwayat = hiltViewModel()) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()

    Scaffold(topBar = { BilahAtas(judul = "Riwayat Rit", onKembali = onKembali) }) { isi ->
        when {
            keadaan.sedangMuat && keadaan.rit.isEmpty() -> Memuat(Modifier.padding(isi))

            keadaan.rit.isEmpty() -> LayarKosong(
                ikon = Icons.Default.ReceiptLong,
                judul = "Belum ada rit selesai",
                pesan = keadaan.galat ?: "Rit yang sudah selesai dan sudah diinput kantor muncul di sini, " +
                    "lengkap dengan rincian potongan bila ada.",
                aksi = "Muat Ulang",
                onAksi = vm::muat,
                modifier = Modifier.padding(isi),
            )

            else -> LazyColumn(
                modifier = Modifier.padding(isi).fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                keadaan.galat?.let { pesan -> item { PesanGalat(pesan, offline = keadaan.offline) } }
                items(keadaan.rit, key = { it.id }) { rit -> KartuRiwayat(rit) }
            }
        }
    }
}

@Composable
private fun KartuRiwayat(rit: RitRiwayat) {
    KartuApn {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(rit.noDo, style = MaterialTheme.typography.titleMedium)
                Text(
                    formatTanggal.format(Date(rit.tanggal)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            ChipStatus(rit.status)
        }

        Spacer(Modifier.height(10.dp))
        BarisData("Truk", rit.nopol)
        BarisData("Muat", rit.lokasiMuat)
        BarisData("Bongkar", rit.lokasiBongkar)
        rit.nettoMuatKg?.let { BarisData("Netto muat", "${kg(it)} kg") }
        rit.nettoBongkarKg?.let { BarisData("Netto bongkar", "${kg(it)} kg") }

        rit.potongan?.let { potongan ->
            Spacer(Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(Modifier.height(12.dp))
            RincianPotonganSupir(potongan)
        }
    }
}

/**
 * Satu-satunya tempat angka rupiah boleh tampil di aplikasi supir: SPEC.md v1.2
 * mewajibkan supir melihat dasar potongannya sendiri, bukan hanya bayaran yang
 * mengecil tanpa penjelasan. Tarif shipper, tagihan, dan margin tetap tidak
 * pernah dikirim ke perangkat.
 */
@Composable
private fun RincianPotonganSupir(potongan: RincianPotongan) {
    Text("Potongan susut", style = MaterialTheme.typography.titleSmall)
    Spacer(Modifier.height(4.dp))
    Text(
        "Susut di luar toleransi ditanggung pembawa kendaraan sesuai catatan di DO.",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    Spacer(Modifier.height(8.dp))

    BarisData("Selisih", "${kg(potongan.selisihKg)} kg")
    BarisData("Toleransi", "${kg(potongan.toleransiKg)} kg")
    BarisData("Kelebihan dihitung", "${kg(potongan.kelebihanKg)} kg")
    BarisData("Tarif", "${rupiah(potongan.tarifPerKg)} / kg")
    BarisData("Nilai potongan", rupiah(potongan.nilaiPotongan))
    if (potongan.pemaafan > 0) {
        BarisData("Dimaafkan", "− ${rupiah(potongan.pemaafan)}")
        potongan.alasanPemaafan?.let {
            Text(
                "Alasan: $it",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }

    Spacer(Modifier.height(8.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Potongan bersih", style = MaterialTheme.typography.titleSmall)
        Angka(rupiah(potongan.potonganBersih))
    }
}

private fun kg(nilai: Int): String = String.format(Locale("id", "ID"), "%,d", nilai).replace(',', '.')

private fun rupiah(nilai: Long): String =
    "Rp " + String.format(Locale("id", "ID"), "%,d", nilai).replace(',', '.')
