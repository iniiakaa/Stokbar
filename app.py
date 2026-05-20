"""
app.py - Flask Web Server untuk Stokbar
========================================
"""

from flask import (
    Flask, render_template, request, redirect,
    url_for, session, jsonify, send_from_directory
)
from functools import wraps
from werkzeug.utils import secure_filename
import database as db
import os
import uuid

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.urandom(24)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5 MB

if "VERCEL" in os.environ:
    UPLOAD_FOLDER = "/tmp/uploads"
else:
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "uploads")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/static/uploads/<filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# ============================================================
# Kredensial Login
# ============================================================
USERS = {
    "admin":    {"password": "admin123",    "name": "Administrator", "role": "Admin"},
    "operator": {"password": "operator123", "name": "Operator",      "role": "Operator"},
}

# ============================================================
# Helpers
# ============================================================
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

# ============================================================
# Routes - Public
# ============================================================

@app.route("/")
def landing():
    return render_template("landing.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")
        user = USERS.get(username)
        if user and user["password"] == password:
            session["user"] = username
            session["name"] = user["name"]
            session["role"] = user["role"]
            return redirect(url_for("dashboard"))
        error = "Username atau password salah!"
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("landing"))


# ============================================================
# Routes - Dashboard
# ============================================================

@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html",
                           name=session.get("name"),
                           role=session.get("role"))


# ============================================================
# Upload Image
# ============================================================

@app.route("/api/upload", methods=["POST"])
@login_required
def api_upload():
    if "file" not in request.files:
        return jsonify({"success": False, "message": "Tidak ada file"}), 400
    file = request.files["file"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"success": False, "message": "Format file tidak didukung (gunakan jpg/png/gif/webp)"}), 400
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(UPLOAD_FOLDER, filename))
    url = url_for("static", filename=f"uploads/{filename}")
    return jsonify({"success": True, "filename": filename, "url": url})


@app.route("/api/upload/<filename>", methods=["DELETE"])
@login_required
def api_delete_upload(filename):
    """Hapus file upload lama."""
    try:
        path = os.path.join(UPLOAD_FOLDER, secure_filename(filename))
        if os.path.exists(path):
            os.remove(path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})


# ============================================================
# API Routes (JSON)
# ============================================================

@app.route("/api/dashboard")
@login_required
def api_dashboard():
    return jsonify(db.get_dashboard_stats())


@app.route("/api/low-stock")
@login_required
def api_low_stock():
    return jsonify(db.get_low_stock_items())


@app.route("/api/barang", methods=["GET"])
@login_required
def api_get_barang():
    return jsonify(db.get_all_barang())


@app.route("/api/barang", methods=["POST"])
@login_required
def api_add_barang():
    data = request.get_json()
    return jsonify(db.add_barang(data))


@app.route("/api/barang/<kode>", methods=["GET"])
@login_required
def api_get_barang_kode(kode):
    item = db.get_barang_by_kode(kode)
    if item:
        return jsonify(item)
    return jsonify({"error": "Tidak ditemukan"}), 404


@app.route("/api/barang/<kode>", methods=["PUT"])
@login_required
def api_update_barang(kode):
    data = request.get_json()
    return jsonify(db.update_barang(kode, data))


@app.route("/api/barang/<kode>", methods=["DELETE"])
@login_required
def api_delete_barang(kode):
    return jsonify(db.delete_barang(kode))


@app.route("/api/barang/kode/generate")
@login_required
def api_generate_kode():
    return jsonify({"kode": db.generate_kode_barang()})


@app.route("/api/kategori")
@login_required
def api_kategori():
    return jsonify(db.get_kategori_list())


@app.route("/api/transaksi", methods=["POST"])
@login_required
def api_add_transaksi():
    data = request.get_json()
    return jsonify(db.add_transaksi(data))


@app.route("/api/transaksi")
@login_required
def api_get_transaksi():
    tipe = request.args.get("tipe")
    limit = int(request.args.get("limit", 50))
    return jsonify(db.get_transaksi(tipe, limit))


@app.route("/api/laporan")
@login_required
def api_laporan():
    start = request.args.get("start")
    end = request.args.get("end")
    return jsonify(db.get_laporan_data(start, end))


@app.route("/api/export/xlsx")
@login_required
def api_export_xlsx():
    start = request.args.get("start")
    end = request.args.get("end")
    return jsonify(db.export_to_xlsx(start, end))


# ============================================================
# Main
# ============================================================

# Tambahkan ini agar Vercel dapat mendeteksi aplikasi Flask
app = app

if "VERCEL" in os.environ and os.environ.get("TURSO_DATABASE_URL"):
    try:
        db.init_db()
        print("[Vercel] Turso Database initialized successfully.")
    except Exception as e:
        print(f"[Vercel] Turso Database initialization failed: {e}")

if __name__ == "__main__":
    db.init_db()
    print("[Stokbar] Database siap.")
    app.run(debug=True, host="0.0.0.0", port=8080)

