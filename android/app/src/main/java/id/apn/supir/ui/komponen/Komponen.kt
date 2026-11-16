package id.apn.supir.ui.komponen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.apn.supir.domain.StatusRit
import id.apn.supir.domain.WarnaStatus
import id.apn.supir.ui.tema.ApnBiru
import id.apn.supir.ui.tema.ApnHijau
import id.apn.supir.ui.tema.ApnKuning
import id.apn.supir.ui.tema.ApnMerah
import id.apn.supir.ui.tema.ApnTeal
import id.apn.supir.ui.tema.GayaAngka
import id.apn.supir.ui.tema.TinggiAksiMinimum
import id.apn.supir.ui.tema.TinggiAksiUtama

/**
 * Aksi utama satu layar: selebar layar, 56dp, di bawah. Label menyebut syarat
 * bila ada ("perlu foto tanda terima") supaya tidak ada ketukan yang berakhir
 * di penolakan.
 */
@Composable
fun TombolUtama(
    teks: String,
    modifier: Modifier = Modifier,
    aktif: Boolean = true,
    sedangJalan: Boolean = false,
    ikon: ImageVector? = null,
    keterangan: String? = null,
    onKlik: () -> Unit,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Button(
            onClick = onKlik,
            enabled = aktif && !sedangJalan,
            modifier = Modifier
                .fillMaxWidth()
                .height(TinggiAksiUtama),
            shape = MaterialTheme.shapes.large,
        ) {
            if (sedangJalan) {
                CircularProgressIndicator(
                    modifier = Modifier.size(22.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                Spacer(Modifier.width(12.dp))
            } else if (ikon != null) {
                Icon(ikon, contentDescription = null)
                Spacer(Modifier.width(12.dp))
            }
            Text(teks, style = MaterialTheme.typography.titleMedium)
        }
        if (keterangan != null) {
            Spacer(Modifier.height(6.dp))
            Text(
                keterangan,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/** Aksi sekunder: tetap 48dp agar bisa ditekan dengan tangan kotor. */
@Composable
fun TombolSekunder(
    teks: String,
    modifier: Modifier = Modifier,
    aktif: Boolean = true,
    ikon: ImageVector? = null,
    onKlik: () -> Unit,
) {
    OutlinedButton(
        onClick = onKlik,
        enabled = aktif,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = TinggiAksiMinimum),
        shape = MaterialTheme.shapes.large,
    ) {
        if (ikon != null) {
            Icon(ikon, contentDescription = null)
            Spacer(Modifier.width(8.dp))
        }
        Text(teks)
    }
}

private fun warnaDari(warna: WarnaStatus): Color = when (warna) {
    WarnaStatus.NETRAL -> Color(0xFF64748B)
    WarnaStatus.INFO -> ApnBiru
    WarnaStatus.AKSEN -> ApnTeal
    WarnaStatus.PERINGATAN -> ApnKuning
    WarnaStatus.ORANYE -> Color(0xFFEA580C)
    WarnaStatus.SUKSES -> ApnHijau
    WarnaStatus.BAHAYA -> ApnMerah
}

/** Status selalu chip berwarna, tidak pernah teks polos. */
@Composable
fun ChipStatus(status: StatusRit, modifier: Modifier = Modifier) {
    ChipTeks(teks = status.label, warna = warnaDari(status.warna), modifier = modifier)
}

@Composable
fun ChipTeks(
    teks: String,
    warna: Color,
    modifier: Modifier = Modifier,
    ikon: ImageVector? = null,
) {
    Surface(
        modifier = modifier,
        shape = CircleShape,
        color = warna.copy(alpha = 0.14f),
        border = BorderStroke(1.dp, warna.copy(alpha = 0.35f)),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
        ) {
            if (ikon != null) {
                Icon(ikon, contentDescription = null, tint = warna, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
            }
            Text(
                teks,
                color = warna,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
fun KartuApn(
    modifier: Modifier = Modifier,
    isi: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(16.dp), content = isi)
    }
}

/** Angka selalu tabular figures supaya kolom kg/jam tidak bergoyang. */
@Composable
fun Angka(teks: String, modifier: Modifier = Modifier) {
    Text(teks, style = GayaAngka, modifier = modifier)
}

@Composable
fun BarisData(label: String, nilai: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.width(12.dp))
        Text(
            nilai,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.End,
        )
    }
}

/**
 * Layar kosong tidak pernah polos: gambar, satu kalimat penjelas, dan jalan
 * keluar. Supir yang buntu di lapangan tidak punya siapa-siapa untuk bertanya.
 */
@Composable
fun LayarKosong(
    ikon: ImageVector,
    judul: String,
    pesan: String,
    modifier: Modifier = Modifier,
    aksi: String? = null,
    onAksi: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.size(96.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    ikon,
                    contentDescription = null,
                    modifier = Modifier.size(44.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(20.dp))
        Text(judul, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Text(
            pesan,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        if (aksi != null && onAksi != null) {
            Spacer(Modifier.height(24.dp))
            TombolUtama(teks = aksi, onKlik = onAksi)
        }
    }
}

/** Pesan galat dari server ditampilkan apa adanya — sudah ditulis untuk supir. */
@Composable
fun PesanGalat(pesan: String, modifier: Modifier = Modifier, offline: Boolean = false) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = if (offline) {
            MaterialTheme.colorScheme.surfaceVariant
        } else {
            MaterialTheme.colorScheme.error.copy(alpha = 0.12f)
        },
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                if (offline) Icons.Default.CloudOff else Icons.Default.ErrorOutline,
                contentDescription = null,
                tint = if (offline) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error,
            )
            Spacer(Modifier.width(10.dp))
            Text(
                pesan,
                style = MaterialTheme.typography.bodyMedium,
                color = if (offline) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error,
            )
        }
    }
}

@Composable
fun Memuat(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BilahAtas(
    judul: String,
    modifier: Modifier = Modifier,
    onKembali: (() -> Unit)? = null,
    aksi: @Composable () -> Unit = {},
) {
    TopAppBar(
        modifier = modifier,
        title = { Text(judul, style = MaterialTheme.typography.titleLarge) },
        navigationIcon = {
            if (onKembali != null) {
                IconButton(onClick = onKembali) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                }
            }
        },
        actions = { aksi() },
    )
}

/** Indikator "langkah N dari 6" — supir perlu tahu sisa pekerjaannya. */
@Composable
fun IndikatorLangkah(selesai: Int, total: Int, modifier: Modifier = Modifier) {
    Row(modifier = modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        repeat(total) { i ->
            val aktif = i < selesai
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .height(6.dp)
                    .padding(horizontal = 2.dp),
                shape = CircleShape,
                color = if (aktif) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
            ) {}
        }
        Spacer(Modifier.width(12.dp))
        Text(
            "$selesai/$total",
            style = GayaAngka.copy(fontSize = 14.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun KolomIsian(
    nilai: String,
    label: String,
    onUbah: (String) -> Unit,
    modifier: Modifier = Modifier,
    jenisPapanKetik: KeyboardType = KeyboardType.Text,
    rahasia: Boolean = false,
    aktif: Boolean = true,
    bantuan: String? = null,
    galat: String? = null,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = nilai,
            onValueChange = onUbah,
            label = { Text(label) },
            singleLine = true,
            enabled = aktif,
            isError = galat != null,
            visualTransformation = if (rahasia) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = jenisPapanKetik),
            shape = MaterialTheme.shapes.small,
            modifier = Modifier.fillMaxWidth(),
        )
        val catatan = galat ?: bantuan
        if (catatan != null) {
            Text(
                catatan,
                style = MaterialTheme.typography.bodySmall,
                color = if (galat != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 12.dp, top = 4.dp),
            )
        }
    }
}

@Composable
fun TautanTeks(teks: String, modifier: Modifier = Modifier, onKlik: () -> Unit) {
    TextButton(onClick = onKlik, modifier = modifier.heightIn(min = TinggiAksiMinimum)) {
        Text(teks, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun TombolAksiBawah(
    modifier: Modifier = Modifier,
    isi: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 3.dp,
    ) {
        Column(
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            content = isi,
        )
    }
}
