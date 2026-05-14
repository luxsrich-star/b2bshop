import { useState, useEffect, useRef } from "react";
import Head from "next/head";

const SF = { fontFamily:"'DM Sans','Helvetica Neue',sans-serif" };

function Btn({ children, onClick, disabled, variant="primary", style={} }) {
  const cls = variant==="primary" ? "btn-primary" : variant==="ghost" ? "btn-ghost" : "btn-danger";
  return <button className={cls} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

function EditableField({ value, onSave, style={} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  if (!editing) return (
    <span onClick={()=>setEditing(true)} style={{ cursor:"pointer", borderBottom:"1px dashed #ccc", ...style }}>{value}</span>
  );
  return (
    <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
      onBlur={()=>{ onSave(val); setEditing(false); }}
      onKeyDown={e=>{ if(e.key==="Enter"){ onSave(val); setEditing(false); } if(e.key==="Escape") setEditing(false); }}
      style={{ border:"1px solid #111",borderRadius:8,padding:"3px 8px",fontSize:13,fontWeight:600,width:Math.max(val.length*9,80),fontFamily:"inherit" }}/>
  );
}

export default function SuperAdmin() {
  const [authed, setAuthed]   = useState(false);
  const [pass, setPass]       = useState("");
  const [passErr, setPassErr] = useState("");
  const [shops, setShops]     = useState([]);
  const [form, setForm]       = useState({ name:"", slug:"", password:"" });
  const [formErr, setFormErr] = useState("");
  const [tab, setTab]         = useState("shops");
  const [catalog, setCatalog] = useState({ categories:[], products:[] });
  const [newCat, setNewCat]   = useState({ name:"", parentId:"" });
  const [newProd, setNewProd] = useState({ name:"", basePrice:"", stock:"", categoryId:"", img:null });

  useEffect(() => {
    if (sessionStorage.getItem("superauth")==="1") { setAuthed(true); load(); }
  }, []);

  async function load() {
    const [sr, cr] = await Promise.all([fetch("/api/admin/shops"), fetch("/api/admin/catalog")]);
    setShops(await sr.json()); setCatalog(await cr.json());
  }

  async function login() {
    const r = await fetch("/api/admin/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ password: pass }) });
    if (r.ok) { sessionStorage.setItem("superauth","1"); setAuthed(true); load(); }
    else setPassErr("Неверный пароль");
  }

  async function createShop() {
    setFormErr("");
    if (!form.name||!form.slug||!form.password) return setFormErr("Заполни все поля");
    if (!/^[a-z0-9_-]+$/.test(form.slug)) return setFormErr("Slug: только a-z, 0-9, -");
    if (shops.find(s=>s.slug===form.slug)) return setFormErr("Slug уже занят");
    const r = await fetch("/api/admin/shops", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) });
    if (r.ok) { setForm({name:"",slug:"",password:""}); load(); }
    else { const d=await r.json(); setFormErr(d.error||"Ошибка"); }
  }

  async function toggleBlock(slug, blocked) {
    await fetch(`/api/admin/shops?slug=${slug}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ blocked: !blocked }) });
    load();
  }
  async function deleteShop(slug) {
    if (!confirm(`Удалить магазин «${slug}»?`)) return;
    await fetch(`/api/admin/shops?slug=${slug}`, { method:"DELETE" }); load();
  }

  function handleImgFile(file, cb) { const r=new FileReader(); r.onload=e=>cb(e.target.result); r.readAsDataURL(file); }

  // catalog
  async function addCategory() {
    if (!newCat.name.trim()) return;
    await fetch("/api/admin/catalog?action=addCategory", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(newCat) });
    setNewCat({name:"",parentId:""}); load();
  }
  async function deleteCategory(id) {
    if (!confirm("Удалить раздел со всем содержимым?")) return;
    await fetch(`/api/admin/catalog?action=deleteCategory&id=${id}`, { method:"DELETE" }); load();
  }
  async function renameCategory(id, name) {
    await fetch(`/api/admin/catalog?action=updateCategory&id=${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name }) });
    load();
  }
  async function moveCategory(id, parentId) {
    await fetch(`/api/admin/catalog?action=updateCategory&id=${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ parentId: parentId||null }) });
    load();
  }
  async function addProduct() {
    if (!newProd.name||!newProd.basePrice||!newProd.categoryId) return;
    await fetch("/api/admin/catalog?action=addProduct", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(newProd) });
    setNewProd(p=>({...p,name:"",basePrice:"",stock:"",img:null})); load();
  }
  async function deleteProduct(id) {
    if (!confirm("Удалить товар?")) return;
    await fetch(`/api/admin/catalog?action=deleteProduct&id=${id}`, { method:"DELETE" }); load();
  }
  async function renameProduct(id, name) {
    await fetch(`/api/admin/catalog?action=updateProduct&id=${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name }) });
    load();
  }
  async function updateProductImg(id, img) {
    await fetch(`/api/admin/catalog?action=updateProduct&id=${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ img }) });
    load();
  }
  async function moveProduct(id, categoryId) {
    await fetch(`/api/admin/catalog?action=updateProduct&id=${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ categoryId }) });
    load();
  }

  const leafCats = catalog.categories.filter(c=>!catalog.categories.some(x=>x.parentId===c.id));

  function renderCatTree(parentId, depth=0) {
    const children = catalog.categories.filter(c=>c.parentId===parentId);
    if (!children.length) return null;
    return (
      <div style={{ marginLeft: depth*14 }}>
        {children.map(cat => {
          const hasKids = catalog.categories.some(c=>c.parentId===cat.id);
          const prodCount = catalog.products.filter(p=>p.categoryId===cat.id).length;
          return (
            <div key={cat.id} style={{ marginBottom:6 }}>
              <div className="card" style={{ padding:"9px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0 }}>
                  <span style={{ fontSize:16 }}>{hasKids?"📁":"📄"}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <EditableField value={cat.name} onSave={name=>renameCategory(cat.id,name)} style={{ fontSize:12,fontWeight:600 }}/>
                    {!hasKids && <div style={{ fontSize:10,color:"#bbb",marginTop:2 }}>{prodCount} товаров</div>}
                  </div>
                </div>
                <div style={{ display:"flex",gap:5,alignItems:"center",flexShrink:0 }}>
                  <select value={cat.parentId||""} onChange={e=>moveCategory(cat.id,e.target.value)}
                    style={{ fontSize:10,padding:"4px 6px",borderRadius:8,border:"1px solid #e0e0e0",width:100,color:"#666" }}>
                    <option value="">Корневая</option>
                    {catalog.categories.filter(c=>c.id!==cat.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button className="btn-danger" onClick={()=>deleteCategory(cat.id)} style={{ padding:"5px 8px",borderRadius:8 }}>✕</button>
                </div>
              </div>
              {renderCatTree(cat.id, depth+1)}
            </div>
          );
        })}
      </div>
    );
  }

  if (!authed) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f5f5f7",...SF }}>
      <Head><title>Super Admin</title></Head>
      <div className="card anim-scale-in" style={{ padding:32,width:320 }}>
        <div style={{ fontSize:16,fontWeight:700,marginBottom:4 }}>Супер-администратор</div>
        <div style={{ fontSize:12,color:"#aaa",marginBottom:20 }}>Управление всеми магазинами</div>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Пароль" style={{ marginBottom:8 }}/>
        {passErr && <div style={{ fontSize:12,color:"#e00",marginBottom:8 }}>{passErr}</div>}
        <Btn onClick={login} style={{ width:"100%",justifyContent:"center" }}>Войти</Btn>
        <div style={{ fontSize:11,color:"#ccc",marginTop:8,textAlign:"center" }}>По умолчанию: superadmin</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#f5f5f7",...SF }}>
      <Head><title>Super Admin — B2B Shop</title></Head>
      <div style={{ background:"#fff",borderBottom:"1px solid #ebebeb",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:20,boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:32,height:32,background:"#111",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800 }}>SA</div>
          <span style={{ fontSize:13,fontWeight:700 }}>Super Admin</span>
        </div>
        <button className="btn-ghost" onClick={()=>{sessionStorage.removeItem("superauth");setAuthed(false);}} style={{ fontSize:11,padding:"6px 12px" }}>Выйти</button>
      </div>

      <div style={{ display:"flex",background:"#fff",borderBottom:"1px solid #ebebeb",padding:"0 20px" }}>
        {[{id:"shops",label:"Магазины"},{id:"catalog",label:"Общий каталог"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"12px 0",marginRight:24,background:"none",border:"none",borderBottom:tab===t.id?"2px solid #111":"2px solid transparent",fontSize:13,fontWeight:tab===t.id?700:400,cursor:"pointer",color:tab===t.id?"#111":"#888",transition:"color 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-panel" style={{ maxWidth:860,margin:"0 auto",padding:20 }}>

        {tab==="shops" && (
          <div>
            <div className="card" style={{ padding:16,marginBottom:20 }}>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:12 }}>Создать магазин</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8 }}>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Название"/>
                <input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,"")}))} placeholder="slug"/>
                <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Пароль"/>
              </div>
              {formErr && <div style={{ fontSize:12,color:"#e00",marginBottom:8 }}>{formErr}</div>}
              <Btn onClick={createShop}>+ Создать</Btn>
            </div>

            <div style={{ fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:"0.8px",marginBottom:10 }}>МАГАЗИНЫ ({shops.length})</div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {shops.map(shop=>(
                <div key={shop.slug} className="card" style={{ padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:38,height:38,background:shop.blocked?"#e0e0e0":"#111",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",color:shop.blocked?"#aaa":"#fff",fontSize:10,fontWeight:800 }}>
                      {shop.slug.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:13,fontWeight:700 }}>{shop.name}</div>
                      <div style={{ fontSize:11,color:"#aaa" }}>/shop/{shop.slug} · пароль: {shop.password}</div>
                    </div>
                    {shop.blocked && <span style={{ background:"#fee",color:"#e00",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:99 }}>БЛОК</span>}
                  </div>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                    <a href={`/shop/${shop.slug}`} target="_blank" className="btn-ghost" style={{ fontSize:11,padding:"6px 10px" }}>👁 Витрина</a>
                    <a href={`/admin/${shop.slug}`} target="_blank" className="btn-ghost" style={{ fontSize:11,padding:"6px 10px" }}>⚙ Панель</a>
                    <button className="btn-ghost" onClick={()=>toggleBlock(shop.slug,shop.blocked)} style={{ fontSize:11,padding:"6px 10px",color:shop.blocked?"#111":"#888" }}>
                      {shop.blocked?"Разблок.":"Блок."}
                    </button>
                    <button className="btn-danger" onClick={()=>deleteShop(shop.slug)} style={{ padding:"6px 10px" }}>✕</button>
                  </div>
                </div>
              ))}
              {shops.length===0 && <div style={{ color:"#ccc",textAlign:"center",padding:"30px 0",fontSize:13 }}>Нет магазинов</div>}
            </div>
          </div>
        )}

        {tab==="catalog" && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
            {/* Categories */}
            <div>
              <div className="card" style={{ padding:14,marginBottom:12 }}>
                <div style={{ fontSize:12,fontWeight:700,marginBottom:10 }}>Добавить категорию</div>
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  <input value={newCat.name} onChange={e=>setNewCat(n=>({...n,name:e.target.value}))} placeholder="Название"/>
                  <select value={newCat.parentId} onChange={e=>setNewCat(n=>({...n,parentId:e.target.value}))} style={{ color:newCat.parentId?"#111":"#aaa" }}>
                    <option value="">— Корневая —</option>
                    {catalog.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Btn onClick={addCategory} style={{ justifyContent:"center" }}>+ Добавить</Btn>
                </div>
              </div>
              <div style={{ fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:"0.5px",marginBottom:8 }}>СТРУКТУРА</div>
              {renderCatTree(null)}
              {catalog.categories.filter(c=>c.parentId===null).length===0 && <div style={{ color:"#ccc",textAlign:"center",padding:"20px 0",fontSize:12 }}>Нет категорий</div>}
            </div>

            {/* Products */}
            <div>
              <div className="card" style={{ padding:14,marginBottom:12 }}>
                <div style={{ fontSize:12,fontWeight:700,marginBottom:10 }}>Добавить товар</div>
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  <label style={{ border:"1.5px dashed #e0e0e0",borderRadius:12,height:80,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:"#fafafa" }}>
                    {newProd.img ? <img src={newProd.img} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> :
                      <div style={{ textAlign:"center",color:"#bbb",fontSize:12 }}>📷 Фото</div>}
                    <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleImgFile(e.target.files[0],img=>setNewProd(p=>({...p,img})))}/>
                  </label>
                  <input value={newProd.name} onChange={e=>setNewProd(p=>({...p,name:e.target.value}))} placeholder="Название"/>
                  <div style={{ display:"flex",gap:6 }}>
                    <input value={newProd.basePrice} onChange={e=>setNewProd(p=>({...p,basePrice:e.target.value}))} placeholder="Цена" type="number"/>
                    <input value={newProd.stock} onChange={e=>setNewProd(p=>({...p,stock:e.target.value}))} placeholder="Остаток" type="number"/>
                  </div>
                  <select value={newProd.categoryId} onChange={e=>setNewProd(p=>({...p,categoryId:e.target.value}))} style={{ color:newProd.categoryId?"#111":"#aaa" }}>
                    <option value="">— Категория —</option>
                    {leafCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Btn onClick={addProduct} style={{ justifyContent:"center" }}>+ Добавить товар</Btn>
                </div>
              </div>
              <div style={{ fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:"0.5px",marginBottom:8 }}>ТОВАРЫ ({catalog.products.length})</div>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {catalog.products.map(p=>{
                  const cat = catalog.categories.find(c=>c.id===p.categoryId);
                  return (
                    <div key={p.id} className="card" style={{ padding:"9px 12px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                        <label style={{ width:46,height:46,borderRadius:10,overflow:"hidden",background:"#f5f5f5",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"1.5px dashed #e0e0e0" }}>
                          {p.img ? <img src={p.img} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span style={{ fontSize:20 }}>📦</span>}
                          <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleImgFile(e.target.files[0],img=>updateProductImg(p.id,img))}/>
                        </label>
                        <div style={{ flex:1,minWidth:0 }}>
                          <EditableField value={p.name} onSave={name=>renameProduct(p.id,name)} style={{ fontSize:12,fontWeight:600 }}/>
                          <div style={{ fontSize:10,color:"#aaa",marginTop:2 }}>{p.basePrice} ₽ · {p.stock} шт</div>
                        </div>
                        <div style={{ display:"flex",gap:5,flexShrink:0,flexDirection:"column",alignItems:"flex-end" }}>
                          <select value={p.categoryId||""} onChange={e=>moveProduct(p.id,e.target.value)}
                            style={{ fontSize:10,padding:"3px 6px",borderRadius:8,border:"1px solid #e0e0e0",width:90,color:"#666" }}>
                            {catalog.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <button className="btn-danger" onClick={()=>deleteProduct(p.id)} style={{ padding:"4px 8px",borderRadius:8,fontSize:10 }}>Удалить</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
