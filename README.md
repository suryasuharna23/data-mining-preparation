# Mining Mind — Midterm Data Mining

Website belajar berbahasa Indonesia berdasarkan PDF kuliah di `materials/`. Aplikasi statis tanpa proses instalasi, API, atau login untuk versi lokal.

## Buka website

Buka `dist/index.html` di browser, atau jalankan dari direktori proyek:

```sh
npm start
```

Lalu buka `http://127.0.0.1:4173`. Server lokal memerlukan izin mendengarkan port pada perangkat. Di lingkungan pembuatan yang membatasi port, gunakan file HTML langsung. Font web memiliki fallback font sistem; fitur belajar tidak membutuhkan layanan pihak ketiga.

## Isi dan fitur

- 300 soal berbeda: Fondasi, Penerapan, Analisis — tepat 100 soal per level.
- Keenam bab muncul pada setiap level. Distribusi per level: 16 Introduction, 18 Knowledge Representation, 18 Table, 16 Graph, 16 Text, 16 Vision.
- Soal mendukung 0–4 opsi benar, kunci dan pembahasan setiap opsi, rujukan PDF, bookmark, serta pengulangan kesalahan.
- Sesi latihan 10, 25, atau 100 soal. Filter satu bab memakai maksimum 16–18 soal yang tersedia pada level tersebut.
- Simulasi 100 soal per level, waktu 60/90/120 menit, tanda ragu, navigasi, dan pembahasan setelah selesai. Timer memakai deadline absolut dan tetap berjalan saat halaman ditutup.
- 100 konsep, pencarian, catatan pribadi per bab, 100 kartu recall dengan pengulangan 1/3/7 hari, dan timer fokus.
- Penyimpanan otomatis di localStorage; ekspor/impor JSON tervalidasi untuk cadangan. Progres antarbrowser, origin, atau perangkat tidak otomatis tersinkron.
- Pilihan kosong eksplisit berbeda dari belum menjawab. Skor hanya diberikan jika himpunan opsi persis sama; tidak ada penalti negatif. Ini skema latihan, bukan klaim skema ujian dosen.

## Materi dan catatan akademik

Materi diolah dan diparafrasakan dari delapan PDF yang disediakan, termasuk dua salinan bab Introduction dan tambahan detail GCN. PDF asli tetap tersedia di `materials/`; salinan yang dibuka website berada di `dist/materials/`. Soal adalah latihan buatan, bukan bocoran atau soal resmi.

Nomor halaman memakai urutan fisik PDF. Catatan konsep memperjelas dua penyederhanaan pada slide: epoch versus langkah mini-batch (Table hlm. 17–18), serta elemen kernel versus jumlah neuron output (Vision hlm. 36). Beberapa soal analisis adalah penerapan/penurunan dari konsep pada halaman sumber, bukan kutipan slide.

## Verifikasi dan struktur

```sh
npm test
```

Tes memeriksa jumlah dan integritas bank soal, sumber PDF, penilaian multi-jawaban/kosong, penyelesaian sesi tanpa hitung ganda, pemulihan data, validasi impor, serta alur tampilan dalam harness DOM minimal. Harness bukan pengganti pengujian visual browser.

`dist/content*.js` berisi materi dan soal yang ditulis eksplisit. Setiap topik memiliki tiga pertanyaan berbeda; parser tidak menggandakan pertanyaan untuk mencapai kuota. Urutan opsi diacak secara deterministik dan kunci disesuaikan. `engine.js` menangani penilaian dan data; `app.js` menangani UI; `styles.css` menangani layout responsif.

Identitas Sites ada di `.openai/hosting.json`. Publikasi pada sesi pembuatan belum berhasil karena lingkungan tidak dapat me-resolve host `git.chatgpt-team.site`. Tidak ada URL online aktif yang telah diverifikasi. Gunakan versi lokal sambil mempertahankan identitas Site yang sama untuk publikasi berikutnya.

Status verifikasi: 16 tes otomatis lulus. Pratinjau HTTP terhalang izin listen port (`EPERM`), dan inspeksi visual Safari ditolak sistem persetujuan Computer Use. Tampilan visual desktop/mobile belum diverifikasi di browser; CSS responsif dan alur rendering telah diperiksa pada level kode.
