import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { IC } from "@/components/Icons";

const inp = { border:"1px solid #e5e5e5",borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",background:"#fff" };
const btn = (bg="#000",c="#fff") => ({ background:bg,color:c,border:bg==="none"?"1px solid #e5e5e5":"none",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6 });

export default function SuperAdmin() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [pass, setPass]     = useState("");
  const [passErr, setPassErr] = useState("");
  const [shops, setShops]   = useState([]);
  const [form, setForm]     = useState({ name:"", slug:"", password:"" });
  const [formErr, setFormErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab]       = useState("shops"); // shops | catalog
  // catalog state
  const [catalog, setCatalog]   = useState({ categories:[], products:[] });
  const [newCat, setNewCat]     = useState({ name:"", parentId:"" });
  const [newProd, setNewProd]   = useState({ name:"", basePrice:"", stock:"", categoryId:"", img:null });
  const [editingImg, setEditingImg] = useState(null);
  const imgRef = typeof window !== "undefined" ? null : null;

  useEffect(() => {
    const a = sessionStorage.getItem("superauth");
    if (a === "1") { setAuthed(true); load(); }
  }, []);

  async function login() {
    setPassErr("");
    const r = await fetch("/api/admin/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ password: pass }) });
    if (r.ok) { sessionStorage.setItem("superauth","1"); setAuthed(true); load(); }
    else setPassErr("Неверный пароль");
  }

  async function load() {
    const [sr, cr] = await Promise.all([fetch("/api/admin/shops"), fetch("/api/admin/catalog")]);
    setShops(await sr.json());
    setCatalog(await cr.json());
  }

  async function createShop() {
    setFormErr("");
    if (!form.name || !form.slug || !form.password) return setFormErr("Заполни все поля");
    if (!/^[a-z0-9_-]+$/.test(form.slug)) return setFormErr("Slug: только a-z, 0-9, _, -");
    setLoading(true);
    const r = await fetch("/api/admin/shops", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) });
    setLoading(false);
    if (r.ok) { setForm({name:"",slug:"",password:""}); load(); }
    else { const d = await r.json(); setFormErr(d.error||"Ошибка"); }
  }

  async function toggleBlock(slug, blocked) {
    await fetch(`/api/admin/shops?slug=${slug}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ blocked: !blocked }) });
    load();
  }

  async function deleteShop(slug) {
    if (!confirm(`Удалить магазин «${slug}»?`)) return;
    await fetch(`/api/admin/shops?slug=${slug}`, { method:"DELETE" });
    load();
  }

  // catalog helpers
  async function addCategory() {
    if (!newCat.name.trim()) return;
    await fetch("/api/admin/catalog?action=addCategory", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(newCat) });
    setNewCat({ name:"", parentId:"" }); load();
  }
  async function deleteCategory(id) {
    await fetch(`/api/admin/catalog?action=deleteCategory&id=${id}`, { method:"DELETE" });
    load();
  }
  async function addProduct() {
    if (!newProd.name || !newProd.basePrice || !newProd.categoryId) return;
    await fetch("/api/admin/catalog?action=addProduct", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(newProd) });
    setNewProd({ name:"", basePrice:"", stock:"", categoryId:"", img:null }); load();
  }
  async function deleteProduct(id) {
    await fetch(`/api/admin/catalog?action=deleteProduct&id=${id}`, { method:"DELETE" });
    load();
  }
  async function updateProductImg(id, img) {
    await fetch(`/api/admin/catalog?action=updateProduct&id=${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ img }) });
    setEditingImg(null); load();
  }

  function handleImgFile(file, cb) {
    if (!file) return;
    const r = new FileReader(); r.onload = e => cb(e.target.result); r.readAsDataURL(file);
  }

  function renderCatTree(parentId, depth=0) {
    const children = catalog.categories.filter(c=>c.parentId===parentId);
    if (!children.length) return null;
    return (
      <div style={{ marginLeft: depth*14 }}>
        {children.map(cat => {
          const hasKids = catalog.categories.some(c=>c.parentId===cat.id);
          const prodCount = catalog.products.filter(p=>p.categoryId===cat.id).length;
          return (
            <div key={cat.id} style={{ marginBottom:5 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"#fff",border:"1px solid #e8e8e8",borderRadius:8 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,color:"#666" }}>
                  {IC.folder}
                  <div>
                    <div style={{ fontSize:12,fontWeight:600 }}>{cat.name}</div>
                    {!hasKids && <div style={{ fontSize:10,color:"#bbb" }}>{prodCount} товаров</div>}
                  </div>
                </div>
                <button onClick={()=>deleteCategory(cat.id)} style={{ ...btn("none","#ccc"),padding:"4px 8px" }}>{IC.trash}</button>
              </div>
              {renderCatTree(cat.id, depth+1)}
            </div>
          );
        })}
      </div>
    );
  }

  const leafCats = catalog.categories.filter(c=>!catalog.categories.some(x=>x.parentId===c.id));

  if (!authed) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f7f7" }}>
      <Head><title>Super Admin</title></Head>
      <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:32,width:320,boxShadow:"0 4px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize:16,fontWeight:700,marginBottom:4 }}>Супер-администратор</div>
        <div style={{ fontSize:12,color:"#aaa",marginBottom:20 }}>Управление всеми магазинами</div>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Пароль" style={{ ...inp, marginBottom:8 }}/>
        {passErr && <div style={{ fontSize:12,color:"#e00",marginBottom:8 }}>{passErr}</div>}
        <button onClick={login} style={{ ...btn(),width:"100%",justifyContent:"center" }}>Войти</button>
        <div style={{ fontSize:11,color:"#ccc",marginTop:8,textAlign:"center" }}>По умолчанию: superadmin</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#f7f7f7" }}>
      <Head><title>Super Admin — B2B Shop</title></Head>
      {/* Header */}
      <div style={{ background:"#fff",borderBottom:"1px solid #e5e5e5",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:20 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:32,height:32,background:"#000",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:800 }}>SA</div>
          <span style={{ fontSize:13,fontWeight:700 }}>Super Admin</span>
        </div>
        <button onClick={()=>{sessionStorage.removeItem("superauth");setAuthed(false);}} style={{ ...btn("none","#aaa"),fontSize:11 }}>Выйти</button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",background:"#fff",borderBottom:"1px solid #e5e5e5",padding:"0 24px" }}>
        {[{id:"shops",label:"Магазины"},{id:"catalog",label:"Общий каталог"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"13px 0",marginRight:24,background:"none",border:"none",borderBottom:tab===t.id?"2px solid #000":"2px solid transparent",fontSize:13,fontWeight:tab===t.id?700:400,cursor:"pointer",color:tab===t.id?"#000":"#888" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-panel" style={{ maxWidth:760,margin:"0 auto",padding:20 }}>

        {/* ── SHOPS TAB ── */}
        {tab==="shops" && (
          <div>
            {/* Create shop form */}
            <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:16,marginBottom:20 }}>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:12 }}>Создать новый магазин</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8 }}>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Название" style={inp}/>
                <input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value.toLowerCase()}))} placeholder="slug (opt, roznica…)" style={inp}/>
                <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Пароль" style={inp}/>
              </div>
              {formErr && <div style={{ fontSize:12,color:"#e00",marginBottom:8 }}>{formErr}</div>}
              <button onClick={createShop} disabled={loading} style={{ ...btn(),display:"flex",alignItems:"center",gap:6 }}>
                {IC.plus} Создать магазин
              </button>
            </div>

            {/* Shops list */}
            <div style={{ fontSize:11,color:"#aaa",fontWeight:600,letterSpacing:"0.5px",marginBottom:8 }}>МАГАЗИНЫ ({shops.length})</div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {shops.map(shop=>(
                <div key={shop.slug} style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:38,height:38,background:shop.blocked?"#f0f0f0":"#000",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:shop.blocked?"#aaa":"#fff",fontSize:11,fontWeight:800 }}>
                      {shop.slug.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:13,fontWeight:700 }}>{shop.name}</div>
                      <div style={{ fontSize:11,color:"#aaa" }}>/shop/{shop.slug} · пароль: {shop.password}</div>
                    </div>
                    {shop.blocked && <span style={{ background:"#fee",color:"#e00",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99 }}>БЛОК</span>}
                  </div>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                    <a href={`/shop/${shop.slug}`} target="_blank"
                      style={{ ...btn("none","#555"),fontSize:11,textDecoration:"none" }}>
                      {IC.eye} Витрина
                    </a>
                    <a href={`/admin/${shop.slug}`} target="_blank"
                      style={{ ...btn("none","#555"),fontSize:11,textDecoration:"none" }}>
                      {IC.edit} Панель
                    </a>
                    <button onClick={()=>toggleBlock(shop.slug,shop.blocked)}
                      style={{ ...btn(shop.blocked?"#000":"none", shop.blocked?"#fff":"#aaa"),fontSize:11 }}>
                      {IC.lock} {shop.blocked?"Разблокировать":"Блокировать"}
                    </button>
                    <button onClick={()=>deleteShop(shop.slug)} style={{ ...btn("none","#e00"),fontSize:11 }}>
                      {IC.trash}
                    </button>
                  </div>
                </div>
              ))}
              {shops.length===0 && <div style={{ color:"#ccc",textAlign:"center",padding:"30px 0",fontSize:13 }}>Нет магазинов. Создай первый.</div>}
            </div>
          </div>
        )}

        {/* ── CATALOG TAB ── */}
        {tab==="catalog" && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
            {/* Categories */}
            <div>
              <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:14,marginBottom:12 }}>
                <div style={{ fontSize:12,fontWeight:700,marginBottom:10 }}>Добавить категорию</div>
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  <input value={newCat.name} onChange={e=>setNewCat(n=>({...n,name:e.target.value}))} placeholder="Название" style={inp}/>
                  <select value={newCat.parentId} onChange={e=>setNewCat(n=>({...n,parentId:e.target.value}))} style={{ ...inp,color:newCat.parentId?"#000":"#aaa" }}>
                    <option value="">— Корневая —</option>
                    {catalog.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={addCategory} style={{ ...btn(),justifyContent:"center",padding:"9px" }}>{IC.plus} Добавить</button>
                </div>
              </div>
              <div style={{ fontSize:11,color:"#aaa",fontWeight:600,letterSpacing:"0.5px",marginBottom:8 }}>СТРУКТУРА</div>
              {renderCatTree(null)}
            </div>

            {/* Products */}
            <div>
              <div style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:14,marginBottom:12 }}>
                <div style={{ fontSize:12,fontWeight:700,marginBottom:10 }}>Добавить товар</div>
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  {/* img picker */}
                  <label style={{ border:"1.5px dashed #e0e0e0",borderRadius:8,height:80,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:"#fafafa",position:"relative" }}>
                    {newProd.img
                      ? <img src={newProd.img} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                      : <div style={{ textAlign:"center",color:"#bbb" }}>{IC.camera}<div style={{ fontSize:11,marginTop:3 }}>Фото</div></div>}
                    <input type="file" accept="image/*" style={{ display:"none" }}
                      onChange={e=>handleImgFile(e.target.files[0], img=>setNewProd(p=>({...p,img})))}/>
                  </label>
                  <input value={newProd.name} onChange={e=>setNewProd(p=>({...p,name:e.target.value}))} placeholder="Название" style={inp}/>
                  <div style={{ display:"flex",gap:6 }}>
                    <input value={newProd.basePrice} onChange={e=>setNewProd(p=>({...p,basePrice:e.target.value}))} placeholder="Базовая цена" type="number" style={inp}/>
                    <input value={newProd.stock} onChange={e=>setNewProd(p=>({...p,stock:e.target.value}))} placeholder="Остаток" type="number" style={inp}/>
                  </div>
                  <select value={newProd.categoryId} onChange={e=>setNewProd(p=>({...p,categoryId:e.target.value}))} style={{ ...inp,color:newProd.categoryId?"#000":"#aaa" }}>
                    <option value="">— Категория —</option>
                    {leafCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={addProduct} style={{ ...btn(),justifyContent:"center",padding:"9px" }}>{IC.plus} Добавить товар</button>
                </div>
              </div>
              <div style={{ fontSize:11,color:"#aaa",fontWeight:600,letterSpacing:"0.5px",marginBottom:8 }}>ТОВАРЫ ({catalog.products.length})</div>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {catalog.products.map(p=>{
                  const cat = catalog.categories.find(c=>c.id===p.categoryId);
                  const isEd = editingImg===p.id;
                  return (
                    <div key={p.id} style={{ background:"#fff",border:"1px solid #e5e5e5",borderRadius:9,overflow:"hidden" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px" }}>
                        <div style={{ width:44,height:44,borderRadius:7,overflow:"hidden",background:"#f5f5f5",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#bbb" }}>
                          {p.img?<img src={p.img} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:IC.box}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.name}</div>
                          <div style={{ fontSize:11,color:"#aaa" }}>{p.basePrice} ₽ · {p.stock} шт · {cat?.name||"—"}</div>
                        </div>
                        <div style={{ display:"flex",gap:5,flexShrink:0 }}>
                          <button onClick={()=>setEditingImg(isEd?null:p.id)} style={{ ...btn("none",isEd?"#000":"#aaa"),padding:"4px 8px",fontSize:11 }}>
                            {IC.camera}
                          </button>
                          <button onClick={()=>deleteProduct(p.id)} style={{ ...btn("none","#ccc"),padding:"4px 8px" }}>{IC.trash}</button>
                        </div>
                      </div>
                      {isEd && (
                        <div style={{ borderTop:"1px solid #f5f5f5",padding:"10px 12px",display:"flex",gap:10,alignItems:"center" }}>
                          <label style={{ width:60,height:60,borderRadius:8,overflow:"hidden",background:"#f5f5f5",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"1.5px dashed #e0e0e0",color:"#bbb" }}>
                            {p.img?<img src={p.img} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:IC.camera}
                            <input type="file" accept="image/*" style={{ display:"none" }}
                              onChange={e=>handleImgFile(e.target.files[0], img=>updateProductImg(p.id, img))}/>
                          </label>
                          <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                            <label style={{ ...btn(),fontSize:11,padding:"6px 10px",cursor:"pointer" }}>
                              {IC.camera} {p.img?"Заменить":"Добавить"}
                              <input type="file" accept="image/*" style={{ display:"none" }}
                                onChange={e=>handleImgFile(e.target.files[0], img=>updateProductImg(p.id, img))}/>
                            </label>
                            {p.img && <button onClick={()=>updateProductImg(p.id, null)} style={{ ...btn("none","#aaa"),fontSize:11,padding:"6px 10px" }}>{IC.trash} Удалить</button>}
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
      </div>
    </div>
  );
}
