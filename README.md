# rantauboz

Aplikasi budget bulanan untuk penggunaan harian di HP. Next.js 16, React, Neon Postgres, dan Neon Managed Auth. Hosting pada Vercel.

## Penggunaan

1. Daftar atau masuk dengan email dan password.
2. Tambah rekening dan opsional langsung buat pos beserta alokasi bulanan.
3. Tap pos pada Catat cepat, isi nominal, lalu simpan. Tanggal otomatis hari ini; catatan opsional.
4. Atur budget dari kartu pos atau dari Rekening > Atur budget.
5. Buka Riwayat > Rekap bulanan untuk laporan dan CSV.

## Aturan bisnis

- Budget bulanan adalah satu sumber alokasi. Acuan harian/mingguan tidak menambah jumlah alokasi. Mingguan menggunakan Senin–Minggu dan hanya transaksi pada bulan terpilih.
- Transaksi mengurangi budget bulan sesuai tanggalnya. Perubahan tanggal ke bulan lain memerlukan pos budget pada bulan tujuan.
- Sisa dihitung dari alokasi dikurangi SUM pengeluaran. Edit/hapus otomatis menghitung ulang; pengeluaran tidak boleh mengurangi saldo tersimpan dua kali.
- Pengeluaran melewati budget diperbolehkan dan ditampilkan negatif.
- Salin bulan lalu hanya menyalin pos dan nominal, tanpa transaksi atau sisa. Bulan dengan budget tidak ditimpa.
- Rename rekening dan pengubahan pos tidak menulis ulang snapshot bulan lain. Pengeluaran menyimpan rekening pembayaran saat dicatat.
- Pos dengan transaksi diarsipkan; pos kosong dapat dihapus. Rekening hanya dapat diarsipkan setelah pos aktif bulan ini dan berikutnya dipindah/diarsipkan.
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

Migrasi terversi: `migrations/001_initial.sql`. Uji pada branch development Neon terlebih dahulu; terapkan pada production setelah lolos pemeriksaan. Jangan menjalankan migrasi otomatis dalam request pengguna atau setiap build.

Neon project: `super-dawn-26017100` di `aws-ap-southeast-1`. Branch `production` dan `development` terpisah. Vercel project: `rantauboz` pada scope `santana-menas-projects`. Nilai rahasia hanya berada di environment hosting.

## Verifikasi dan operasional

Uji sign-up, sign-in, sign-out, restore sesi, akun kedua, CRUD, retry pencatatan, stale update, pengeluaran melewati budget, pergantian bulan, dan ukuran layar 360/390/768/1440 sebelum rilis. Test UI mock tidak menggantikan uji integrasi database dan autentikasi.

Reset password memakai pengiriman email Neon. SMTP bawaan adalah untuk pengembangan; konfigurasi custom SMTP pada Neon diperlukan sebelum mengandalkan email reset sebagai alur production. Tanpa verifikasi email, email signup belum membuktikan kepemilikan alamat tersebut.

Aset fotografi generatif orisinal disimpan lokal. Font Open Sans beserta lisensinya berada di `public/assets`.
