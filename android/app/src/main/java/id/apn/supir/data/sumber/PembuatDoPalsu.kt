package id.apn.supir.data.sumber

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Pembuat DO PDF untuk mode pengembangan.
 *
 * DO yang sah dibuat server (SPEC-ANDROID.md §11); berkas ini hanya mengisi
 * lubang selama `GET /api/do/:id.pdf` belum ada, supaya tombol Buka/Bagikan DO
 * bisa diuji sungguhan di perangkat. Tata letaknya mengikuti dokumen asli —
 * satu halaman, dua rangkap identik — dan setiap halaman diberi tanda pratinjau
 * supaya tidak pernah tertukar dengan DO resmi.
 */
internal object PembuatDoPalsu {

    data class Isi(
        val noDo: String,
        val noKontrak: String,
        val tanggal: Long,
        val quantity: String,
        val shipper: String,
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
    private const val MARGIN = 36f

    private val formatTanggal = SimpleDateFormat("d MMMM yyyy", Locale("id", "ID"))

    fun tulis(isi: Isi, tujuan: File): File {
        val dokumen = PdfDocument()
        val halaman = dokumen.startPage(PdfDocument.PageInfo.Builder(LEBAR, TINGGI, 1).create())

        val kanvas = halaman.canvas
        gambarRangkap(kanvas, isi, atas = 28f, label = "PUTIH — PKS KIRIM")
        gambarRangkap(kanvas, isi, atas = 436f, label = "MERAH — PKS TERIMA")

        dokumen.finishPage(halaman)
        tujuan.parentFile?.mkdirs()
        tujuan.outputStream().use { dokumen.writeTo(it) }
        dokumen.close()
        return tujuan
    }

    private fun paint(ukuran: Float, tebal: Boolean = false) = Paint().apply {
        isAntiAlias = true
        textSize = ukuran
        typeface = Typeface.create(Typeface.SANS_SERIF, if (tebal) Typeface.BOLD else Typeface.NORMAL)
    }

    private fun gambarRangkap(kanvas: Canvas, isi: Isi, atas: Float, label: String) {
        val garis = Paint().apply { strokeWidth = 0.8f }
        val kecil = paint(7f)
        val biasa = paint(8.5f)
        val tebal = paint(9f, tebal = true)
        val judul = paint(13f, tebal = true)

        var y = atas

        kanvas.drawText(label, MARGIN, y, paint(7.5f, tebal = true))
        y += 16f

        kanvas.drawText("PT ADILA PARIS NUSANTARA", MARGIN, y, judul)
        y += 12f
        kanvas.drawText("Jl. HM Rafii No.404, Perum. Cemara Permai", MARGIN, y, kecil)
        y += 10f
        kanvas.drawText("Kab. Kotawaringin Barat, Kalimantan Tengah", MARGIN, y, kecil)
        y += 8f
        kanvas.drawLine(MARGIN, y, LEBAR - MARGIN, y, garis)
        y += 18f

        val kiri = MARGIN
        val kanan = LEBAR / 2f + 20f
        val barisKiri = listOf(
            "TANGGAL DO" to formatTanggal.format(Date(isi.tanggal)),
            "NO KONTRAK" to isi.noKontrak,
            "NO DO" to isi.noDo,
            "QUANTITY" to isi.quantity,
        )
        barisKiri.forEachIndexed { indeks, (nama, nilai) ->
            val barisY = y + indeks * 13f
            kanvas.drawText(nama, kiri, barisY, biasa)
            kanvas.drawText(": $nilai", kiri + 78f, barisY, tebal)
        }

        kanvas.drawText("Kepada :", kanan, y, biasa)
        kanvas.drawText(isi.shipper, kanan, y + 13f, tebal)
        kanvas.drawText(isi.pks, kanan, y + 26f, tebal)

        y += 4 * 13f + 14f
        kanvas.drawText("Kepada pembawa DO ini harap diserahkan :", MARGIN, y, biasa)
        y += 10f

        val kolom = listOf(
            "JENIS BARANG" to isi.jenisBarang,
            "TUJUAN" to isi.tujuan,
            "TRANSPORTIR" to isi.transportir,
            "DRIVER / SIM" to "${isi.driver} / ${isi.noSim}",
            "NO. POL / HP" to "${isi.nopol} / ${isi.noHp}",
        )
        val lebarKolom = (LEBAR - 2 * MARGIN) / kolom.size
        val tinggiBaris = 34f
        kanvas.drawRect(MARGIN, y, LEBAR - MARGIN, y + tinggiBaris + 14f, Paint().apply { style = Paint.Style.STROKE; strokeWidth = 0.8f })
        kolom.forEachIndexed { indeks, (nama, nilai) ->
            val x = MARGIN + indeks * lebarKolom
            if (indeks > 0) kanvas.drawLine(x, y, x, y + tinggiBaris + 14f, garis)
            kanvas.drawText(nama, x + 4f, y + 10f, kecil)
            potongTeks(nilai, lebarKolom - 8f, biasa).forEachIndexed { b, teks ->
                kanvas.drawText(teks, x + 4f, y + 24f + b * 10f, biasa)
            }
        }
        kanvas.drawLine(MARGIN, y + 14f, LEBAR - MARGIN, y + 14f, garis)
        y += tinggiBaris + 14f + 24f

        kanvas.drawText("TRANSPORTIR", MARGIN, y, biasa)
        kanvas.drawRect(MARGIN, y + 6f, MARGIN + 150f, y + 56f, Paint().apply { style = Paint.Style.STROKE; strokeWidth = 0.6f })
        kanvas.drawText("stempel & tanda tangan", MARGIN + 8f, y + 34f, kecil)

        val kolomTtd = listOf("PT / CV PENERBIT", "DRIVER", "P K S")
        kolomTtd.forEachIndexed { indeks, nama ->
            val x = MARGIN + 190f + indeks * 120f
            kanvas.drawLine(x, y + 44f, x + 100f, y + 44f, garis)
            kanvas.drawText(nama, x, y + 54f, kecil)
        }
        y += 76f

        listOf(
            "PUTIH untuk PKS KIRIM, MERAH untuk PKS TERIMA",
            "Semua kesusutan yang melebihi toleransi 0,2% di tanggung oleh driver atau pemilik kendaraan",
            "DO copy, coretan atau palsu jangan dilayani",
        ).forEachIndexed { indeks, catatan ->
            kanvas.drawText("- $catatan", MARGIN, y + indeks * 10f, kecil)
        }
        y += 3 * 10f + 6f
        kanvas.drawText(
            "PRATINJAU LOKAL — DO resmi diterbitkan server",
            MARGIN,
            y,
            paint(6.5f, tebal = true),
        )
    }

    /** Memecah teks agar tidak melewati lebar kolom. */
    private fun potongTeks(teks: String, lebar: Float, cat: Paint): List<String> {
        val baris = mutableListOf<String>()
        var sisa = teks
        while (sisa.isNotEmpty() && baris.size < 3) {
            val muat = cat.breakText(sisa, true, lebar, null).coerceAtLeast(1)
            baris += sisa.take(muat).trim()
            sisa = sisa.drop(muat)
        }
        return baris
    }
}
