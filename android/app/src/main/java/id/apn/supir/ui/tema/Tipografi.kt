package id.apn.supir.ui.tema

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import id.apn.supir.R

/**
 * Inter dibundel sebagai aset, bukan downloadable font: HP supir sering tanpa
 * sinyal dan tampilan tidak boleh berubah karena font gagal diunduh.
 */
val Inter = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_medium, FontWeight.Medium),
    Font(R.font.inter_semibold, FontWeight.SemiBold),
    Font(R.font.inter_bold, FontWeight.Bold),
)

private val Dasar = Typography()

val TipografiApn = Typography(
    displayLarge = Dasar.displayLarge.copy(fontFamily = Inter, fontWeight = FontWeight.Bold),
    displayMedium = Dasar.displayMedium.copy(fontFamily = Inter, fontWeight = FontWeight.Bold),
    displaySmall = Dasar.displaySmall.copy(fontFamily = Inter, fontWeight = FontWeight.Bold),
    headlineLarge = Dasar.headlineLarge.copy(fontFamily = Inter, fontWeight = FontWeight.Bold),
    headlineMedium = Dasar.headlineMedium.copy(fontFamily = Inter, fontWeight = FontWeight.SemiBold),
    headlineSmall = Dasar.headlineSmall.copy(fontFamily = Inter, fontWeight = FontWeight.SemiBold),
    titleLarge = Dasar.titleLarge.copy(fontFamily = Inter, fontWeight = FontWeight.SemiBold),
    titleMedium = Dasar.titleMedium.copy(fontFamily = Inter, fontWeight = FontWeight.SemiBold),
    titleSmall = Dasar.titleSmall.copy(fontFamily = Inter, fontWeight = FontWeight.Medium),
    bodyLarge = Dasar.bodyLarge.copy(fontFamily = Inter),
    bodyMedium = Dasar.bodyMedium.copy(fontFamily = Inter),
    bodySmall = Dasar.bodySmall.copy(fontFamily = Inter),
    labelLarge = Dasar.labelLarge.copy(fontFamily = Inter, fontWeight = FontWeight.SemiBold),
    labelMedium = Dasar.labelMedium.copy(fontFamily = Inter, fontWeight = FontWeight.Medium),
    labelSmall = Dasar.labelSmall.copy(fontFamily = Inter, fontWeight = FontWeight.Medium),
)

/** Angka rata kolom — dipakai untuk kg, jam, dan nomor DO. */
val GayaAngka = TextStyle(
    fontFamily = Inter,
    fontWeight = FontWeight.SemiBold,
    fontFeatureSettings = "tnum",
    fontSize = 16.sp,
    textAlign = TextAlign.End,
)
