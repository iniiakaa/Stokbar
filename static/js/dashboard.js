// dashboard.js — Stokbar Web (Flask + Image Upload)

const API = {
  async get(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.statusText); return r.json(); },
  async post(url, body) { const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }); return r.json(); },
  async put(url, body) { const r = await fetch(url, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }); return r.json(); },
  async del(url) { const r = await fetch(url, { method:'DELETE' }); return r.json(); },
};

const fmt = n => new Intl.NumberFormat('id-ID').format(n);
const fmtRp = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
const fmtDate = s => new Date(s).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const imgOrPlaceholder = (foto, size=36) => foto
  ? `<img src="${foto}" class="item-img" style="width:${size}px;height:${size}px" onclick="App.previewImage('${foto}')" title="Lihat foto">`
  : `<div class="item-img-placeholder" style="width:${size}px;height:${size}px"><i class="bi bi-image"></i></div>`;

// ── APP ──────────────────────────────────────────────
const App = {
  _chart: null,

  async init() {
    setInterval(() => {
      const el = document.getElementById('topbar-clock');
      if (el) el.textContent = new Date().toLocaleTimeString('id-ID');
    }, 1000);

    // 1) Fetch semua data dulu (saat app masih tersembunyi)
    const [dashData] = await Promise.all([
      API.get('/api/dashboard'),
      App.loadNotifications(),
    ]);

    // 2) Isi metric cards & transaksi terbaru (tanpa chart)
    Dashboard.fillMetrics(dashData);
    Dashboard.renderRecent(dashData.recent);

    // 3) Tampilkan app — loading screen hilang
    document.getElementById('loading-screen').classList.add('hide');
    document.getElementById('app').style.display = 'flex';

    // 4) Render chart SETELAH app visible + satu frame render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        Dashboard.renderChart(dashData.chart_data);
        if (App._chart) App._chart.resize();
      });
    });

    document.addEventListener('click', e => {
      const w = document.getElementById('notification-wrapper');
      if (w && !w.contains(e.target)) document.getElementById('notification-dropdown').classList.remove('show');
    });
  },

  navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    const link = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (link) link.classList.add('active');
    document.getElementById('page-title').textContent = {
      dashboard:'Dashboard', master:'Master Barang',
      masuk:'Barang Masuk', keluar:'Barang Keluar', laporan:'Laporan'
    }[page] || page;
    if (page === 'master') Master.load();
    if (page === 'masuk') Transaksi.initMasuk();
    if (page === 'keluar') Transaksi.initKeluar();
    if (page === 'laporan') Laporan.init();
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
  },

  toggleNotifications() {
    document.getElementById('notification-dropdown').classList.toggle('show');
  },

  async loadNotifications() {
    const items = await API.get('/api/low-stock');
    const badge = document.getElementById('notification-badge');
    const list = document.getElementById('notification-list');
    if (items.length) {
      badge.textContent = items.length; badge.style.display = 'flex';
      list.innerHTML = items.map(i => `
        <div class="notification-item">
          <i class="bi bi-exclamation-circle-fill item-icon"></i>
          <div><div class="item-name">${i.nama_barang}</div>
          <div class="item-stock">Stok: ${i.stok} / Min: ${i.stok_minimum}</div></div>
        </div>`).join('');
    } else {
      badge.style.display = 'none';
      list.innerHTML = '<div style="padding:1rem;text-align:center;font-size:.82rem;color:#9ca3af">Semua stok aman ✓</div>';
    }
  },

  previewImage(url) {
    const modal = document.getElementById('img-view-modal');
    document.getElementById('img-view-src').src = url;
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(0,0,0,.75)';
    modal.style.zIndex = '3000';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.cursor = 'zoom-out';
  }
};

// ── DASHBOARD ──────────────────────────────────────────────
const Dashboard = {
  // Load all & render (dipakai saat refresh manual)
  async load() {
    const d = await API.get('/api/dashboard');
    this.fillMetrics(d);
    this.renderRecent(d.recent);
    // Re-render chart hanya jika canvas visible
    requestAnimationFrame(() => {
      this.renderChart(d.chart_data);
      if (App._chart) App._chart.resize();
    });
  },

  // Isi angka-angka metric card saja (tanpa chart)
  fillMetrics(d) {
    document.getElementById('val-total-barang').textContent = fmt(d.total_barang);
    document.getElementById('val-total-stok').textContent = fmt(d.total_stok);
    document.getElementById('val-masuk-bulan').textContent = fmt(d.masuk_bulan_ini);
    document.getElementById('val-keluar-bulan').textContent = fmt(d.keluar_bulan_ini);
    document.getElementById('val-inventaris').textContent = fmtRp(d.nilai_inventaris);
    document.getElementById('val-stok-menipis').textContent = fmt(d.stok_menipis);
  },

  renderChart(c) {
    const canvas = document.getElementById('chart-tren');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (App._chart) { App._chart.destroy(); App._chart = null; }

    // Gradient biru (Masuk) — atas solid, bawah putih transparan
    const h = canvas.offsetHeight || 260;
    const gradBlue = ctx.createLinearGradient(0, 0, 0, h);
    gradBlue.addColorStop(0,   'rgba(99, 102, 241, 0.9)');  // biru indigo solid atas
    gradBlue.addColorStop(0.75,'rgba(99, 102, 241, 0.35)'); // mulai pudar
    gradBlue.addColorStop(1,   'rgba(255, 255, 255, 0.05)'); // hampir putih bawah

    // Gradient orange (Keluar) — atas solid, bawah putih transparan
    const gradOrange = ctx.createLinearGradient(0, 0, 0, h);
    gradOrange.addColorStop(0,   'rgba(249, 115, 22, 0.9)');  // orange solid atas
    gradOrange.addColorStop(0.75,'rgba(249, 115, 22, 0.35)'); // mulai pudar
    gradOrange.addColorStop(1,   'rgba(255, 255, 255, 0.05)'); // hampir putih bawah

    App._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: c.labels,
        datasets: [
          {
            label: 'Masuk',
            data: c.masuk,
            backgroundColor: gradBlue,
            borderColor: 'rgba(99, 102, 241, 0.6)',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Keluar',
            data: c.keluar,
            backgroundColor: gradOrange,
            borderColor: 'rgba(249, 115, 22, 0.6)',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 10,
              font: { size: 11 },
              generateLabels: (chart) => chart.data.datasets.map((ds, i) => ({
                text: ds.label,
                fillStyle: i === 0 ? 'rgba(99,102,241,0.85)' : 'rgba(249,115,22,0.85)',
                strokeStyle: i === 0 ? 'rgba(99,102,241,0.6)' : 'rgba(249,115,22,0.6)',
                lineWidth: 1.5,
                hidden: false,
                datasetIndex: i,
              }))
            }
          },
          tooltip: {
            callbacks: {
              labelColor: (ctx) => ({
                borderColor: ctx.datasetIndex === 0 ? '#6366f1' : '#f97316',
                backgroundColor: ctx.datasetIndex === 0 ? '#6366f1' : '#f97316',
              })
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: '#f0f2f8' }, ticks: { font: { size: 11 } } }
        }
      }
    });
  },

  renderRecent(items) {
    const el = document.getElementById('recent-list');
    if (!items.length) { el.innerHTML = '<p style="color:#9ca3af;font-size:.82rem;padding:.375rem">Belum ada transaksi</p>'; return; }
    el.innerHTML = items.map(t => `
      <div class="recent-item">
        <div class="ri-icon ${t.tipe}"><i class="bi bi-arrow-${t.tipe==='masuk'?'down':'up'}-circle-fill"></i></div>
        <div class="ri-info">
          <div class="ri-name">${t.nama_barang}</div>
          <div class="ri-detail">${fmtDate(t.tanggal)}</div>
        </div>
        <span class="ri-qty ${t.tipe}">${t.tipe==='masuk'?'+':'-'}${fmt(t.jumlah)}</span>
      </div>`).join('');
  }
};

// ── MASTER ──────────────────────────────────────────────
const Master = {
  data:[], filtered:[], page:1, perPage:10, sortKey:'', sortAsc:true,

  async load() {
    this.data = await API.get('/api/barang');
    this.filtered = [...this.data];
    this.page = 1;
    this.render();
    this.loadKategori();
  },

  async loadKategori() {
    const list = await API.get('/api/kategori');
    document.getElementById('kategori-list').innerHTML = list.map(k => `<option value="${k}">`).join('');
  },

  search(q) {
    q = q.toLowerCase();
    this.filtered = this.data.filter(b =>
      b.nama_barang.toLowerCase().includes(q) ||
      b.kode_barang.toLowerCase().includes(q) ||
      (b.kategori||'').toLowerCase().includes(q)
    );
    this.page = 1; this.render();
  },

  sort(key) {
    if (this.sortKey === key) this.sortAsc = !this.sortAsc;
    else { this.sortKey = key; this.sortAsc = true; }
    this.filtered.sort((a,b) => {
      let av = a[key], bv = b[key];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return this.sortAsc ? (av > bv ? 1:-1) : (av < bv ? 1:-1);
    });
    this.render();
  },

  render() {
    const start = (this.page-1) * this.perPage;
    const slice = this.filtered.slice(start, start + this.perPage);
    const tbody = document.getElementById('master-tbody');
    if (!slice.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted" style="padding:2.5rem">Tidak ada data</td></tr>';
    } else {
      tbody.innerHTML = slice.map(b => {
        const status = b.stok === 0 ? 'badge-danger' : b.stok <= b.stok_minimum ? 'badge-warning' : 'badge-safe';
        const stLabel = b.stok === 0 ? 'Habis' : b.stok <= b.stok_minimum ? 'Menipis' : 'Aman';
        const foto = b.foto ? `/static/uploads/${b.foto}` : '';
        return `<tr>
          <td>${imgOrPlaceholder(foto)}</td>
          <td><code style="font-size:.75rem;background:#f0f2f8;padding:.15rem .4rem;border-radius:4px">${b.kode_barang}</code></td>
          <td style="font-weight:600">${b.nama_barang}</td>
          <td><span style="font-size:.78rem;color:#6b7280">${b.kategori||'—'}</span></td>
          <td><span style="font-size:.78rem;color:#6b7280">${b.satuan}</span></td>
          <td class="text-right price" style="color:#6b7280">${fmtRp(b.harga_beli)}</td>
          <td class="text-right price">${fmtRp(b.harga_jual)}</td>
          <td class="text-center" style="font-weight:700">${fmt(b.stok)}</td>
          <td class="text-center"><span class="badge ${status}">${stLabel}</span></td>
          <td class="text-center">
            <div class="action-btns">
              ${foto ? `<button class="btn-icon btn-icon-view" onclick="App.previewImage('${foto}')" title="Lihat foto"><i class="bi bi-zoom-in"></i></button>` : ''}
              <button class="btn-icon btn-icon-edit" onclick="Master.showEditModal('${b.kode_barang}')" title="Edit"><i class="bi bi-pencil-fill"></i></button>
              <button class="btn-icon btn-icon-delete" onclick="Master.delete('${b.kode_barang}')" title="Hapus"><i class="bi bi-trash-fill"></i></button>
            </div>
          </td></tr>`;
      }).join('');
    }
    const total = this.filtered.length;
    document.getElementById('master-info').textContent =
      `Menampilkan ${Math.min(start+1, total)}–${Math.min(start+this.perPage, total)} dari ${total} data`;
    this.renderPagination();
  },

  renderPagination() {
    const pages = Math.ceil(this.filtered.length / this.perPage);
    const pg = document.getElementById('master-pagination');
    if (pages <= 1) { pg.innerHTML = ''; return; }
    pg.innerHTML = Array.from({length:pages},(_,i) =>
      `<button class="page-btn ${this.page===i+1?'active':''}" onclick="Master.goPage(${i+1})">${i+1}</button>`
    ).join('');
  },
  goPage(p) { this.page = p; this.render(); },

  _resetImageUI() {
    document.getElementById('form-foto').value = '';
    document.getElementById('foto-file').value = '';
    document.getElementById('img-preview').src = '';
    document.getElementById('upload-preview-wrap').style.display = 'none';
    document.getElementById('upload-placeholder').style.display = 'block';
    document.getElementById('upload-status').style.display = 'none';
  },

  async handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('img-preview').src = e.target.result;
      document.getElementById('upload-placeholder').style.display = 'none';
      document.getElementById('upload-preview-wrap').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);

    // Upload to server
    document.getElementById('upload-status').style.display = 'flex';
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method:'POST', body:formData });
      const data = await res.json();
      if (data.success) {
        document.getElementById('form-foto').value = data.filename;
        document.getElementById('img-preview').src = data.url;
      } else {
        Swal.fire({ icon:'error', title:'Upload Gagal', text:data.message });
        this._resetImageUI();
      }
    } catch(e) {
      Swal.fire({ icon:'error', title:'Error', text:'Gagal mengupload gambar' });
      this._resetImageUI();
    } finally {
      document.getElementById('upload-status').style.display = 'none';
    }
  },

  clearImage(e) {
    e.stopPropagation();
    this._resetImageUI();
  },

  async showAddModal() {
    document.getElementById('modal-barang-title').textContent = 'Tambah Barang Baru';
    document.getElementById('form-mode').value = 'add';
    document.getElementById('form-barang').reset();
    document.getElementById('form-satuan').value = 'pcs';
    document.getElementById('form-stok-min').value = 5;
    this._resetImageUI();
    const kode = await API.get('/api/barang/kode/generate');
    document.getElementById('form-kode').value = kode.kode;
    document.getElementById('form-kode').readOnly = false;
    document.getElementById('modal-barang').style.display = 'flex';
  },

  async showEditModal(kode) {
    const b = await API.get('/api/barang/' + kode);
    document.getElementById('modal-barang-title').textContent = 'Edit Barang';
    document.getElementById('form-mode').value = 'edit';
    document.getElementById('form-old-kode').value = kode;
    document.getElementById('form-kode').value = b.kode_barang;
    document.getElementById('form-kode').readOnly = true;
    document.getElementById('form-nama').value = b.nama_barang;
    document.getElementById('form-kategori').value = b.kategori||'';
    document.getElementById('form-satuan').value = b.satuan;
    document.getElementById('form-harga-beli').value = b.harga_beli;
    document.getElementById('form-harga-jual').value = b.harga_jual;
    document.getElementById('form-stok').value = b.stok;
    document.getElementById('form-stok-min').value = b.stok_minimum;
    // Restore foto
    this._resetImageUI();
    if (b.foto) {
      document.getElementById('form-foto').value = b.foto;
      document.getElementById('img-preview').src = `/static/uploads/${b.foto}`;
      document.getElementById('upload-placeholder').style.display = 'none';
      document.getElementById('upload-preview-wrap').style.display = 'inline-block';
    }
    document.getElementById('modal-barang').style.display = 'flex';
  },

  closeModal() {
    document.getElementById('modal-barang').style.display = 'none';
  },

  async submitForm(e) {
    e.preventDefault();
    const mode = document.getElementById('form-mode').value;
    const data = {
      kode_barang: document.getElementById('form-kode').value.trim(),
      nama_barang: document.getElementById('form-nama').value.trim(),
      kategori: document.getElementById('form-kategori').value.trim(),
      satuan: document.getElementById('form-satuan').value.trim()||'pcs',
      harga_beli: parseFloat(document.getElementById('form-harga-beli').value)||0,
      harga_jual: parseFloat(document.getElementById('form-harga-jual').value)||0,
      stok: parseInt(document.getElementById('form-stok').value)||0,
      stok_minimum: parseInt(document.getElementById('form-stok-min').value)||5,
      foto: document.getElementById('form-foto').value,
    };
    const btn = document.getElementById('btn-submit-barang');
    btn.disabled = true;
    const res = mode === 'add'
      ? await API.post('/api/barang', data)
      : await API.put('/api/barang/' + document.getElementById('form-old-kode').value, data);
    btn.disabled = false;
    if (res.success) {
      Swal.fire({ icon:'success', title:'Berhasil!', text:res.message, timer:2000, showConfirmButton:false });
      this.closeModal(); this.load();
    } else {
      Swal.fire({ icon:'error', title:'Gagal', text:res.message });
    }
  },

  async delete(kode) {
    const conf = await Swal.fire({ title:'Hapus Barang?', text:`Kode: ${kode}`, icon:'warning', showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:'Ya, Hapus', cancelButtonText:'Batal' });
    if (!conf.isConfirmed) return;
    const res = await API.del('/api/barang/' + kode);
    if (res.success) {
      Swal.fire({ icon:'success', title:'Terhapus!', timer:1500, showConfirmButton:false });
      this.load();
    } else {
      Swal.fire({ icon:'error', title:'Gagal', text:res.message });
    }
  }
};

// ── TRANSAKSI ──────────────────────────────────────────────
const Transaksi = {
  _list: [],

  async initMasuk() {
    this._list = await API.get('/api/barang');
    this._fillSelect('masuk-kode');
    this._loadHistory('masuk','masuk-tbody');
    document.getElementById('masuk-kode').onchange = e => this._showInfo(e.target.value,'masuk-info');
  },

  async initKeluar() {
    this._list = await API.get('/api/barang');
    this._fillSelect('keluar-kode');
    this._loadHistory('keluar','keluar-tbody');
    document.getElementById('keluar-kode').onchange = e => this._showInfo(e.target.value,'keluar-info');
  },

  _fillSelect(id) {
    document.getElementById(id).innerHTML =
      '<option value="">Pilih Barang</option>' +
      this._list.map(b => `<option value="${b.kode_barang}">${b.kode_barang} — ${b.nama_barang}</option>`).join('');
  },

  _showInfo(kode, infoId) {
    const el = document.getElementById(infoId);
    const b = this._list.find(x => x.kode_barang === kode);
    if (!b) { el.innerHTML = '<span class="info-placeholder">Pilih barang untuk melihat info</span>'; return; }
    const foto = b.foto ? `<img src="/static/uploads/${b.foto}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #e8eaf0">` : '';
    el.innerHTML = `${foto}<div class="info-detail">
      <span class="info-name">${b.nama_barang}</span>
      <div class="info-meta">
        <span>Stok: <strong>${fmt(b.stok)} ${b.satuan}</strong></span>
        <span>Min: ${b.stok_minimum}</span>
        <span>Jual: ${fmtRp(b.harga_jual)}</span>
      </div></div>`;
  },

  async _loadHistory(tipe, tbodyId) {
    const list = await API.get(`/api/transaksi?tipe=${tipe}&limit=30`);
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = list.length
      ? list.map(t => `<tr>
          <td style="font-size:.78rem;color:#6b7280">${fmtDate(t.tanggal)}</td>
          <td><code style="font-size:.72rem;background:#f0f2f8;padding:.1rem .35rem;border-radius:4px">${t.kode_barang}</code></td>
          <td style="font-weight:600">${t.nama_barang}</td>
          <td class="text-center" style="font-weight:700;color:${tipe==='masuk'?'#10b981':'#f59e0b'}">${fmt(t.jumlah)}</td>
          <td style="font-size:.78rem;color:#6b7280">${t.keterangan||'—'}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" class="text-center text-muted" style="padding:2rem">Belum ada riwayat</td></tr>';
  },

  async submitMasuk(e) { e.preventDefault(); await this._submit('masuk','masuk-kode','masuk-jumlah','masuk-keterangan','form-masuk','masuk-tbody'); },
  async submitKeluar(e) { e.preventDefault(); await this._submit('keluar','keluar-kode','keluar-jumlah','keluar-keterangan','form-keluar','keluar-tbody'); },

  async _submit(tipe, kodeId, jumlahId, ketId, formId, tbodyId) {
    const data = {
      kode_barang: document.getElementById(kodeId).value,
      tipe, jumlah: parseInt(document.getElementById(jumlahId).value),
      keterangan: document.getElementById(ketId).value
    };
    const res = await API.post('/api/transaksi', data);
    if (res.success) {
      Swal.fire({ icon:'success', title:'Berhasil!', text:res.message, timer:1800, showConfirmButton:false });
      document.getElementById(formId).reset();
      document.getElementById(kodeId==='masuk-kode'?'masuk-info':'keluar-info').innerHTML = '<span class="info-placeholder">Pilih barang untuk melihat info</span>';
      await this._loadHistory(tipe, tbodyId);
      this._list = await API.get('/api/barang');
      App.loadNotifications();
    } else {
      Swal.fire({ icon:'error', title:'Gagal', text:res.message });
    }
  }
};

// ── LAPORAN ──────────────────────────────────────────────
const Laporan = {
  _data: [],
  init() {
    const today = new Date().toISOString().slice(0,10);
    const m1 = new Date(); m1.setDate(1);
    document.getElementById('laporan-start').value = m1.toISOString().slice(0,10);
    document.getElementById('laporan-end').value = today;
  },

  async load() {
    const s = document.getElementById('laporan-start').value;
    const e = document.getElementById('laporan-end').value;
    this._data = await API.get(`/api/laporan?start=${s}&end=${e}`);
    const tbody = document.getElementById('laporan-tbody');
    if (!this._data.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:2rem">Tidak ada data pada rentang tanggal ini</td></tr>';
      document.getElementById('laporan-summary').style.display = 'none'; return;
    }
    const totalMasuk = this._data.filter(x=>x.tipe==='masuk').reduce((a,b)=>a+b.jumlah,0);
    const totalKeluar = this._data.filter(x=>x.tipe==='keluar').reduce((a,b)=>a+b.jumlah,0);
    document.getElementById('lap-total-masuk').textContent = fmt(totalMasuk);
    document.getElementById('lap-total-keluar').textContent = fmt(totalKeluar);
    document.getElementById('lap-total-transaksi').textContent = fmt(this._data.length);
    document.getElementById('laporan-summary').style.display = 'grid';
    tbody.innerHTML = this._data.map(t => `<tr>
      <td style="font-size:.78rem;color:#6b7280">${fmtDate(t.tanggal)}</td>
      <td><code style="font-size:.72rem;background:#f0f2f8;padding:.1rem .35rem;border-radius:4px">${t.kode_barang}</code></td>
      <td style="font-weight:600">${t.nama_barang}</td>
      <td style="font-size:.78rem;color:#6b7280">${t.kategori||'—'}</td>
      <td class="text-center"><span class="badge badge-${t.tipe}">${t.tipe}</span></td>
      <td class="text-center" style="font-weight:700">${fmt(t.jumlah)}</td>
      <td style="font-size:.78rem;color:#6b7280">${t.keterangan||'—'}</td>
    </tr>`).join('');
  },

  exportCSV() {
    if (!this._data.length) { Swal.fire({ icon:'warning', title:'Tidak ada data', text:'Tampilkan laporan terlebih dahulu.' }); return; }
    const cols = ['Tanggal','Kode','Nama Barang','Kategori','Tipe','Jumlah','Keterangan'];
    const rows = this._data.map(t=>[t.tanggal,t.kode_barang,t.nama_barang,t.kategori,t.tipe,t.jumlah,t.keterangan||'']);
    const csv = [cols,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));
    a.download = `Laporan_Stok_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  },

  async exportXLSX() {
    const s = document.getElementById('laporan-start').value;
    const e = document.getElementById('laporan-end').value;
    const res = await API.get(`/api/export/xlsx?start=${s}&end=${e}`);
    Swal.fire({ icon:res.success?'success':'error', title:res.success?'Berhasil!':'Gagal', text:res.message });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
