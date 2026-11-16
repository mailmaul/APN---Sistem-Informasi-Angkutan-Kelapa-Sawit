package id.apn.supir.ui.layar.pengajuan

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.apn.supir.domain.PoAktif
import id.apn.supir.ui.komponen.BilahAtas
import id.apn.supir.ui.komponen.BarisData
import id.apn.supir.ui.komponen.ChipStatus
import id.apn.supir.ui.komponen.ChipTeks
import id.apn.supir.ui.komponen.KartuApn
import id.apn.supir.ui.komponen.LayarKosong
import id.apn.supir.ui.komponen.Memuat
import id.apn.supir.ui.komponen.PesanGalat
import id.apn.supir.ui.komponen.TombolSekunder
import id.apn.supir.ui.komponen.TombolUtama
import id.apn.supir.ui.tema.ApnHijau
import id.apn.supir.ui.tema.ApnKuning
import id.apn.supir.ui.tema.ApnMerah

@Composable
fun LayarBeranda(
    onBuatDo: (String) -> Unit,
    onRitBerjalan: () -> Unit,
    onRiwayat: () -> Unit,
    onPengaturan: () -> Unit,
    vm: VmBeranda = hiltViewModel(),
) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            BilahAtas(judul = vm.namaSupir) {
                IconButton(onClick = onRiwayat) {
                    Icon(Icons.Default.History, contentDescription = "Riwayat rit")
                }
                IconButton(onClick = onPengaturan) {
                    Icon(Icons.Default.Settings, contentDescription = "Pengaturan")
                }
            }
        },
    ) { isi ->
        when {
            keadaan.sedangMuat && keadaan.po.isEmpty() -> Memuat(Modifier.padding(isi))

            keadaan.po.isEmpty() && keadaan.ritAktif == null -> LayarKosong(
                ikon = Icons.Default.Inbox,
                judul = "Belum ada PO yang dibuka",
                pesan = keadaan.galat ?: "Kantor belum membuka kuota angkutan hari ini. " +
                    "Coba muat ulang sebentar lagi.",
                aksi = "Muat Ulang",
                onAksi = vm::muat,
                modifier = Modifier.padding(isi),
            )

            else -> LazyColumn(
                modifier = Modifier
                    .padding(isi)
                    .fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                keadaan.galat?.let { pesan ->
                    item { PesanGalat(pesan, offline = keadaan.offline) }
                }

                keadaan.ritAktif?.let { rit ->
                    item {
                        KartuApn {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.LocalShipping, contentDescription = null)
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "  Rit sedang berjalan",
                                    style = MaterialTheme.typography.titleMedium,
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            Text(rit.noDo, style = MaterialTheme.typography.headlineSmall)
                            Spacer(Modifier.height(8.dp))
                            ChipStatus(rit.status)
                            Spacer(Modifier.height(12.dp))
                            BarisData("Truk", rit.nopol)
                            BarisData("Tujuan", rit.lokasiBongkar)
                            Spacer(Modifier.height(12.dp))
                            TombolUtama(teks = "Buka Rit", onKlik = onRitBerjalan)
                        }
                    }
                }

                item {
                    Text(
                        "PO yang sedang dibuka",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }

                items(keadaan.po, key = { it.id }) { po ->
                    KartuPo(
                        po = po,
                        alasanMati = keadaan.alasanTidakBolehAjukan(po),
                        onAjukan = { onBuatDo(po.id) },
                    )
                }

                item {
                    TombolSekunder(teks = "Muat Ulang", onKlik = vm::muat)
                }
            }
        }
    }
}

@Composable
private fun KartuPo(po: PoAktif, alasanMati: String?, onAjukan: () -> Unit) {
    KartuApn {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(po.noSpk, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    po.shipper,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            // Chip kuota tampil sebelum tombol: supir tahu peluangnya sebelum
            // repot membuka form.
            ChipTeks(
                teks = if (po.penuh) "Kuota penuh" else "Sisa ${po.sisaKuota} unit",
                warna = when {
                    po.penuh -> ApnMerah
                    po.sisaKuota <= 2 -> ApnKuning
                    else -> ApnHijau
                },
            )
        }

        Spacer(Modifier.height(10.dp))
        BarisData("Barang", po.jenisBarang.label)
        BarisData("Muat", po.lokasiAsal)
        BarisData("Bongkar", po.lokasiTujuan)
        po.periodeSelesai?.let { BarisData("Berlaku sampai", it) }

        Spacer(Modifier.height(12.dp))
        TombolUtama(
            teks = "Ajukan DO",
            aktif = alasanMati == null,
            keterangan = alasanMati,
            onKlik = onAjukan,
        )
    }
}
