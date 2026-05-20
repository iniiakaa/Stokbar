"""
database.py - Modul Database SQLite untuk Aplikasi Manajemen Stok Barang
=========================================================================
Mengelola semua operasi CRUD (Create, Read, Update, Delete) terhadap
database SQLite lokal. Database akan otomatis dibuat saat aplikasi
pertama kali dijalankan.
"""

import sqlite3
import sys
import os
from datetime import datetime, timedelta
import random

DB_NAME = "stok_barang.db"


def get_db_path():
    """Mendapatkan path database yang benar, baik saat development maupun saat .exe."""
    if "VERCEL" in os.environ:
        tmp_db_path = "/tmp/stok_barang.db"
        if not os.path.exists(tmp_db_path):
            import shutil
            base_dir = os.path.dirname(os.path.abspath(__file__))
            src_db_path = os.path.join(base_dir, DB_NAME)
            if os.path.exists(src_db_path):
                shutil.copy2(src_db_path, tmp_db_path)
        return tmp_db_path

    if getattr(sys, "frozen", False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, DB_NAME)


def get_connection():
    """Membuat koneksi ke database SQLite."""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Inisialisasi tabel-tabel database dan seed data awal."""
    conn = get_connection()
    cursor = conn.cursor()

    # Tabel Barang
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS barang (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kode_barang TEXT UNIQUE NOT NULL,
            nama_barang TEXT NOT NULL,
            kategori TEXT DEFAULT '',
            satuan TEXT DEFAULT 'pcs',
            harga_beli REAL DEFAULT 0,
            harga_jual REAL DEFAULT 0,
            stok INTEGER DEFAULT 0,
            stok_minimum INTEGER DEFAULT 5,
            foto TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)

    # Migrasi: tambah kolom foto jika belum ada (untuk DB lama)
    try:
        cursor.execute("ALTER TABLE barang ADD COLUMN foto TEXT DEFAULT ''")
    except Exception:
        pass  # Kolom sudah ada

    # Tabel Transaksi
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transaksi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kode_barang TEXT NOT NULL,
            tipe TEXT NOT NULL CHECK(tipe IN ('masuk', 'keluar')),
            jumlah INTEGER NOT NULL CHECK(jumlah > 0),
            keterangan TEXT DEFAULT '',
            tanggal TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (kode_barang) REFERENCES barang(kode_barang)
                ON UPDATE CASCADE ON DELETE CASCADE
        )
    """)

    # Cek apakah sudah ada data
    cursor.execute("SELECT COUNT(*) FROM barang")
    count = cursor.fetchone()[0]

    if count == 0:
        seed_data(cursor)

    conn.commit()
    conn.close()


def seed_data(cursor):
    """Mengisi data contoh untuk demonstrasi aplikasi."""
    sample_barang = [
        ("BRG001", "Beras Premium 5kg", "Makanan", "karung", 65000, 72000, 45, 10),
        ("BRG002", "Minyak Goreng 2L", "Makanan", "botol", 28000, 35000, 30, 5),
        ("BRG003", "Gula Pasir 1kg", "Makanan", "kg", 14000, 18000, 3, 5),
        ("BRG004", "Kopi Bubuk 250g", "Minuman", "pcs", 22000, 28000, 20, 5),
        ("BRG005", "Sabun Mandi Cair", "Kebersihan", "pcs", 5000, 8000, 2, 10),
        ("BRG006", "Pasta Gigi 150g", "Kebersihan", "pcs", 12000, 16000, 15, 5),
        ("BRG007", "Mi Instan (Isi 40)", "Makanan", "dus", 95000, 110000, 8, 3),
        ("BRG008", "Air Mineral 600ml", "Minuman", "dus", 45000, 55000, 12, 5),
        ("BRG009", "Telur Ayam 1kg", "Makanan", "kg", 27000, 32000, 1, 5),
        ("BRG010", "Deterjen Bubuk 1kg", "Kebersihan", "pcs", 18000, 24000, 25, 5),
        ("BRG011", "Susu UHT 1L", "Minuman", "kotak", 16000, 20000, 18, 5),
        ("BRG012", "Tepung Terigu 1kg", "Makanan", "kg", 12000, 15000, 35, 10),
    ]

    for b in sample_barang:
        cursor.execute("""
            INSERT INTO barang (kode_barang, nama_barang, kategori, satuan,
                                harga_beli, harga_jual, stok, stok_minimum)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, b)

    # Seed transaksi bulan ini untuk chart
    now = datetime.now()
    for i in range(30):
        day = now - timedelta(days=i)
        tanggal = day.strftime("%Y-%m-%d %H:%M:%S")
        # Random masuk
        if random.random() > 0.4:
            kode = random.choice([b[0] for b in sample_barang])
            jumlah = random.randint(3, 20)
            cursor.execute("""
                INSERT INTO transaksi (kode_barang, tipe, jumlah, keterangan, tanggal)
                VALUES (?, 'masuk', ?, 'Restok barang', ?)
            """, (kode, jumlah, tanggal))
        # Random keluar
        if random.random() > 0.3:
            kode = random.choice([b[0] for b in sample_barang])
            jumlah = random.randint(1, 10)
            cursor.execute("""
                INSERT INTO transaksi (kode_barang, tipe, jumlah, keterangan, tanggal)
                VALUES (?, 'keluar', ?, 'Penjualan', ?)
            """, (kode, jumlah, tanggal))


# ============================================================
# FUNGSI CRUD - BARANG
# ============================================================

def get_all_barang():
    """Mengambil semua data barang."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, kode_barang, nama_barang, kategori, satuan,
               harga_beli, harga_jual, stok, stok_minimum, foto,
               created_at, updated_at
        FROM barang ORDER BY id DESC
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_barang_by_kode(kode):
    """Mengambil data barang berdasarkan kode."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM barang WHERE kode_barang = ?", (kode,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def add_barang(data):
    """Menambahkan barang baru."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO barang (kode_barang, nama_barang, kategori, satuan,
                                harga_beli, harga_jual, stok, stok_minimum, foto)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["kode_barang"], data["nama_barang"], data.get("kategori", ""),
            data.get("satuan", "pcs"), data.get("harga_beli", 0),
            data.get("harga_jual", 0), data.get("stok", 0),
            data.get("stok_minimum", 5), data.get("foto", "")
        ))
        conn.commit()
        conn.close()
        return {"success": True, "message": "Barang berhasil ditambahkan!"}
    except sqlite3.IntegrityError:
        conn.close()
        return {"success": False, "message": "Kode barang sudah ada!"}
    except Exception as e:
        conn.close()
        return {"success": False, "message": str(e)}


def update_barang(kode, data):
    """Memperbarui data barang."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE barang SET
                nama_barang = ?, kategori = ?, satuan = ?,
                harga_beli = ?, harga_jual = ?, stok = ?,
                stok_minimum = ?, foto = ?,
                updated_at = datetime('now', 'localtime')
            WHERE kode_barang = ?
        """, (
            data["nama_barang"], data.get("kategori", ""),
            data.get("satuan", "pcs"), data.get("harga_beli", 0),
            data.get("harga_jual", 0), data.get("stok", 0),
            data.get("stok_minimum", 5), data.get("foto", ""), kode
        ))
        conn.commit()
        conn.close()
        return {"success": True, "message": "Data barang berhasil diperbarui!"}
    except Exception as e:
        conn.close()
        return {"success": False, "message": str(e)}


def delete_barang(kode):
    """Menghapus barang berdasarkan kode."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM barang WHERE kode_barang = ?", (kode,))
        conn.commit()
        conn.close()
        return {"success": True, "message": "Barang berhasil dihapus!"}
    except Exception as e:
        conn.close()
        return {"success": False, "message": str(e)}


def generate_kode_barang():
    """Membuat kode barang baru secara otomatis."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT kode_barang FROM barang ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()

    if row:
        last_num = int(row["kode_barang"].replace("BRG", ""))
        new_num = last_num + 1
    else:
        new_num = 1
    return f"BRG{new_num:03d}"


# ============================================================
# FUNGSI TRANSAKSI
# ============================================================

def add_transaksi(data):
    """Menambahkan transaksi masuk/keluar dan update stok."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        kode = data["kode_barang"]
        tipe = data["tipe"]
        jumlah = int(data["jumlah"])
        keterangan = data.get("keterangan", "")

        # Cek stok jika keluar
        if tipe == "keluar":
            cursor.execute("SELECT stok FROM barang WHERE kode_barang = ?", (kode,))
            row = cursor.fetchone()
            if not row:
                conn.close()
                return {"success": False, "message": "Barang tidak ditemukan!"}
            if row["stok"] < jumlah:
                conn.close()
                return {
                    "success": False,
                    "message": f"Stok tidak mencukupi! Stok saat ini: {row['stok']}"
                }

        # Insert transaksi
        cursor.execute("""
            INSERT INTO transaksi (kode_barang, tipe, jumlah, keterangan)
            VALUES (?, ?, ?, ?)
        """, (kode, tipe, jumlah, keterangan))

        # Update stok
        if tipe == "masuk":
            cursor.execute("""
                UPDATE barang SET stok = stok + ?,
                    updated_at = datetime('now', 'localtime')
                WHERE kode_barang = ?
            """, (jumlah, kode))
        else:
            cursor.execute("""
                UPDATE barang SET stok = stok - ?,
                    updated_at = datetime('now', 'localtime')
                WHERE kode_barang = ?
            """, (jumlah, kode))

        conn.commit()
        conn.close()
        return {"success": True, "message": f"Transaksi {tipe} berhasil dicatat!"}
    except Exception as e:
        conn.close()
        return {"success": False, "message": str(e)}


def get_transaksi(tipe=None, limit=50):
    """Mengambil daftar transaksi."""
    conn = get_connection()
    cursor = conn.cursor()
    if tipe:
        cursor.execute("""
            SELECT t.id, t.kode_barang, b.nama_barang, t.tipe,
                   t.jumlah, t.keterangan, t.tanggal
            FROM transaksi t
            JOIN barang b ON t.kode_barang = b.kode_barang
            WHERE t.tipe = ?
            ORDER BY t.tanggal DESC LIMIT ?
        """, (tipe, limit))
    else:
        cursor.execute("""
            SELECT t.id, t.kode_barang, b.nama_barang, t.tipe,
                   t.jumlah, t.keterangan, t.tanggal
            FROM transaksi t
            JOIN barang b ON t.kode_barang = b.kode_barang
            ORDER BY t.tanggal DESC LIMIT ?
        """, (limit,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


# ============================================================
# FUNGSI DASHBOARD & STATISTIK
# ============================================================

def get_dashboard_stats():
    """Mengambil statistik untuk dashboard."""
    conn = get_connection()
    cursor = conn.cursor()

    # Total barang
    cursor.execute("SELECT COUNT(*) as total FROM barang")
    total_barang = cursor.fetchone()["total"]

    # Total stok
    cursor.execute("SELECT COALESCE(SUM(stok), 0) as total FROM barang")
    total_stok = cursor.fetchone()["total"]

    # Barang stok menipis
    cursor.execute("SELECT COUNT(*) as total FROM barang WHERE stok <= stok_minimum")
    stok_menipis = cursor.fetchone()["total"]

    # Transaksi masuk bulan ini
    cursor.execute("""
        SELECT COALESCE(SUM(jumlah), 0) as total FROM transaksi
        WHERE tipe = 'masuk'
        AND strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now', 'localtime')
    """)
    masuk_bulan_ini = cursor.fetchone()["total"]

    # Transaksi keluar bulan ini
    cursor.execute("""
        SELECT COALESCE(SUM(jumlah), 0) as total FROM transaksi
        WHERE tipe = 'keluar'
        AND strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now', 'localtime')
    """)
    keluar_bulan_ini = cursor.fetchone()["total"]

    # Total nilai inventaris
    cursor.execute("SELECT COALESCE(SUM(stok * harga_jual), 0) as total FROM barang")
    nilai_inventaris = cursor.fetchone()["total"]

    # Data chart - tren 7 hari terakhir
    chart_data = get_chart_data_7days(cursor)

    # Transaksi terbaru
    cursor.execute("""
        SELECT t.id, t.kode_barang, b.nama_barang, t.tipe,
               t.jumlah, t.keterangan, t.tanggal
        FROM transaksi t
        JOIN barang b ON t.kode_barang = b.kode_barang
        ORDER BY t.tanggal DESC LIMIT 5
    """)
    recent = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return {
        "total_barang": total_barang,
        "total_stok": total_stok,
        "stok_menipis": stok_menipis,
        "masuk_bulan_ini": masuk_bulan_ini,
        "keluar_bulan_ini": keluar_bulan_ini,
        "nilai_inventaris": nilai_inventaris,
        "chart_data": chart_data,
        "recent": recent,
    }


def get_chart_data_7days(cursor):
    """Mengambil data chart tren 7 hari terakhir."""
    labels = []
    masuk_data = []
    keluar_data = []

    for i in range(6, -1, -1):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        label = (datetime.now() - timedelta(days=i)).strftime("%d %b")
        labels.append(label)

        cursor.execute("""
            SELECT COALESCE(SUM(jumlah), 0) as total FROM transaksi
            WHERE tipe = 'masuk' AND date(tanggal) = ?
        """, (date,))
        masuk_data.append(cursor.fetchone()["total"])

        cursor.execute("""
            SELECT COALESCE(SUM(jumlah), 0) as total FROM transaksi
            WHERE tipe = 'keluar' AND date(tanggal) = ?
        """, (date,))
        keluar_data.append(cursor.fetchone()["total"])

    return {
        "labels": labels,
        "masuk": masuk_data,
        "keluar": keluar_data,
    }


def get_low_stock_items():
    """Mengambil daftar barang dengan stok menipis."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT kode_barang, nama_barang, stok, stok_minimum, kategori
        FROM barang
        WHERE stok <= stok_minimum
        ORDER BY (stok * 1.0 / CASE WHEN stok_minimum = 0 THEN 1 ELSE stok_minimum END) ASC
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


# ============================================================
# FUNGSI LAPORAN & EKSPOR
# ============================================================

def get_laporan_data(start_date=None, end_date=None):
    """Mengambil data untuk laporan."""
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT t.id, t.kode_barang, b.nama_barang, b.kategori,
               t.tipe, t.jumlah, t.keterangan, t.tanggal,
               b.harga_beli, b.harga_jual
        FROM transaksi t
        JOIN barang b ON t.kode_barang = b.kode_barang
    """
    params = []

    if start_date and end_date:
        query += " WHERE date(t.tanggal) BETWEEN ? AND ?"
        params = [start_date, end_date]

    query += " ORDER BY t.tanggal DESC"

    cursor.execute(query, params)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def export_to_xlsx(start_date=None, end_date=None):
    """Mengekspor data ke format Excel (.xlsx) menggunakan Pandas."""
    try:
        import pandas as pd

        data = get_laporan_data(start_date, end_date)
        if not data:
            return {"success": False, "message": "Tidak ada data untuk diekspor!"}

        df = pd.DataFrame(data)
        df.columns = [
            "ID", "Kode Barang", "Nama Barang", "Kategori",
            "Tipe", "Jumlah", "Keterangan", "Tanggal",
            "Harga Beli", "Harga Jual"
        ]

        # Simpan ke folder yang sama dengan database
        db_path = get_db_path()
        base_dir = os.path.dirname(db_path)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Laporan_Stok_{timestamp}.xlsx"
        filepath = os.path.join(base_dir, filename)

        df.to_excel(filepath, index=False, engine="openpyxl")
        return {
            "success": True,
            "message": f"Laporan berhasil diekspor ke {filename}",
            "filepath": filepath,
        }
    except ImportError:
        return {
            "success": False,
            "message": "Modul pandas/openpyxl belum terinstal!",
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


def get_kategori_list():
    """Mengambil daftar kategori unik."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT kategori FROM barang WHERE kategori != '' ORDER BY kategori")
    rows = [row["kategori"] for row in cursor.fetchall()]
    conn.close()
    return rows
