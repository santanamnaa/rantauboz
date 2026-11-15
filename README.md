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

Migrasi terversi dijalankan berurutan: `migrations/001_initial.sql`, `002_profile_photos.sql`, dan `003_friends.sql`. Uji pada branch development Neon terlebih dahulu; terapkan pada production setelah lolos pemeriksaan. Jangan menjalankan migrasi otomatis dalam request pengguna atau setiap build.

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
