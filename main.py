"""
main.py - Entry Point Aplikasi Manajemen Stok Barang (StokModern)
==================================================================
Menggunakan Python Eel untuk menjembatani frontend HTML/CSS/JS
dengan backend Python/SQLite. Semua fungsi yang di-expose ke JavaScript
didefinisikan di sini.
"""

import eel
import sys
import os
import database as db


# ============================================================
# Inisialisasi Eel
# ============================================================

def get_web_dir():
    """Mendapatkan path folder 'web' yang benar."""
    if getattr(sys, "frozen", False):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "web")


eel.init(get_web_dir())


# ============================================================
# Exposed Functions - Dashboard
# ============================================================

@eel.expose
def get_dashboard_stats():
    """Mengambil statistik dashboard."""
    return db.get_dashboard_stats()


@eel.expose
def get_low_stock_items():
    """Mengambil daftar barang stok menipis."""
    return db.get_low_stock_items()


# ============================================================
# Exposed Functions - Barang (CRUD)
# ============================================================

@eel.expose
def get_all_barang():
    """Mengambil semua data barang."""
    return db.get_all_barang()


@eel.expose
def get_barang_by_kode(kode):
    """Mengambil data barang berdasarkan kode."""
    return db.get_barang_by_kode(kode)


@eel.expose
def add_barang(data):
    """Menambahkan barang baru."""
    return db.add_barang(data)


@eel.expose
def update_barang(kode, data):
    """Memperbarui data barang."""
    return db.update_barang(kode, data)


@eel.expose
def delete_barang(kode):
    """Menghapus barang."""
    return db.delete_barang(kode)


@eel.expose
def generate_kode_barang():
    """Membuat kode barang baru."""
    return db.generate_kode_barang()


@eel.expose
def get_kategori_list():
    """Mengambil daftar kategori."""
    return db.get_kategori_list()


# ============================================================
# Exposed Functions - Transaksi
# ============================================================

@eel.expose
def add_transaksi(data):
    """Menambahkan transaksi masuk/keluar."""
    return db.add_transaksi(data)


@eel.expose
def get_transaksi(tipe=None, limit=50):
    """Mengambil daftar transaksi."""
    return db.get_transaksi(tipe, limit)


# ============================================================
# Exposed Functions - Laporan & Ekspor
# ============================================================

@eel.expose
def get_laporan_data(start_date=None, end_date=None):
    """Mengambil data laporan."""
    return db.get_laporan_data(start_date, end_date)


@eel.expose
def export_xlsx(start_date=None, end_date=None):
    """Mengekspor data ke Excel."""
    return db.export_to_xlsx(start_date, end_date)


# ============================================================
# Close Callback - Cleanup saat jendela ditutup
# ============================================================

def on_close(page, sockets):
    """Callback ketika semua jendela browser ditutup."""
    print("[StokModern] Aplikasi ditutup. Membersihkan proses...")
    sys.exit(0)


# ============================================================
# Main Entry Point
# ============================================================

if __name__ == "__main__":
    # Inisialisasi database
    db.init_db()
    print("[StokModern] Database siap.")
    print("[StokModern] Memulai aplikasi...")

    try:
        eel.start(
            "index.html",
            size=(1366, 800),
            position=(100, 50),
            port=0,                  # Port otomatis
            mode="chrome",           # Menggunakan Chrome/Edge
            close_callback=on_close,
            cmdline_args=[
                "--disable-gpu",
                "--disable-extensions",
            ],
        )
    except EnvironmentError:
        # Jika Chrome tidak ditemukan, coba mode default
        print("[StokModern] Chrome tidak ditemukan. Mencoba browser default...")
        try:
            eel.start(
                "index.html",
                size=(1366, 800),
                port=0,
                mode="edge",
                close_callback=on_close,
            )
        except EnvironmentError:
            print("[StokModern] Tidak ada browser yang kompatibel ditemukan!")
            print("[StokModern] Silakan instal Google Chrome atau Microsoft Edge.")
            sys.exit(1)
