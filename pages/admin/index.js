import { useState, useEffect, useRef } from "react";
import Head from "next/head";

const SF = { fontFamily:"'DM Sans','Helvetica Neue',sans-serif" };

// ── SVG icons ─────────────────────────────────────────────────────────────────
const I = {
  eye:      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
  trash:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  plus:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  folder:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>,
  file:     <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></svg>,
  camera:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M1 5v14h22V5H1M12 17a5 5 0 0 1-5-5 5 5 0 0 1 5-5 5 5 0 0 1 5 5 5 5 0 0 1-5 5z"/></svg>,
  box:      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{opacity:0.25}}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>,
  lock:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>,
};

function Btn({ children, onClick, disabled, variant="primary", style={} }) {
  const base = {cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit",border:"none",transition:"background .15s, transform .1s"};
  const variants = {
    primary: {background:"#111",color:"#fff",borderRadius:10,padding:"9px 16px",fontSize:12,fontWeight:600},
    ghost:   {background:"none",color:"#555",border:"1.5px solid #e0e0e0",borderRadius:10,padding:"8px 14px",fontSize:12},
    danger:  {background:"none",color:"#d00",border:"1.5px solid #fcc",borderRadius:10,padding:"7px 12px",fontSize:11},
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{...base,...variants[variant],opacity:disabled?0.4:1,...style}}>
      {children}
    </button>
  );
}

function EditableField({ value, onSave, style={} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setVal(value); }, [value]);
  if (!editing) return (
    <span onClick={()=>setEditing(true)} title="Нажми чтобы переименовать"
      style={{cursor:"pointer",borderBottom:"1px dashed #ccc",display:"inline-block",...style}}>{val}</span>
  );
  return (
    <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
      onBlur={()=>{onSave(val);setEditing(false);}}
      onKeyDown={e=>{if(e.key==="Enter"){onSave(val);setEditing(false);}if(e.key==="Escape")setEditing(false);}}
      style={{fontSize:12,fontWeight:600,border:"1px solid #111",borderRadius:8,padding:"3px 8px",width:Math.max((val||"").length*8,80),fontFamily:"inherit"}}/>
  );
}

export default function SuperAdmin() {
  const [authed,setAuthed]     = useState(false);
  const [pass,setPass]         = useState("");
  const [passErr,setPassErr]   = useState("");
  const [passLoading,setPassLoading] = useState(false);
  const [shops,setShops]       = useState([]);
  const [form,setForm]         = useState({name:"",slug:"",password:""});
  const [formErr,setFormErr]   = useState("");
  const [tab,setTab]           = useState("shops");
  const [catalog,setCatalog]   = useState({categories:[],products:[]});
  const [newCat,setNewCat]     = useState({name:"",parentId:""});
  const [newProd,setNewProd]   = useState({name:"",basePrice:"",cost:"",stock:"",categoryId:"",img:null});

  useEffect(()=>{
    if(sessionStorage.getItem("superauth")==="1"){setAuthed(true);load();}
  },[]);

  async function load(){
    const[sr,cr]=await Promise.all([fetch("/api/admin/shops"),fetch("/api/admin/catalog")]);
    setShops(await sr.json());setCatalog(await cr.json());
  }

  async function login(){
    setPassErr("");setPassLoading(true);
    const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pass})});
    setPassLoading(false);
    if(r.ok){sessionStorage.setItem("superauth","1");setAuthed(true);load();}
    else{const d=await r.json();setPassErr(d.error||"Неверный пароль");}
  }

  async function createShop(){
    setFormErr("");
    if(!form.name||!form.slug||!form.password)return setFormErr("Заполни все поля");
    if(!/^[a-z0-9_-]+$/.test(form.slug))return setFormErr("Slug: только a-z, 0-9, -");
    if(form.password.length<4)return setFormErr("Пароль минимум 4 символа");
    const r=await fetch("/api/admin/shops",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    if(r.ok){setForm({name:"",slug:"",password:""});load();}
    else{const d=await r.json();setFormErr(d.error||"Ошибка");}
  }

  async function toggleBlock(slug,blocked){
    await fetch(`/api/admin/shops?slug=${slug}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({blocked:!blocked})});
    load();
  }
  async function deleteShop(slug){
    if(!confirm(`Удалить магазин «${slug}»? Это действие нельзя отменить.`))return;
    await fetch(`/api/admin/shops?slug=${slug}`,{method:"DELETE"});load();
  }

  function handleImgFile(file,cb){const r=new FileReader();r.onload=e=>cb(e.target.result);r.readAsDataURL(file);}

  async function addCategory(){
    if(!newCat.name.trim())return;
    await fetch("/api/admin/catalog?action=addCategory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newCat)});
    setNewCat({name:"",parentId:""});load();
  }
  async function deleteCategory(id){
    if(!confirm("Удалить раздел и все товары в нём?"))return;
    await fetch(`/api/admin/catalog?action=deleteCategory&id=${id}`,{method:"DELETE"});load();
  }
  async function renameCategory(id,name){
    if(!name.trim())return;
    await fetch(`/api/admin/catalog?action=updateCategory&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});
    load();
  }
  async function moveCategory(id,parentId){
    await fetch(`/api/admin/catalog?action=updateCategory&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({parentId:parentId||null})});
    load();
  }
  async function addProduct(){
    if(!newProd.name||!newProd.basePrice||!newProd.categoryId)return;
    await fetch("/api/admin/catalog?action=addProduct",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newProd)});
    setNewProd(p=>({...p,name:"",basePrice:"",stock:"",img:null}));load();
  }
  async function deleteProduct(id){
    if(!confirm("Удалить товар?"))return;
    await fetch(`/api/admin/catalog?action=deleteProduct&id=${id}`,{method:"DELETE"});load();
  }
  async function renameProduct(id,name){
    if(!name.trim())return;
    await fetch(`/api/admin/catalog?action=updateProduct&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});
    load();
  }
  async function updateProductImg(id,img){
    await fetch(`/api/admin/catalog?action=updateProduct&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({img})});
    load();
  }
  async function moveProduct(id,categoryId){
    await fetch(`/api/admin/catalog?action=updateProduct&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({categoryId})});
    load();
  }

  const leafCats=catalog.categories.filter(c=>!catalog.categories.some(x=>x.parentId===c.id));

  function renderCatTree(parentId,depth=0){
    const children=catalog.categories.filter(c=>c.parentId===parentId);
    if(!children.length)return null;
    return(
      <div style={{marginLeft:depth*14}}>
        {children.map(cat=>{
          const hasKids=catalog.categories.some(c=>c.parentId===cat.id);
          const prodCount=catalog.products.filter(p=>p.categoryId===cat.id).length;
          return(
            <div key={cat.id} style={{marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"9px 12px",background:"#fff",border:"1px solid #ebebeb",borderRadius:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0,color:"#555"}}>
                  {hasKids?I.folder:I.file}
                  <div style={{flex:1,minWidth:0}}>
                    <EditableField value={cat.name} onSave={name=>renameCategory(cat.id,name)} style={{fontSize:12,fontWeight:600}}/>
                    {!hasKids&&<div style={{fontSize:10,color:"#bbb",marginTop:2}}>{prodCount} товаров</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
                  <select value={cat.parentId||""} onChange={e=>moveCategory(cat.id,e.target.value)}
                    style={{fontSize:10,padding:"4px 6px",borderRadius:8,border:"1px solid #e0e0e0",width:100,color:"#666",outline:"none"}}>
                    <option value="">Корневая</option>
                    {catalog.categories.filter(c=>c.id!==cat.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Btn variant="danger" onClick={()=>deleteCategory(cat.id)} style={{padding:"5px 8px",borderRadius:8}}>{I.trash}</Btn>
                </div>
              </div>
              {renderCatTree(cat.id,depth+1)}
            </div>
          );
        })}
      </div>
    );
  }

  const cardStyle={background:"#fff",border:"1px solid #ebebeb",borderRadius:14,boxShadow:"0 2px 10px rgba(0,0,0,0.05)"};
  const inpStyle={border:"1.5px solid #e0e0e0",borderRadius:10,padding:"9px 12px",fontSize:12,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",transition:"border-color .15s"};

  if(!authed) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f5f5f7",...SF}}>
      <Head><title>Super Admin</title></Head>
      <div style={{...cardStyle,padding:32,width:340,animation:"scaleIn .22s ease both"}}>
        <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
        <div style={{width:44,height:44,background:"#111",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:800,marginBottom:16}}>SA</div>
        <div style={{fontSize:17,fontWeight:700,marginBottom:4}}>Супер-администратор</div>
        <div style={{fontSize:12,color:"#aaa",marginBottom:22}}>Управление всеми магазинами</div>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Пароль"
          style={{...inpStyle,marginBottom:8}}/>
        {passErr&&<div style={{fontSize:12,color:"#e00",marginBottom:10,display:"flex",alignItems:"center",gap:5}}>⚠ {passErr}</div>}
        <Btn onClick={login} disabled={passLoading} style={{width:"100%",justifyContent:"center",padding:"11px"}}>
          {passLoading?"Вход...":"Войти"}
        </Btn>
        <div style={{fontSize:11,color:"#ccc",marginTop:10,textAlign:"center"}}>По умолчанию: superadmin</div>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#f5f5f7",...SF}}>
      <Head><title>Super Admin — B2B Shop</title></Head>
      <div style={{background:"rgba(255,255,255,0.9)",backdropFilter:"blur(12px)",borderBottom:"1px solid #ebebeb",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:20,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:"#111",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>SA</div>
          <span style={{fontSize:13,fontWeight:700}}>Super Admin</span>
        </div>
        <Btn variant="ghost" onClick={()=>{sessionStorage.removeItem("superauth");setAuthed(false);}} style={{fontSize:11,padding:"6px 12px"}}>Выйти</Btn>
      </div>

      <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #ebebeb",padding:"0 24px"}}>
        {[{id:"shops",label:"Магазины"},{id:"catalog",label:"Общий каталог"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"12px 0",marginRight:24,background:"none",border:"none",borderBottom:tab===t.id?"2px solid #111":"2px solid transparent",fontSize:13,fontWeight:tab===t.id?700:400,cursor:"pointer",color:tab===t.id?"#111":"#888",transition:"color .2s",fontFamily:"inherit"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:20,animation:"fadeUp .24s ease both"}}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {tab==="shops"&&(
          <div>
            <div style={{...cardStyle,padding:16,marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Создать новый магазин</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Название магазина" style={inpStyle}/>
                <input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,"")}))} placeholder="slug (opt, roznica…)" style={inpStyle}/>
                <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Пароль (мин. 4 символа)" style={inpStyle}/>
              </div>
              {formErr&&<div style={{fontSize:12,color:"#e00",marginBottom:10}}>⚠ {formErr}</div>}
              <Btn onClick={createShop}>{I.plus} Создать магазин</Btn>
            </div>

            <div style={{fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:"0.8px",marginBottom:12}}>МАГАЗИНЫ ({shops.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {shops.map(shop=>(
                <div key={shop.slug} style={{...cardStyle,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:40,height:40,background:shop.blocked?"#e0e0e0":"#111",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",color:shop.blocked?"#aaa":"#fff",fontSize:10,fontWeight:800,flexShrink:0}}>
                      {shop.slug.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700}}>{shop.name}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>/shop/{shop.slug} · пароль: {shop.password}</div>
                    </div>
                    {shop.blocked&&<span style={{background:"#fee2e2",color:"#dc2626",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:99}}>БЛОК</span>}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <a href={`/shop/${shop.slug}`} target="_blank"
                      style={{background:"none",border:"1.5px solid #e0e0e0",borderRadius:10,padding:"6px 10px",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5,textDecoration:"none",color:"#555",fontFamily:"inherit"}}>
                      {I.eye} Витрина
                    </a>
                    <a href={`/admin/${shop.slug}`} target="_blank"
                      style={{background:"none",border:"1.5px solid #e0e0e0",borderRadius:10,padding:"6px 10px",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5,textDecoration:"none",color:"#555",fontFamily:"inherit"}}>
                      {I.settings} Панель
                    </a>
                    <Btn variant="ghost" onClick={()=>toggleBlock(shop.slug,shop.blocked)} style={{fontSize:11,padding:"6px 10px",color:shop.blocked?"#111":"#888"}}>
                      {I.lock} {shop.blocked?"Разблок.":"Блок."}
                    </Btn>
                    <Btn variant="danger" onClick={()=>deleteShop(shop.slug)} style={{padding:"6px 10px"}}>
                      {I.trash}
                    </Btn>
                  </div>
                  <BotConfig slug={shop.slug}/>
                </div>
              ))}
              {shops.length===0&&<div style={{color:"#ccc",textAlign:"center",padding:"40px 0",fontSize:13}}>Нет магазинов. Создай первый выше.</div>}
            </div>
          </div>
        )}

        {tab==="catalog"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div>
              <div style={{...cardStyle,padding:14,marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Добавить категорию</div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  <input value={newCat.name} onChange={e=>setNewCat(n=>({...n,name:e.target.value}))} placeholder="Название" style={inpStyle}/>
                  <select value={newCat.parentId} onChange={e=>setNewCat(n=>({...n,parentId:e.target.value}))}
                    style={{...inpStyle,color:newCat.parentId?"#111":"#aaa"}}>
                    <option value="">— Корневая —</option>
                    {catalog.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Btn onClick={addCategory} style={{justifyContent:"center"}}>{I.plus} Добавить</Btn>
                </div>
              </div>
              <div style={{fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:"0.5px",marginBottom:8}}>СТРУКТУРА</div>
              {renderCatTree(null)}
              {catalog.categories.filter(c=>c.parentId===null).length===0&&
                <div style={{color:"#ccc",textAlign:"center",padding:"24px 0",fontSize:12}}>Нет категорий</div>}
            </div>

            <div>
              <div style={{...cardStyle,padding:14,marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Добавить товар</div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  <label style={{border:"1.5px dashed #e0e0e0",borderRadius:12,height:80,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:"#fafafa",position:"relative"}}>
                    {newProd.img
                      ?<img src={newProd.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      :<div style={{textAlign:"center",color:"#bbb",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>{I.camera}<span style={{fontSize:11}}>Добавить фото</span></div>}
                    <input type="file" accept="image/*" style={{display:"none"}}
                      onChange={e=>handleImgFile(e.target.files[0],img=>setNewProd(p=>({...p,img})))}/>
                  </label>
                  <input value={newProd.name} onChange={e=>setNewProd(p=>({...p,name:e.target.value}))} placeholder="Название товара" style={inpStyle}/>
                  <div style={{display:"flex",gap:6}}>
                    <input value={newProd.basePrice} onChange={e=>setNewProd(p=>({...p,basePrice:e.target.value}))} placeholder="Цена ₽" type="number" style={inpStyle}/>
                    <input value={newProd.cost||""} onChange={e=>setNewProd(p=>({...p,cost:e.target.value}))} placeholder="Себест. ₽" type="number" style={inpStyle}/>
                    <input value={newProd.stock} onChange={e=>setNewProd(p=>({...p,stock:e.target.value}))} placeholder="Остаток" type="number" style={inpStyle}/>
                  </div>
                  <select value={newProd.categoryId} onChange={e=>setNewProd(p=>({...p,categoryId:e.target.value}))}
                    style={{...inpStyle,color:newProd.categoryId?"#111":"#aaa"}}>
                    <option value="">— Выбери категорию —</option>
                    {leafCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Btn onClick={addProduct} style={{justifyContent:"center"}}>{I.plus} Добавить товар</Btn>
                </div>
              </div>
              <div style={{fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:"0.5px",marginBottom:8}}>ТОВАРЫ ({catalog.products.length})</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {catalog.products.map(p=>{
                  const cat=catalog.categories.find(c=>c.id===p.categoryId);
                  return(
                    <div key={p.id} style={{...cardStyle,padding:"9px 12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <label style={{width:46,height:46,borderRadius:10,overflow:"hidden",background:"#f5f5f5",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"1.5px dashed #e0e0e0"}}>
                          {p.img?<img src={p.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:I.box}
                          <input type="file" accept="image/*" style={{display:"none"}}
                            onChange={e=>handleImgFile(e.target.files[0],img=>updateProductImg(p.id,img))}/>
                        </label>
                        <div style={{flex:1,minWidth:0}}>
                          <EditableField value={p.name} onSave={name=>renameProduct(p.id,name)} style={{fontSize:12,fontWeight:600}}/>
                          <div style={{fontSize:10,color:"#aaa",marginTop:2}}>{p.basePrice} ₽ · {p.stock} шт · {cat?.name||"—"}</div>
                        </div>
                        <div style={{display:"flex",gap:5,flexShrink:0,flexDirection:"column",alignItems:"flex-end"}}>
                          <select value={p.categoryId||""} onChange={e=>moveProduct(p.id,e.target.value)}
                            style={{fontSize:10,padding:"3px 6px",borderRadius:8,border:"1px solid #e0e0e0",width:90,color:"#666",outline:"none"}}>
                            {catalog.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <Btn variant="danger" onClick={()=>deleteProduct(p.id)} style={{padding:"4px 8px",fontSize:10}}>{I.trash} Удалить</Btn>
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

// ── BotConfig: telegram bot access per shop ───────────────────────────────────
function BotConfig({ slug }) {
  const [cfg, setCfg]       = useState(null);
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (open && !cfg) load();
  }, [open]);

  async function load() {
    const r = await fetch(`/api/admin/shop-config?slug=${slug}`);
    setCfg(await r.json());
  }

  async function action(act) {
    const r = await fetch(`/api/admin/shop-config?slug=${slug}&action=${act}`, { method:"POST" });
    setCfg(await r.json());
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  const bot = cfg?.telegramBot || {};
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div style={{ borderTop:"1px solid #f0f0f0", marginTop:10, paddingTop:10 }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#888", display:"flex", alignItems:"center", gap:5, fontFamily:"inherit", padding:0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        Telegram-бот (бухгалтерия) {open ? "▲" : "▼"}
      </button>

      {open && cfg && (
        <div style={{ marginTop:10, background:"#f9f9f9", borderRadius:10, padding:12, display:"flex", flexDirection:"column", gap:8 }}>
          {/* toggle */}
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:12 }}>
            <input type="checkbox" checked={bot.enabled||false}
              onChange={e => action(e.target.checked ? "enable" : "disable")}
              style={{ width:15, height:15, accentColor:"#111", cursor:"pointer" }}/>
            <span style={{ fontWeight:600 }}>Доступ к Telegram-боту</span>
          </label>

          {bot.enabled && (
            <>
              {/* codes */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ background:"#fff", border:"1px solid #e5e5e5", borderRadius:8, padding:"8px 10px" }}>
                  <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>КОД ДОСТУПА</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
                    <span style={{ fontSize:14, fontWeight:700, letterSpacing:2 }}>{bot.accessCode||"—"}</span>
                    <button onClick={()=>copy(bot.accessCode,"access")}
                      style={{ background:"none", border:"none", cursor:"pointer", fontSize:10, color: copied==="access"?"#16a34a":"#aaa", fontFamily:"inherit" }}>
                      {copied==="access"?"✓ скопировано":"копировать"}
                    </button>
                  </div>
                </div>
                <div style={{ background:"#fff", border:"1px solid #e5e5e5", borderRadius:8, padding:"8px 10px" }}>
                  <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>КОД ПОДТВЕРЖДЕНИЯ</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
                    <span style={{ fontSize:14, fontWeight:700, letterSpacing:2 }}>{bot.verifyCode||"—"}</span>
                    <button onClick={()=>copy(bot.verifyCode,"verify")}
                      style={{ background:"none", border:"none", cursor:"pointer", fontSize:10, color:copied==="verify"?"#16a34a":"#aaa", fontFamily:"inherit" }}>
                      {copied==="verify"?"✓ скопировано":"копировать"}
                    </button>
                  </div>
                </div>
              </div>

              {/* telegram id status */}
              <div style={{ fontSize:11, color: bot.telegramId ? "#16a34a" : "#aaa" }}>
                {bot.telegramId
                  ? `✓ Привязан Telegram ID: ${bot.telegramId}`
                  : "Ожидает привязки — отправь коды в бота"}
              </div>

              {/* api url */}
              <div style={{ background:"#fff", border:"1px solid #e5e5e5", borderRadius:8, padding:"8px 10px" }}>
                <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>API URL ДЛЯ БОТА</div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
                  <code style={{ fontSize:10, color:"#555", wordBreak:"break-all" }}>{baseUrl}/api/admin/update-stock</code>
                  <button onClick={()=>copy(`${baseUrl}/api/admin/update-stock`,"url")}
                    style={{ background:"none", border:"none", cursor:"pointer", fontSize:10, color:copied==="url"?"#16a34a":"#aaa", fontFamily:"inherit", flexShrink:0 }}>
                    {copied==="url"?"✓":"копировать"}
                  </button>
                </div>
              </div>

              {/* buttons */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <button onClick={()=>action("regenerate")}
                  style={{ background:"none", border:"1.5px solid #e0e0e0", borderRadius:8, padding:"6px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                  🔄 Новые коды
                </button>
                {bot.telegramId && (
                  <button onClick={()=>{ if(confirm("Сбросить привязку и сгенерировать новые коды?")) action("reset"); }}
                    style={{ background:"none", border:"1.5px solid #fcc", borderRadius:8, padding:"6px 10px", fontSize:11, cursor:"pointer", color:"#d00", fontFamily:"inherit" }}>
                    ✕ Сбросить доступ
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
