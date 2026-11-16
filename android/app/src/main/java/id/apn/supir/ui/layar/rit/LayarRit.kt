package id.apn.supir.ui.layar.rit

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocationOff
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.io.File
import id.apn.supir.domain.LANGKAH_SUPIR
import id.apn.supir.domain.RitAktif
import id.apn.supir.domain.STATUS_BOLEH_KENDALA
import id.apn.supir.domain.StatusRit
import id.apn.supir.domain.TRANSISI_SUDAH_DI_LOKASI
import id.apn.supir.domain.TitikGps
import id.apn.supir.domain.Transisi
import id.apn.supir.domain.legUntukStatus
import id.apn.supir.domain.transisiBerikutnya
import id.apn.supir.pelacakan.LayananPelacakan
import id.apn.supir.ui.kamera.LayarKamera
import id.apn.supir.ui.komponen.Angka
import id.apn.supir.ui.komponen.BarisData
import id.apn.supir.ui.komponen.BilahAtas
import id.apn.supir.ui.komponen.ChipStatus
import id.apn.supir.ui.komponen.ChipTeks
import id.apn.supir.ui.komponen.IndikatorLangkah
import id.apn.supir.ui.komponen.KartuApn
import id.apn.supir.ui.komponen.Memuat
import id.apn.supir.ui.komponen.PesanGalat
import id.apn.supir.ui.komponen.TombolAksiBawah
import id.apn.supir.ui.komponen.TombolSekunder
import id.apn.supir.ui.komponen.TombolUtama
import id.apn.supir.ui.tema.ApnHijau
import id.apn.supir.ui.tema.ApnKuning
import id.apn.supir.ui.tema.ApnRedupTerang
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val formatJam = SimpleDateFormat("EEE d MMM HH:mm", Locale("id", "ID"))

@Composable
fun LayarRit(
    onKendala: () -> Unit,
    onRiwayat: () -> Unit,
    onPengaturan: () -> Unit,
    onTidakAdaRit: () -> Unit,
    vm: VmRit = hiltViewModel(),
) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var izinLokasi = remember {
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
    }
    val pemintaIzin = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { hasil ->
        izinLokasi = hasil[Manifest.permission.ACCESS_FINE_LOCATION] == true
        vm.tandaiGps(izinLokasi)
    }

    LaunchedEffect(Unit) {
        val diminta = buildList {
            add(Manifest.permission.ACCESS_FINE_LOCATION)
            add(Manifest.permission.ACCESS_COARSE_LOCATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        if (!izinLokasi) pemintaIzin.launch(diminta.toTypedArray()) else vm.tandaiGps(true)
    }

    LaunchedEffect(keadaan.rit == null, keadaan.sedangMuat) {
        if (!keadaan.sedangMuat && keadaan.rit == null) onTidakAdaRit()
    }

    // Leg perjalanan menyalakan pelacakan; di luar leg service dimatikan supaya
    // baterai tidak habis saat truk antri berjam-jam.
    val rit = keadaan.rit
    LaunchedEffect(rit?.id, rit?.status, izinLokasi) {
        if (rit != null && izinLokasi && legUntukStatus(rit.status) != null) {
            LayananPelacakan.mulai(context, rit.id, "Rit ${rit.noDo}")
            vm.tandaiGps(true)
        } else {
            LayananPelacakan.hentikan(context)
            vm.tandaiGps(false)
        }
    }

    // DO yang sudah terunduh dibuka/dibagikan sebagai berkas lewat FileProvider.
    val doSiap = keadaan.doSiap
    LaunchedEffect(doSiap) {
        if (doSiap != null) {
            bukaBerkasDo(context, doSiap.berkas, doSiap.bagikan, rit?.noDo.orEmpty())
            vm.doSudahDipakai()
        }
    }

    val transisiFoto = keadaan.menungguFoto
    if (transisiFoto != null) {
        LayarKamera(
            judul = transisiFoto.aksi,
            petunjuk = petunjukFoto(transisiFoto),
            depan = false,
            onHasil = { path -> ambilLokasiLalu(context, izinLokasi) { vm.jalankan(transisiFoto, path, it) } },
            onBatal = vm::batalFoto,
        )
        return
    }

    if (keadaan.sedangMuat || rit == null) {
        Memuat()
        return
    }

    val lanjut = transisiBerikutnya(rit.status)

    Scaffold(
        topBar = {
            BilahAtas(judul = rit.noDo) {
                IconButton(onClick = onRiwayat) {
                    Icon(Icons.Default.History, contentDescription = "Riwayat rit")
                }
                IconButton(onClick = onPengaturan) {
                    Icon(Icons.Default.Settings, contentDescription = "Pengaturan")
                }
            }
        },
        bottomBar = {
            TombolAksiBawah {
                keadaan.pesan?.let { PesanGalat(it, offline = keadaan.pesanOffline) }

                if (lanjut != null) {
                    TombolUtama(
                        teks = lanjut.aksi,
                        sedangJalan = keadaan.sedangKirim,
                        aktif = rit.status !in keadaan.statusTertunda,
                        keterangan = when {
                            rit.status in keadaan.statusTertunda ->
                                "Langkah sebelumnya masih menunggu terkirim"

                            lanjut.wajibFoto != null -> petunjukFoto(lanjut)
                            else -> null
                        },
                    ) {
                        if (lanjut.wajibFoto != null) {
                            vm.mintaFoto(lanjut)
                        } else {
                            ambilLokasiLalu(context, izinLokasi) { vm.jalankan(lanjut, null, it) }
                        }
                    }
                }

                if (rit.status == StatusRit.DITUGASKAN) {
                    TombolSekunder(teks = TRANSISI_SUDAH_DI_LOKASI.aksi) {
                        ambilLokasiLalu(context, izinLokasi) {
                            vm.jalankan(TRANSISI_SUDAH_DI_LOKASI, null, it)
                        }
                    }
                }

                TombolSekunder(
                    teks = "Lapor Kendala",
                    ikon = Icons.Default.WarningAmber,
                    aktif = rit.status in STATUS_BOLEH_KENDALA,
                    onKlik = onKendala,
                )
            }
        },
    ) { isi ->
        Column(
            modifier = Modifier
                .padding(isi)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                ChipStatus(rit.status)
                ChipTeks(
                    teks = if (keadaan.gpsAktif) "GPS aktif" else "GPS mati",
                    warna = if (keadaan.gpsAktif) ApnHijau else ApnRedupTerang,
                    ikon = if (keadaan.gpsAktif) Icons.Default.MyLocation else Icons.Default.LocationOff,
                )
                if (keadaan.jumlahTertunda > 0) {
                    ChipTeks(teks = "Menunggu terkirim (${keadaan.jumlahTertunda})", warna = ApnKuning)
                }
            }

            Spacer(Modifier.height(16.dp))
            IndikatorLangkah(selesai = rit.langkahSelesai, total = LANGKAH_SUPIR.size)
            Spacer(Modifier.height(16.dp))

            if (!izinLokasi) {
                PesanGalat(
                    "Izin lokasi belum diberikan. Jejak perjalanan tidak terekam — " +
                        "buka Pengaturan untuk mengizinkan.",
                )
                Spacer(Modifier.height(12.dp))
            }

            KartuApn {
                Text("Muatan", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                BarisData("Truk", rit.nopol)
                BarisData("Barang", rit.jenisBarang.label)
                BarisData("Shipper", rit.shipper)
            }

            Spacer(Modifier.height(12.dp))
            KartuApn {
                Text("Rute", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                BarisData("Muat", rit.lokasiMuat)
                rit.alamatMuat?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.height(8.dp))
                BarisData("Bongkar", rit.lokasiBongkar)
                rit.alamatBongkar?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            if (rit.tibaMuat != null || rit.selesaiMuat != null ||
                rit.tibaBongkar != null || rit.selesaiBongkar != null
            ) {
                Spacer(Modifier.height(12.dp))
                KartuApn {
                    Text("Catatan waktu", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    BarisJam("Tiba muat", rit.tibaMuat)
                    BarisJam("Selesai muat", rit.selesaiMuat)
                    BarisJam("Tiba bongkar", rit.tibaBongkar)
                    BarisJam("Selesai bongkar", rit.selesaiBongkar)
                }
            }

            if (rit.doPdfUrl != null) {
                Spacer(Modifier.height(12.dp))
                TombolSekunder(
                    teks = if (keadaan.sedangUnduhDo) "Menyiapkan DO…" else "Buka DO (PDF)",
                    ikon = Icons.Default.PictureAsPdf,
                    aktif = !keadaan.sedangUnduhDo,
                ) { vm.siapkanDo(bagikan = false) }
                Spacer(Modifier.height(8.dp))
                TombolSekunder(
                    teks = "Bagikan DO",
                    ikon = Icons.Default.Share,
                    aktif = !keadaan.sedangUnduhDo,
                ) { vm.siapkanDo(bagikan = true) }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun BarisJam(label: String, waktu: Long?) {
    if (waktu == null) return
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Angka(formatJam.format(Date(waktu)))
    }
}

private fun petunjukFoto(transisi: Transisi): String = when (transisi.ke) {
    StatusRit.SELESAI_MUAT -> "Perlu foto tanda terima pabrik"
    StatusRit.SELESAI_BONGKAR -> "Perlu foto bukti bongkar di tujuan"
    else -> "Perlu foto bukti"
}

/**
 * Membuka atau membagikan DO sebagai berkas.
 *
 * Berkas dibungkus FileProvider dan diberi izin baca sementara: aplikasi tujuan
 * tidak punya sesi APN, jadi menyerahkan URL hanya menghasilkan "Belum login".
 */
private fun bukaBerkasDo(context: Context, berkas: File, bagikan: Boolean, noDo: String) {
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.berkas", berkas)
    val intent = if (bagikan) {
        Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, "DO $noDo")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    } else {
        Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    }

    val pemilih = Intent.createChooser(intent, if (bagikan) "Bagikan DO" else "Buka DO")
    runCatching { context.startActivity(pemilih) }.onFailure {
        // Tidak ada pembaca PDF terpasang — biarkan sistem yang memberi tahu.
        context.startActivity(Intent.createChooser(intent, "Buka DO"))
    }
}
