'use client';

import { useEffect, useMemo, useState } from 'react';

const productCatalog = [
  // BIGBUS JB5
  {model:'BIGBUS JB5', no:1, name:'DUM DEPAN ABS + BOX TV', unit:'SET'},
  {model:'BIGBUS JB5', no:2, name:'DEK PINTU DEPAN, BLK, DARURAT', unit:'PC'},
  {model:'BIGBUS JB5', no:3, name:'COVER T KN KR + LASER CUTING', unit:'PC'},
  {model:'BIGBUS JB5', no:4, name:'COVER KABEL', unit:'PC'},
  {model:'BIGBUS JB5', no:5, name:'COVER BANDO DALAM', unit:'SET'},
  {model:'BIGBUS JB5', no:6, name:'COVER PIPA AC BLK POJOK KN KR', unit:'PC'},
  {model:'BIGBUS JB5', no:7, name:'COVER PILAR KACA BLK SAMPING KN KR', unit:'PC'},
  {model:'BIGBUS JB5', no:8, name:'DUM BELAKANG FULL', unit:'SET'},
  {model:'BIGBUS JB5', no:9, name:'COVER CAGAK DARURAT KN KR', unit:'PC'},
  {model:'BIGBUS JB5', no:10, name:'VARIASI SAMPING GEPREK + VARIASI RUMAH LAMPU SLENDANG DPN BLK, EMBLEM', unit:'SET'},
  {model:'BIGBUS JB5', no:11, name:'PLAFON JB5', unit:'PC'},
  {model:'BIGBUS JB5', no:12, name:'INNER C', unit:'PC'},
  {model:'BIGBUS JB5', no:13, name:'BOX TV TENGAH', unit:'PC'},
  {model:'BIGBUS JB5', no:14, name:'COOLBOX LENGKAP HANDLE, SKOK, ENGSEL', unit:'PC'},
  {model:'BIGBUS JB5', no:15, name:'PILAR INTEGRAL PU L PANJANG', unit:'PC'},
  {model:'BIGBUS JB5', no:16, name:'PILAR INTEGRAL PU U PENDEK', unit:'PC'},
  {model:'BIGBUS JB5', no:17, name:'COVER TUTUP PIPA DUKTING PU 3 MACAM', unit:'PC'},
  {model:'BIGBUS JB5', no:18, name:'TATAKAN RAK DUKTING ATAS BAWAH', unit:'PC'},
  {model:'BIGBUS JB5', no:19, name:'FRAME KACA BLK', unit:'PC'},
  {model:'BIGBUS JB5', no:20, name:'DEK BEGASI BELAKANG', unit:'PC'},
  {model:'BIGBUS JB5', no:21, name:'CROME BANDO, CROME PISTOL, KACA BLK', unit:'SET'},

  // MEDIUM JB5
  {model:'MEDIUM JB5', no:1, name:'DUM DEPAN ABS MEDIUM JB5 + BOX TV', unit:'SET'},
  {model:'MEDIUM JB5', no:2, name:'DEK PINTU DEPAN, BLK, DARURAT', unit:'PC'},
  {model:'MEDIUM JB5', no:3, name:'COVER T KN KR + LASER CUTTING', unit:'PC'},
  {model:'MEDIUM JB5', no:4, name:'COVER KABEL', unit:'SET'},
  {model:'MEDIUM JB5', no:5, name:'COVER BANDO DALAM', unit:'SET'},
  {model:'MEDIUM JB5', no:6, name:'COVER POJOK BLK KN KR', unit:'PC'},
  {model:'MEDIUM JB5', no:7, name:'COVER PILAR KACA BLK SAMPING KN KR', unit:'PC'},
  {model:'MEDIUM JB5', no:8, name:'DUM BELAKANG', unit:'SET'},
  {model:'MEDIUM JB5', no:9, name:'COVER CAGAK DARURAT KN KR', unit:'PC'},
  {model:'MEDIUM JB5', no:10, name:'VARIASI SAMPING GEPREK + VARIASI RUMAH LAMPU SLENDANG DPN BLK, EMBLEM', unit:'SET'},
  {model:'MEDIUM JB5', no:11, name:'PLAFON JB5 MEDIUM', unit:'PC'},
  {model:'MEDIUM JB5', no:12, name:'INNER C', unit:'PC'},
  {model:'MEDIUM JB5', no:13, name:'PILAR INTEGRAL L PANJANG', unit:'PC'},
  {model:'MEDIUM JB5', no:14, name:'PILAR INTEGRAL U PENDEK', unit:'PC'},
  {model:'MEDIUM JB5', no:15, name:'INTEGRAL COVER PIPA RAK DUKTING 3 MACAM', unit:'PC'},
  {model:'MEDIUM JB5', no:16, name:'TATAKAN RAK DUKTING ATAS BAWAH', unit:'PC'},
  {model:'MEDIUM JB5', no:17, name:'FRAME KACA BLK', unit:'PC'},
  {model:'MEDIUM JB5', no:18, name:'COOLBOX LENGKAP ENGSEL, SKOK, HANDLE', unit:'PC'},
  {model:'MEDIUM JB5', no:19, name:'CROME BANDO, CROME PISTOL, KACA BLK', unit:'PC'},
  {model:'MEDIUM JB5', no:20, name:'PARTISI MEDIUM', unit:'PC'}
];

const seed = [
  {
    id:'VER-001',
    po:'PO-001',
    orderDate:'2026-09-20',
    deliveryDate:'2026-09-30',
    notes:'Pengiriman tahap pertama',
    approved:false,
    sent:false,
    items:[
      {
        id:1,
        name:'DUM DEPAN ABS + BOX TV',
        part:'',
        qty:1,
        unit:'SET',
        model:'BIGBUS JB5',
        checked:true
      },
      {
        id:2,
        name:'COVER KABEL',
        part:'',
        qty:2,
        unit:'PC',
        model:'BIGBUS JB5',
        checked:true
      },
      {
        id:3,
        name:'PLAFON JB5',
        part:'',
        qty:1,
        unit:'PC',
        model:'BIGBUS JB5',
        checked:false
      },
      {
        id:4,
        name:'FRAME KACA BLK',
        part:'',
        qty:1,
        unit:'PC',
        model:'BIGBUS JB5',
        checked:false
      }
    ]
  },
  {
    id:'VER-002',
    po:'PO-002',
    orderDate:'2026-09-23',
    deliveryDate:'2026-10-03',
    notes:'',
    approved:false,
    sent:false,
    items:[
      {
        id:1,
        name:'DUM DEPAN ABS MEDIUM JB5 + BOX TV',
        part:'',
        qty:1,
        unit:'SET',
        model:'MEDIUM JB5',
        checked:false
      },
      {
        id:2,
        name:'COVER BANDO DALAM',
        part:'',
        qty:2,
        unit:'SET',
        model:'MEDIUM JB5',
        checked:false
      }
    ]
  },
  {
    id:'VER-003',
    po:'PO-003',
    orderDate:'2026-09-15',
    deliveryDate:'2026-09-28',
    notes:'Lengkap',
    approved:true,
    sent:true,
    items:[
      {
        id:1,
        name:'DUM DEPAN ABS + BOX TV',
        part:'',
        qty:1,
        unit:'SET',
        model:'BIGBUS JB5',
        checked:true
      },
      {
        id:2,
        name:'COVER PILAR KACA BLK SAMPING KN KR',
        part:'',
        qty:2,
        unit:'PC',
        model:'BIGBUS JB5',
        checked:true
      }
    ]
  }
];

function todayISO(){
  return new Date().toISOString().slice(0,10);
}

function daysUntil(date){
  const a = new Date(todayISO());
  const b = new Date(date);
  return Math.ceil((b-a)/86400000);
}

function fmt(d){
  return new Intl.DateTimeFormat('id-ID',{
    day:'2-digit',
    month:'short',
    year:'numeric'
  }).format(new Date(d));
}

function progress(o){
  if(!o.items.length) return 0;
  return Math.round(
    o.items.filter(i=>i.checked).length / o.items.length * 100
  );
}

function status(o){
  if(o.approved) return 'Approved';
  if(o.sent) return 'Dikirim';
  if(progress(o)===100) return 'Siap dibuat SJ';
  return 'Diproses';
}

export default function Home(){

  const [orders,setOrders] = useState(seed);
  const [page,setPage] = useState('dashboard');
  const [selected,setSelected] = useState(null);
  const [query,setQuery] = useState('');
  const [range,setRange] = useState('monthly');
  const [showForm,setShowForm] = useState(false);
  const [toast,setToast] = useState('');

  useEffect(()=>{
    const x = localStorage.getItem('vertical-orders');
    if(x){
      try{
        setOrders(JSON.parse(x));
      }catch{
        setOrders(seed);
      }
    }
  },[]);

  useEffect(()=>{
    localStorage.setItem(
      'vertical-orders',
      JSON.stringify(orders)
    );
  },[orders]);

  useEffect(()=>{
    if(toast){
      const t = setTimeout(
        ()=>setToast(''),
        2400
      );
      return ()=>clearTimeout(t);
    }
  },[toast]);

  const stats = useMemo(()=>{
    const total = orders.length;

    const complete = orders.filter(
      o=>o.items.length>0 &&
      o.items.every(i=>i.checked)
    ).length;

    const approved = orders.filter(
      o=>o.approved
    ).length;

    // WARNING H-5
    const warnings = orders.filter(o=>{
      const d = daysUntil(o.deliveryDate);
      return d >= 0 &&
             d <= 5 &&
             !o.approved;
    }).length;

    return {
      total,
      complete,
      approved,
      warnings
    };
  },[orders]);

  const filtered = orders.filter(o=>(
    o.id+' '+o.po
  ).toLowerCase().includes(
    query.toLowerCase()
  ));

  function openOrder(o){
    setSelected(o.id);
    setPage('order');
  }

  function updateOrder(id,fn){
    setOrders(prev =>
      prev.map(o =>
        o.id===id ? fn({...o}) : o
      )
    );
  }

  function toggleItem(id,itemId){
    updateOrder(id,o=>{
      o.items = o.items.map(i =>
        i.id===itemId
          ? {...i,checked:!i.checked}
          : i
      );
      return o;
    });
  }

  function approve(id){

    const o = orders.find(x=>x.id===id);

    if(!o) return;

    if(!o.items.every(i=>i.checked)){
      setToast(
        'Belum bisa approve: semua barang harus diceklis.'
      );
      return;
    }

    updateOrder(
      id,
      o=>({...o,approved:true})
    );

    setToast(
      'Order berhasil di-approve.'
    );
  }

  function markSent(id){

    updateOrder(
      id,
      o=>({...o,sent:true})
    );

    setToast(
      'Status pengiriman diperbarui.'
    );
  }

  function createOrder(data){

    // VER-001, VER-002, VER-003 dst.
    const id =
      'VER-' +
      String(
        orders.length + 1
      ).padStart(3,'0');

    setOrders(prev=>[
      {
        ...data,
        id,
        approved:false,
        sent:false,
        items:data.items.map(
          (x,i)=>({
            ...x,
            id:i+1,
            checked:false
          })
        )
      },
      ...prev
    ]);

    setShowForm(false);
    setPage('orders');

    setToast(
      'Order baru dibuat.'
    );
  }

  function exportCSV(){

    const rows = [
      [
        'Order',
        'PO',
        'Tanggal Order',
        'Tanggal Kirim',
        'Total Item',
        'Terkirim',
        'Status'
      ]
    ];

    filtered.forEach(o=>{
      rows.push([
        o.id,
        o.po,
        o.orderDate,
        o.deliveryDate,
        o.items.length,
        o.items.filter(
          i=>i.checked
        ).length,
        status(o)
      ]);
    });

    const csv =
      rows.map(r=>
        r.map(v=>
          '"'+
          String(v)
            .replaceAll('"','""')+
          '"'
        ).join(',')
      ).join('\n');

    const blob = new Blob(
      [csv],
      {
        type:'text/csv;charset=utf-8'
      }
    );

    const a =
      document.createElement('a');

    a.href =
      URL.createObjectURL(blob);

    a.download =
      'Laporan_Vertical_' +
      range +
      '_' +
      todayISO() +
      '.csv';

    a.click();

    URL.revokeObjectURL(
      a.href
    );
  }

  function printReport(){
    window.print();
  }

  return (
    <div className="shell">

      <aside className="sidebar">

        <div className="brand">
          <div className="brandmark">
            V
          </div>

          <div>
            <b>VERTICAL</b>
            <span>.ID</span>
          </div>
        </div>

        <div className="side-label">
          OPERASIONAL
        </div>

        <Nav
          active={page==='dashboard'}
          icon="▦"
          text="Dashboard"
          onClick={()=>setPage('dashboard')}
        />

        <Nav
          active={
            page==='orders' ||
            page==='order'
          }
          icon="▤"
          text="Orders"
          onClick={()=>setPage('orders')}
        />

        <Nav
          active={page==='shipping'}
          icon="◈"
          text="Pengiriman"
          onClick={()=>setPage('shipping')}
        />

        <Nav
          active={page==='products'}
          icon="□"
          text="Sparepart"
          onClick={()=>setPage('products')}
        />

        <div className="side-label report-label">
          LAPORAN
        </div>

        <Nav
          active={page==='reports'}
          icon="▥"
          text="Laporan"
          onClick={()=>setPage('reports')}
        />

        <div className="sidebar-bottom">
          <div className="avatar">
            A
          </div>

          <div>
            <b>Admin</b>
            <small>Operational</small>
          </div>
        </div>

      </aside>

      <main className="main">

        <header className="topbar">

          <div>
            <div className="eyebrow">
              CONTROL CENTER
            </div>

            <h1>
              {
                page==='dashboard'
                  ? 'Dashboard'
                  : page==='orders'
                  ? 'Orders'
                  : page==='order'
                  ? 'Detail Order'
                  : page==='shipping'
                  ? 'Pengiriman'
                  : page==='reports'
                  ? 'Laporan'
                  : 'Sparepart'
              }
            </h1>
          </div>

          <div className="top-actions">

            <button
              className="ghost"
              onClick={()=>setPage('reports')}
            >
              ↧ Export
            </button>

            <button
              className="primary"
              onClick={()=>setShowForm(true)}
            >
              + Order Baru
            </button>

          </div>

        </header>

        {page==='dashboard' &&
          <Dashboard
            stats={stats}
            orders={orders}
            openOrder={openOrder}
          />
        }

        {page==='orders' &&
          <Orders
            orders={filtered}
            query={query}
            setQuery={setQuery}
            openOrder={openOrder}
            setShowForm={setShowForm}
          />
        }

        {page==='order' &&
          <OrderDetail
            order={
              orders.find(
                o=>o.id===selected
              )
            }
            toggleItem={toggleItem}
            approve={approve}
            markSent={markSent}
            back={()=>setPage('orders')}
            printReport={printReport}
          />
        }

        {page==='shipping' &&
          <Shipping
            orders={orders}
            openOrder={openOrder}
          />
        }

        {page==='reports' &&
          <Reports
            orders={filtered}
            range={range}
            setRange={setRange}
            exportCSV={exportCSV}
            printReport={printReport}
          />
        }

        {page==='products' &&
          <ProductsPage/>
        }

      </main>

      {showForm &&
        <OrderForm
          onClose={()=>setShowForm(false)}
          onSave={createOrder}
        />
      }

      {toast &&
        <div className="toast">
          ✓ {toast}
        </div>
      }

    </div>
  );
}


function Nav({
  active,
  icon,
  text,
  onClick
}){

  return (
    <button
      className={
        'nav '+
        (active?'active':'')
      }
      onClick={onClick}
    >
      <span>{icon}</span>
      {text}
    </button>
  );
}


function Dashboard({
  stats,
  orders,
  openOrder
}){

  const upcoming =
    orders
      .filter(
        o=>daysUntil(o.deliveryDate)>=0
      )
      .sort(
        (a,b)=>
          new Date(a.deliveryDate) -
          new Date(b.deliveryDate)
      )
      .slice(0,5);

  const warningOrders =
    upcoming.filter(o=>{
      const d =
        daysUntil(o.deliveryDate);

      return d<=5 &&
             !o.approved;
    });

  return (
    <>
      <section className="cards">

        <Stat
          title="Total Order"
          value={stats.total}
          sub="Seluruh order"
          icon="▤"
        />

        <Stat
          title="Warning H-5"
          value={stats.warnings}
          sub="Perlu perhatian"
          danger
          icon="!"
        />

        <Stat
          title="Siap / Lengkap"
          value={stats.complete}
          sub="Semua item diceklis"
          icon="✓"
        />

        <Stat
          title="Approved"
          value={stats.approved}
          sub="Order selesai"
          icon="●"
        />

      </section>

      <section className="grid2">

        <div className="panel">

          <div className="panel-head">

            <div>
              <h2>
                ⚠ Perlu Perhatian
              </h2>

              <p>
                Warning mulai H-5
                sebelum tanggal kirim
              </p>
            </div>

            <span className="muted">
              Auto monitoring
            </span>

          </div>

          {
            warningOrders.length===0
              ?
              <Empty
                text="Tidak ada warning saat ini."
              />
              :
              warningOrders.map(o=>
                <OrderRow
                  key={o.id}
                  o={o}
                  openOrder={openOrder}
                  warning
                />
              )
          }

        </div>

        <div className="panel">

          <div className="panel-head">

            <div>
              <h2>
                Pengiriman Mendatang
              </h2>

              <p>
                Urutan berdasarkan tanggal kirim
              </p>
            </div>

          </div>

          {
            upcoming.map(o=>
              <OrderRow
                key={o.id}
                o={o}
                openOrder={openOrder}
              />
            )
          }

        </div>

      </section>

      <section className="panel">

        <div className="panel-head">

          <div>
            <h2>
              Order Terbaru
            </h2>

            <p>
              Ringkasan kontrol operasional
            </p>
          </div>

          <span className="muted">
            {orders.length} order
          </span>

        </div>

        <OrderTable
          orders={orders.slice(0,6)}
          openOrder={openOrder}
        />

      </section>
    </>
  );
}


function Stat({
  title,
  value,
  sub,
  icon,
  danger
}){

  return (
    <div
      className={
        'stat '+
        (danger?'danger':'')
      }
    >

      <div className="stat-icon">
        {icon}
      </div>

      <div>

        <div className="stat-title">
          {title}
        </div>

        <strong>
          {value}
        </strong>

        <small>
          {sub}
        </small>

      </div>

    </div>
  );
}


function OrderRow({
  o,
  openOrder,
  warning
}){

  const d =
    daysUntil(o.deliveryDate);

  return (
    <div className="order-row">

      <div className="mini-icon">
        {warning?'!':'□'}
      </div>

      <div className="grow">

        <b>{o.id}</b>

        <span>
          PO {o.po || '-'}
        </span>

      </div>

      <div className="row-progress">

        <b>
          {progress(o)}%
        </b>

        <div className="bar">
          <i
            style={{
              width:
                progress(o)+'%'
            }}
          />
        </div>

      </div>

      <div className="deadline">

        <b
          className={
            d<=5?'red':''
          }
        >
          {
            d<0
              ? 'Lewat'
              : d===0
              ? 'Hari ini'
              : 'H-'+d
          }
        </b>

        <span>
          {fmt(o.deliveryDate)}
        </span>

      </div>

      <button
        className="linkbtn"
        onClick={()=>
          openOrder(o)
        }
      >
        Detail →
      </button>

    </div>
  );
}


function OrderTable({
  orders,
  openOrder
}){

  return (
    <div className="table-wrap">

      <table>

        <thead>
          <tr>
            <th>ORDER</th>
            <th>PO</th>
            <th>TANGGAL ORDER</th>
            <th>TANGGAL KIRIM</th>
            <th>PROGRESS</th>
            <th>STATUS</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          {orders.map(o=>

            <tr key={o.id}>

              <td>
                <b>{o.id}</b>
              </td>

              <td>
                {o.po || '-'}
              </td>

              <td>
                {fmt(o.orderDate)}
              </td>

              <td>
                {fmt(o.deliveryDate)}
              </td>

              <td>

                <div className="table-progress">

                  <b>
                    {progress(o)}%
                  </b>

                  <div className="bar">
                    <i
                      style={{
                        width:
                          progress(o)+'%'
                      }}
                    />
                  </div>

                </div>

              </td>

              <td>
                <Badge o={o}/>
              </td>

              <td>

                <button
                  className="linkbtn"
                  onClick={()=>
                    openOrder(o)
                  }
                >
                  Buka
                </button>

              </td>

            </tr>

          )}

        </tbody>

      </table>

    </div>
  );
}


function Badge({o}){

  return (
    <span
      className={
        'badge '+
        (
          o.approved
            ? 'green'
            : progress(o)===100
            ? 'blue'
            : 'yellow'
        )
      }
    >
      {status(o)}
    </span>
  );
}


function Orders({
  orders,
  query,
  setQuery,
  openOrder,
  setShowForm
}){

  return (
    <section className="panel">

      <div className="panel-head">

        <div>

          <h2>
            Semua Order
          </h2>

          <p>
            Klik order untuk checklist
            barang dan approval.
          </p>

        </div>

        <button
          className="primary"
          onClick={()=>
            setShowForm(true)
          }
        >
          + Buat Order
        </button>

      </div>

      <div className="filters">

        <input
          placeholder="Cari order atau PO..."
          value={query}
          onChange={e=>
            setQuery(e.target.value)
          }
        />

        <span>
          {orders.length} hasil
        </span>

      </div>

      <OrderTable
        orders={orders}
        openOrder={openOrder}
      />

    </section>
  );
}


function OrderDetail({
  order,
  toggleItem,
  approve,
  markSent,
  back,
  printReport
}){

  if(!order){
    return (
      <Empty
        text="Order tidak ditemukan."
      />
    );
  }

  const p = progress(order);
  const d = daysUntil(
    order.deliveryDate
  );

  return (
    <>

      <button
        className="back"
        onClick={back}
      >
        ← Kembali ke Orders
      </button>

      <section className="detail-hero">

        <div>

          <span className="eyebrow">
            ORDER DETAIL
          </span>

          <h2>
            {order.id}
          </h2>

          <p>
            PO {order.po || '-'}
          </p>

        </div>

        <Badge o={order}/>

      </section>

      <section className="detail-grid">

        <div className="panel">

          <div className="panel-head">

            <div>

              <h2>
                Checklist Pengiriman
              </h2>

              <p>
                Centang manual barang
                yang benar-benar sudah dikirim.
              </p>

            </div>

            <div className="big-progress">

              <b>{p}%</b>

              <span>
                {
                  order.items.filter(
                    i=>i.checked
                  ).length
                }/
                {order.items.length}
                {' '}item
              </span>

            </div>

          </div>

          {
            d>=0 &&
            d<=5 &&
            !order.approved &&
            <div className="warning">

              ⚠

              <div>

                <b>
                  WARNING — Pengiriman {
                    d===0
                      ? 'hari ini'
                      : d+' hari lagi'
                  }
                </b>

                <span>
                  Pastikan seluruh barang
                  sudah dikonfirmasi sebelum approval.
                </span>

              </div>

            </div>
          }

          <div className="items">

            {order.items.map(i=>

              <label
                className={
                  'item '+
                  (i.checked?'checked':'')
                }
                key={i.id}
              >

                <input
                  type="checkbox"
                  checked={i.checked}
                  onChange={()=>
                    toggleItem(
                      order.id,
                      i.id
                    )
                  }
                />

                <span className="check">
                  ✓
                </span>

                <div className="grow">

                  <b>
                    {i.name}
                  </b>

                  <small>
                    {i.model}
                    {i.part
                      ? ' · '+i.part
                      : ''}
                  </small>

                </div>

                <strong>
                  {i.qty}
                </strong>

                <span className="item-status">
                  {
                    i.checked
                      ? 'Terkirim'
                      : 'Belum dikirim'
                  }
                </span>

              </label>

            )}

          </div>

          <div className="actionbar">

            <button
              className="ghost"
              onClick={printReport}
            >
              🖨 Cetak / PDF
            </button>

            {
              p===100
                ?
                <>
                  <button
                    className="secondary"
                    onClick={()=>
                      markSent(order.id)
                    }
                  >
                    ✓ Tandai Dikirim
                  </button>

                  <button
                    className="primary"
                    disabled={order.approved}
                    onClick={()=>
                      approve(order.id)
                    }
                  >
                    {
                      order.approved
                        ? '✓ Approved'
                        : 'Approve Order'
                    }
                  </button>
                </>
                :
                <button className="disabled">
                  🔒 Approve belum tersedia
                </button>
            }

          </div>

        </div>

        <div className="side-stack">

          <div className="panel">

            <h2>
              Informasi
            </h2>

            <Info
              k="Tanggal Order"
              v={fmt(order.orderDate)}
            />

            <Info
              k="Tanggal Pengiriman"
              v={fmt(order.deliveryDate)}
              danger={d<=5}
            />

            <Info
              k="Status"
              v={status(order)}
            />

            <Info
              k="Nomor PO"
              v={order.po || '-'}
            />

            <Info
              k="Catatan"
              v={order.notes || '-'}
            />

          </div>

          <div className="panel">

            <h2>
              Surat Jalan
            </h2>

            {
              p===100
                ?
                <>
                  <p className="muted">
                    Semua item lengkap.
                    Surat jalan siap dibuat
                    dari data order ini.
                  </p>

                  <button
                    className="primary full"
                    onClick={printReport}
                  >
                    Buat / Cetak Surat Jalan
                  </button>
                </>
                :
                <p className="muted">
                  Surat jalan baru tersedia
                  setelah semua barang diceklis.
                </p>
            }

          </div>

        </div>

      </section>

    </>
  );
}


function Info({
  k,
  v,
  danger
}){

  return (
    <div className="info">

      <span>{k}</span>

      <b
        className={
          danger?'red':''
        }
      >
        {v}
      </b>

    </div>
  );
}


function Shipping({
  orders,
  openOrder
}){

  const list =
    orders.filter(
      o=>o.sent ||
      progress(o)===100
    );

  return (
    <section className="panel">

      <div className="panel-head">

        <div>

          <h2>
            Pengiriman
          </h2>

          <p>
            Kontrol order yang siap
            atau sudah dikirim.
          </p>

        </div>

      </div>

      <OrderTable
        orders={list}
        openOrder={openOrder}
      />

    </section>
  );
}


function Reports({
  orders,
  range,
  setRange,
  exportCSV,
  printReport
}){

  return (
    <section className="panel report">

      <div className="panel-head">

        <div>

          <h2>
            Laporan
          </h2>

          <p>
            Filter periode lalu
            export untuk administrasi.
          </p>

        </div>

        <div className="export-actions">

          <button
            className="ghost"
            onClick={printReport}
          >
            📄 PDF / Print
          </button>

          <button
            className="primary"
            onClick={exportCSV}
          >
            📊 Excel / CSV
          </button>

        </div>

      </div>

      <div className="report-filters">

        <select
          value={range}
          onChange={e=>
            setRange(e.target.value)
          }
        >
          <option value="daily">
            Harian
          </option>

          <option value="weekly">
            Mingguan
          </option>

          <option value="monthly">
            Bulanan
          </option>

          <option value="yearly">
            Tahunan
          </option>
        </select>

        <input type="date"/>
        <input type="date"/>

        <select>
          <option>
            Semua Status
          </option>

          <option>
            Diproses
          </option>

          <option>
            Siap dibuat SJ
          </option>

          <option>
            Approved
          </option>

          <option>
            Dikirim
          </option>
        </select>

      </div>

      <div className="report-summary">

        <Stat
          title="Order"
          value={orders.length}
          sub="Dalam data saat ini"
          icon="▤"
        />

        <Stat
          title="Item"
          value={
            orders.reduce(
              (a,o)=>
                a+o.items.length,
              0
            )
          }
          sub="Total jenis item"
          icon="□"
        />

        <Stat
          title="Lengkap"
          value={
            orders.filter(
              o=>progress(o)===100
            ).length
          }
          sub="Semua item diceklis"
          icon="✓"
        />

        <Stat
          title="Approved"
          value={
            orders.filter(
              o=>o.approved
            ).length
          }
          sub="Selesai"
          icon="●"
        />

      </div>

      <OrderTable
        orders={orders}
        openOrder={()=>{}}
      />

    </section>
  );
}


function Empty({
  text
}){

  return (
    <div className="empty">
      {text}
    </div>
  );
}


function ProductsPage(){

  const groups = [
    'BIGBUS JB5',
    'MEDIUM JB5'
  ];

  return (
    <section className="panel">

      <div className="panel-head">

        <div>

          <h2>
            Master Produk
          </h2>

          <p>
            Daftar produk interior
            bus JB5 dari data produk Vertical.
          </p>

        </div>

        <span className="muted">
          {productCatalog.length} produk
        </span>

      </div>

      {groups.map(model=>

        <div
          className="product-group"
          key={model}
        >

          <div className="product-group-head">

            <h3>
              {model}
            </h3>

            <span>
              {
                productCatalog.filter(
                  p=>p.model===model
                ).length
              } item
            </span>

          </div>

          <div className="table-wrap">

            <table>

              <thead>

                <tr>
                  <th>NO</th>
                  <th>NAMA BARANG</th>
                  <th>KET</th>
                </tr>

              </thead>

              <tbody>

                {
                  productCatalog
                    .filter(
                      p=>p.model===model
                    )
                    .map(p=>

                      <tr
                        key={
                          model+p.no
                        }
                      >

                        <td>
                          {p.no}
                        </td>

                        <td>
                          <b>
                            {p.name}
                          </b>
                        </td>

                        <td>
                          {p.unit}
                        </td>

                      </tr>

                    )
                }

              </tbody>

            </table>

          </div>

        </div>

      )}

    </section>
  );
}


function OrderForm({
  onClose,
  onSave
}){

  const [po,setPo] =
    useState('');

  const [orderDate,setOrderDate] =
    useState(todayISO());

  const [deliveryDate,setDeliveryDate] =
    useState('');

  const [notes,setNotes] =
    useState('');

  const [model,setModel] =
    useState('BIGBUS JB5');

  const [items,setItems] =
    useState([
      {
        name:'',
        part:'',
        qty:1,
        unit:'PC',
        model:'BIGBUS JB5'
      }
    ]);

  function add(){

    setItems([
      ...items,
      {
        name:'',
        part:'',
        qty:1,
        unit:'PC',
        model
      }
    ]);
  }

  function chooseProduct(
    n,
    value
  ){

    const product =
      productCatalog.find(
        p=>
          p.model===model &&
          p.name===value
      );

    setItems(
      items.map(
        (x,j)=>
          j===n
            ? {
                ...x,
                name:value,
                unit:
                  product?.unit ||
                  x.unit,
                model
              }
            : x
      )
    );
  }

  function changeModel(
    value
  ){

    setModel(value);

    setItems(
      items.map(x=>({
        ...x,
        name:'',
        unit:'PC',
        model:value
      }))
    );
  }

  function save(){

    if(!po){
      alert(
        'Nomor PO wajib diisi.'
      );
      return;
    }

    if(!orderDate){
      alert(
        'Tanggal order wajib diisi.'
      );
      return;
    }

    if(!deliveryDate){
      alert(
        'Tanggal pengiriman wajib diisi.'
      );
      return;
    }

    if(
      new Date(deliveryDate) <
      new Date(orderDate)
    ){
      alert(
        'Tanggal pengiriman tidak boleh sebelum tanggal order.'
      );
      return;
    }

    if(
      items.some(i=>!i.name)
    ){
      alert(
        'Semua produk wajib dipilih.'
      );
      return;
    }

    onSave({
      po,
      orderDate,
      deliveryDate,
      notes,
      model,
      items
    });
  }

  return (
    <div className="modal-bg">

      <div className="modal wide">

        <div className="modal-head">

          <div>

            <span className="eyebrow">
              NEW ORDER
            </span>

            <h2>
              Buat Order
            </h2>

          </div>

          <button
            className="close"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        <div className="form-grid">

          <label>

            Nomor PO

            <input
              value={po}
              onChange={e=>
                setPo(e.target.value)
              }
              placeholder="PO-XXXX"
            />

          </label>

          <label>

            Tanggal Order

            <input
              type="date"
              value={orderDate}
              onChange={e=>
                setOrderDate(
                  e.target.value
                )
              }
            />

          </label>

          <label>

            Tanggal Pengiriman

            <input
              type="date"
              min={orderDate}
              value={deliveryDate}
              onChange={e=>
                setDeliveryDate(
                  e.target.value
                )
              }
            />

          </label>

          <label>

            Model Bus

            <select
              value={model}
              onChange={e=>
                changeModel(
                  e.target.value
                )
              }
            >

              <option>
                BIGBUS JB5
              </option>

              <option>
                MEDIUM JB5
              </option>

            </select>

          </label>

          <label className="full-field">

            Catatan

            <input
              value={notes}
              onChange={e=>
                setNotes(
                  e.target.value
                )
              }
              placeholder="Catatan order"
            />

          </label>

        </div>

        <h3>
          Daftar Produk
        </h3>

        <p className="muted">
          Pilih produk dari master produk.
          Part number dapat diisi jika
          perusahaan menggunakan kode internal.
        </p>

        <div className="form-items">

          {items.map((i,n)=>

            <div
              className="form-item catalog-row"
              key={n}
            >

              <select
                value={i.name}
                onChange={e=>
                  chooseProduct(
                    n,
                    e.target.value
                  )
                }
              >

                <option value="">
                  Pilih produk {model}...
                </option>

                {
                  productCatalog
                    .filter(
                      p=>p.model===model
                    )
                    .map(p=>

                      <option
                        key={p.no}
                        value={p.name}
                      >
                        {p.no}. {p.name}
                        {' '}({p.unit})
                      </option>

                    )
                }

              </select>

              <input
                placeholder="Part number"
                value={i.part}
                onChange={e=>
                  setItems(
                    items.map(
                      (x,j)=>
                        j===n
                          ? {
                              ...x,
                              part:
                                e.target.value
                            }
                          : x
                    )
                  )
                }
              />

              <input
                type="number"
                min="1"
                value={i.qty}
                onChange={e=>
                  setItems(
                    items.map(
                      (x,j)=>
                        j===n
                          ? {
                              ...x,
                              qty:
                                Number(
                                  e.target.value
                                )
                            }
                          : x
                    )
                  )
                }
              />

              <span className="unit-pill">
                {i.unit}
              </span>

            </div>

          )}

        </div>

        <button
          className="add-line"
          onClick={add}
        >
          + Tambah Produk
        </button>

        <div className="modal-actions">

          <button
            className="ghost"
            onClick={onClose}
          >
            Batal
          </button>

          <button
            className="primary"
            onClick={save}
          >
            Simpan Order
          </button>

        </div>

      </div>

    </div>
  );
}
