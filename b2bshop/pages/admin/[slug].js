import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { IC } from "@/components/Icons";
import { ReceiptModal, printReceipt } from "@/components/Receipt";

const inp = { border:"1px solid #e5e5e5",borderRadius:8,padding:"9px 12px",fontSize:12,outline:"none",width:"100%",boxSizing:"border-box",background:"#fff" };
const btnB = { background:"#000",color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6 };
const btnG = { background:"none",color:"#555",border:"1px solid #e5e5e5",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5 };

export default function SellerPanel() {
  const router = useRouter();
  const { slug } = router.query;

  const [authed, setAuthed]   = useState(false);
  const [pass, setPass]       = useState("");
  const [passErr, setPassErr] = useState("");
  const [tab, setTab]         = useState("prices");
  const [data, setData]       = useState(null); // { settings, prices, orders, catalog }
  const [saving, setSaving]   = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const logoRef = useRef(null);

  useEffect(() => {
    if (!slug) return;
    const a = sessionStorage.getItem("sellerauth_" + slug);
    if (a === "1") { setAuthed(true); loadData(); }
  }, [slug]);

  async function login() {
    setPassErr("");
    const r = await fetch("/api/admin/shop-login", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ slug, password: pass })
    });
    if (r.ok) {
      sessionStorage.setItem("sellerauth_"+slug, "1");
      setAuthed(true); loadData();
    } else {
      const d = await r.json(); setPassErr(d.error || "Неверный пароль");
    }
  }

  async function loadData() {
    const r = await fetch(`/api/admin/shop-data?slug=${slug}`);
    const d = await r.json();
    setData(d);
    setSettingsForm({ ...d.settings });
  }

  // merge catalog product with shop price override
  function getMerged() {
    if (!data) return [];
    return data.catalog.products.map(p => ({
      ...p,
      shopPrice: data.prices[p.id]?.price ?? p.basePrice,
      shopStock: data.prices[p.id]?.stock ?? p.stock ?? 0,
      shopHidden: data.prices[p.id]?.hidden ?? false,
    }));
  }

  async function savePrice(productId, price, stock, hidden) {
    await fetch(`/api/admin/shop-data?slug=${slug}&action=savePrice`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ productId, price, stock, hidden })
    });
    loadData();
  }

  async function saveSettings() {
    setSaving(true);
    await fetch(`/api/admin/shop-data?slug=${slug}&action=saveSettings`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(settingsForm)
    });
    setSaving(false); loadData();
  }

  async function updateOrderStatus(id, status) {
    await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOrder`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ id, status })
    });
    loadData();
  }

  function handleImgFile(file, cb) {
    const r = new FileReader(); r.onload = e => cb(e.target.result); r.readAsDataURL(file);
  }

  function getCatName(catId) {
    return data?.catalog.categories.find(c=>c.id===catId)?.name || "—";
  }

  const merged = getMerged();

  if (!slug) return null;

  if (!authed) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f7f7" }}>
      <Head><title>Вход — {slug}</title></Head>
      <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:32,width:320,boxShadow:"0 4px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize:16,fontWeight:700,marginBottom:4 }}>Панель магазина</div>
        <div style={{ fontSize:12,color:"#aaa",marginBottom:20 }}>/{slug}</div>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Пароль" style={{ ...inp,marginBottom:8 }}/>
        {passErr && <div style={{ fontSize:12,color:"#e00",marginBottom:8 }}>{passErr}</div>}
        <button onClick={login} style={{ ...btnB,width:"100%",justifyContent:"center" }}>Войти</button>
      </div>
    </div>
  );

  if (!data) return <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#aaa",fontSize:13 }}>Загрузка...</div>;

  const newOrdersCount = data.orders.filter(o=>o.status==="Новый").length;

  return (
    <div style={{ minHeight:"100vh",background:"#f7f7f7" }}>
      <Head><title>{data.settings.name} — Панель</title></Head>

      {/* Header */}
      <div style={{ background:"#fff",borderBottom:"1px solid #e5e5e5",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:20 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:8,overflow:"hidden",background:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0 }}>
            {data.settings.logoImg
              ? <img src={data.settings.logoImg} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
              : data.settings.logoText}
          </div>
          <div>
            <div style={{ fontSize:13,fontWeight:700,lineHeight:1.2 }}>{data.settings.name}</div>
            <div style={{ fontSize:10,color:"#aaa" }}>/shop/{slug}</div>
          </div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <a href={`/shop/${slug}`} target="_blank" style={{ ...btnG,fontSize:11,textDecoration:"none" }}>{IC.eye} Витрина</a>
          <button onClick={()=>{sessionStorage.removeItem("sellerauth_"+slug);setAuthed(false);}} style={{ ...btnG,fontSize:11,color:"#aaa" }}>Выйти</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",background:"#fff",borderBottom:"1px solid #e5e5e5",overflowX:"auto" }}>
        {[
          { id:"prices",  label:"Цены и остатки" },
          { id:"orders",  label:`Заказы${newOrdersCount?` (${newOrdersCount})`:""}`},
          { id:"settings",label:"Настройки" },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"13px 20px",background:"none",border:"none",borderBottom:tab===t.id?"2px solid #000":"2px solid transparent",fontSize:12,fontWeight:tab===t.id?700:400,cursor:"pointer",color:tab===t.id?"#000":"#888",whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-panel" style={{ padding:16,maxWidth:720,margin:"0 auto" }}>

        {/* ── PRICES TAB ── */}
        {tab==="prices" && (
          <div>
            <div style={{ fontSize:11,color:"#aaa",fontWeight:600,letterSpacing:"0.5px",marginBottom:10 }}>
              ТОВАРЫ — задай цену и остаток для своего магазина
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {merged.map(p => (
                <PriceRow key={p.id} p={p} getCatName={getCatName} onSave={savePrice}/>
              ))}
              {merged.length===0 && <div style={{ color:"#ccc",textAlign:"center",padding:"30px 0",fontSize:13 }}>Нет товаров в каталоге</div>}
            </div>
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {tab==="orders" && (
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {data.orders.length===0 && <div style={{ color:"#ccc",textAlign:"center",padding:"30px 0",fontSize:13 }}>Заказов пока нет</div>}
            {data.orders.map(ord=>(
              <div key={ord.id} style={{ background:"#fff",border:ord.status==="Новый"?"1.5px solid #000":"1px solid #e5e5e5",borderRadius:10,padding:"13px 14px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                  <div>
                    <span style={{ fontSize:13,fontWeight:700 }}>№{String(ord.id).padStart(5,"0")}</span>
                    <span style={{ fontSize:11,color:"#aaa",marginLeft:8 }}>{ord.date}</span>
                  </div>
                  <select value={ord.status} onChange={e=>updateOrderStatus(ord.id, e.target.value)}
                    style={{ border:"1px solid #e5e5e5",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",outline:"none" }}>
                    {["Новый","В обработке","Выполнен","Отмена"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ fontSize:12,color:"#555",marginBottom:4 }}>{ord.client} · @{ord.tg}</div>
                {ord.comment && <div style={{ fontSize:11,color:"#aaa",marginBottom:6,fontStyle:"italic" }}>"{ord.comment}"</div>}
                {ord.items.map((item,i)=>(
                  <div key={i} style={{ fontSize:12,color:"#666",marginBottom:1 }}>{item.name} × {item.qty} = {item.qty*item.price} ₽</div>
                ))}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,borderTop:"1px solid #f5f5f5",paddingTop:8 }}>
                  <span style={{ fontSize:13,fontWeight:700 }}>Итого: {ord.total} ₽</span>
                  <button onClick={()=>setReceiptOrder(ord)} style={{ ...btnG,fontSize:11 }}>{IC.print} Чек</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab==="settings" && settingsForm && (
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:16 }}>
              <div style={{ fontSize:12,fontWeight:700,marginBottom:10 }}>Название магазина</div>
              <input value={settingsForm.name} onChange={e=>setSettingsForm(f=>({...f,name:e.target.value}))} placeholder="Название" style={inp}/>
            </div>
            <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:16 }}>
              <div style={{ fontSize:12,fontWeight:700,marginBottom:10 }}>Логотип / Аватарка</div>
              <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                <div onClick={()=>logoRef.current?.click()}
                  style={{ width:64,height:64,borderRadius:10,overflow:"hidden",background:"#000",border:"1.5px dashed #e0e0e0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:12,fontWeight:800,color:"#fff",letterSpacing:1 }}>
                  {settingsForm.logoImg
                    ? <img src={settingsForm.logoImg} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                    : settingsForm.logoText}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:"#aaa",marginBottom:7 }}>Нажми на квадрат для загрузки, или измени аббревиатуру:</div>
                  <input value={settingsForm.logoText} onChange={e=>setSettingsForm(f=>({...f,logoText:e.target.value.slice(0,3).toUpperCase()}))}
                    placeholder="ММ" maxLength={3} style={{ ...inp,width:70 }}/>
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display:"none" }}
                onChange={e=>handleImgFile(e.target.files[0], img=>setSettingsForm(f=>({...f,logoImg:img})))}/>
              {settingsForm.logoImg && (
                <button onClick={()=>setSettingsForm(f=>({...f,logoImg:null}))}
                  style={{ ...btnG,marginTop:10,width:"100%",justifyContent:"center",color:"#aaa" }}>
                  {IC.trash} Удалить изображение
                </button>
              )}
            </div>
            <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:16 }}>
              <div style={{ fontSize:12,fontWeight:700,marginBottom:10 }}>WhatsApp</div>
              <input value={settingsForm.whatsapp} onChange={e=>setSettingsForm(f=>({...f,whatsapp:e.target.value}))}
                placeholder="79001234567" style={inp}/>
              <div style={{ fontSize:11,color:"#bbb",marginTop:6 }}>Без + и пробелов</div>
            </div>
            <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:16 }}>
              <div style={{ fontSize:12,fontWeight:700,marginBottom:4 }}>Ссылка на витрину</div>
              <div style={{ fontSize:13,color:"#555",fontWeight:500 }}>{typeof window!=="undefined"?window.location.origin:""}/shop/{slug}</div>
            </div>
            <button onClick={saveSettings} disabled={saving}
              style={{ ...btnB,justifyContent:"center",padding:"12px 0",opacity:saving?0.6:1 }}>
              {IC.check} {saving?"Сохраняется...":"Сохранить настройки"}
            </button>
          </div>
        )}
      </div>

      {receiptOrder && <ReceiptModal order={receiptOrder} shopName={data.settings.name} onClose={()=>setReceiptOrder(null)}/>}
    </div>
  );
}

// ── Price row component ──────────────────────────────────────────────────────
function PriceRow({ p, getCatName, onSave }) {
  const [price,  setPrice]  = useState(String(p.shopPrice));
  const [stock,  setStock]  = useState(String(p.shopStock));
  const [hidden, setHidden] = useState(p.shopHidden);
  const [saved,  setSaved]  = useState(false);

  async function save() {
    await onSave(p.id, Number(price), Number(stock), hidden);
    setSaved(true); setTimeout(()=>setSaved(false), 1800);
  }

  const changed = Number(price)!==p.shopPrice || Number(stock)!==p.shopStock || hidden!==p.shopHidden;

  return (
    <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
      <div style={{ width:44,height:44,borderRadius:8,overflow:"hidden",background:"#f5f5f5",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc" }}>
        {p.img ? <img src={p.img} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
      </div>
      <div style={{ flex:1,minWidth:120 }}>
        <div style={{ fontSize:12,fontWeight:600 }}>{p.name}</div>
        <div style={{ fontSize:10,color:"#bbb" }}>{getCatName(p.categoryId)} · база: {p.basePrice} ₽</div>
      </div>
      <div style={{ display:"flex",gap:6,alignItems:"center",flexWrap:"wrap" }}>
        <div style={{ display:"flex",flexDirection:"column",gap:2,alignItems:"center" }}>
          <div style={{ fontSize:10,color:"#aaa" }}>Цена ₽</div>
          <input value={price} onChange={e=>setPrice(e.target.value)} type="number"
            style={{ width:72,border:"1px solid #e5e5e5",borderRadius:7,padding:"6px 8px",fontSize:12,outline:"none",textAlign:"center" }}/>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:2,alignItems:"center" }}>
          <div style={{ fontSize:10,color:"#aaa" }}>Остаток</div>
          <input value={stock} onChange={e=>setStock(e.target.value)} type="number"
            style={{ width:60,border:"1px solid #e5e5e5",borderRadius:7,padding:"6px 8px",fontSize:12,outline:"none",textAlign:"center" }}/>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:2,alignItems:"center" }}>
          <div style={{ fontSize:10,color:"#aaa" }}>Скрыть</div>
          <input type="checkbox" checked={hidden} onChange={e=>setHidden(e.target.checked)} style={{ width:16,height:16,accentColor:"#000",cursor:"pointer" }}/>
        </div>
        <button onClick={save}
          style={{ background:saved?"#27ae60":changed?"#000":"#f0f0f0",color:saved||changed?"#fff":"#aaa",border:"none",borderRadius:7,padding:"7px 12px",fontSize:11,fontWeight:600,cursor:"pointer",transition:"background 0.2s" }}>
          {saved ? "✓" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
