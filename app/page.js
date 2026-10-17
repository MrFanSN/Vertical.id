'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { productCatalog, buildSetItems, SET_QTY_PER_SET } from '../lib/catalog.js';
import { api } from '../lib/api.js';
import { buildDemoOrders } from '../lib/seed.js';
import {
  APPROVAL, APPROVAL_LABEL, DEFAULT_RULES, KPI_DEFINITIONS, PRIORITY_LABEL, RISK, STATUS,
  MODELS, addHistory, addDays, approvalTransition, defaultOrderDates, orderKindLabel, buildAlerts, cancelOrder, canMarkSent, computeKpis, daysUntil,
  deadlineLabel, deliveryStatus, filterOrders, isChecklistComplete, migrateOrder, missingItems,
  nextOrderId, orderStatus, progress, relevantItems, reportRows, riskLevel, todayISO, toCSV, validateOrder,
} from '../lib/domain.js';

const STORAGE_KEY = 'vertical-orders';
const EMPTY_FILTERS = { from: '', to: '', status: 'all', delivery: 'all', pic: 'all', priority: 'all', risk: 'all', query: '' };

function fmt(d) {
  if (!d) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z'));
}
function fmtTime(iso) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(iso));
}
const statusTone = s => ({ [STATUS.DONE]: 'green', [STATUS.OVERDUE]: 'red', [STATUS.PENDING_APPROVAL]: 'purple', [STATUS.READY]: 'blue', [STATUS.PROCESSING]: 'yellow', [STATUS.NEW]: 'gray', [STATUS.CANCELLED]: 'gray' }[s] || 'gray');
const riskTone = r => ({ [RISK.LATE]: 'red', [RISK.HIGH]: 'red', [RISK.WATCH]: 'yellow', [RISK.SAFE]: 'green', [RISK.NONE]: 'gray' }[r] || 'gray');
const PAGE_TITLES = { dashboard: 'Dashboard', orders: 'Orders', order: 'Detail Order', shipping: 'Pengiriman', reports: 'Laporan', products: 'Sparepart' };

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [mode, setMode] = useState('loading'); // loading | server | local | auth | error
  const [code, setCode] = useState('');
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState('dashboard');
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [today, setToday] = useState(todayISO());
  const [navOpen, setNavOpen] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const ordersRef = useRef([]);
  const chain = useRef(Promise.resolve());
  const pending = useRef(0);
  const hydrated = mode === 'server' || mode === 'local';

  const commit = list => { ordersRef.current = list; setOrders(list); };
  const notify = (text, type = 'ok') => setToast({ text, type });

  function readLocal() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw).map(migrateOrder) : []; }
    catch { return null; }
  }

  async function load(c, silent) {
    const r = await api('/api/orders', { code: c });
    if (r.status === 200) {
      setMode('server'); commit(r.data.orders.map(migrateOrder)); setLoadError('');
      const local = readLocal(); setLocalCount(local ? local.length : 0);
    } else if (r.status === 401) { setMode('auth'); if (!silent) sessionStorage.removeItem('vertical-code'); }
    else if (r.status === 503 || r.status === 404) {
      const local = readLocal();
      if (local === null) setLoadError('Data tersimpan di browser tidak dapat dibaca. Data asli tidak diubah.');
      commit(local || []); setMode('local');
    } else if (!silent) { setLoadError('Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.'); setMode('error'); }
  }

  useEffect(() => { const c = sessionStorage.getItem('vertical-code') || ''; setCode(c); load(c); }, []);
  useEffect(() => {
    if (mode !== 'local') return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); }
    catch { setToast({ type: 'error', text: 'Gagal menyimpan ke penyimpanan browser.' }); }
  }, [orders, mode]);
  useEffect(() => { // sinkron berkala agar order dari pengguna lain tampil
    if (mode !== 'server') return;
    const t = setInterval(() => { if (!document.hidden && pending.current === 0) load(code, true); }, 20000);
    return () => clearInterval(t);
  }, [mode, code]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3600); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => { const t = setInterval(() => setToday(todayISO()), 60000); return () => clearInterval(t); }, []);

  const filtered = useMemo(() => filterOrders(orders, filters, today), [orders, filters, today]);
  const pics = useMemo(() => [...new Set(orders.map(o => o.pic).filter(Boolean))].sort(), [orders]);

  function go(p) { setPage(p); setNavOpen(false); }
  function openOrder(o) { setSelected(o.id); go('order'); }

  // Simpan perubahan satu order ke server secara berurutan (antrean) dengan optimistic locking.
  function persist(id) {
    pending.current++;
    chain.current = chain.current.then(async () => {
      try {
        const cur = ordersRef.current.find(o => o.id === id); if (!cur) return;
        const { version, ...rest } = cur;
        const r = await api(`/api/orders/${id}`, { method: 'PATCH', body: { version, order: rest }, code });
        if (r.status === 200) commit(ordersRef.current.map(o => (o.id === id ? { ...o, version: r.data.order.version } : o)));
        else if (r.status === 401) setMode('auth');
        else { notify(r.status === 409 ? 'Data baru saja diubah pengguna lain. Memuat ulang…' : (r.data?.message || 'Gagal menyimpan ke server.'), 'error'); await load(code, true); }
      } finally { pending.current--; }
    });
  }
  function update(id, fn) {
    const cur = ordersRef.current.find(o => o.id === id); if (!cur) return;
    const next = fn(cur); if (next === cur) return;
    commit(ordersRef.current.map(o => (o.id === id ? next : o)));
    if (mode === 'server') persist(id);
  }

  function toggleItem(id, itemId) {
    update(id, o => {
      if (o.cancelled || o.approval?.state === APPROVAL.APPROVED || o.sent) return o;
      const item = o.items.find(i => i.id === itemId);
      const next = { ...o, items: o.items.map(i => (i.id === itemId ? { ...i, checked: !i.checked } : i)) };
      return addHistory(next, `${item.checked ? 'Batal ceklis' : 'Ceklis'}: ${item.name}`);
    });
  }
  function markSent(id) {
    const o = orders.find(x => x.id === id); const g = canMarkSent(o);
    if (!g.ok) return notify(g.reason, 'error');
    setDialog({ title: 'Konfirmasi pengiriman', body: `Tandai ${o.id} sebagai terkirim? Checklist akan dikunci.`, confirm: 'Ya, tandai terkirim',
      onConfirm: () => { update(id, x => addHistory({ ...x, sent: true, sentAt: new Date().toISOString() }, 'Pengiriman dikonfirmasi')); notify('Pengiriman dikonfirmasi.'); } });
  }
  function approval(id, action, note) {
    const o = orders.find(x => x.id === id); const r = approvalTransition(o, action, { note });
    if (!r.ok) return notify(r.reason, 'error');
    update(id, () => r.order); notify(`Approval: ${APPROVAL_LABEL[r.order.approval.state]}.`);
  }
  function cancel(id, reason) {
    const r = cancelOrder(orders.find(x => x.id === id), reason);
    if (!r.ok) return notify(r.reason, 'error');
    update(id, () => r.order); notify('Order dibatalkan.');
  }
  async function createOrder(data) {
    const errs = validateOrder(data); if (errs.length) return errs;
    const draft = addHistory(migrateOrder({ ...data, sent: false, items: data.items.map((x, i) => ({ ...x, id: i + 1, checked: false })) }), 'Order dibuat');
    let created;
    if (mode === 'server') {
      const r = await api('/api/orders', { method: 'POST', body: { order: draft }, code });
      if (r.status === 401) { setMode('auth'); return ['Sesi berakhir. Masukkan kode akses.']; }
      if (r.status !== 201) return [r.data?.message || 'Gagal menyimpan order ke server.'];
      created = migrateOrder(r.data.order);
    } else created = { ...draft, id: nextOrderId(ordersRef.current) };
    commit([created, ...ordersRef.current]); setShowForm(false); setSelected(created.id); go('orders'); notify(`Order ${created.id} dibuat.`);
    return [];
  }
  async function importLocal() {
    const local = readLocal() || []; let ok = 0;
    for (const o of local) {
      const { id, version, ...rest } = o;
      const r = await api('/api/orders', { method: 'POST', code, body: { order: addHistory(rest, `Diimpor dari data lokal (no. lama ${id})`) } });
      if (r.status === 201) ok++; else break;
    }
    if (ok === local.length) { localStorage.removeItem(STORAGE_KEY); setLocalCount(0); notify(`${ok} order diunggah ke server.`); }
    else notify(`Hanya ${ok} dari ${local.length} order terunggah. Coba lagi.`, 'error');
    await load(code, true);
  }
  function exportCSV(list, name) {
    const blob = new Blob([toCSV(reportRows(list, today))], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}_${today}.csv`; a.click(); URL.revokeObjectURL(a.href);
    notify(`${list.length} order diekspor.`);
  }
  function loadDemo() { commit(buildDemoOrders(today).map(o => addHistory(migrateOrder(o), 'Data contoh dimuat'))); notify('Data contoh dimuat.'); }

  const order = orders.find(o => o.id === selected);
  return <div className="shell">
    <aside className={'sidebar ' + (navOpen ? 'open' : '')}>
      <div className="brand"><img src="/logo-vertical.png" alt="Vertical Karoseri" className="brandlogo" /><div className="brandtext"><b>VERTICAL<span>.ID</span></b><small>Operational Control Center</small></div></div>
      <div className="side-label">Operasional</div>
      <Nav active={page === 'dashboard'} icon="▦" text="Dashboard" onClick={() => go('dashboard')} />
      <Nav active={page === 'orders' || page === 'order'} icon="▤" text="Orders" onClick={() => go('orders')} />
      <Nav active={page === 'shipping'} icon="◈" text="Pengiriman" onClick={() => go('shipping')} />
      <Nav active={page === 'products'} icon="□" text="Sparepart" onClick={() => go('products')} />
      <div className="side-label report-label">Laporan</div>
      <Nav active={page === 'reports'} icon="▥" text="Laporan" onClick={() => go('reports')} />
      <div className="sidebar-bottom"><div className="avatar">A</div><div><b>Admin</b><small>{mode === 'server' ? 'Tersinkron ke server' : mode === 'local' ? 'Mode lokal' : 'Operational'}</small></div></div>
    </aside>
    {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

    <main className="main">
      <header className="topbar">
        <button className="menu-btn" aria-label="Menu" onClick={() => setNavOpen(true)}>☰</button>
        <div><div className="eyebrow">Vertical Karoseri</div><h1>{PAGE_TITLES[page]}</h1></div>
        <div className="top-actions"><button className="ghost" onClick={() => go('reports')}>↧ Export</button><button className="primary" disabled={!hydrated} onClick={() => setShowForm(true)}>+ Order Baru</button></div>
      </header>

      {mode === 'local' && <div className="warning"><span>ℹ</span><div><b>Mode lokal</b><span>Penyimpanan server belum diaktifkan, jadi order hanya tersimpan di browser ini dan tidak terlihat pengguna lain. Admin perlu mengisi TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN di Vercel lalu redeploy (panduan: README, bagian “Penyimpanan bersama”).</span></div></div>}
      {mode === 'server' && localCount > 0 && <div className="warning"><span>⬆</span><div><b>{localCount} order lama masih di browser ini</b><span>Unggah ke server agar bisa dilihat semua pengguna. Nomor order baru akan diberikan.</span></div><button className="primary" onClick={importLocal}>Unggah ke server</button></div>}
      {loadError && <div className="warning err">⚠ <div><b>Perhatian</b><span>{loadError}</span></div>{mode === 'error' && <button className="primary" onClick={() => load(code)}>Coba lagi</button>}</div>}
      {mode === 'loading' && <div className="empty">Memuat data…</div>}
      {mode === 'auth' && <AccessGate onSubmit={c => { sessionStorage.setItem('vertical-code', c); setCode(c); load(c); }} />}
      {hydrated && <>
        {page === 'dashboard' && <Dashboard orders={orders} filtered={filtered} filters={filters} setFilters={setFilters} pics={pics} today={today} openOrder={openOrder} loadDemo={loadDemo} canDemo={mode === 'local'} newOrder={() => setShowForm(true)} />}
        {page === 'orders' && <Orders orders={filtered} total={orders.length} filters={filters} setFilters={setFilters} pics={pics} today={today} openOrder={openOrder} newOrder={() => setShowForm(true)} />}
        {page === 'order' && <OrderDetail order={order} today={today} toggleItem={toggleItem} markSent={markSent} approval={approval} cancel={cancel} setDialog={setDialog} back={() => go('orders')} />}
        {page === 'shipping' && <Shipping orders={orders} today={today} openOrder={openOrder} />}
        {page === 'reports' && <Reports orders={orders} today={today} pics={pics} exportCSV={exportCSV} openOrder={openOrder} />}
        {page === 'products' && <ProductsPage />}
      </>}
    </main>

    {showForm && <OrderForm onClose={() => setShowForm(false)} onSave={createOrder} />}
    {dialog && <Confirm dialog={dialog} close={() => setDialog(null)} />}
    {toast && <div className={'toast ' + toast.type} role="status">{toast.type === 'error' ? '✕' : '✓'} {toast.text}</div>}
  </div>;
}

function AccessGate({ onSubmit }) {
  const [v, setV] = useState('');
  return <section className="panel gate"><h2>Masukkan kode akses</h2><p>Data order dilindungi. Minta kode akses ke admin Vertical.</p>
    <input type="password" aria-label="Kode akses" value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && v && onSubmit(v)} autoFocus />
    <button className="primary" disabled={!v} onClick={() => onSubmit(v)}>Buka</button></section>;
}

function Nav({ active, icon, text, onClick }) { return <button className={'nav ' + (active ? 'active' : '')} onClick={onClick}><span>{icon}</span><em>{text}</em></button>; }
function Empty({ text, children }) { return <div className="empty">{text}{children}</div>; }
function Tone({ tone, children }) { return <span className={'badge ' + tone}>{children}</span>; }
function StatusBadge({ o, today }) { const s = orderStatus(o, today); return <Tone tone={statusTone(s)}>{s}</Tone>; }
function RiskBadge({ o, today }) { const r = riskLevel(o, today); return <Tone tone={riskTone(r)}>{r}</Tone>; }
function Bar({ value }) { return <div className={'bar' + (value === 100 ? ' full' : '')}><i style={{ width: value + '%' }} /></div>; }
function Info({ k, v, danger }) { return <div className="info"><span>{k}</span><b className={danger ? 'red' : ''}>{v}</b></div>; }

function Confirm({ dialog, close }) {
  return <div className="modal-bg" role="dialog" aria-modal="true"><div className="modal small">
    <h2>{dialog.title}</h2><p className="dlg-body">{dialog.body}</p>
    {dialog.input && <textarea className="note" placeholder={dialog.input} value={dialog.value || ''} onChange={e => dialog.set(e.target.value)} />}
    <div className="modal-actions"><button className="ghost" onClick={close}>Batal</button>
      <button className={dialog.danger ? 'danger-btn' : 'primary'} onClick={() => { dialog.onConfirm(dialog.value); close(); }}>{dialog.confirm}</button></div>
  </div></div>;
}

function FilterBar({ filters, setFilters, pics, compact }) {
  const set = (k, v) => setFilters({ ...filters, [k]: v });
  const active = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  return <div className="filter-bar">
    {!compact && <label>Kirim dari<input type="date" value={filters.from} onChange={e => set('from', e.target.value)} /></label>}
    {!compact && <label>Sampai<input type="date" value={filters.to} onChange={e => set('to', e.target.value)} /></label>}
    <label>Status<select value={filters.status} onChange={e => set('status', e.target.value)}><option value="all">Semua</option>{Object.values(STATUS).map(s => <option key={s}>{s}</option>)}</select></label>
    <label>Pengiriman<select value={filters.delivery} onChange={e => set('delivery', e.target.value)}><option value="all">Semua</option>{['Belum Siap', 'Siap Dikirim', 'Terkirim', 'Dibatalkan'].map(s => <option key={s}>{s}</option>)}</select></label>
    <label>PIC<select value={filters.pic} onChange={e => set('pic', e.target.value)}><option value="all">Semua</option>{pics.map(p => <option key={p}>{p}</option>)}</select></label>
    <label>Prioritas<select value={filters.priority} onChange={e => set('priority', e.target.value)}><option value="all">Semua</option>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    <label>Risiko<select value={filters.risk} onChange={e => set('risk', e.target.value)}><option value="all">Semua</option>{Object.values(RISK).map(r => <option key={r}>{r}</option>)}</select></label>
    {active && <button className="linkbtn reset" onClick={() => setFilters(EMPTY_FILTERS)}>Reset filter</button>}
  </div>;
}

function Kpi({ id, title, value, tone, suffix, compact }) {
  return <div className={'stat ' + (tone || '') + (compact ? ' compact' : '')} title={KPI_DEFINITIONS[id]}><div><div className="stat-title">{title}</div><strong>{value}{suffix}</strong>{!compact && <small>{KPI_DEFINITIONS[id]}</small>}</div></div>;
}

function BusArt() {
  return <svg className="bus-art" viewBox="0 0 520 170" role="img" aria-label="Ilustrasi bus">
    <defs><clipPath id="bodyclip"><rect x="14" y="22" width="480" height="112" rx="22" /></clipPath></defs>
    <g clipPath="url(#bodyclip)"><rect x="14" y="22" width="480" height="112" fill="#f4f6f8" />
      <rect x="14" y="98" width="480" height="36" fill="#ffb81c" /><path d="M14 98 L494 98" stroke="#14181d" strokeWidth="3" />
      <path d="M330 134 L372 98 L420 98 L378 134Z M392 134 L434 98 L482 98 L440 134Z" fill="#14181d" opacity=".9" /></g>
    <rect x="34" y="40" width="64" height="42" rx="6" fill="#14181d" /><rect x="108" y="40" width="64" height="42" rx="6" fill="#14181d" />
    <rect x="182" y="40" width="64" height="42" rx="6" fill="#14181d" /><rect x="256" y="40" width="64" height="42" rx="6" fill="#14181d" />
    <rect x="330" y="40" width="64" height="42" rx="6" fill="#14181d" /><path d="M408 40 H462 Q478 40 482 56 L486 82 H408Z" fill="#14181d" />
    <rect x="22" y="104" width="10" height="14" rx="3" fill="#c0392b" /><rect x="480" y="106" width="10" height="12" rx="3" fill="#fff6d6" />
    <g fill="#14181d"><circle cx="110" cy="136" r="26" /><circle cx="400" cy="136" r="26" /></g>
    <g fill="#8a95a3"><circle cx="110" cy="136" r="12" /><circle cx="400" cy="136" r="12" /></g>
    <g fill="#14181d"><circle cx="110" cy="136" r="4" /><circle cx="400" cy="136" r="4" /></g>
  </svg>;
}

function Hero({ orders, today, alerts, k, newOrder }) {
  const hour = Number(new Intl.DateTimeFormat('id-ID', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date()));
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const dateText = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(today + 'T00:00:00Z'));
  const critical = alerts.filter(a => a.level === 'critical').length;
  return <section className="hero">
    <div className="hero-copy">
      <p className="hero-date">{greet}, {dateText}</p>
      <h2>{critical > 0 ? `${critical} order butuh tindakan hari ini` : 'Tidak ada order kritis hari ini'}</h2>
      <div className="hero-figs">
        <div><b>{k.active}</b><span>order aktif</span></div>
        <div><b>{k.deliveringToday}</b><span>dikirim hari ini</span></div>
        <div><b>{k.ready}</b><span>siap dikirim</span></div>
      </div>
      <div className="hero-actions"><button className="amber" onClick={newOrder}>+ Buat order</button></div>
    </div>
    <div className="hero-road"><BusArt /><div className="lane" /></div>
  </section>;
}

function Dashboard({ orders, filtered, filters, setFilters, pics, today, openOrder, loadDemo, canDemo, newOrder }) {
  const k = useMemo(() => computeKpis(filtered, today), [filtered, today]);
  const alerts = useMemo(() => buildAlerts(filtered, today), [filtered, today]);
  const allAlerts = useMemo(() => buildAlerts(orders, today), [orders, today]);
  const allK = useMemo(() => computeKpis(orders, today), [orders, today]);
  if (!orders.length) return <section className="panel"><Empty text="Belum ada order. Buat order pertama untuk mulai memantau.">
    <div className="empty-actions"><button className="primary" onClick={newOrder}>+ Buat Order</button>{canDemo && <button className="ghost" onClick={loadDemo}>Muat Data Contoh</button>}</div></Empty></section>;
  return <>
    <Hero orders={orders} today={today} alerts={allAlerts} k={allK} newOrder={newOrder} />
    <FilterBar filters={filters} setFilters={setFilters} pics={pics} />
    <section className="kpi-priority">
      <Kpi id="overdue" title="Terlambat" value={k.overdue} tone={k.overdue ? 'danger' : 'calm'} />
      <Kpi id="atRisk" title="Berisiko terlambat" value={k.atRisk} tone={k.atRisk ? 'warn' : 'calm'} />
      <Kpi id="deliveringToday" title="Pengiriman hari ini" value={k.deliveringToday} tone="info" />
      <Kpi id="pendingApproval" title="Menunggu approval" value={k.pendingApproval} tone="purple" />
    </section>
    <section className="kpi-row">
      <Kpi compact id="active" title="Order aktif" value={k.active} />
      <Kpi compact id="new" title="Order baru" value={k.new} />
      <Kpi compact id="processing" title="Diproses" value={k.processing} />
      <Kpi compact id="ready" title="Siap dikirim" value={k.ready} />
      <Kpi compact id="done" title="Selesai" value={k.done} />
      <Kpi compact id="completionPct" title="Penyelesaian" value={k.completionPct} suffix="%" />
    </section>
    <section className="grid2">
      <div className="panel"><div className="panel-head"><div><h2>Peringatan operasional</h2><p>H-{DEFAULT_RULES.warnDays} waspada, H-{DEFAULT_RULES.highRiskDays} risiko tinggi, hari ini dan terlambat kritis</p></div><span className="muted">{alerts.length} peringatan</span></div>
        {alerts.length === 0 ? <Empty text="Tidak ada peringatan untuk filter ini." /> : alerts.slice(0, 8).map(a => <div key={a.id} className={'alert ' + a.level}>
          <div className="alert-top"><Tone tone={a.level === 'critical' ? 'red' : a.level === 'warning' ? 'yellow' : 'blue'}>{{ critical: 'Kritis', warning: 'Peringatan', info: 'Info' }[a.level]}</Tone><b>{a.orderId}</b><span className="alert-prio">Prioritas {a.priority}</span></div>
          <p className="alert-title">{a.title}</p>{a.detail && <p className="alert-detail">{a.detail}</p>}
          <p className="alert-meta">Tenggat {fmt(a.dueDate)} · PIC: {a.pic}</p><p className="alert-action">➜ {a.action}</p>
          <button className="linkbtn" onClick={() => openOrder(orders.find(o => o.id === a.orderId))}>Buka detail →</button></div>)}
        {alerts.length > 8 && <p className="muted more">+{alerts.length - 8} peringatan lain</p>}
      </div>
      <DeliveryTimeline orders={filtered} today={today} openOrder={openOrder} />
    </section>
    <section className="panel"><div className="panel-head"><div><h2>Pemantauan Progres</h2><p>Progres pekerjaan, pengiriman, dan approval dipisahkan</p></div><span className="muted">{filtered.length} order</span></div>
      <OrderTable orders={filtered.slice(0, 8)} today={today} openOrder={openOrder} /></section>
  </>;
}

function DeliveryTimeline({ orders, today, openOrder }) {
  const [sort, setSort] = useState('date');
  const list = useMemo(() => {
    const l = orders.filter(o => !o.cancelled && !o.sent && o.approval?.state !== APPROVAL.APPROVED);
    const riskRank = { [RISK.LATE]: 0, [RISK.HIGH]: 1, [RISK.WATCH]: 2, [RISK.SAFE]: 3, [RISK.NONE]: 4 };
    const by = { date: (a, b) => a.deliveryDate.localeCompare(b.deliveryDate), risk: (a, b) => riskRank[riskLevel(a, today)] - riskRank[riskLevel(b, today)] || a.deliveryDate.localeCompare(b.deliveryDate), status: (a, b) => orderStatus(a, today).localeCompare(orderStatus(b, today)) };
    return [...l].sort(by[sort]).slice(0, 8);
  }, [orders, sort, today]);
  return <div className="panel"><div className="panel-head"><div><h2>Pengiriman Mendatang</h2><p>Belum terkirim, diurutkan sesuai pilihan</p></div>
    <select aria-label="Urutkan" value={sort} onChange={e => setSort(e.target.value)} className="mini-select"><option value="date">Tanggal</option><option value="risk">Risiko</option><option value="status">Status</option></select></div>
    {list.length === 0 ? <Empty text="Tidak ada pengiriman tertunda." /> : list.map(o => { const miss = missingItems(o); return <div className="order-row" key={o.id}>
      <div className="grow"><b>{o.id}</b><span>{orderKindLabel(o)} · PIC {o.pic || '-'}</span>{miss.length > 0 && <span className="short">Kurang {miss.length} item: {miss.slice(0, 2).map(i => i.name).join(', ')}{miss.length > 2 ? '…' : ''}</span>}</div>
      <div className="row-progress"><b>{progress(o)}%</b><Bar value={progress(o)} /></div>
      <div className="deadline"><b className={daysUntil(o.deliveryDate, today) <= 2 ? 'red' : ''}>{deadlineLabel(o, today)}</b><span>{fmt(o.deliveryDate)}</span><RiskBadge o={o} today={today} /></div>
      <button className="linkbtn" onClick={() => openOrder(o)}>Detail →</button></div>; })}
  </div>;
}

function OrderTable({ orders, today, openOrder }) {
  if (!orders.length) return <Empty text="Tidak ada order yang cocok." />;
  return <div className="table-wrap"><table><thead><tr><th>Order</th><th>Jenis</th><th>PIC</th><th>Tgl kirim</th><th>Pekerjaan</th><th>Pengiriman</th><th>Approval</th><th>Status</th><th></th></tr></thead><tbody>
    {orders.map(o => <tr key={o.id}><td><b>{o.id}</b>{o.priority === 'high' && <small className="red">Prioritas tinggi</small>}</td><td>{orderKindLabel(o)}</td><td>{o.pic || '-'}</td>
      <td>{fmt(o.deliveryDate)}<small>{deadlineLabel(o, today)}</small></td>
      <td><div className="table-progress"><b>{progress(o)}%</b><Bar value={progress(o)} /></div></td><td>{deliveryStatus(o)}</td>
      <td>{APPROVAL_LABEL[o.approval?.state || 'draft']}</td><td><StatusBadge o={o} today={today} /></td><td><button className="linkbtn" onClick={() => openOrder(o)}>Buka</button></td></tr>)}
  </tbody></table></div>;
}

function Orders({ orders, total, filters, setFilters, pics, today, openOrder, newOrder }) {
  const [sort, setSort] = useState('date');
  const [pageNo, setPageNo] = useState(1);
  const size = 15;
  const sorted = useMemo(() => [...orders].sort({ date: (a, b) => a.deliveryDate.localeCompare(b.deliveryDate), id: (a, b) => b.id.localeCompare(a.id), progress: (a, b) => progress(a) - progress(b) }[sort]), [orders, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / size)); const p = Math.min(pageNo, pages);
  return <section className="panel"><div className="panel-head"><div><h2>Semua Order</h2><p>Klik order untuk checklist, pengiriman, dan approval.</p></div><button className="primary" onClick={newOrder}>+ Buat Order</button></div>
    <div className="filters"><input aria-label="Cari" placeholder="Cari nomor order atau PIC…" value={filters.query} onChange={e => { setFilters({ ...filters, query: e.target.value }); setPageNo(1); }} />
      <select aria-label="Urutkan" value={sort} onChange={e => setSort(e.target.value)} className="mini-select"><option value="date">Urut tgl kirim</option><option value="id">Urut terbaru</option><option value="progress">Urut progres</option></select><span>{orders.length} dari {total}</span></div>
    <FilterBar filters={filters} setFilters={setFilters} pics={pics} />
    {total === 0 ? <Empty text="Belum ada order." /> : <OrderTable orders={sorted.slice((p - 1) * size, p * size)} today={today} openOrder={openOrder} />}
    {pages > 1 && <div className="pager"><button className="ghost" disabled={p <= 1} onClick={() => setPageNo(p - 1)}>← Sebelumnya</button><span>Halaman {p} / {pages}</span><button className="ghost" disabled={p >= pages} onClick={() => setPageNo(p + 1)}>Berikutnya →</button></div>}
  </section>;
}

function OrderDetail({ order, today, toggleItem, markSent, approval, cancel, setDialog, back }) {
  if (!order) return <><button className="back" onClick={back}>← Kembali ke Orders</button><Empty text="Order tidak ditemukan." /></>;
  const p = progress(order), d = daysUntil(order.deliveryDate, today), complete = isChecklistComplete(order);
  const st = order.approval?.state || APPROVAL.DRAFT; const locked = order.sent || order.cancelled || st === APPROVAL.APPROVED;
  const ask = (title, body, input, confirm, run, danger) => { const dlg = { title, body, input, confirm, danger, value: '', onConfirm: v => run(v) }; dlg.set = v => setDialog({ ...dlg, value: v, set: dlg.set }); setDialog(dlg); };
  return <>
    <button className="back" onClick={back}>← Kembali ke Orders</button>
    <section className="detail-hero"><div><span className="eyebrow">Detail order</span><h2>{order.id}</h2><p>{orderKindLabel(order)} · Dibuat {fmt(order.orderDate)} · PIC {order.pic || '-'}</p></div><div className="hero-badges"><StatusBadge o={order} today={today} /><RiskBadge o={order} today={today} /></div></section>
    <section className="detail-grid"><div>
      <div className="panel"><div className="panel-head"><div><h2>Checklist Pekerjaan</h2><p>{locked ? 'Checklist dikunci.' : 'Centang barang yang sudah siap.'}</p></div><div className="big-progress"><b>{p}%</b><span>{relevantItems(order).filter(i => i.checked).length}/{relevantItems(order).length} item</span></div></div>
        {!order.cancelled && !order.sent && st !== APPROVAL.APPROVED && d !== null && d <= 5 && !complete && <div className="warning">⚠ <div><b>{d < 0 ? `Terlambat ${-d} hari` : d === 0 ? 'Tenggat hari ini' : `H-${d}: pengecekan barang`}</b><span>{missingItems(order).length} item belum diceklis.</span></div></div>}
        {order.cancelled && <div className="warning err">✕ <div><b>Order dibatalkan</b><span>{order.cancelReason}</span></div></div>}
        <div className="items">{order.items.length === 0 ? <Empty text="Checklist kosong." /> : order.items.map(i => <label className={'item ' + (i.checked ? 'checked' : '') + (locked ? ' locked' : '')} key={i.id}><input type="checkbox" checked={i.checked} disabled={locked} onChange={() => toggleItem(order.id, i.id)} /><span className="check">✓</span><div className="grow"><b>{i.name}</b><small>{i.part || '—'}</small></div><strong>{i.qty} {i.unit || ''}</strong><span className="item-status">{i.checked ? 'Siap' : 'Belum siap'}</span></label>)}</div>
        <div className="actionbar"><button className="ghost" onClick={() => window.print()}>🖨 Cetak / Simpan PDF</button>
          {!order.cancelled && st !== APPROVAL.APPROVED && <button className="danger-ghost" onClick={() => ask('Batalkan order', `Batalkan ${order.id}? Tindakan ini dicatat di riwayat.`, 'Alasan pembatalan (wajib)', 'Batalkan Order', v => cancel(order.id, v), true)}>Batalkan</button>}
          {!order.sent && !order.cancelled && <button className="secondary" disabled={!complete} onClick={() => markSent(order.id)}>✓ Konfirmasi Pengiriman</button>}</div></div>
      <div className="panel"><div className="panel-head"><div><h2>Approval</h2><p>Status: <b>{APPROVAL_LABEL[st]}</b>{order.approval?.by && st !== APPROVAL.DRAFT ? ` · oleh ${order.approval.by}${order.approval.at ? ', ' + fmtTime(order.approval.at) : ''}` : ''}</p></div></div>
        {order.approval?.note && <p className="note-text">Catatan: {order.approval.note}</p>}
        {!order.cancelled && <div className="actionbar left">
          {[APPROVAL.DRAFT, APPROVAL.REJECTED, APPROVAL.REVISION].includes(st) && <button className="primary" disabled={!complete || !order.sent} onClick={() => approval(order.id, 'submit')}>Ajukan Approval</button>}
          {st === APPROVAL.SUBMITTED && <button className="primary" onClick={() => approval(order.id, 'review')}>Mulai Tinjau</button>}
          {st === APPROVAL.REVIEW && <><button className="primary" onClick={() => ask('Setujui order', `Setujui ${order.id}?`, null, 'Setujui', () => approval(order.id, 'approve'))}>Setujui</button>
            <button className="ghost" onClick={() => ask('Minta revisi', 'Jelaskan yang perlu diperbaiki.', 'Catatan revisi (wajib)', 'Kirim', v => approval(order.id, 'revise', v))}>Minta Revisi</button>
            <button className="danger-ghost" onClick={() => ask('Tolak order', 'Jelaskan alasan penolakan.', 'Alasan penolakan (wajib)', 'Tolak', v => approval(order.id, 'reject', v), true)}>Tolak</button></>}
          {[APPROVAL.DRAFT, APPROVAL.REJECTED, APPROVAL.REVISION].includes(st) && (!complete || !order.sent) && <span className="muted">Approval terbuka setelah checklist lengkap dan pengiriman dikonfirmasi.</span>}
        </div>}
      </div>
    </div>
    <div className="side-stack">
      <div className="panel"><h2>Informasi</h2><Info k="Jenis" v={orderKindLabel(order)} /><Info k="Tanggal Order" v={fmt(order.orderDate)} /><Info k="Mulai Pengerjaan" v={fmt(order.workStartDate)} /><Info k="Tanggal Pengiriman" v={`${fmt(order.deliveryDate)} (${deadlineLabel(order, today)})`} danger={d !== null && d <= 2 && !order.sent} /><Info k="Status Pengiriman" v={deliveryStatus(order)} /><Info k="Prioritas" v={PRIORITY_LABEL[order.priority || 'normal']} /><Info k="Pelanggan" v={order.customer || '-'} /><Info k="Catatan" v={order.notes || '-'} /></div>
      <div className="panel"><h2>Surat Jalan</h2>{order.sent ? <><p className="muted">Pengiriman dikonfirmasi. Surat jalan siap dicetak.</p><button className="primary full" onClick={() => window.print()}>Cetak Surat Jalan</button></> : <p className="muted">Tersedia setelah pengiriman dikonfirmasi.</p>}</div>
      <div className="panel"><h2>Riwayat Perubahan</h2>{(order.history || []).length === 0 ? <p className="muted">Belum ada riwayat.</p> : <ul className="history">{[...order.history].reverse().slice(0, 20).map((h, n) => <li key={n}><b>{h.action}</b><span>{h.by} · {fmtTime(h.at)}</span></li>)}</ul>}</div>
    </div></section>
    <OrderPrint order={order} today={today} />
  </>;
}

function Shipping({ orders, today, openOrder }) {
  const [tab, setTab] = useState('ready');
  const lists = { ready: orders.filter(o => !o.cancelled && !o.sent && isChecklistComplete(o)), prep: orders.filter(o => !o.cancelled && !o.sent && !isChecklistComplete(o)), sent: orders.filter(o => o.sent && !o.cancelled) };
  const sorted = [...lists[tab]].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  return <section className="panel"><div className="panel-head"><div><h2>Pengiriman</h2><p>Pantau kesiapan dan konfirmasi pengiriman.</p></div></div>
    <div className="tabs">{[['ready', 'Siap Dikirim'], ['prep', 'Dalam Persiapan'], ['sent', 'Terkirim']].map(([k, l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l} <em>{lists[k].length}</em></button>)}</div>
    <OrderTable orders={sorted} today={today} openOrder={openOrder} /></section>;
}

function Reports({ orders, today, pics, exportCSV, openOrder }) {
  const [f, setF] = useState({ ...EMPTY_FILTERS, from: today.slice(0, 8) + '01', to: today });
  const list = useMemo(() => filterOrders(orders, f, today), [orders, f, today]);
  const k = computeKpis(list, today);
  const applyPreset = days => { const [y, m, d] = today.split('-').map(Number); const from = new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10); setF({ ...f, from, to: today }); };
  const onTime = list.filter(o => o.sent && o.sentAt && o.sentAt.slice(0, 10) <= o.deliveryDate).length;
  const sentCount = list.filter(o => o.sent && o.sentAt).length;
  return <><section className="panel report"><div className="panel-head"><div><h2>Laporan</h2><p>Berdasarkan tanggal pengiriman. Ekspor mengikuti filter yang aktif.</p></div>
    <div className="export-actions"><button className="ghost" onClick={() => window.print()}>📄 PDF / Print</button><button className="primary" disabled={!list.length} onClick={() => exportCSV(list, 'Laporan_Vertical')}>📊 Excel / CSV</button></div></div>
    <div className="presets"><button className="ghost" onClick={() => applyPreset(0)}>Hari ini</button><button className="ghost" onClick={() => applyPreset(6)}>7 hari</button><button className="ghost" onClick={() => applyPreset(29)}>30 hari</button><button className="ghost" onClick={() => applyPreset(364)}>1 tahun</button></div>
    <FilterBar filters={f} setFilters={setF} pics={pics} />
    <div className="report-summary">
      <Kpi id="active" title="Order Aktif" value={k.active} /><Kpi id="overdue" title="Terlambat" value={k.overdue} tone={k.overdue ? 'danger' : ''} />
      <Kpi id="done" title="Selesai" value={k.done} /><Kpi id="completionPct" title="Penyelesaian" value={k.completionPct} suffix="%" /></div>
    <p className="muted ontime">Ketepatan waktu kirim: {sentCount ? `${onTime}/${sentCount} order (${Math.round(onTime / sentCount * 100)}%)` : 'belum ada pengiriman terkonfirmasi pada periode ini'}</p>
    <OrderTable orders={list} today={today} openOrder={openOrder} /></section>
    <ReportPrint list={list} k={k} f={f} today={today} onTime={onTime} sentCount={sentCount} />
  </>;
}

function ProductsPage() {
  const groups = ['BIGBUS JB5', 'MEDIUM JB5'];
  return <section className="panel"><div className="panel-head"><div><h2>Master Produk</h2><p>Daftar produk interior bus JB5. Pelacakan stok belum tersedia.</p></div><span className="muted">{productCatalog.length} produk</span></div>
    {groups.map(model => <div className="product-group" key={model}><div className="product-group-head"><h3>{model}</h3><span>{productCatalog.filter(p => p.model === model).length} item</span></div><div className="table-wrap"><table><thead><tr><th>No</th><th>Nama barang</th><th>Satuan</th></tr></thead><tbody>{productCatalog.filter(p => p.model === model).map(p => <tr key={model + p.no}><td>{p.no}</td><td><b>{p.name}</b></td><td>{p.unit}</td></tr>)}</tbody></table></div></div>)}</section>;
}

const UNITS = ['PC', 'SET', 'UNIT', 'BOX', 'METER', 'KG'];

function OrderForm({ onClose, onSave }) {
  const [kind, setKind] = useState('eceran');
  const [f, setF] = useState({ pic: '', customer: '', priority: 'normal', notes: '' });
  const [model, setModel] = useState(MODELS[0]);
  const [setQty, setSetQty] = useState(1);
  const [items, setItems] = useState([{ name: '', part: '', qty: 1, unit: 'PC' }]);
  const [errors, setErrors] = useState([]); const [busy, setBusy] = useState(false);
  const [orderDate, setOrderDate] = useState(todayISO());
  const dates = defaultOrderDates(orderDate);
  const setItemsList = useMemo(() => buildSetItems(model, setQty), [model, setQty]);
  const set = (k, v) => setF({ ...f, [k]: v });
  const patch = (n, o) => setItems(items.map((x, j) => (j === n ? { ...x, ...o } : x)));
  async function save() {
    if (busy) return; setBusy(true);
    const payload = { ...f, ...defaultOrderDates(orderDate), kind, ...(kind === 'set' ? { model, setQty, items: setItemsList } : { items: items.map(i => ({ ...i, name: i.name.trim() })) }) };
    try { setErrors(await onSave(payload)); } finally { setBusy(false); }
  }
  return <div className="modal-bg" role="dialog" aria-modal="true"><div className="modal wide"><div className="modal-head"><div><span className="eyebrow">Order baru</span><h2>Buat Order</h2></div><button className="close" aria-label="Tutup" onClick={onClose}>×</button></div>
    {errors.length > 0 && <div className="warning err" role="alert">✕ <div>{errors.map(e => <span key={e}>{e}</span>)}</div></div>}
    <div className="auto-box">
      <div><small>Nomor order</small><b>Otomatis</b></div>
      <label className="auto-date"><small>Tanggal order</small><input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} /></label>
      <div><small>Mulai pengerjaan (H+1)</small><b>{dates.workStartDate ? fmt(dates.workStartDate) : '-'}</b></div>
      <div><small>Pengiriman (H+14)</small><b>{dates.deliveryDate ? fmt(dates.deliveryDate) : '-'}</b></div>
    </div>
    <div className="form-grid">
      <label>PIC<input value={f.pic} onChange={e => set('pic', e.target.value)} placeholder="Penanggung jawab" /></label>
      <label>Pelanggan<input value={f.customer} onChange={e => set('customer', e.target.value)} placeholder="Opsional" /></label>
      <label>Prioritas<select value={f.priority} onChange={e => set('priority', e.target.value)}>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Catatan<input value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Catatan order" /></label></div>

    <h3>Daftar Produk</h3>
    <div className="seg" role="tablist">
      <button role="tab" aria-selected={kind === 'eceran'} className={kind === 'eceran' ? 'active' : ''} onClick={() => setKind('eceran')}>Eceran</button>
      <button role="tab" aria-selected={kind === 'set'} className={kind === 'set' ? 'active' : ''} onClick={() => setKind('set')}>Set</button></div>

    {kind === 'eceran' ? <>
      <p className="muted hint">Ketik nama produk satu per satu sesuai kebutuhan.</p>
      <div className="form-items">{items.map((i, n) => <div className="form-item eceran-row" key={n}>
        <input aria-label="Nama produk" placeholder="Nama produk" value={i.name} onChange={e => patch(n, { name: e.target.value })} />
        <input aria-label="Part number" placeholder="Part number (opsional)" value={i.part} onChange={e => patch(n, { part: e.target.value })} />
        <input aria-label="Jumlah" type="number" min="1" step="1" value={i.qty} onChange={e => patch(n, { qty: Number(e.target.value) })} />
        <select aria-label="Satuan" value={i.unit} onChange={e => patch(n, { unit: e.target.value })}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
        {items.length > 1 && <button className="close sm" aria-label="Hapus baris" onClick={() => setItems(items.filter((_, j) => j !== n))}>×</button>}</div>)}</div>
      <button className="add-line" onClick={() => setItems([...items, { name: '', part: '', qty: 1, unit: 'PC' }])}>+ Tambah Produk</button>
    </> : <>
      <div className="model-pick">{MODELS.map(m => <button key={m} className={model === m ? 'active' : ''} onClick={() => setModel(m)}><b>{m.replace(' JB5', '')}</b><small>{productCatalog.filter(p => p.model === m).length} produk per set</small></button>)}</div>
      <label className="setqty">Jumlah set<input type="number" min="1" step="1" value={setQty} onChange={e => setSetQty(Number(e.target.value))} /></label>
      <p className="muted hint">Semua produk {model} masuk otomatis. {Object.keys(SET_QTY_PER_SET).some(k => k.startsWith(model + '|')) ? 'Satu set berisi 3 partisi.' : ''}</p>
      <div className="table-wrap set-preview"><table><thead><tr><th>No</th><th>Produk</th><th>Jumlah</th></tr></thead><tbody>
        {setItemsList.map((i, n) => <tr key={i.name}><td>{n + 1}</td><td><b>{i.name}</b></td><td>{i.qty} {i.unit}</td></tr>)}</tbody></table></div>
    </>}
    <div className="modal-actions"><button className="ghost" onClick={onClose}>Batal</button><button className="primary" disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan Order'}</button></div></div></div>;
}

/* ===== Dokumen cetak (hanya tampil saat Cetak / Simpan PDF) ===== */
function usePrintStamp() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const h = () => setNow(new Date()); window.addEventListener('beforeprint', h); return () => window.removeEventListener('beforeprint', h); }, []);
  return fmtTime(now.toISOString());
}

function Letterhead({ title, subtitle, docNo }) {
  return <header className="pd-head">
    <img src="/logo-vertical.png" alt="" className="pd-logo" />
    <div className="pd-brand"><b>VERTICAL KAROSERI</b><span>vertical-id.vercel.app</span></div>
    <div className="pd-title"><h1>{title}</h1>{docNo && <p className="pd-docno">{docNo}</p>}{subtitle && <p>{subtitle}</p>}</div>
  </header>;
}

function OrderPrint({ order, today }) {
  const stamp = usePrintStamp();
  const items = relevantItems(order);
  const doneN = items.filter(i => i.checked).length;
  const st = order.approval?.state || APPROVAL.DRAFT;
  const title = order.sent ? 'SURAT JALAN' : 'LEMBAR ORDER';
  const meta = [
    ['Nomor order', order.id], ['Jenis', orderKindLabel(order)],
    ['Tanggal order', fmt(order.orderDate)], ['Mulai pengerjaan', fmt(order.workStartDate)],
    ['Tanggal pengiriman', fmt(order.deliveryDate)], ['Status', orderStatus(order, today)],
    ['PIC', order.pic || '-'], ['Pelanggan', order.customer || '-'],
    ['Prioritas', PRIORITY_LABEL[order.priority || 'normal']], ['Approval', APPROVAL_LABEL[st]],
  ];
  return <div className="print-doc print-order">
    <Letterhead title={title} docNo={order.id} subtitle={order.sent && order.sentAt ? `Dikirim ${fmtTime(order.sentAt)}` : 'Checklist kesiapan barang'} />
    <section className="pd-meta">{meta.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</section>
    <table className="pd-table"><thead><tr><th className="c">No</th><th>Nama barang</th><th>Part number</th><th className="r">Jumlah</th><th className="c">Satuan</th><th className="c">Siap</th><th>Keterangan</th></tr></thead>
      <tbody>{items.map((i, n) => <tr key={i.id}><td className="c">{n + 1}</td><td><b>{i.name}</b></td><td>{i.part || ''}</td><td className="r">{i.qty}</td><td className="c">{i.unit || ''}</td><td className="c"><span className={'cb' + (i.checked ? ' on' : '')}>{i.checked ? '✓' : ''}</span></td><td></td></tr>)}</tbody>
      <tfoot><tr><td colSpan="3" className="r"><b>Total</b></td><td className="r"><b>{items.reduce((a, i) => a + i.qty, 0)}</b></td><td colSpan="3">{items.length} jenis barang · {doneN} siap ({progress(order)}%)</td></tr></tfoot></table>
    {order.notes && <p className="pd-notes"><b>Catatan:</b> {order.notes}</p>}
    {st === APPROVAL.APPROVED && <p className="pd-notes"><b>Disetujui</b> oleh {order.approval.by}{order.approval.at ? `, ${fmtTime(order.approval.at)}` : ''}.</p>}
    <section className="pd-sign">
      {[['Dibuat oleh', order.pic || ''], ['Pengirim', ''], ['Penerima', '']].map(([k, v]) => <div key={k}><span>{k}</span><i>{v}</i><em>Nama &amp; tanda tangan</em><small>Tanggal: ____ / ____ / ______</small></div>)}
    </section>
    <footer className="pd-foot">Dicetak {stamp} WIB · Dokumen ini dibuat dari sistem Vertical.id</footer>
  </div>;
}

function ReportPrint({ list, k, f, today, onTime, sentCount }) {
  const stamp = usePrintStamp();
  const filt = [f.status !== 'all' && `Status: ${f.status}`, f.delivery !== 'all' && `Pengiriman: ${f.delivery}`, f.pic !== 'all' && `PIC: ${f.pic}`, f.priority !== 'all' && `Prioritas: ${PRIORITY_LABEL[f.priority]}`, f.risk !== 'all' && `Risiko: ${f.risk}`, f.query && `Cari: ${f.query}`].filter(Boolean);
  return <div className="print-doc print-report">
    <Letterhead title="LAPORAN ORDER" subtitle={`Periode kirim ${f.from ? fmt(f.from) : 'awal'} – ${f.to ? fmt(f.to) : 'sekarang'}`} />
    {filt.length > 0 && <p className="pd-filter">Filter: {filt.join(' · ')}</p>}
    <section className="pd-kpi">
      {[['Total order', list.length], ['Aktif', k.active], ['Terlambat', k.overdue], ['Selesai', k.done], ['Penyelesaian', k.completionPct + '%'], ['Tepat waktu', sentCount ? `${onTime}/${sentCount}` : '-']].map(([a, b]) => <div key={a}><b>{b}</b><span>{a}</span></div>)}
    </section>
    <table className="pd-table"><thead><tr><th className="c">No</th><th>Order</th><th>Jenis</th><th>PIC</th><th>Tgl order</th><th>Tgl kirim</th><th className="r">Progres</th><th>Pengiriman</th><th>Approval</th><th>Status</th></tr></thead>
      <tbody>{list.map((o, n) => <tr key={o.id}><td className="c">{n + 1}</td><td><b>{o.id}</b></td><td>{orderKindLabel(o)}</td><td>{o.pic || '-'}</td><td>{fmt(o.orderDate)}</td><td>{fmt(o.deliveryDate)}</td><td className="r">{progress(o)}%</td><td>{deliveryStatus(o)}</td><td>{APPROVAL_LABEL[o.approval?.state || 'draft']}</td><td>{orderStatus(o, today)}</td></tr>)}</tbody></table>
    {list.length === 0 && <p className="pd-notes">Tidak ada order pada periode dan filter ini.</p>}
    <footer className="pd-foot">Dicetak {stamp} WIB · Dokumen ini dibuat dari sistem Vertical.id</footer>
  </div>;
}
