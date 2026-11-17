package id.apn.supir.data.sumber

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Matrix
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import androidx.core.content.res.ResourcesCompat
import androidx.core.graphics.PathParser
import androidx.core.graphics.withSave
import id.apn.supir.R
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Pembuat DO PDF untuk mode pengembangan.
 *
 * Tata letak meniru `doc-example/DO MKM SJIM 0015 375 TON.pdf`: satu halaman
 * A4 berisi dua rangkap identik, kop dengan logo di kiri, blok kiri/kanan,
 * tabel lima baris, stempel bertanda tangan, tiga kolom tanda tangan, dan tiga
 * baris catatan. Ukuran dipakai dalam poin (1/72 inci) sesuai satuan PdfDocument.
 *
 * DO yang sah tetap diterbitkan server (SPEC-ANDROID.md §11); berkas ini hanya
 * menambal selama `GET /api/do/:id.pdf` belum ada. Hapus bersama
 * [SumberMobilePalsu] begitu endpointnya hidup.
 */
internal object PembuatDoPalsu {

    data class Isi(
        val noDo: String,
        val noKontrak: String,
        val tanggal: Long,
        /** Kuantitas DO dalam kilogram; null bila server belum mengirimkannya. */
        val kuantitasKg: Int?,
        val pembeli: String,
        val pks: String,
        val jenisBarang: String,
        val tujuan: String,
        val transportir: String,
        val driver: String,
        val noSim: String,
        val nopol: String,
        val noHp: String,
    )

    private const val LEBAR = 595
    private const val TINGGI = 842

    /** Tepi kiri/kanan isi, diukur dari garis horizontal pada contoh DO. */
    private const val KIRI = 54f
    private const val KANAN = 541f

    /** Jarak antara garis atas rangkap pertama dan rangkap kedua. */
    private const val JARAK_RANGKAP = 397f
    private const val RANGKAP_PERTAMA = 28f

    private val formatTanggal = SimpleDateFormat("d MMMM yyyy", Locale("id", "ID"))
    private val formatRibuan = Locale("id", "ID")

    fun tulis(context: Context, isi: Isi, tujuan: File): File {
        val dokumen = PdfDocument()
        val halaman = dokumen.startPage(PdfDocument.PageInfo.Builder(LEBAR, TINGGI, 1).create())

        gambarRangkap(context, halaman.canvas, isi, RANGKAP_PERTAMA)
        gambarRangkap(context, halaman.canvas, isi, RANGKAP_PERTAMA + JARAK_RANGKAP)

        dokumen.finishPage(halaman)
        tujuan.parentFile?.mkdirs()
        tujuan.outputStream().use { dokumen.writeTo(it) }
        dokumen.close()
        return tujuan
    }

    private fun teks(ukuran: Float, tebal: Boolean = false, miring: Boolean = false) = Paint().apply {
        isAntiAlias = true
        textSize = ukuran
        typeface = Typeface.create(
            Typeface.SERIF,
            when {
                tebal && miring -> Typeface.BOLD_ITALIC
                tebal -> Typeface.BOLD
                miring -> Typeface.ITALIC
                else -> Typeface.NORMAL
            },
        )
    }

    private fun garisTipis() = Paint().apply {
        isAntiAlias = true
        strokeWidth = 0.7f
        style = Paint.Style.STROKE
    }

    private fun gambarRangkap(context: Context, kanvas: Canvas, isi: Isi, atas: Float) {
        val garisTebal = Paint().apply { isAntiAlias = true; strokeWidth = 1.1f }
        val garis = garisTipis()

        val label = teks(8f)
        val nilai = teks(8f)
        val nilaiTebal = teks(8.5f, tebal = true)
        val judul = teks(16.5f, tebal = true)
        val alamat = teks(9f, tebal = true)
        val tabel = teks(7.5f)
        val catatan = teks(6.8f, miring = true)
        val kecil = teks(7f)

        fun baris(y: Float) = atas + y

        // ── Kop ──
        kanvas.drawLine(KIRI, baris(0f), KANAN, baris(0f), garisTebal)

        val logoKiri = KIRI + 6f
        val logoLebar = 96f
        val logoAtas = baris(10f)
        ResourcesCompat.getDrawable(context.resources, R.drawable.do_logo, null)?.let { logo ->
            logo.setBounds(
                logoKiri.toInt(),
                logoAtas.toInt(),
                (logoKiri + logoLebar).toInt(),
                (logoAtas + logoLebar * 178f / 320f).toInt(),
            )
            logo.draw(kanvas)
        }

        // Judul & alamat dipusatkan pada ruang di kanan logo, persis seperti contoh.
        val pusatKop = (logoKiri + logoLebar + KANAN) / 2f
        judul.textAlign = Paint.Align.CENTER
        alamat.textAlign = Paint.Align.CENTER
        kanvas.drawText("PT ADILA PARIS NUSANTARA", pusatKop, baris(21f), judul)
        kanvas.drawText("Jl. HM Rafii No.404, Perum. Cemara Permai", pusatKop, baris(39f), alamat)
        kanvas.drawText("Kab. Kotawaringin Barat, Kalimantan Tengah", pusatKop, baris(60f), alamat)
        kanvas.drawLine(KIRI, baris(66f), KANAN, baris(66f), garisTebal)

        // ── Blok kiri: identitas DO ──
        val kolomNilai = KIRI + 120f
        listOf(
            "TANGGAL DO" to formatTanggal.format(Date(isi.tanggal)),
            "NO KONTRAK" to isi.noKontrak,
            "NO DO" to isi.noDo,
            "QUANTITY" to (isi.kuantitasKg?.let { "${String.format(formatRibuan, "%,d", it)} KG" } ?: "—"),
        ).forEachIndexed { indeks, (nama, teksNilai) ->
            val y = baris(76f + indeks * 12.6f)
            kanvas.drawText(nama, KIRI + 2f, y, label)
            kanvas.drawText(teksNilai, kolomNilai, y, nilai)
        }

        // ── Blok kanan: penerima ──
        kanvas.drawText("Kepada :", KIRI + 248f, baris(76f), nilaiTebal)
        kanvas.drawText(isi.pembeli, KIRI + 299f, baris(76f), nilaiTebal)
        kanvas.drawText(isi.pks, KIRI + 299f, baris(88.6f), nilaiTebal)

        // ── Tabel muatan ──
        kanvas.drawText("Kepada pembawa DO ini harap diserahkan:", KIRI + 55f, baris(138f), kecil)

        val tabelKiri = KIRI + 58f
        val tabelKanan = KIRI + 409f
        val kolomLabel = tabelKiri + 100f
        val kolomSim = tabelKiri + 190f
        val tabelAtas = baris(142f)
        val tinggiBaris = 12.2f

        val isiTabel = listOf(
            Triple("JENIS BARANG", isi.jenisBarang, null),
            Triple("TUJUAN", isi.tujuan, null),
            Triple("TRANSPORTIR", isi.transportir, null),
            Triple("DRIVER", isi.driver, "SIM: ${isi.noSim}"),
            Triple("NO. POL", isi.nopol, "HP: ${isi.noHp}"),
        )

        isiTabel.forEachIndexed { indeks, (nama, utama, tambahan) ->
            val y = tabelAtas + indeks * tinggiBaris
            val dasar = y + tinggiBaris
            kanvas.drawRect(tabelKiri, y, tabelKanan, dasar, garis)
            kanvas.drawLine(kolomLabel, y, kolomLabel, dasar, garis)
            kanvas.drawText(nama, tabelKiri + 3f, dasar - 3.5f, tabel)
            kanvas.drawText(utama, kolomLabel + 3f, dasar - 3.5f, tabel)
            if (tambahan != null) {
                // Dua baris terakhir pada contoh punya sekat tambahan untuk SIM dan HP.
                kanvas.drawLine(kolomSim, y, kolomSim, dasar, garis)
                kanvas.drawText(tambahan, kolomSim + 3f, dasar - 3.5f, tabel)
            }
        }

        // ── Stempel + tanda tangan transportir ──
        val stempelKiri = KIRI + 34f
        val stempelLebar = 86f
        val stempelAtas = baris(225f)
        val stempelTinggi = stempelLebar * 214f / 320f

        kanvas.drawText("TRANSPORTIR", KIRI + 58f, baris(221f), kecil)

        ResourcesCompat.getDrawable(context.resources, R.drawable.do_stempel, null)?.let { stempel ->
            stempel.setBounds(
                stempelKiri.toInt(),
                stempelAtas.toInt(),
                (stempelKiri + stempelLebar).toInt(),
                (stempelAtas + stempelTinggi).toInt(),
            )
            stempel.draw(kanvas)
        }

        // Keterangan stempel memang teks, bukan bagian gambar: lebarnya dipaksa
        // sama dengan contoh (290 dari 320 satuan stempel).
        val keterangan = teks(19f * stempelTinggi / 214f, tebal = true).apply {
            color = 0xFFE3141B.toInt()
            textAlign = Paint.Align.CENTER
        }
        val lebarTarget = 290f * stempelLebar / 320f
        val lebarAsli = keterangan.measureText(TEKS_STEMPEL)
        if (lebarAsli > 0f) keterangan.textScaleX = lebarTarget / lebarAsli
        kanvas.drawText(
            TEKS_STEMPEL,
            stempelKiri + stempelLebar / 2f,
            stempelAtas + stempelTinggi * 205f / 214f,
            keterangan,
        )

        // Tanda tangan menimpa stempel, sama seperti dokumen aslinya. Jalurnya
        // disimpan di res/raw, bukan vector drawable: AAPT menolak string
        // pathData sebesar ini ("STRING_TOO_LARGE") dan hasilnya jadi kosong.
        //
        // Penskalaan memakai batas tinta, bukan viewBox: berkas SVG-nya punya
        // ruang kosong lebar sehingga tanda tangan tampil kecil kalau seluruh
        // kanvasnya ikut diskalakan.
        val jalur = jalurTandaTangan(context)
        val tinta = RectF().also { jalur.computeBounds(it, true) }
        val sasaran = RectF(
            stempelKiri - stempelLebar * 0.04f,
            stempelAtas + stempelTinggi * 0.18f,
            stempelKiri + stempelLebar * 0.96f,
            stempelAtas + stempelTinggi * 1.20f,
        )
        kanvas.withSave {
            val skala = Matrix()
            skala.setRectToRect(tinta, sasaran, Matrix.ScaleToFit.CENTER)
            kanvas.concat(skala)
            kanvas.drawPath(jalur, catTandaTangan)
        }

        // ── Kaki: tiga kolom tanda tangan ──
        kanvas.drawLine(KIRI, baris(285f), KANAN, baris(285f), garisTebal)

        val kakiTebal = teks(7f, tebal = true)
        kanvas.drawText("PT ADILA PARIS NUSANTARA", KIRI + 27f, baris(294f), kakiTebal)
        kakiTebal.textAlign = Paint.Align.CENTER
        kanvas.drawText("DRIVER", KIRI + 268f, baris(294f), kakiTebal)
        kakiTebal.textAlign = Paint.Align.LEFT
        kanvas.drawText("P K S", KIRI + 403f, baris(294f), kakiTebal)

        kanvas.drawText("Notes", KIRI + 65f, baris(304f), teks(6.8f, miring = true))
        listOf(
            ": - PUTIH untuk PKS KIRIM, MERAH untuk PKS TERIMA",
            ": - Semua kesusutan yang melebihi toleransi 0,2% di tanggung oleh driver atau pemilik kendaraan",
            ": - DO Copy, coretan atau palsu jangan dilayani",
        ).forEachIndexed { indeks, isiCatatan ->
            kanvas.drawText(isiCatatan, KIRI + 97f, baris(304f + indeks * 11.7f), catatan)
        }

        kanvas.drawLine(KIRI, baris(335f), KANAN, baris(335f), garisTebal)
        kanvas.drawLine(KIRI, baris(346f), KANAN, baris(346f), garisTebal)
    }

    private var jalurTtd: Path? = null

    private val catTandaTangan = Paint().apply {
        isAntiAlias = true
        color = 0xFF111111.toInt()
        style = Paint.Style.FILL
    }

    /** Jalur tanda tangan dibaca sekali lalu dipakai ulang untuk kedua rangkap. */
    private fun jalurTandaTangan(context: Context): Path {
        jalurTtd?.let { return it }
        val data = context.resources.openRawResource(R.raw.do_ttd_path)
            .bufferedReader()
            .use { it.readText() }
        val jalur = PathParser.createPathFromPathData(data)
            .apply { fillType = Path.FillType.EVEN_ODD }
        jalurTtd = jalur
        return jalur
    }

    private const val TEKS_STEMPEL = "PT. ADILA PARIS NUSANTARA"
}
