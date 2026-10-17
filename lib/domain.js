// Logika bisnis VERTICAL.ID — fungsi murni (tanpa React/DOM) agar bisa diuji.
// Semua perhitungan tanggal memakai zona waktu Asia/Jakarta (WIB) dan hari kalender.

export const TZ = 'Asia/Jakarta';

// Aturan peringatan — dapat dikonfigurasi lewat argumen `rules`.
export const DEFAULT_RULES = {
  warnDays: 5,       // H-5: mulai pengecekan barang (aturan existing)
  highRiskDays: 2,   // H-2: risiko tinggi jika belum lengkap
};

export const STATUS = {
  CANCELLED: 'Dibatalkan',
  DONE: 'Selesai',
  OVERDUE: 'Terlambat',
  PENDING_APPROVAL: 'Menunggu Approval',
  READY: 'Siap Dikirim',
  PROCESSING: 'Diproses',
  NEW: 'Baru',
};

export const APPROVAL = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVISION: 'revision_required',
};
export const APPROVAL_LABEL = {
  draft: 'Draft', submitted: 'Diajukan', under_review: 'Sedang Ditinjau',
  approved: 'Disetujui', rejected: 'Ditolak', revision_required: 'Perlu Revisi',
};

export const RISK = { NONE: 'Selesai', SAFE: 'Aman', WATCH: 'Waspada', HIGH: 'Risiko Tinggi', LATE: 'Terlambat' };
export const PRIORITY_LABEL = { high: 'Tinggi', normal: 'Normal', low: 'Rendah' };

/** Tanggal hari ini (YYYY-MM-DD) di WIB. `now` dapat diinjeksi untuk tes. */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function dayNumber(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Selisih hari kalender (target − hari ini). Negatif = sudah lewat. Null jika tanggal tidak valid. */
export function daysUntil(dateISO, today = todayISO()) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}/.test(String(dateISO))) return null;
  return dayNumber(dateISO) - dayNumber(today);
}

export function relevantItems(order) {
  return (order.items || []).filter(i => !i.cancelled);
}

/** Persentase checklist selesai. Checklist kosong = 0 (bukan 100). */
export function progress(order) {
  const items = relevantItems(order);
  if (!items.length) return 0;
  return Math.round((items.filter(i => i.checked).length / items.length) * 100);
}

export function isChecklistComplete(order) {
  const items = relevantItems(order);
  return items.length > 0 && items.every(i => i.checked);
}

export function isTerminal(order) {
  return !!order.cancelled || order.approval?.state === APPROVAL.APPROVED;
}

/** Status tunggal dengan prioritas konsisten: satu order hanya punya satu status. */
export function orderStatus(order, today = todayISO()) {
  if (order.cancelled) return STATUS.CANCELLED;
  if (order.approval?.state === APPROVAL.APPROVED) return STATUS.DONE;
  const d = daysUntil(order.deliveryDate, today);
  if (d !== null && d < 0) return STATUS.OVERDUE;
  if (isChecklistComplete(order)) {
    return order.sent ? STATUS.PENDING_APPROVAL : STATUS.READY;
  }
  if (relevantItems(order).some(i => i.checked)) return STATUS.PROCESSING;
  return STATUS.NEW;
}

/** Status pengiriman terpisah dari status order. */
export function deliveryStatus(order) {
  if (order.cancelled) return 'Dibatalkan';
  if (order.sent) return 'Terkirim';
  if (isChecklistComplete(order)) return 'Siap Dikirim';
  return 'Belum Siap';
}

/** Tingkat risiko keterlambatan. */
export function riskLevel(order, today = todayISO(), rules = DEFAULT_RULES) {
  if (isTerminal(order)) return RISK.NONE;
  if (order.sent && isChecklistComplete(order)) return RISK.SAFE; // tinggal approval
  const d = daysUntil(order.deliveryDate, today);
  if (d === null) return RISK.WATCH;
  if (d < 0) return RISK.LATE;
  if (isChecklistComplete(order)) return RISK.SAFE;
  if (d <= rules.highRiskDays) return RISK.HIGH;
  if (d <= rules.warnDays) return RISK.WATCH;
  return RISK.SAFE;
}

/** Label tenggat: Terlambat N hari / Hari ini / H-n. */
export function deadlineLabel(order, today = todayISO()) {
  const d = daysUntil(order.deliveryDate, today);
  if (d === null) return '-';
  if (d < 0) return `Terlambat ${-d} hari`;
  if (d === 0) return 'Hari ini';
  return `H-${d}`;
}

/** Item yang belum tersedia/belum diceklis (kekurangan). */
export function missingItems(order) {
  return relevantItems(order).filter(i => !i.checked);
}

/** Approval hanya boleh jika checklist lengkap, belum dibatalkan, belum approved. */
export function canApprove(order) {
  if (order.cancelled) return { ok: false, reason: 'Order sudah dibatalkan.' };
  if (order.approval?.state === APPROVAL.APPROVED) return { ok: false, reason: 'Order sudah disetujui.' };
  if (!isChecklistComplete(order)) return { ok: false, reason: 'Semua barang harus diceklis sebelum approval.' };
  if (!order.sent) return { ok: false, reason: 'Pengiriman harus dikonfirmasi sebelum approval.' };
  return { ok: true };
}

export function canMarkSent(order) {
  if (order.cancelled) return { ok: false, reason: 'Order sudah dibatalkan.' };
  if (order.sent) return { ok: false, reason: 'Pengiriman sudah dikonfirmasi.' };
  if (!isChecklistComplete(order)) return { ok: false, reason: 'Pengiriman belum bisa dikonfirmasi: checklist belum lengkap.' };
  return { ok: true };
}

/**
 * Peringatan operasional berbasis aturan (deterministik).
 * Urutan keparahan: Critical (lewat tenggat / hari ini belum lengkap) >
 * Warning (H-2, H-5, menunggu approval) > Info (order baru).
 */
export function buildAlerts(orders, today = todayISO(), rules = DEFAULT_RULES) {
  const alerts = [];
  for (const o of orders) {
    if (isTerminal(o)) continue;
    const d = daysUntil(o.deliveryDate, today);
    const missing = missingItems(o);
    const base = { orderId: o.id, dueDate: o.deliveryDate, pic: o.pic || 'Belum ditentukan' };
    const missingTxt = missing.length ? `${missing.length} item belum diceklis` : '';
    const complete = isChecklistComplete(o);

    if (d !== null && d < 0) {
      alerts.push({ ...base, id: o.id + ':late', level: 'critical', rule: 'OVERDUE', priority: 'Tinggi',
        title: `Tenggat terlewati ${-d} hari`,
        detail: complete ? 'Checklist lengkap namun belum diselesaikan.' : missingTxt,
        action: complete ? 'Segera konfirmasi pengiriman dan ajukan approval.' : 'Eskalasi ke PIC dan lengkapi barang yang belum tersedia.' });
    } else if (d === 0 && !complete) {
      alerts.push({ ...base, id: o.id + ':today', level: 'critical', rule: 'DUE_TODAY', priority: 'Tinggi',
        title: 'Tenggat hari ini, checklist belum lengkap', detail: missingTxt,
        action: 'Prioritaskan pelengkapan barang hari ini.' });
    } else if (d !== null && d <= rules.highRiskDays && !complete) {
      alerts.push({ ...base, id: o.id + ':h2', level: 'warning', rule: 'H2', priority: 'Tinggi',
        title: `H-${d}: risiko tinggi terlambat`, detail: missingTxt,
        action: 'Pastikan sisa barang tersedia dan jadwalkan pengiriman.' });
    } else if (d !== null && d <= rules.warnDays && !complete) {
      alerts.push({ ...base, id: o.id + ':h5', level: 'warning', rule: 'H5', priority: 'Normal',
        title: `H-${d}: mulai pengecekan barang`, detail: missingTxt,
        action: 'Cek ketersediaan barang dan konfirmasi ke PIC.' });
    } else if (complete && o.sent) {
      alerts.push({ ...base, id: o.id + ':appr', level: 'warning', rule: 'PENDING_APPROVAL', priority: 'Normal',
        title: 'Menunggu approval', detail: 'Pengiriman dikonfirmasi, approval belum diberikan.',
        action: 'Tinjau dan berikan keputusan approval.' });
    } else if (complete && !o.sent && d !== null && d <= rules.warnDays) {
      alerts.push({ ...base, id: o.id + ':ready', level: 'info', rule: 'READY', priority: 'Normal',
        title: 'Siap dikirim', detail: 'Checklist lengkap, pengiriman belum dikonfirmasi.',
        action: 'Buat surat jalan dan konfirmasi pengiriman.' });
    }
    if (o.approval?.state === APPROVAL.REJECTED || o.approval?.state === APPROVAL.REVISION) {
      alerts.push({ ...base, id: o.id + ':rev', level: 'warning', rule: 'REVISION', priority: 'Tinggi',
        title: `Approval: ${APPROVAL_LABEL[o.approval.state]}`, detail: o.approval.note || '',
        action: 'Perbaiki sesuai catatan lalu ajukan ulang.' });
    }
  }
  const rank = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.level] - rank[b.level] || String(a.dueDate).localeCompare(String(b.dueDate)));
}

/** Filter dashboard; semua komponen memakai hasil yang sama. */
export function filterOrders(orders, f = {}, today = todayISO(), rules = DEFAULT_RULES) {
  return orders.filter(o => {
    if (f.from && o.deliveryDate < f.from) return false;
    if (f.to && o.deliveryDate > f.to) return false;
    if (f.status && f.status !== 'all' && orderStatus(o, today) !== f.status) return false;
    if (f.delivery && f.delivery !== 'all' && deliveryStatus(o) !== f.delivery) return false;
    if (f.pic && f.pic !== 'all' && (o.pic || '') !== f.pic) return false;
    if (f.priority && f.priority !== 'all' && (o.priority || 'normal') !== f.priority) return false;
    if (f.risk && f.risk !== 'all' && riskLevel(o, today, rules) !== f.risk) return false;
    if (f.query) {
      const q = f.query.toLowerCase();
      if (!(`${o.id} ${o.po || ''} ${o.pic || ''} ${o.customer || ''}`).toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

/** KPI dengan definisi eksplisit. Setiap order masuk tepat satu status. */
export function computeKpis(orders, today = todayISO(), rules = DEFAULT_RULES) {
  const live = orders.filter(o => !o.cancelled);
  const active = live.filter(o => !isTerminal(o));
  const by = s => live.filter(o => orderStatus(o, today) === s).length;
  const done = live.filter(o => orderStatus(o, today) === STATUS.DONE);
  const totalForPct = live.length;
  return {
    active: active.length,
    new: by(STATUS.NEW),
    processing: by(STATUS.PROCESSING),
    overdue: by(STATUS.OVERDUE),
    atRisk: active.filter(o => [RISK.HIGH, RISK.WATCH].includes(riskLevel(o, today, rules))).length,
    ready: by(STATUS.READY),
    deliveringToday: active.filter(o => daysUntil(o.deliveryDate, today) === 0).length,
    pendingApproval: by(STATUS.PENDING_APPROVAL),
    done: done.length,
    completionPct: totalForPct ? Math.round((done.length / totalForPct) * 100) : 0,
  };
}

export const KPI_DEFINITIONS = {
  active: 'Order yang belum Selesai dan tidak Dibatalkan.',
  new: 'Belum ada barang diceklis dan tenggat belum lewat.',
  processing: 'Minimal satu barang diceklis, checklist belum lengkap, tenggat belum lewat.',
  overdue: 'Tenggat lewat dan order belum disetujui. Tidak dihitung di status lain.',
  atRisk: 'Aktif, checklist belum lengkap, tenggat ≤ H-5 (Waspada) atau ≤ H-2 (Risiko Tinggi).',
  ready: 'Checklist lengkap, pengiriman belum dikonfirmasi, tenggat belum lewat.',
  deliveringToday: 'Aktif dengan tanggal kirim hari ini (WIB).',
  pendingApproval: 'Checklist lengkap dan pengiriman dikonfirmasi, menunggu keputusan approval.',
  done: 'Order dengan approval Disetujui.',
  completionPct: 'Order Selesai ÷ seluruh order tidak dibatalkan.',
};

/** Migrasi data localStorage lama (approved:boolean) ke model baru. Idempoten. */
export function migrateOrder(o) {
  const items = (o.items || []).map((i, n) => ({ id: i.id ?? n + 1, ...i, qty: Number(i.qty) > 0 ? Number(i.qty) : 1 }));
  const approval = o.approval || (o.approved
    ? { state: APPROVAL.APPROVED, by: 'Admin (data lama)', at: null, note: '' }
    : { state: APPROVAL.DRAFT, by: null, at: null, note: '' });
  const orderDate = o.orderDate || '';
  return {
    pic: '', priority: 'normal', customer: '', notes: '', cancelled: false, history: [], kind: 'eceran',
    workStartDate: orderDate ? addDays(orderDate, 1) : '',
    ...o, items, approval, sent: !!o.sent, approved: approval.state === APPROVAL.APPROVED,
  };
}

export function addHistory(order, action, by = 'Admin', now = new Date()) {
  return { ...order, history: [...(order.history || []), { at: now.toISOString(), by, action }] };
}

/** Tambah n hari kalender pada tanggal ISO (YYYY-MM-DD). */
export function addDays(iso, n) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Dari tanggal order: mulai pengerjaan = H+1, pengiriman = H+14. Tanggal order diinput pengguna (default hari ini). */
export const WORK_START_OFFSET_DAYS = 1;
export const DELIVERY_OFFSET_DAYS = 14;
export function defaultOrderDates(today = todayISO()) {
  return {
    orderDate: today,
    workStartDate: addDays(today, WORK_START_OFFSET_DAYS),
    deliveryDate: addDays(today, DELIVERY_OFFSET_DAYS),
  };
}

export const MODELS = ['BIGBUS JB5', 'MEDIUM JB5'];

export function orderKindLabel(o) {
  return o.kind === 'set' ? `Set ${o.model || ''} ×${o.setQty || 1}`.replace('  ', ' ') : 'Eceran';
}

/** Validasi order baru. Mengembalikan daftar pesan error (kosong = valid). */
export function validateOrder(data) {
  const errors = [];
  if (!data.orderDate) errors.push('Tanggal order wajib diisi.');
  if (!data.deliveryDate) errors.push('Tanggal pengiriman wajib diisi.');
  if (data.orderDate && data.deliveryDate && data.deliveryDate < data.orderDate)
    errors.push('Tanggal pengiriman tidak boleh sebelum tanggal order.');
  if (data.kind === 'set') {
    if (!MODELS.includes(data.model)) errors.push('Model bus wajib dipilih.');
    if (!Number.isInteger(data.setQty) || data.setQty < 1) errors.push('Jumlah set harus bilangan bulat ≥ 1.');
  } else if (data.kind !== 'eceran') {
    errors.push('Jenis order tidak valid.');
  }
  if (!data.items || !data.items.length) errors.push('Minimal satu produk.');
  (data.items || []).forEach((i, n) => {
    if (!i.name || !String(i.name).trim()) errors.push(`Produk baris ${n + 1} belum diisi.`);
    if (!Number.isInteger(i.qty) || i.qty < 1) errors.push(`Jumlah baris ${n + 1} harus bilangan bulat ≥ 1.`);
  });
  return errors;
}

/** Pemeriksaan konsistensi data tersimpan (dipakai juga oleh server). */
export function validateStored(order) {
  const errors = [];
  const items = order.items || [];
  if (items.length > 300) errors.push('Jumlah item terlalu banyak.');
  const complete = items.length > 0 && items.every(i => i.checked);
  if (order.sent && !complete) errors.push('Pengiriman tidak valid: checklist belum lengkap.');
  const st = order.approval?.state;
  if (st && !Object.values(APPROVAL).includes(st)) errors.push('Status approval tidak dikenal.');
  if (st === APPROVAL.APPROVED && !(complete && order.sent)) errors.push('Approval tidak valid: checklist/pengiriman belum lengkap.');
  if (st === APPROVAL.APPROVED && order.cancelled) errors.push('Order yang disetujui tidak dapat dibatalkan.');
  return errors;
}

/** Nomor order otomatis untuk mode lokal (server memakai sequence database). */
export function nextOrderId(orders) {
  const max = orders.reduce((m, o) => {
    const x = String(o.id || '').match(/^VER-(\d+)$/);
    return x ? Math.max(m, Number(x[1])) : m;
  }, 0);
  return 'VER-' + String(max + 1).padStart(3, '0');
}

/** CSV aman untuk Excel: BOM UTF-8, escape kutip, cegah formula injection. */
export function toCSV(rows) {
  const cell = v => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}

export function reportRows(orders, today = todayISO(), rules = DEFAULT_RULES) {
  const head = ['Order', 'Jenis', 'PIC', 'Prioritas', 'Tanggal Order', 'Mulai Pengerjaan', 'Tanggal Kirim', 'Total Item', 'Item Diceklis', 'Progress %', 'Status', 'Status Pengiriman', 'Approval', 'Risiko'];
  const rows = orders.map(o => [o.id, orderKindLabel(o), o.pic || '', PRIORITY_LABEL[o.priority || 'normal'], o.orderDate, o.workStartDate || '', o.deliveryDate,
    relevantItems(o).length, relevantItems(o).filter(i => i.checked).length, progress(o), orderStatus(o, today),
    deliveryStatus(o), APPROVAL_LABEL[o.approval?.state || 'draft'], riskLevel(o, today, rules)]);
  return [head, ...rows];
}

/**
 * Transisi approval. Mengembalikan {ok, order} atau {ok:false, reason}.
 * Aksi: submit | review | approve | reject | revise.
 * Catatan wajib untuk reject dan revise. Pemeriksaan ini juga HARUS diulang di backend
 * saat backend tersedia; frontend saja tidak cukup sebagai kontrol akses.
 */
export function approvalTransition(order, action, { note = '', by = 'Admin', now = new Date() } = {}) {
  const cur = order.approval?.state || APPROVAL.DRAFT;
  const allowed = {
    submit: [APPROVAL.DRAFT, APPROVAL.REJECTED, APPROVAL.REVISION],
    review: [APPROVAL.SUBMITTED],
    approve: [APPROVAL.REVIEW],
    reject: [APPROVAL.REVIEW],
    revise: [APPROVAL.REVIEW],
  };
  const target = { submit: APPROVAL.SUBMITTED, review: APPROVAL.REVIEW, approve: APPROVAL.APPROVED, reject: APPROVAL.REJECTED, revise: APPROVAL.REVISION };
  if (!allowed[action]) return { ok: false, reason: 'Aksi approval tidak dikenal.' };
  if (!allowed[action].includes(cur)) return { ok: false, reason: `Aksi tidak valid dari status ${APPROVAL_LABEL[cur]}.` };
  if (['submit', 'approve'].includes(action)) {
    const g = canApprove({ ...order, approval: { state: APPROVAL.DRAFT } });
    if (!g.ok) return { ok: false, reason: g.reason };
  }
  if (['reject', 'revise'].includes(action) && !note.trim()) return { ok: false, reason: 'Catatan wajib diisi.' };
  const next = { ...order, approval: { state: target[action], by, at: now.toISOString(), note: note.trim() } };
  next.approved = next.approval.state === APPROVAL.APPROVED;
  return { ok: true, order: addHistory(next, `Approval: ${APPROVAL_LABEL[target[action]]}${note.trim() ? ' — ' + note.trim() : ''}`, by, now) };
}

export function cancelOrder(order, reason, { by = 'Admin', now = new Date() } = {}) {
  if (order.cancelled) return { ok: false, reason: 'Order sudah dibatalkan.' };
  if (order.approval?.state === APPROVAL.APPROVED) return { ok: false, reason: 'Order yang sudah disetujui tidak dapat dibatalkan.' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'Alasan pembatalan wajib diisi.' };
  return { ok: true, order: addHistory({ ...order, cancelled: true, cancelReason: reason.trim() }, `Order dibatalkan — ${reason.trim()}`, by, now) };
}
