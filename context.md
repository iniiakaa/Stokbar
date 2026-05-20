# 📦 Stokbar — Aplikasi Manajemen Stok Barang

## 🚀 Cara Menjalankan

```bash
py app.py
```

Server berjalan di: **http://localhost:8080**

---

## 🔐 Kredensial Login

| Username   | Password      | Role      |
|------------|---------------|-----------|
| `admin`    | `admin123`    | Admin     |
| `operator` | `operator123` | Operator  |

> ⚠️ Kredensial ini hardcoded di `app.py`. Ubah sebelum deploy ke production.

---

## 📡 API Endpoints (Flask)

Semua endpoint API membutuhkan sesi login aktif.

### Halaman (HTML)

| Method | Route        | Deskripsi               |
|--------|--------------|-------------------------|
| GET    | `/`          | Landing page publik     |
| GET    | `/login`     | Halaman login           |
| POST   | `/login`     | Proses autentikasi      |
| GET    | `/logout`    | Hapus sesi & redirect   |
| GET    | `/dashboard` | Dashboard utama         |

### Data Barang

| Method | Route                        | Deskripsi                     |
|--------|------------------------------|-------------------------------|
| GET    | `/api/barang`                | Ambil semua barang            |
| POST   | `/api/barang`                | Tambah barang baru            |
| GET    | `/api/barang/<kode>`         | Ambil barang by kode          |
| PUT    | `/api/barang/<kode>`         | Update barang                 |
| DELETE | `/api/barang/<kode>`         | Hapus barang                  |
| GET    | `/api/barang/kode/generate`  | Generate kode barang otomatis |
| GET    | `/api/kategori`              | Daftar kategori unik          |

### Transaksi

| Method | Route             | Deskripsi                          |
|--------|-------------------|------------------------------------|
| POST   | `/api/transaksi`  | Catat transaksi masuk/keluar       |
| GET    | `/api/transaksi`  | Ambil daftar transaksi (+ filter)  |

Query params untuk GET transaksi:
- `?tipe=masuk` atau `?tipe=keluar`
- `?limit=50` (default)

### Dashboard & Laporan

| Method | Route                | Deskripsi                        |
|--------|----------------------|----------------------------------|
| GET    | `/api/dashboard`     | Statistik dashboard              |
| GET    | `/api/low-stock`     | Barang dengan stok menipis       |
| GET    | `/api/laporan`       | Data laporan transaksi           |
| GET    | `/api/export/xlsx`   | Ekspor laporan ke file Excel     |

Query params untuk laporan:
- `?start=YYYY-MM-DD&end=YYYY-MM-DD`

### Upload Foto

| Method | Route                   | Deskripsi              |
|--------|-------------------------|------------------------|
| POST   | `/api/upload`           | Upload foto barang     |
| DELETE | `/api/upload/<filename>`| Hapus foto lama        |

- Format yang didukung: `jpg`, `jpeg`, `png`, `gif`, `webp`
- Maks ukuran file: **5 MB**

---

## 🗄️ Skema Database (SQLite)

### Tabel `barang`

| Kolom          | Tipe    | Keterangan                        |
|----------------|---------|-----------------------------------|
| `id`           | INTEGER | Primary key, auto increment       |
| `kode_barang`  | TEXT    | Kode unik (format: BRG001)        |
| `nama_barang`  | TEXT    | Nama barang                       |
| `kategori`     | TEXT    | Kategori (Makanan, Minuman, dll.) |
| `satuan`       | TEXT    | Satuan (pcs, kg, dus, dll.)       |
| `harga_beli`   | REAL    | Harga beli per satuan             |
| `harga_jual`   | REAL    | Harga jual per satuan             |
| `stok`         | INTEGER | Jumlah stok saat ini              |
| `stok_minimum` | INTEGER | Batas stok minimum (alert)        |
| `foto`         | TEXT    | Nama file foto barang             |
| `created_at`   | TEXT    | Waktu dibuat                      |
| `updated_at`   | TEXT    | Waktu terakhir diubah             |

### Tabel `transaksi`

| Kolom         | Tipe    | Keterangan                      |
|---------------|---------|---------------------------------|
| `id`          | INTEGER | Primary key, auto increment     |
| `kode_barang` | TEXT    | FK ke tabel barang              |
| `tipe`        | TEXT    | `masuk` atau `keluar`           |
| `jumlah`      | INTEGER | Jumlah barang dalam transaksi   |
| `keterangan`  | TEXT    | Catatan transaksi               |
| `tanggal`     | TEXT    | Waktu transaksi (localtime)     |

> Saat transaksi dicatat, stok di tabel `barang` akan otomatis bertambah atau berkurang.

---

## ✨ Fitur Utama

- **Dashboard** — Statistik ringkas: total barang, total stok, nilai inventaris, transaksi bulan ini
- **Chart Tren 7 Hari** — Visualisasi barang masuk & keluar dalam 7 hari terakhir
- **Notifikasi Stok Menipis** — Alert otomatis saat stok ≤ stok minimum
- **CRUD Barang** — Tambah, lihat, edit, hapus data barang lengkap dengan foto
- **Transaksi Masuk/Keluar** — Pencatatan pergerakan stok otomatis update stok
- **Laporan & Ekspor Excel** — Filter by tanggal, ekspor ke `.xlsx`
- **Upload Foto Barang** — Mendukung drag & drop, preview langsung
- **Auto-generate Kode** — Kode barang digenerate otomatis (BRG001, BRG002, ...)
- **Login & Session** — Proteksi halaman dengan session-based auth

---

## 📦 Instalasi & Dependensi

```bash
pip install -r requirements.txt
```

**Isi `requirements.txt`:**

```
flask==3.1.0
pandas==2.2.3
openpyxl==3.1.5
```



---

## 🌐 Share via Ngrok

Untuk berbagi aplikasi secara publik:

```bash
# Terminal 1 - jalankan Flask
py app.py

# Terminal 2 - tunnel via ngrok
ngrok http 8080
```

Ngrok akan memberikan URL publik seperti `https://xxxx.ngrok-free.app`.

---



---

## 📝 Catatan Penting

- Database `stok_barang.db` dibuat **otomatis** saat aplikasi pertama kali dijalankan
- Data contoh (12 barang + transaksi 30 hari) di-seed otomatis jika database kosong
- Foto barang disimpan di `static/uploads/` dengan nama UUID random
- `app.secret_key` di-generate random setiap restart — session akan reset jika server di-restart
- Debug mode aktif saat development (`debug=True`), **nonaktifkan untuk production**

---

## 🛠️ Urutan Membuat Web App dari Nol (Panduan Pemula)

Ini urutan yang bener buat bikin web app kayak Stokbar ini dari awal:

---

### TAHAP 1 — Persiapan Tools

1. **Install Python**
   - Download di [python.org](https://python.org) → pilih versi terbaru
   - Centang ✅ **"Add Python to PATH"** waktu install (penting banget!)
   - Cek berhasil: buka terminal → ketik `python --version`

2. **Install VS Code** (code editor)
   - Download di [code.visualstudio.com](https://code.visualstudio.com)
   - Install extension: **Python**, **Prettier**

3. **Install Git** (opsional tapi recommended)
   - Download di [git-scm.com](https://git-scm.com)

---

### TAHAP 2 — Setup Project

4. **Buat folder project**
   ```
   namafolder/
   ├── app.py
   ├── database.py
   ├── requirements.txt
   ├── templates/
   └── static/
       ├── css/
       └── js/
   ```

5. **Buat virtual environment** (biar library ga campur-campur)
   ```bash
   python -m venv venv
   venv\Scripts\activate      # Windows
   # source venv/bin/activate # Mac/Linux
   ```

6. **Install Flask**
   ```bash
   pip install flask
   pip freeze > requirements.txt   # simpan daftar library
   ```

---

### TAHAP 3 — Coding Backend (Python/Flask)

7. **Buat `database.py`** — Urus semua urusan database (buat tabel, CRUD)

8. **Buat `app.py`** — Entry point Flask, define semua route/endpoint
   ```python
   from flask import Flask
   app = Flask(__name__)

   @app.route('/')
   def index():
       return 'Hello World!'

   if __name__ == '__main__':
       app.run(debug=True)
   ```

9. **Test jalankan Flask**
   ```bash
   py app.py
   # Buka browser → http://localhost:5000
   ```

---

### TAHAP 4 — Coding Frontend (HTML/CSS/JS)

10. **Buat templates HTML** di folder `templates/`
    - `landing.html` — halaman depan/publik
    - `login.html` — form login
    - `dashboard.html` — halaman utama setelah login

11. **Buat CSS** di `static/css/` — styling tampilan

12. **Buat JavaScript** di `static/js/` — logika interaktif di browser (fetch API, dll.)

---

### TAHAP 5 — Koneksi Frontend ↔ Backend

13. **Hubungkan HTML dengan Flask** pakai Jinja2 template
    ```html
    <!-- Di HTML -->
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
    ```

14. **Buat API endpoint** di `app.py` yang dipanggil dari JS
    ```python
    @app.route('/api/data')
    def get_data():
        return jsonify({'status': 'ok'})
    ```

15. **Fetch dari JavaScript**
    ```javascript
    fetch('/api/data')
      .then(res => res.json())
      .then(data => console.log(data))
    ```

---

### TAHAP 6 — Testing & Polish

16. **Test semua fitur** satu-satu — coba semua tombol, form, dll.
17. **Fix bug** yang ditemukan
18. **Rapikan UI** — warna, font, responsif mobile

---

### TAHAP 7 — Share / Deploy (Opsional)

19. **Share lokal via Ngrok** (untuk demo cepat)
    ```bash
    ngrok http 8080
    ```

20. **Deploy ke server** (untuk online permanen):
    - Heroku, Railway, Render (gratis)
    - VPS (lebih advanced)

---

### 🗺️ Ringkasan Urutan

```
Install Python → Buat Folder → Setup venv → Install Flask
→ Coding database.py → Coding app.py → Buat HTML/CSS/JS
→ Koneksi frontend-backend → Test → Deploy
```

> 💡 **Tips:** Jangan nunggu semua selesai baru ditest. Test sedikit-sedikit setiap selesai satu bagian biar gampang nemuin bugnya!
