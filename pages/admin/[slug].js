import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { IC } from "@/components/Icons";
import { ReceiptModal, printReceipt } from "@/components/Receipt";

const INP = { border:"1px solid #e5e5e5",borderRadius:8,padding:"9px 12px",fontSize:12,outline:"none",width:"100%",boxSizing:"border-box",background:"#fff",fontFamily:"inherit" };
const BtnB = ({ children, onClick, disabled, style={} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background:"#000",color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",opacity:disabled?0.4:1,...style }}>
    {children}
  </button>
);
const BtnG = ({ children, onClick, style={} }) => (
  <button onClick={onClick}
    style={{ background:"none",color:"#555",border:"1px solid #e5e5e5",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",...style }}>
    {children}
  </button>
);

export default function SellerPanel() {
  const router = useRouter();
  const { slug } = router.query;

  const [authed, setAuthed]       = useState(false);
  const [pass, setPass]           = useState("");
  const [passErr, setPassErr]     = useState("");
  const [tab, setTab]             = useState("catalog");
  const [data, setData]           = useState(null);
  const [saving, setSaving]       = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const logoRef = useRef(null);

  // own catalog forms
  const [newCat, setNewCat]   = useState({ name:"", parentId:"" });
  const [newProd, setNewProd] = useState({ name:"", price:"", stock:"", categoryId:"", img:null });
  const [editingImg, setEditingImg] = useState(null);

  useEffect(() => {
    if (!slug) return;
    // Security: check session via httpOnly cookie (not sessionStorage)
    fetch(`/api/admin/me?type=shop&slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => { if (d.authed) { setAuthed(true); loadData(); } })
      .catch(() => {});
  }, [slug]);

  async function loadData() {
    const r = await fetch(`/api/admin/shop-data?slug=${slug}`);
    const d = await r.json();
    setData(d);
    setSettingsForm({ ...d.settings });
  }

  async function login() {
    setPassErr("");
    const r = await fetch("/api/admin/shop-login", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ slug, password: pass })
    });
    // Security: session cookie is set by the server — no sessionStorage needed
    if (r.ok) { setAuthed(true); loadData(); }
    else { const d=await r.json(); setPassErr(d.error||"Неверный пароль"); }
  }

  async function saveSettings() {
    setSaving(true);
    await fetch(`/api/admin/shop-data?slug=${slug}&action=saveSettings`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(settingsForm)
    });
    setSaving(false); loadData();
  }

  async function savePrice(productId, price, stock, hidden) {
    await fetch(`/api/admin/shop-data?slug=${slug}&action=savePrice`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ productId, price, stock, hidden })
    });
    loadData();
  }

  async function toggleCatalogMode() {
    const updated = { ...settingsForm, useSharedCatalog: !settingsForm.useSharedCatalog };
    setSettingsForm(updated);
    await fetch(`/api/admin/shop-data?slug=${slug}&action=saveSettings`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(updated)
    });
    loadData();
  }

  async function addOwnCategory() {
    if (!newCat.name.trim()) return;
    await fetch(`/api/admin/shop-data?slug=${slug}&action=addOwnCategory`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(newCat)
    });
    setNewCat({ name:"", parentId:"" }); loadData();
  }

  async function deleteOwnCategory(id) {
    await fetch(`/api/admin/shop-data?slug=${slug}&action=deleteOwnCategory&id=${id}`, { method:"DELETE" });
    loadData();
  }

  async function addOwnProduct() {
    if (!newProd.name || !newProd.price || !newProd.categoryId) return;
    await fetch(`/api/admin/shop-data?slug=${slug}&action=addOwnProduct`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(newProd)
    });
    setNewProd(p=>({ name:"",price:"",stock:"",categoryId:p.categoryId,img:null })); loadData();
  }

  async function deleteOwnProduct(id) {
    await fetch(`/api/admin/shop-data?slug=${slug}&action=deleteOwnProduct&id=${id}`, { method:"DELETE" });
    loadData();
  }

  async function updateOwnProductImg(id, img) {
    await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnProduct&id=${id}`, {
      method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ img })
    });
    setEditingImg(null); loadData();
  }

  async function updateOrderStatus(id, status) {
    await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOrder`, {
      method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, status })
    });
    loadData();
  }

  function handleImgFile(file, cb) {
    const r = new FileReader(); r.onload = e => cb(e.target.result); r.readAsDataURL(file);
  }

  function renderOwnCatTree(parentId, depth=0) {
    if (!data) return null;
    const cats = data.ownCatalog.categories;
    const children = cats.filter(c=>c.parentId===parentId);
    if (!children.length) return null;
    return (
      <div style={{ marginLeft: depth*14 }}>
        {children.map(cat => {
          const hasKids = cats.some(c=>c.parentId===cat.id);
          const prodCount = data.ownCatalog.products.filter(p=>p.categoryId===cat.id).length;
          return (
            <div key={cat.id} style={{ marginBottom:5 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",background:"#fff",border:"1px solid #e8e8e8",borderRadius:8 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,color:"#666" }}>
                  {IC.folder}
                  <div>
                    <div style={{ fontSize:12,fontWeight:600 }}>{cat.name}</div>
                    {!hasKids && <div style={{ fontSize:10,color:"#bbb" }}>{prodCount} товаров</div>}
                  </div>
                </div>
                <button onClick={()=>deleteOwnCategory(cat.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#ccc",display:"flex" }}>{IC.trash}</button>
              </div>
              {renderOwnCatTree(cat.id, depth+1)}
            </div>
          );
        })}
      </div>
    );
  }

  if (!slug) return null;

  if (!authed) return (
    <div style={{ minHeight:"100vh",background:"#f7f7f7",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif" }}>
      <Head><title>Вход — {slug}</title></Head>
      <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:28,width:300,boxShadow:"0 4px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize:15,fontWeight:700,marginBottom:4 }}>Панель магазина</div>
        <div style={{ fontSize:12,color:"#aaa",marginBottom:18 }}>/{slug}</div>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Пароль" style={{ ...INP,marginBottom:8 }}/>
        {passErr && <div style={{ fontSize:12,color:"#e00",marginBottom:8 }}>{passErr}</div>}
        <BtnB onClick={login} style={{ width:"100%",justifyContent:"center" }}>Войти</BtnB>
      </div>
    </div>
  );

  if (!data) return <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#aaa",fontSize:13 }}>Загрузка...</div>;

  const settings = data.settings;
  const newOrdersCount = data.orders.filter(o=>o.status==="Новый").length;
  const ownLeafCats = data.ownCatalog.categories.filter(c=>!data.ownCatalog.categories.some(x=>x.parentId===c.id));
  const sharedLeafCats = data.sharedCatalog.categories.filter(c=>!data.sharedCatalog.categories.some(x=>x.parentId===c.id));

  return (
    <div style={{ minHeight:"100vh",background:"#f7f7f7",fontFamily:"'DM Sans',sans-serif" }}>
      <Head><title>{settings.name} — Панель</title></Head>

      {/* Header */}
      <div style={{ background:"#fff",borderBottom:"1px solid #e5e5e5",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:20 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:32,height:32,borderRadius:8,overflow:"hidden",background:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0 }}>
            {settings.logoImg ? <img src={settings.logoImg} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : settings.logoText}
          </div>
          <div>
            <div style={{ fontSize:13,fontWeight:700,lineHeight:1.2 }}>{settings.name}</div>
            <div style={{ fontSize:10,color:"#aaa" }}>/shop/{slug}</div>
          </div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <a href={`/shop/${slug}`} target="_blank" style={{ background:"none",border:"1px solid #e5e5e5",borderRadius:7,padding:"6px 10px",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5,textDecoration:"none",color:"#555" }}>{IC.eye} Витрина</a>
          <button onClick={async()=>{
            // Security: clear httpOnly cookie via server endpoint
            await fetch(`/api/admin/logout?type=shop&slug=${encodeURIComponent(slug)}`, { method:"POST" });
            setAuthed(false);
          }} style={{ background:"none",border:"none",fontSize:11,color:"#bbb",cursor:"pointer" }}>Выйти</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",background:"#fff",borderBottom:"1px solid #e5e5e5",overflowX:"auto" }}>
        {[
          { id:"catalog", label:"Каталог" },
          { id:"prices",  label:"Цены и остатки", show: settings.useSharedCatalog },
          { id:"orders",  label:`Заказы${newOrdersCount?` (${newOrdersCount})`:""}`},
          { id:"settings",label:"Настройки" },
        ].filter(t=>t.show!==false).map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"12px 18px",background:"none",border:"none",borderBottom:tab===t.id?"2px solid #000":"2px solid transparent",fontSize:12,fontWeight:tab===t.id?700:400,cursor:"pointer",color:tab===t.id?"#000":"#888",whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:16,maxWidth:720,margin:"0 auto" }}>

        {/* ── CATALOG TAB ── */}
        {tab==="catalog" && (
          <div>
            {/* Toggle shared/own */}
            <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:14,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:700,marginBottom:2 }}>
                  {settings.useSharedCatalog ? "Используется общий каталог" : "Используется свой каталог"}
                </div>
                <div style={{ fontSize:11,color:"#aaa" }}>
                  {settings.useSharedCatalog
                    ? "Товары берутся из общего каталога. Цены настраиваются во вкладке «Цены и остатки»."
                    : "Товары добавляешь сам — независимо от общего каталога."}
                </div>
              </div>
              <button onClick={toggleCatalogMode}
                style={{ background:settings.useSharedCatalog?"#f7f7f7":"#000",color:settings.useSharedCatalog?"#555":"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
                {settings.useSharedCatalog ? "Переключить на свой" : "Переключить на общий"}
              </button>
            </div>

            {/* Own catalog management */}
            {!settings.useSharedCatalog && (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                {/* Categories */}
                <div>
                  <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:14,marginBottom:10 }}>
                    <div style={{ fontSize:12,fontWeight:700,marginBottom:10 }}>Добавить категорию</div>
                    <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                      <input value={newCat.name} onChange={e=>setNewCat(n=>({...n,name:e.target.value}))} placeholder="Название" style={INP}/>
                      <select value={newCat.parentId} onChange={e=>setNewCat(n=>({...n,parentId:e.target.value}))} style={{ ...INP,color:newCat.parentId?"#000":"#aaa" }}>
                        <option value="">— Корневая —</option>
                        {data.ownCatalog.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <BtnB onClick={addOwnCategory} style={{ justifyContent:"center" }}>{IC.plus} Добавить</BtnB>
                    </div>
                  </div>
                  <div style={{ fontSize:11,color:"#aaa",fontWeight:600,letterSpacing:"0.5px",marginBottom:8 }}>СТРУКТУРА</div>
                  {renderOwnCatTree(null)}
                  {data.ownCatalog.categories.length===0 && <div style={{ color:"#ccc",textAlign:"center",padding:"20px 0",fontSize:12 }}>Нет категорий</div>}
                </div>

                {/* Products */}
                <div>
                  <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:14,marginBottom:10 }}>
                    <div style={{ fontSize:12,fontWeight:700,marginBottom:10 }}>Добавить товар</div>
                    <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                      <label style={{ border:"1.5px dashed #e0e0e0",borderRadius:8,height:70,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:"#fafafa" }}>
                        {newProd.img
                          ? <img src={newProd.img} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                          : <div style={{ textAlign:"center",color:"#bbb" }}>{IC.camera}<div style={{ fontSize:10,marginTop:2 }}>Фото</div></div>}
                        <input type="file" accept="image/*" style={{ display:"none" }}
                          onChange={e=>handleImgFile(e.target.files[0],img=>setNewProd(p=>({...p,img})))}/>
                      </label>
                      <input value={newProd.name} onChange={e=>setNewProd(p=>({...p,name:e.target.value}))} placeholder="Название" style={INP}/>
                      <div style={{ display:"flex",gap:6 }}>
                        <input value={newProd.price} onChange={e=>setNewProd(p=>({...p,price:e.target.value}))} placeholder="Цена ₽" type="number" style={INP}/>
                        <input value={newProd.stock} onChange={e=>setNewProd(p=>({...p,stock:e.target.value}))} placeholder="Остаток" type="number" style={INP}/>
                      </div>
                      <select value={newProd.categoryId} onChange={e=>setNewProd(p=>({...p,categoryId:e.target.value}))} style={{ ...INP,color:newProd.categoryId?"#000":"#aaa" }}>
                        <option value="">— Категория —</option>
                        {ownLeafCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <BtnB onClick={addOwnProduct} style={{ justifyContent:"center" }}>{IC.plus} Добавить товар</BtnB>
                    </div>
                  </div>

                  <div style={{ fontSize:11,color:"#aaa",fontWeight:600,letterSpacing:"0.5px",marginBottom:8 }}>ТОВАРЫ ({data.ownCatalog.products.length})</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                    {data.ownCatalog.products.map(p => {
                      const isEd = editingImg===p.id;
                      const cat = data.ownCatalog.categories.find(c=>c.id===p.categoryId);
                      return (
                        <div key={p.id} style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:9,overflow:"hidden" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:9,padding:"9px 11px" }}>
                            <div style={{ width:44,height:44,borderRadius:7,overflow:"hidden",background:"#f5f5f5",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc" }}>
                              {p.img ? <img src={p.img} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : IC.box}
                            </div>
                            <div style={{ flex:1,minWidth:0 }}>
                              <div style={{ fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.name}</div>
                              <div style={{ fontSize:10,color:"#aaa" }}>{p.price} ₽ · {p.stock} шт · {cat?.name||"—"}</div>
                            </div>
                            <div style={{ display:"flex",gap:5 }}>
                              <button onClick={()=>setEditingImg(isEd?null:p.id)}
                                style={{ background:"none",border:"1px solid #e5e5e5",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",color:isEd?"#000":"#aaa",display:"flex",alignItems:"center",gap:4 }}>
                                {IC.camera}
                              </button>
                              <button onClick={()=>deleteOwnProduct(p.id)}
                                style={{ background:"none",border:"1px solid #f0f0f0",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"#ccc",display:"flex" }}>
                                {IC.trash}
                              </button>
                            </div>
                          </div>
                          {isEd && (
                            <div style={{ borderTop:"1px solid #f5f5f5",padding:"10px 11px",display:"flex",gap:9,alignItems:"center" }}>
                              <label style={{ width:60,height:60,borderRadius:8,overflow:"hidden",background:"#f5f5f5",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"1.5px dashed #e0e0e0",color:"#ccc" }}>
                                {p.img ? <img src={p.img} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : IC.camera}
                                <input type="file" accept="image/*" style={{ display:"none" }}
                                  onChange={e=>handleImgFile(e.target.files[0],img=>updateOwnProductImg(p.id,img))}/>
                              </label>
                              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                                <BtnB style={{ fontSize:11,padding:"6px 10px" }}>
                                  <label style={{ cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
                                    {IC.camera} {p.img?"Заменить":"Добавить"}
                                    <input type="file" accept="image/*" style={{ display:"none" }}
                                      onChange={e=>handleImgFile(e.target.files[0],img=>updateOwnProductImg(p.id,img))}/>
                                  </label>
                                </BtnB>
                                {p.img && <BtnG onClick={()=>updateOwnProductImg(p.id,null)} style={{ fontSize:11,padding:"5px 10px" }}>{IC.trash} Удалить</BtnG>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Shared catalog info */}
            {settings.useSharedCatalog && (
              <div style={{ background:"#f7f7f7",border:"1px solid #e5e5e5",borderRadius:10,padding:14,textAlign:"center" }}>
                <div style={{ fontSize:13,color:"#888",marginBottom:4 }}>Используется общий каталог</div>
                <div style={{ fontSize:11,color:"#bbb" }}>Товары и категории управляются супер-администратором. Свои цены и остатки настрой во вкладке «Цены и остатки».</div>
              </div>
            )}
          </div>
        )}

        {/* ── PRICES TAB (only for shared catalog) ── */}
        {tab==="prices" && settings.useSharedCatalog && (
          <div>
            <div style={{ fontSize:11,color:"#aaa",fontWeight:600,letterSpacing:"0.5px",marginBottom:10 }}>
              ЦЕНЫ И ОСТАТКИ — задай свои значения для каждого товара
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
              {data.sharedCatalog.products.map(p => {
                const ov = data.prices[p.id] || {};
                const shopPrice = ov.price !== undefined ? ov.price : p.basePrice;
                // FIX: use catalog stock as default, not 0
                const shopStock = ov.stock !== undefined ? ov.stock : (p.stock || 0);
                const shopHidden = ov.hidden !== undefined ? ov.hidden : false;
                const cat = data.sharedCatalog.categories.find(c=>c.id===p.categoryId);
                return (
                  <PriceRow key={p.id} p={p} shopPrice={shopPrice} shopStock={shopStock}
                    shopHidden={shopHidden} catName={cat?.name||"—"} onSave={savePrice}/>
                );
              })}
              {data.sharedCatalog.products.length===0 &&
                <div style={{ color:"#ccc",textAlign:"center",padding:"30px 0",fontSize:13 }}>Нет товаров в общем каталоге</div>}
            </div>
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {tab==="orders" && (
          <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
            {data.orders.length===0 && <div style={{ color:"#ccc",textAlign:"center",padding:"30px 0",fontSize:13 }}>Заказов пока нет</div>}
            {data.orders.map(ord=>(
              <div key={ord.id} style={{ background:"#fff",border:ord.status==="Новый"?"1.5px solid #000":"1px solid #e5e5e5",borderRadius:10,padding:"12px 14px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
                  <div>
                    <span style={{ fontSize:13,fontWeight:700 }}>№{String(ord.id).padStart(5,"0")}</span>
                    <span style={{ fontSize:11,color:"#aaa",marginLeft:8 }}>{ord.date}</span>
                  </div>
                  <select value={ord.status} onChange={e=>updateOrderStatus(ord.id,e.target.value)}
                    style={{ border:"1px solid #e5e5e5",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",outline:"none" }}>
                    {["Новый","В обработке","Выполнен","Отмена"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ fontSize:12,color:"#555",marginBottom:4 }}>{ord.client} · @{ord.tg}</div>
                {ord.comment && <div style={{ fontSize:11,color:"#aaa",marginBottom:5,fontStyle:"italic" }}>"{ord.comment}"</div>}
                {ord.items.map((item,i)=>(
                  <div key={i} style={{ fontSize:12,color:"#666",marginBottom:1 }}>{item.name} × {item.qty} = {item.qty*item.price} ₽</div>
                ))}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,borderTop:"1px solid #f5f5f5",paddingTop:8 }}>
                  <span style={{ fontSize:13,fontWeight:700 }}>Итого: {ord.total} ₽</span>
                  <BtnG onClick={()=>setReceiptOrder(ord)} style={{ fontSize:11 }}>{IC.print} Чек</BtnG>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab==="settings" && settingsForm && (
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:14 }}>
              <div style={{ fontSize:12,fontWeight:700,marginBottom:8 }}>Название магазина</div>
              <input value={settingsForm.name||""} onChange={e=>setSettingsForm(f=>({...f,name:e.target.value}))} placeholder="Название" style={INP}/>
            </div>
            <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:14 }}>
              <div style={{ fontSize:12,fontWeight:700,marginBottom:10 }}>Логотип / Аватарка</div>
              <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                <div onClick={()=>logoRef.current?.click()}
                  style={{ width:62,height:62,borderRadius:10,overflow:"hidden",background:"#000",border:"1.5px dashed #e0e0e0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:11,fontWeight:800,color:"#fff",letterSpacing:1 }}>
                  {settingsForm.logoImg ? <img src={settingsForm.logoImg} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : settingsForm.logoText}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:"#aaa",marginBottom:6 }}>Нажми для загрузки, или измени аббревиатуру:</div>
                  <input value={settingsForm.logoText||""} onChange={e=>setSettingsForm(f=>({...f,logoText:e.target.value.slice(0,3).toUpperCase()}))}
                    maxLength={3} style={{ ...INP,width:70 }}/>
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display:"none" }}
                onChange={e=>{ const r=new FileReader(); r.onload=ev=>setSettingsForm(f=>({...f,logoImg:ev.target.result})); r.readAsDataURL(e.target.files[0]); }}/>
              {settingsForm.logoImg && (
                <BtnG onClick={()=>setSettingsForm(f=>({...f,logoImg:null}))} style={{ marginTop:10,width:"100%",justifyContent:"center",color:"#aaa" }}>
                  {IC.trash} Удалить изображение
                </BtnG>
              )}
            </div>
            <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:14 }}>
              <div style={{ fontSize:12,fontWeight:700,marginBottom:8 }}>WhatsApp</div>
              <input value={settingsForm.whatsapp||""} onChange={e=>setSettingsForm(f=>({...f,whatsapp:e.target.value}))} placeholder="79001234567" style={INP}/>
              <div style={{ fontSize:11,color:"#bbb",marginTop:5 }}>Без + и пробелов</div>
            </div>
            <div style={{ background:"#f7f7f7",border:"1px solid #e5e5e5",borderRadius:10,padding:14 }}>
              <div style={{ fontSize:12,fontWeight:600,marginBottom:3 }}>Ссылка на витрину</div>
              <code style={{ fontSize:12,color:"#555" }}>{typeof window!=="undefined"?window.location.origin:""}/shop/{slug}</code>
            </div>
            <BtnB onClick={saveSettings} disabled={saving} style={{ justifyContent:"center",padding:"12px" }}>
              {IC.check} {saving?"Сохраняется...":"Сохранить настройки"}
            </BtnB>
          </div>
        )}
      </div>

      {receiptOrder && <ReceiptModal order={receiptOrder} shopName={settings.name} onClose={()=>setReceiptOrder(null)}/>}
    </div>
  );
}

function PriceRow({ p, shopPrice, shopStock, shopHidden, catName, onSave }) {
  const [price,  setPrice]  = useState(String(shopPrice));
  const [stock,  setStock]  = useState(String(shopStock));
  const [hidden, setHidden] = useState(shopHidden);
  const [saved,  setSaved]  = useState(false);

  const changed = Number(price)!==shopPrice || Number(stock)!==shopStock || hidden!==shopHidden;

  async function save() {
    await onSave(p.id, Number(price), Number(stock), hidden);
    setSaved(true); setTimeout(()=>setSaved(false), 1600);
  }

  return (
    <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:9,padding:"9px 11px",display:"flex",alignItems:"center",gap:9,flexWrap:"wrap" }}>
      <div style={{ width:42,height:42,borderRadius:7,overflow:"hidden",background:"#f5f5f5",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc" }}>
        {p.img ? <img src={p.img} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> :
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
      </div>
      <div style={{ flex:1,minWidth:100 }}>
        <div style={{ fontSize:12,fontWeight:600 }}>{p.name}</div>
        <div style={{ fontSize:10,color:"#bbb" }}>{catName} · база: {p.basePrice} ₽ · в каталоге: {p.stock} шт</div>
      </div>
      <div style={{ display:"flex",gap:5,alignItems:"center",flexWrap:"wrap" }}>
        <div style={{ display:"flex",flexDirection:"column",gap:2,alignItems:"center" }}>
          <div style={{ fontSize:10,color:"#aaa" }}>Цена ₽</div>
          <input value={price} onChange={e=>setPrice(e.target.value)} type="number"
            style={{ width:68,border:"1px solid #e5e5e5",borderRadius:7,padding:"5px 7px",fontSize:12,outline:"none",textAlign:"center" }}/>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:2,alignItems:"center" }}>
          <div style={{ fontSize:10,color:"#aaa" }}>Остаток</div>
          <input value={stock} onChange={e=>setStock(e.target.value)} type="number"
            style={{ width:56,border:"1px solid #e5e5e5",borderRadius:7,padding:"5px 7px",fontSize:12,outline:"none",textAlign:"center" }}/>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:2,alignItems:"center" }}>
          <div style={{ fontSize:10,color:"#aaa" }}>Скрыть</div>
          <input type="checkbox" checked={hidden} onChange={e=>setHidden(e.target.checked)} style={{ width:15,height:15,accentColor:"#000",cursor:"pointer" }}/>
        </div>
        <button onClick={save}
          style={{ background:saved?"#27ae60":changed?"#000":"#f0f0f0",color:saved||changed?"#fff":"#aaa",border:"none",borderRadius:7,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",transition:"background .2s",marginTop:14,fontFamily:"inherit" }}>
          {saved?"✓":"Сохр."}
        </button>
      </div>
    </div>
  );
}
