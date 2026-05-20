/* ============================================
   StokModern — Main Application (app.js)
   ============================================ */

// ---- Utility ----
function formatRupiah(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}
function formatDate(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
function toast(msg, icon = 'success') {
    Swal.fire({ toast: true, position: 'top-end', icon, title: msg, showConfirmButton: false, timer: 2500, timerProgressBar: true });
}

// ============================================
// APP — SPA Router & Global
// ============================================
const App = {
    currentPage: 'dashboard',
    init() {
        this.navigate('dashboard');
        this.startClock();
        this.loadNotifications();
        document.addEventListener('click', (e) => {
            const dd = document.getElementById('notification-dropdown');
            const nw = document.getElementById('notification-wrapper');
            if (dd && dd.classList.contains('show') && !nw.contains(e.target)) dd.classList.remove('show');
        });
    },
    navigate(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const el = document.getElementById('page-' + page);
        if (el) el.classList.add('active');
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const nl = document.querySelector('[data-page="' + page + '"]');
        if (nl) nl.classList.add('active');
        const titles = { dashboard: 'Dashboard', master: 'Master Barang', masuk: 'Barang Masuk', keluar: 'Barang Keluar', laporan: 'Laporan' };
        document.getElementById('page-title').textContent = titles[page] || page;
        this.currentPage = page;
        this.loadPageData(page);
    },
    loadPageData(page) {
        switch (page) {
            case 'dashboard': Dashboard.load(); break;
            case 'master': Master.load(); break;
            case 'masuk': Transaksi.loadMasuk(); break;
            case 'keluar': Transaksi.loadKeluar(); break;
            case 'laporan': Laporan.init(); break;
        }
    },
    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('collapsed');
    },
    toggleNotifications() {
        document.getElementById('notification-dropdown').classList.toggle('show');
    },
    async loadNotifications() {
        try {
            const items = await eel.get_low_stock_items()();
            const badge = document.getElementById('notification-badge');
            const list = document.getElementById('notification-list');
            if (items.length > 0) {
                badge.style.display = 'flex';
                badge.textContent = items.length;
                list.innerHTML = items.map(i => `
                    <div class="notification-item">
                        <span class="item-icon"><i class="bi bi-exclamation-triangle-fill"></i></span>
                        <div>
                            <div class="item-name">${i.nama_barang}</div>
                            <div class="item-stock">Stok: ${i.stok} / Min: ${i.stok_minimum}</div>
                        </div>
                    </div>`).join('');
            } else {
                badge.style.display = 'none';
                list.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:.85rem;">Semua stok aman 👍</div>';
            }
        } catch (e) { console.error(e); }
    },
    startClock() {
        const el = document.getElementById('topbar-clock');
        const tick = () => {
            const now = new Date();
            el.textContent = now.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) + '  ' + now.toLocaleTimeString('id-ID');
        };
        tick();
        setInterval(tick, 1000);
    }
};

// ============================================
// DASHBOARD
// ============================================
const Dashboard = {
    chart: null,
    async load() {
        try {
            const s = await eel.get_dashboard_stats()();
            document.getElementById('val-total-barang').textContent = s.total_barang;
            document.getElementById('val-total-stok').textContent = s.total_stok.toLocaleString('id-ID');
            document.getElementById('val-masuk-bulan').textContent = s.masuk_bulan_ini.toLocaleString('id-ID');
            document.getElementById('val-keluar-bulan').textContent = s.keluar_bulan_ini.toLocaleString('id-ID');
            document.getElementById('val-inventaris').textContent = formatRupiah(s.nilai_inventaris);
            document.getElementById('val-stok-menipis').textContent = s.stok_menipis;
            this.renderChart(s.chart_data);
            this.renderRecent(s.recent);
        } catch (e) { console.error(e); }
    },
    renderChart(cd) {
        const ctx = document.getElementById('chart-tren');
        if (this.chart) this.chart.destroy();
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: cd.labels,
                datasets: [
                    { label: 'Masuk', data: cd.masuk, backgroundColor: 'rgba(34,197,94,.7)', borderRadius: 6, borderSkipped: false },
                    { label: 'Keluar', data: cd.keluar, backgroundColor: 'rgba(245,158,11,.7)', borderRadius: 6, borderSkipped: false }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 20, font: { family: "'Inter',sans-serif", size: 12 } } } },
                scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: "'Inter',sans-serif" } } }, x: { grid: { display: false }, ticks: { font: { family: "'Inter',sans-serif" } } } },
                animation: { duration: 800, easing: 'easeOutQuart' }
            }
        });
    },
    renderRecent(items) {
        const el = document.getElementById('recent-list');
        if (!items || items.length === 0) { el.innerHTML = '<div style="padding:2rem;text-align:center;color:#94a3b8;">Belum ada transaksi</div>'; return; }
        el.innerHTML = items.map(i => `
            <div class="recent-item">
                <div class="ri-icon ${i.tipe}"><i class="bi bi-arrow-${i.tipe === 'masuk' ? 'down' : 'up'}-circle-fill"></i></div>
                <div class="ri-info">
                    <div class="ri-name">${i.nama_barang}</div>
                    <div class="ri-detail">${i.kode_barang} · ${formatDate(i.tanggal)}</div>
                </div>
                <span class="ri-qty ${i.tipe}">${i.tipe === 'masuk' ? '+' : '-'}${i.jumlah}</span>
            </div>`).join('');
    }
};

// ============================================
// MASTER BARANG
// ============================================
const Master = {
    data: [], filtered: [], page: 1, perPage: 10, sortField: '', sortDir: 'asc',
    async load() {
        try {
            this.data = await eel.get_all_barang()();
            this.filtered = [...this.data];
            this.page = 1;
            this.render();
        } catch (e) { console.error(e); }
    },
    search(q) {
        q = q.toLowerCase();
        this.filtered = this.data.filter(b => b.nama_barang.toLowerCase().includes(q) || b.kode_barang.toLowerCase().includes(q) || (b.kategori || '').toLowerCase().includes(q));
        this.page = 1;
        this.render();
    },
    sort(field) {
        if (this.sortField === field) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        else { this.sortField = field; this.sortDir = 'asc'; }
        this.filtered.sort((a, b) => {
            let va = a[field], vb = b[field];
            if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
            let c = va > vb ? 1 : va < vb ? -1 : 0;
            return this.sortDir === 'asc' ? c : -c;
        });
        this.render();
    },
    render() {
        const start = (this.page - 1) * this.perPage;
        const pageData = this.filtered.slice(start, start + this.perPage);
        const tbody = document.getElementById('master-tbody');
        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:2rem;">Tidak ada data</td></tr>';
        } else {
            tbody.innerHTML = pageData.map(b => {
                let statusCls = 'badge-safe', statusTxt = 'Aman';
                if (b.stok <= 0) { statusCls = 'badge-danger'; statusTxt = 'Habis'; }
                else if (b.stok <= b.stok_minimum) { statusCls = 'badge-warning'; statusTxt = 'Menipis'; }
                return `<tr>
                    <td><span style="font-family:var(--font-mono);font-weight:600;">${b.kode_barang}</span></td>
                    <td><strong>${b.nama_barang}</strong></td>
                    <td>${b.kategori || '-'}</td>
                    <td>${b.satuan}</td>
                    <td class="text-right price">${formatRupiah(b.harga_beli)}</td>
                    <td class="text-right price">${formatRupiah(b.harga_jual)}</td>
                    <td class="text-center"><strong>${b.stok}</strong></td>
                    <td class="text-center"><span class="badge ${statusCls}">${statusTxt}</span></td>
                    <td class="text-center"><div class="action-btns">
                        <button class="btn-icon btn-icon-edit" onclick="Master.showEditModal('${b.kode_barang}')" title="Edit"><i class="bi bi-pencil-fill"></i></button>
                        <button class="btn-icon btn-icon-delete" onclick="Master.confirmDelete('${b.kode_barang}','${b.nama_barang}')" title="Hapus"><i class="bi bi-trash-fill"></i></button>
                    </div></td></tr>`;
            }).join('');
        }
        document.getElementById('master-info').textContent = `Menampilkan ${Math.min(start + 1, this.filtered.length)}-${Math.min(start + this.perPage, this.filtered.length)} dari ${this.filtered.length} data`;
        this.renderPagination();
    },
    renderPagination() {
        const total = Math.ceil(this.filtered.length / this.perPage);
        const el = document.getElementById('master-pagination');
        if (total <= 1) { el.innerHTML = ''; return; }
        let html = '';
        if (this.page > 1) html += `<button class="page-btn" onclick="Master.goPage(${this.page - 1})"><i class="bi bi-chevron-left"></i></button>`;
        for (let i = 1; i <= total; i++) html += `<button class="page-btn ${i === this.page ? 'active' : ''}" onclick="Master.goPage(${i})">${i}</button>`;
        if (this.page < total) html += `<button class="page-btn" onclick="Master.goPage(${this.page + 1})"><i class="bi bi-chevron-right"></i></button>`;
        el.innerHTML = html;
    },
    goPage(p) { this.page = p; this.render(); },
    async showAddModal() {
        document.getElementById('form-mode').value = 'add';
        document.getElementById('form-old-kode').value = '';
        document.getElementById('modal-barang-title').textContent = 'Tambah Barang Baru';
        document.getElementById('form-barang').reset();
        try {
            const kode = await eel.generate_kode_barang()();
            document.getElementById('form-kode').value = kode;
        } catch (e) {}
        try {
            const kats = await eel.get_kategori_list()();
            document.getElementById('kategori-list').innerHTML = kats.map(k => `<option value="${k}">`).join('');
        } catch (e) {}
        document.getElementById('form-kode').removeAttribute('readonly');
        document.getElementById('modal-barang').style.display = 'flex';
    },
    async showEditModal(kode) {
        try {
            const b = await eel.get_barang_by_kode(kode)();
            if (!b) return toast('Data tidak ditemukan', 'error');
            document.getElementById('form-mode').value = 'edit';
            document.getElementById('form-old-kode').value = kode;
            document.getElementById('modal-barang-title').textContent = 'Edit Barang';
            document.getElementById('form-kode').value = b.kode_barang;
            document.getElementById('form-kode').setAttribute('readonly', true);
            document.getElementById('form-nama').value = b.nama_barang;
            document.getElementById('form-kategori').value = b.kategori || '';
            document.getElementById('form-satuan').value = b.satuan || 'pcs';
            document.getElementById('form-harga-beli').value = b.harga_beli;
            document.getElementById('form-harga-jual').value = b.harga_jual;
            document.getElementById('form-stok').value = b.stok;
            document.getElementById('form-stok-min').value = b.stok_minimum;
            try {
                const kats = await eel.get_kategori_list()();
                document.getElementById('kategori-list').innerHTML = kats.map(k => `<option value="${k}">`).join('');
            } catch (e) {}
            document.getElementById('modal-barang').style.display = 'flex';
        } catch (e) { toast('Gagal memuat data', 'error'); }
    },
    closeModal() { document.getElementById('modal-barang').style.display = 'none'; },
    async submitForm(e) {
        e.preventDefault();
        const mode = document.getElementById('form-mode').value;
        const data = {
            kode_barang: document.getElementById('form-kode').value.trim(),
            nama_barang: document.getElementById('form-nama').value.trim(),
            kategori: document.getElementById('form-kategori').value.trim(),
            satuan: document.getElementById('form-satuan').value.trim() || 'pcs',
            harga_beli: parseFloat(document.getElementById('form-harga-beli').value) || 0,
            harga_jual: parseFloat(document.getElementById('form-harga-jual').value) || 0,
            stok: parseInt(document.getElementById('form-stok').value) || 0,
            stok_minimum: parseInt(document.getElementById('form-stok-min').value) || 5
        };
        try {
            let res;
            if (mode === 'add') res = await eel.add_barang(data)();
            else res = await eel.update_barang(document.getElementById('form-old-kode').value, data)();
            if (res.success) { toast(res.message); this.closeModal(); this.load(); App.loadNotifications(); }
            else toast(res.message, 'error');
        } catch (e) { toast('Terjadi kesalahan', 'error'); }
    },
    confirmDelete(kode, nama) {
        Swal.fire({
            title: 'Hapus Barang?', html: `<b>${nama}</b> (${kode}) akan dihapus permanen.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal'
        }).then(async (r) => {
            if (r.isConfirmed) {
                try {
                    const res = await eel.delete_barang(kode)();
                    if (res.success) { toast(res.message); this.load(); App.loadNotifications(); }
                    else toast(res.message, 'error');
                } catch (e) { toast('Gagal menghapus', 'error'); }
            }
        });
    }
};

// ============================================
// TRANSAKSI
// ============================================
const Transaksi = {
    barangList: [],
    async loadBarangOptions(selectId, infoId) {
        try {
            this.barangList = await eel.get_all_barang()();
            const sel = document.getElementById(selectId);
            sel.innerHTML = '<option value="">— Pilih Barang —</option>' + this.barangList.map(b => `<option value="${b.kode_barang}">${b.kode_barang} — ${b.nama_barang} (Stok: ${b.stok})</option>`).join('');
            sel.onchange = () => this.showBarangInfo(sel.value, infoId);
            document.getElementById(infoId).innerHTML = '<span class="info-placeholder">Pilih barang untuk melihat info</span>';
        } catch (e) { console.error(e); }
    },
    showBarangInfo(kode, infoId) {
        const el = document.getElementById(infoId);
        const b = this.barangList.find(x => x.kode_barang === kode);
        if (!b) { el.innerHTML = '<span class="info-placeholder">Pilih barang untuk melihat info</span>'; return; }
        let statusCls = 'badge-safe', statusTxt = 'Aman';
        if (b.stok <= 0) { statusCls = 'badge-danger'; statusTxt = 'Habis'; }
        else if (b.stok <= b.stok_minimum) { statusCls = 'badge-warning'; statusTxt = 'Menipis'; }
        el.innerHTML = `<div class="info-detail">
            <span class="info-name">${b.nama_barang}</span>
            <span class="info-meta"><span>Stok: <strong>${b.stok}</strong> ${b.satuan}</span><span>Kategori: ${b.kategori || '-'}</span><span class="badge ${statusCls}">${statusTxt}</span></span>
        </div>`;
    },
    async loadMasuk() {
        await this.loadBarangOptions('masuk-kode', 'masuk-info');
        this.loadHistory('masuk');
    },
    async loadKeluar() {
        await this.loadBarangOptions('keluar-kode', 'keluar-info');
        this.loadHistory('keluar');
    },
    async loadHistory(tipe) {
        try {
            const data = await eel.get_transaksi(tipe, 30)();
            const tbody = document.getElementById(tipe + '-tbody');
            if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:2rem;">Belum ada riwayat</td></tr>'; return; }
            tbody.innerHTML = data.map(t => `<tr>
                <td>${formatDate(t.tanggal)}</td>
                <td><span style="font-family:var(--font-mono);">${t.kode_barang}</span></td>
                <td>${t.nama_barang}</td>
                <td class="text-center"><span class="badge badge-${tipe}">${tipe === 'masuk' ? '+' : '-'}${t.jumlah}</span></td>
                <td>${t.keterangan || '-'}</td>
            </tr>`).join('');
        } catch (e) { console.error(e); }
    },
    async submitMasuk(e) {
        e.preventDefault();
        const data = {
            kode_barang: document.getElementById('masuk-kode').value,
            tipe: 'masuk',
            jumlah: document.getElementById('masuk-jumlah').value,
            keterangan: document.getElementById('masuk-keterangan').value || 'Restok barang'
        };
        if (!data.kode_barang || !data.jumlah) return toast('Lengkapi form!', 'error');
        try {
            const res = await eel.add_transaksi(data)();
            if (res.success) { toast(res.message); document.getElementById('form-masuk').reset(); this.loadMasuk(); App.loadNotifications(); }
            else toast(res.message, 'error');
        } catch (e) { toast('Gagal menyimpan', 'error'); }
    },
    async submitKeluar(e) {
        e.preventDefault();
        const data = {
            kode_barang: document.getElementById('keluar-kode').value,
            tipe: 'keluar',
            jumlah: document.getElementById('keluar-jumlah').value,
            keterangan: document.getElementById('keluar-keterangan').value || 'Penjualan'
        };
        if (!data.kode_barang || !data.jumlah) return toast('Lengkapi form!', 'error');
        try {
            const res = await eel.add_transaksi(data)();
            if (res.success) { toast(res.message); document.getElementById('form-keluar').reset(); this.loadKeluar(); App.loadNotifications(); }
            else toast(res.message, 'error');
        } catch (e) { toast('Gagal menyimpan', 'error'); }
    }
};

// ============================================
// LAPORAN
// ============================================
const Laporan = {
    data: [],
    init() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        document.getElementById('laporan-start').value = start.toISOString().split('T')[0];
        document.getElementById('laporan-end').value = now.toISOString().split('T')[0];
    },
    async load() {
        const s = document.getElementById('laporan-start').value;
        const e = document.getElementById('laporan-end').value;
        try {
            this.data = await eel.get_laporan_data(s || null, e || null)();
            const tbody = document.getElementById('laporan-tbody');
            if (!this.data || this.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:2rem;">Tidak ada data</td></tr>';
                document.getElementById('laporan-summary').style.display = 'none';
                return;
            }
            let totalMasuk = 0, totalKeluar = 0;
            tbody.innerHTML = this.data.map(t => {
                if (t.tipe === 'masuk') totalMasuk += t.jumlah; else totalKeluar += t.jumlah;
                return `<tr>
                    <td>${formatDate(t.tanggal)}</td>
                    <td style="font-family:var(--font-mono);">${t.kode_barang}</td>
                    <td>${t.nama_barang}</td>
                    <td>${t.kategori || '-'}</td>
                    <td class="text-center"><span class="badge badge-${t.tipe}">${t.tipe === 'masuk' ? '▼ Masuk' : '▲ Keluar'}</span></td>
                    <td class="text-center"><strong>${t.jumlah}</strong></td>
                    <td>${t.keterangan || '-'}</td>
                </tr>`;
            }).join('');
            document.getElementById('lap-total-masuk').textContent = totalMasuk.toLocaleString('id-ID');
            document.getElementById('lap-total-keluar').textContent = totalKeluar.toLocaleString('id-ID');
            document.getElementById('lap-total-transaksi').textContent = this.data.length;
            document.getElementById('laporan-summary').style.display = 'grid';
        } catch (e) { toast('Gagal memuat data', 'error'); }
    },
    exportCSV() {
        if (!this.data || this.data.length === 0) return toast('Tidak ada data untuk diekspor', 'warning');
        let csv = 'Tanggal,Kode Barang,Nama Barang,Kategori,Tipe,Jumlah,Keterangan\n';
        this.data.forEach(t => {
            csv += `"${t.tanggal}","${t.kode_barang}","${t.nama_barang}","${t.kategori || ''}","${t.tipe}","${t.jumlah}","${t.keterangan || ''}"\n`;
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'Laporan_Stok_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click(); toast('CSV berhasil diunduh!');
    },
    async exportXLSX() {
        const s = document.getElementById('laporan-start').value || null;
        const e = document.getElementById('laporan-end').value || null;
        try {
            const res = await eel.export_xlsx(s, e)();
            if (res.success) toast(res.message); else toast(res.message, 'error');
        } catch (e) { toast('Gagal ekspor XLSX', 'error'); }
    }
};

// ============================================
// INIT on DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hide');
        document.getElementById('app').style.display = 'flex';
        setTimeout(() => App.init(), 100);
    }, 1500);
});
