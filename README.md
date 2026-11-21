# rantauboz

Aplikasi budget bulanan untuk penggunaan harian di HP. Next.js 16, React, Neon Postgres, dan Neon Managed Auth. Hosting pada Vercel.

## Penggunaan

1. Daftar atau masuk dengan email dan password.
2. Tambah rekening dan opsional langsung buat pos beserta alokasi bulanan.
3. Tap pos pada Catat cepat, isi nominal, lalu simpan. Tanggal otomatis hari ini; catatan opsional.
4. Atur budget dari kartu pos atau dari Rekening > Atur budget.
5. Buka Riwayat > Rekap bulanan untuk laporan dan CSV, atau Grafik bulanan untuk membandingkan 6/12 bulan.
6. Buka Teman Rantau dari Beranda atau Profil untuk mengundang teman dan mengatur berbagi.

## Aturan bisnis

- Budget bulanan adalah satu sumber alokasi. Acuan harian/mingguan tidak menambah jumlah alokasi. Mingguan menggunakan Senin–Minggu dan hanya transaksi pada bulan terpilih.
- Transaksi mengurangi budget bulan sesuai tanggalnya. Perubahan tanggal ke bulan lain memerlukan pos budget pada bulan tujuan.
- Sisa dihitung dari alokasi dikurangi SUM pengeluaran. Edit/hapus otomatis menghitung ulang; pengeluaran tidak boleh mengurangi saldo tersimpan dua kali.
- Pengeluaran melewati budget diperbolehkan dan ditampilkan negatif.
- Salin bulan lalu hanya menyalin pos dan nominal, tanpa transaksi atau sisa. Bulan dengan budget tidak ditimpa.
- Rename rekening dan pengubahan pos tidak menulis ulang snapshot bulan lain. Pengeluaran menyimpan rekening pembayaran saat dicatat.
- Pos dengan transaksi diarsipkan; pos kosong dapat dihapus. Rekening tanpa riwayat dapat dihapus; rekening dengan riwayat hanya dapat diarsipkan setelah pos aktif bulan ini dan berikutnya dipindah/diarsipkan.
- Semua query dibatasi user_id dari sesi server; ID dari klien tidak menentukan identitas pengguna.
- Pencatatan transaksi menggunakan UUID idempotensi untuk retry. Perubahan dan penghapusan menggunakan version untuk menolak pembaruan stale.
- Akun baru kosong. Tidak ada data contoh yang dimasukkan otomatis.

## Pengembangan

Salin `.env.example` ke `.env.local` dan isi nilai rahasia di lingkungan lokal saja. Jangan commit env.

```sh
npm ci
npm test
npm run dev
npm run build
```

Environment: `DATABASE_URL` (pooled), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (minimal 32 karakter), `APP_URL`.

Migrasi terversi dijalankan berurutan: `migrations/001_initial.sql`, `002_profile_photos.sql`, `003_friends.sql`, `004_community.sql`, dan `005_friend_devices.sql`. Uji pada branch development Neon terlebih dahulu; terapkan pada production setelah lolos pemeriksaan. Jangan menjalankan migrasi otomatis dalam request pengguna atau setiap build.

Neon project: `super-dawn-26017100` di `aws-ap-southeast-1`. Branch `production` dan `development` terpisah. Vercel project: `rantauboz` pada scope `santana-menas-projects`. Nilai rahasia hanya berada di environment hosting. Deployment production dibuat dari commit GitHub menggunakan project Vercel ini. Koneksi auto-deploy setiap push belum terpasang; gunakan Vercel Settings > Git > Connect Git Repository untuk menyambungkan repo ini ke proyek yang sama. Jangan membuat proyek kedua.

## Verifikasi dan operasional

Uji sign-up, sign-in, sign-out, restore sesi, akun kedua, CRUD, retry pencatatan, stale update, pengeluaran melewati budget, pergantian bulan, dan ukuran layar 360/390/768/1440 sebelum rilis. Test UI mock tidak menggantikan uji integrasi database dan autentikasi.

Reset password memakai pengiriman email Neon. SMTP bawaan adalah untuk pengembangan; konfigurasi custom SMTP pada Neon diperlukan sebelum mengandalkan email reset sebagai alur production. Tanpa verifikasi email, email signup belum membuktikan kepemilikan alamat tersebut.

Aset fotografi generatif orisinal disimpan lokal. Font Open Sans beserta lisensinya berada di `public/assets`.

## Hasil verifikasi rilis

- Build production dan unit test lulus.
- Pengujian UI memakai API mock: buat rekening+budget, catat cepat, field tanggal 16 px tanpa overflow, ubah budget dari rekening, edit/hapus pengeluaran, dan layout 360/390/768/1440.
- Integrasi pada Vercel production dan Neon sungguhan: signup, login/logout, password salah, sesi, data akun baru kosong, simpan rekening+budget, transaksi idempotent, stale-version ditolak, over-budget, isolasi bulan, salin tanpa carryover, isolasi antar-user, dan hapus transaksi. Transaksi uji dibersihkan.
- Proteksi login Vercel dipertahankan untuk seluruh deployment sesuai preferensi pemilik. Login aplikasi adalah lapisan terpisah.
- Draft pengeluaran disimpan sementara per akun dan bulan di sessionStorage; draft dibuang setelah berhasil tersimpan.

## Teman Rantau

- Undangan berupa kode acak sekali pakai dengan hash SHA-256 di database dan masa berlaku 7 hari. Tautan membawa kode melewati login/pendaftaran. Undangan tidak dikirim otomatis.
- Pemilik memilih izin masing-masing: tidak berbagi, progres tanpa nominal, ringkasan bulanan, atau nominal budget tertentu. Penerima melihat pilihan pengundang dan memilih pengaturan sendiri sebelum menerima.
- `from_month` membatasi awal riwayat; budget pilihan memakai category_id agar tetap mengikuti bulan berikutnya. Total dan grafik hanya menghitung lingkup yang diizinkan, termasuk arsip.
- API membaca identitas dari sesi. Query laporan memeriksa koneksi aktif dan izin pemilik dalam satu statement. Progres menghilangkan seluruh field nominal dari respons, bukan sekadar menyembunyikannya di UI. Rekening, email, dan catatan transaksi teman tidak dikirim.
- Tidak ada hak edit atas data teman. Versi pengaturan mencegah overwrite; penerimaan undangan memakai row lock; koneksi bisa dihentikan oleh kedua pihak. Reconnect memerlukan undangan dan persetujuan baru.
- Percobaan kode dan pembuatan undangan dibatasi di database. POST memeriksa origin dan content type; respons memakai no-store. UI memuat ulang saat kembali aktif dan setiap 60 detik; izin selalu dicek lagi oleh server.
- Verifikasi fitur: 11 unit test; 12 pemeriksaan service/API dengan sesi uji dan database PostgreSQL lokal (PGlite); SQL pelaporan diuji di Neon development; alur UI diuji dengan mock pada 360–1440 px. Tes undangan tanpa sesi juga memeriksa redirect login, pelestarian kode ke signup, dan API 401 pada server Next lokal. Proteksi Vercel tetap aktif; fitur ini tidak memperluas akses deployment.

## Pratinjau tautan dan undangan

- Judul, deskripsi, canonical URL, Open Graph, dan Twitter card dibedakan untuk aplikasi, cerita Boz, login, daftar, dan undangan Teman Rantau. Favicon dan ikon Home Screen memakai wajah Boz; nama instalasi adalah Rantau Boz.
- Gambar 1200×630 di `/share/{app,story,invite,login,signup}.png` memakai aset lokal. Route ini hanya merender konten merek yang tetap, tanpa membaca undangan atau data finansial. Akses publik di middleware aplikasi tidak mengubah proteksi deployment Vercel.
- Tautan `/?teman=CODE` dan halaman auth yang membawa kode memakai metadata undangan yang sama. Halaman auth/undangan tidak diindeks. Token reset tidak masuk canonical atau metadata sosial.
- Bagikan undangan memakai Web Share API, dengan fallback salin pesan dan tautan. Pesan mengikuti izin pada saat undangan dibuat; tidak berisi nominal, rekening, atau transaksi. Salin kode dan salin tautan tetap tersedia.
- Pratinjau aplikasi chat memerlukan crawler mencapai metadata dan gambar. Login Vercel tetap aktif sesuai pilihan pemilik, sehingga platform eksternal bisa menampilkan login Vercel alih-alih kartu aplikasi.

## Profil dan portofolio teman

- Pilih teman dari deretan foto untuk membuka profilnya. Portofolio budget dibagi ke Ringkasan, Budget (bila diizinkan), dan Grafik. Tidak ada nilai aset, saldo bank, atau tabungan yang dibuat-buat dari sisa budget.
- Foto memakai unggahan profil teman, dengan inisial jika belum ada/foto gagal dimuat. `GET /api/friends/[id]/photo` menerima id koneksi, memeriksa sesi dan koneksi aktif dalam query yang sama, lalu mengambil foto milik anggota satunya. Respons private/no-store; tidak ada akses tulis atau endpoint foto publik.
- Profil/foto terlihat selama berteman, termasuk ketika berbagi budget dimatikan. Ini dijelaskan di pilihan berbagi. Putus koneksi menutup akses ke foto juga. Daftar teman hanya mengirim versi foto, bukan bytes atau user_id teman.
- Pengaturan berbagi dan putus koneksi ada di menu Atur pada profil. Budget tetap mengikuti izin yang dipilih pemilik; progres tidak menampilkan nominal. Pembaruan berkala tidak mengembalikan tab portofolio ke awal.
- Verifikasi tambahan: 14 unit test, query foto dan route pada PostgreSQL lokal (PGlite), serta pengujian profil/foto/fallback dan seluruh mode berbagi pada 360–1440 px. Foto profil pribadi tetap memakai endpoint pemilik yang terpisah.

## Maskot tanpa latar

Pose Boz di dashboard memakai tiga atlas transparan WebP (`boz-cutouts-1.webp` hingga `3.webp`), empat pose per atlas. `BozImage` memilih pose tanpa mengubah nilai maskot yang disimpan dalam budget. Latar dan bingkai putih pada gambar dihapus; kartu dan batas pilihan tetap berfungsi. Seluruh atlas sekitar 211 KiB dan memakai alpha asli, termasuk di atas kartu berwarna. Aset marketing dan ikon aplikasi tetap terpisah.

## Ikut rawat Rantau Boz

- `/ikut-rawat` menjelaskan cerita pembuat, dukungan sukarela untuk biaya aplikasi **dan waktu/penghasilan pembuatnya**, kontribusi kode/desain, serta masukan pengguna. Tautan ada di Profil dan footer marketing, tanpa popup donasi.
- Perkenalan disimpan melalui `POST /api/contributions` tanpa mewajibkan akun. Email wajib untuk calon kontributor; masukan boleh tanpa email. Ada persetujuan baca/balas, validasi, pembatasan body, honeypot, batas percobaan berbasis hash IP, dan idempotensi UUID. Pesan gagal tetap ada di formulir.
- Kotak masuk `/kelola-kontribusi` dan API baca/ubah hanya untuk user_id yang ditunjuk di `contribution_managers`; tidak ada klaim akses otomatis berdasarkan email yang diketik. Pengelola bisa memfilter, memuat halaman berikutnya, memperbarui daftar, dan menandai tindak lanjut. Kontak dibuka manual lewat email; aplikasi tidak mengirim pesan otomatis.
- Dukungan mulai dalam keadaan belum dibuka. Pengelola membuat akun penerima sendiri di Saweria/Trakteer, menyalin tautan profilnya ke pengaturan, lalu mengaktifkannya. URL dibatasi ke profil HTTPS pada kedua layanan tersebut. Nominal, QRIS, dan pencairan berlangsung di layanan penerima. Tidak ada QR atau penerima pembayaran contoh yang dipublikasikan.
- Route dukungan boleh dibaca tanpa login aplikasi. Route pengelola memeriksa sesi dan peran sendiri agar login dapat kembali ke tujuan yang benar. Proteksi login Vercel untuk seluruh deployment tetap dipertahankan.
- Verifikasi: 16 unit test; 9 pemeriksaan service/API pada PostgreSQL lokal (PGlite); UI formulir, kegagalan/retry, masukan tanpa email, pengelolaan status dan tautan, serta ukuran 360/390/768/1440. Migrasi diuji pada development sebelum production. Data perkenalan tidak ditampilkan publik atau dipakai otomatis sebagai testimoni.


## Tema terang dan gelap

- Pilihan Tampilan tersedia pada toolbar bersama di semua halaman aplikasi: Terang, Gelap, dan Ikuti perangkat. Pilihan disimpan lokal pada browser/perangkat melalui `rantauboz-theme`; tidak disimpan sebagai preferensi akun di database.
- Bootstrap di head menerapkan pilihan sebelum body ditampilkan. Mode perangkat mengikuti perubahan `prefers-color-scheme`; pilihan manual mengesampingkan perangkat. Perubahan localStorage tersinkron pada tab lain. Jika storage diblokir, kontrol tetap dapat dipakai pada halaman aktif.
- `app/theme.css` mendefinisikan token palet gelap berdasarkan fungsi: halaman, permukaan, garis, teks, biru merek, pengeluaran, dan peringatan. CSS dashboard, marketing, autentikasi, serta kontribusi memakai token dengan fallback warna terang. Aset Boz transparan dan identitas biru tetap dipertahankan.
- Tema mencakup modal, input tanggal, grafik, profil/foto, semua mode portofolio teman, kotak masuk pengelola, halaman akses ditolak, 404, dan fallback error. Login proteksi Vercel serta halaman layanan pembayaran eksternal dikelola penyedia masing-masing. Kartu gambar sosial tetap merupakan aset merek statis.
- Saat menambah komponen, gunakan token tema dan periksa kedua mode, kontras, input/selected/error, serta layout mobile. Hindari menambah warna hardcoded tanpa fallback tema.


## Favicon mengikuti perangkat

Favicon SVG `public/assets/boz-favicon-adaptive.svg` memakai wajah Boz yang memegang koin Rp dan bingkai dengan `prefers-color-scheme`. SVG menyematkan PNG secara langsung sehingga tidak membutuhkan request gambar eksternal. Mode mengikuti perangkat/browser, terpisah dari pilihan tema manual aplikasi. PNG/ICO lama tetap menjadi fallback. Ikon instalasi Home Screen dari manifest/apple-touch-icon tidak diubah; tampilannya dikelola sistem dan launcher perangkat.

Aset ikon uang berada pada `boz-money-{16,32,180,192,512}.png`. ICO memuat ukuran 16/32/48. PNG Apple/Home Screen memakai latar krem tetap, sedangkan favicon SVG memakai wajah transparan dan bingkai adaptif. Versi URL ikon dibedakan untuk pembaruan cache.


## Lokasi dan baterai teman

- Panel Lokasi & baterai tersedia di profil Teman Rantau. Izin terpisah dari berbagi budget dan selalu nonaktif sampai pemilik memilih data serta menekan Mulai berbagi 1 jam. Tidak ada aktivasi melalui undangan, oleh teman, atau berdasarkan izin budget.
- Pemilik memilih lokasi dan/atau baterai untuk satu koneksi. Sesi kedaluwarsa satu jam; tiap perpanjangan menghasilkan session UUID baru dan menghapus sampel sebelumnya. Browser hanya mengirim sesi yang dimulai di browser tersebut, dengan pengenal sesi di localStorage tanpa menyimpan koordinat atau baterai lokal. Browser lain pada akun yang sama tidak otomatis mengirim lokasinya.
- Pengambilan data paling sering sekali per 60 detik ketika aplikasi terlihat. GPS memakai Geolocation API dengan izin browser, tanpa fallback IP. Battery Status API hanya dipakai bila tersedia. iPhone umumnya tidak menyediakan API baterai; UI menjelaskan ketidaktersediaan tanpa angka buatan. Tidak ada pengambilan data ketika aplikasi ditutup/latar belakang.
- API baru `/api/friends/device` memeriksa sesi, keanggotaan koneksi aktif, izin pemilik, session UUID, masa berlaku, origin, JSON, serta body maksimum 32 KiB. Publikasi dibatasi minimal 10 detik per grant dan tidak menerima user_id dari klien. Maksimal 50 sesi penerima aktif per pemilik. Seluruh respons private/no-store; payload perangkat tidak ditulis ke log.
- Satu sampel terakhir per pemilik dan koneksi, tanpa tabel riwayat perjalanan. Koordinat, akurasi, status pengisian, serta waktu pembacaan hanya ditampilkan untuk izin yang sesuai. Sampel lebih dari 15 menit tidak dikirim/ditampilkan; lebih dari dua menit ditandai lama. Data kedaluwarsa dibersihkan pada permintaan pemilik berikutnya, bukan lewat janji penghapusan terjadwal.
- Hentikan berbagi mengosongkan sampel dan mengganti sesi sehingga kiriman lama tidak bisa menghidupkannya kembali. Hentikan semua hanya memengaruhi data milik pemilik sesi. Gagal menghentikan di jaringan menyimpan penanda jeda lokal, mencegah pengambilan/pengiriman, dan mencoba menutup seluruh sesi pemilik sebelum melanjutkan. Putus pertemanan menghapus grant dan sampel kedua pihak; reconnect tidak mengembalikan izin perangkat.
- Peta dibuka lewat tautan OpenStreetMap atas tindakan penerima, tanpa embed atau request peta otomatis. Referrer tidak dikirim. Waktu pembaruan selalu terlihat; ini bukan pemantauan lokasi latar belakang.
- Migrasi additive: `migrations/005_friend_devices.sql`, diuji di development sebelum production. Verifikasi fitur: 20 pengujian otomatis lolos, termasuk validasi/proyeksi serta service dan route dengan PostgreSQL lokal PGlite; pemeriksaan browser mencakup opt-in dan sensor browser, callback GPS terlambat, pause saat latar belakang, kegagalan stop/reload, browser tanpa Battery API, serta layout dan kedua tema pada 320–1440 px.
