package id.apn.supir.ui.tema

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val SkemaTerang = lightColorScheme(
    primary = ApnTeal,
    onPrimary = ApnPutih,
    primaryContainer = ApnTealLembut,
    onPrimaryContainer = ApnTealGelap,
    secondary = ApnBiru,
    onSecondary = ApnPutih,
    error = ApnMerah,
    onError = ApnPutih,
    background = ApnPutih,
    onBackground = ApnTintaTerang,
    surface = ApnPutih,
    onSurface = ApnTintaTerang,
    surfaceVariant = ApnAbuPermukaan,
    onSurfaceVariant = ApnRedupTerang,
    outline = ApnAbuGaris,
    outlineVariant = ApnAbuGaris,
)

private val SkemaGelap = darkColorScheme(
    primary = ApnTealTerang,
    onPrimary = ApnTealGelap,
    primaryContainer = ApnTealGelap,
    onPrimaryContainer = ApnTealTerang,
    secondary = ApnBiruTerang,
    onSecondary = ApnLatarGelap,
    error = ApnMerahTerang,
    onError = ApnLatarGelap,
    background = ApnLatarGelap,
    onBackground = ApnTintaGelap,
    surface = ApnLatarGelap,
    onSurface = ApnTintaGelap,
    surfaceVariant = ApnPermukaanGelap,
    onSurfaceVariant = ApnRedupGelap,
    outline = ApnGarisGelap,
    outlineVariant = ApnGarisGelap,
)

@Composable
fun TemaApn(
    gelap: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (gelap) SkemaGelap else SkemaTerang,
        typography = TipografiApn,
        shapes = BentukApn,
        content = content,
    )
}
