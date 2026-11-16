package id.apn.supir.ui.tema

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/** Tombol 20dp · kartu 16dp · chip penuh (SPEC-ANDROID.md §8). */
val BentukApn = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

/** Tinggi target sentuh aksi utama: tangan kotor, truk bergetar. */
val TinggiAksiUtama = 56.dp
val TinggiAksiMinimum = 48.dp
