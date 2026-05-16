import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { ReceiptModal } from "@/components/Receipt";

const SF = { fontFamily:"'DM Sans','Helvetica Neue',sans-serif" };

const I = {
  eye:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>,
  trash:   <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  plus:    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  check:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  folder:  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>,
  file:    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></svg>,
  camera:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M1 5v14h22V5H1M12 17a5 5 0 0 1-5-5 5 5 0 0 1 5-5 5 5 0 0 1 5 5 5 5 0 0 1-5 5z"/></svg>,
  print:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>,
  box:     <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" style={{opacity:0.25}}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>,
};

function Btn({ children, onClick, disabled, variant="primary", style={} }) {
  const base={cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"background .15s",border:"none"};
  const variants={
    primary:{background:"#111",color:"#fff",borderRadius:10,padding:"9px 14px",fontSize:12,fontWeight:600},
    ghost:  {background:"none",color:"#555",border:"1.5px solid #e0e0e0",borderRadius:10,padding:"8px 12px",fontSize:12},
    danger: {background:"none",color:"#d00",border:"1.5px solid #fcc",borderRadius:10,padding:"6px 10px",fontSize:11},
  };
  return <button onClick={onClick} disabled={disabled} style={{...base,...variants[variant],opacity:disabled?0.4:1,...style}}>{children}</button>;
}

function EditableField({ value, onSave, style={} }) {
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(value);
  const ref=useRef(null);
  useEffect(()=>{if(editing)ref.current?.focus();},[editing]);
  useEffect(()=>{setVal(value);},[value]);
  if(!editing)return(
    <span onClick={()=>setEditing(true)} title="Нажми чтобы переименовать"
      style={{cursor:"pointer",borderBottom:"1px dashed #ddd",display:"inline-block",...style}}>{val}</span>
  );
  return(
    <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
      onBlur={()=>{onSave(val);setEditing(false);}}
      onKeyDown={e=>{if(e.key==="Enter"){onSave(val);setEditing(false);}if(e.key==="Escape")setEditing(false);}}
      style={{fontSize:12,fontWeight:600,border:"1px solid #111",borderRadius:8,padding:"3px 8px",width:Math.max((val||"").length*8,80),fontFamily:"inherit"}}/>
  );
}

export default function SellerPanel() {
  const router=useRouter();
  const {slug}=router.query;
  const [authed,setAuthed]=useState(false);
  const [pass,setPass]=useState("");
  const [passErr,setPassErr]=useState("");
  const [passLoading,setPassLoading]=useState(false);
  const [tab,setTab]=useState("catalog");
  const [data,setData]=useState(null);
  const [saving,setSaving]=useState(false);
  const [receiptOrder,setReceiptOrder]=useState(null);
  const [settingsForm,setSettingsForm]=useState(null);
  const [newCat,setNewCat]=useState({name:"",parentId:""});
  const [newProd,setNewProd]=useState({name:"",price:"",stock:"",categoryId:"",img:null});
  const logoRef=useRef(null);

  useEffect(()=>{
    if(!slug)return;
    if(sessionStorage.getItem("sellerauth_"+slug)==="1"){setAuthed(true);loadData();}
  },[slug]);

  async function loadData(){
    const r=await fetch(`/api/admin/shop-data?slug=${slug}`);
    const d=await r.json();
    setData(d);setSettingsForm({...d.settings});
  }

  async function login(){
    setPassErr("");setPassLoading(true);
    const r=await fetch("/api/admin/shop-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,password:pass})});
    setPassLoading(false);
    if(r.ok){sessionStorage.setItem("sellerauth_"+slug,"1");setAuthed(true);loadData();}
    else{const d=await r.json();setPassErr(d.error||"Неверный пароль");}
  }

  async function saveSettings(){
    setSaving(true);
    await fetch(`/api/admin/shop-data?slug=${slug}&action=saveSettings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settingsForm)});
    setSaving(false);loadData();
  }

  async function savePrice(productId,price,stock,hidden){
    await fetch(`/api/admin/shop-data?slug=${slug}&action=savePrice`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,price,stock,hidden})});
    loadData();
  }

  async function toggleCatalogMode(){
    const updated={...settingsForm,useSharedCatalog:!settingsForm.useSharedCatalog};
    setSettingsForm(updated);
    await fetch(`/api/admin/shop-data?slug=${slug}&action=saveSettings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(updated)});
    loadData();
  }

  async function addOwnCat(){
    if(!newCat.name.trim())return;
    await fetch(`/api/admin/shop-data?slug=${slug}&action=addOwnCategory`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newCat)});
    setNewCat({name:"",parentId:""});loadData();
  }
  async function deleteOwnCat(id){
    if(!confirm("Удалить категорию?"))return;
    await fetch(`/api/admin/shop-data?slug=${slug}&action=deleteOwnCategory&id=${id}`,{method:"DELETE"});loadData();
  }
  async function renameOwnCat(id,name){
    await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnCategory&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});
    loadData();
  }
  async function moveOwnCat(id,parentId){
    await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnCategory&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({parentId:parentId||null})});
    loadData();
  }
  async function addOwnProd(){
    if(!newProd.name||!newProd.price||!newProd.categoryId)return;
    await fetch(`/api/admin/shop-data?slug=${slug}&action=addOwnProduct`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newProd)});
    setNewProd(p=>({...p,name:"",price:"",stock:"",img:null}));loadData();
  }
  async function deleteOwnProd(id){
    if(!confirm("Удалить товар?"))return;
    await fetch(`/api/admin/shop-data?slug=${slug}&action=deleteOwnProduct&id=${id}`,{method:"DELETE"});loadData();
  }
  async function renameOwnProd(id,name){
    await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnProduct&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});
    loadData();
  }
  async function updateOwnProdImg(id,img){
    await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnProduct&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({img})});
    loadData();
  }
  async function updateOrderStatus(id,status){
    await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOrder`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});
    loadData();
  }
  async function deleteOrder(id){
    if(!confirm("Удалить заказ?"))return;
    await fetch(`/api/admin/shop-data?slug=${slug}&action=deleteOrder&id=${id}`,{method:"DELETE"});loadData();
  }

  function handleImgFile(file,cb){const r=new FileReader();r.onload=e=>cb(e.target.result);r.readAsDataURL(file);}

  function renderOwnCatTree(parentId,depth=0){
    if(!data)return null;
    const cats=data.ownCatalog.categories;
    const children=cats.filter(c=>c.parentId===parentId);
    if(!children.length)return null;
    return(
      <div style={{marginLeft:depth*12}}>
        {children.map(cat=>{
          const hasKids=cats.some(c=>c.parentId===cat.id);
          const prodCount=data.ownCatalog.products.filter(p=>p.categoryId===cat.id).length;
          return(
            <div key={cat.id} style={{marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,padding:"8px 10px",background:"#fff",border:"1px solid #ebebeb",borderRadius:10}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0,color:"#555"}}>
                  {hasKids?I.folder:I.file}
                  <div style={{flex:1,minWidth:0}}>
                    <EditableField value={cat.name} onSave={name=>renameOwnCat(cat.id,name)} style={{fontSize:12,fontWeight:600}}/>
                    {!hasKids&&<div style={{fontSize:10,color:"#bbb",marginTop:2}}>{prodCount} товаров</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <select value={cat.parentId||""} onChange={e=>moveOwnCat(cat.id,e.target.value)}
                    style={{fontSize:10,padding:"3px 5px",borderRadius:8,border:"1px solid #e0e0e0",width:90,color:"#666",outline:"none"}}>
                    <option value="">Корневая</option>
                    {cats.filter(c=>c.id!==cat.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Btn variant="danger" onClick={()=>deleteOwnCat(cat.id)} style={{padding:"4px 7px",borderRadius:8,fontSize:10}}>{I.trash}</Btn>
                </div>
              </div>
              {renderOwnCatTree(cat.id,depth+1)}
            </div>
          );
        })}
      </div>
    );
  }

  if(!slug)return null;

  const cardStyle={background:"#fff",border:"1px solid #ebebeb",borderRadius:14,boxShadow:"0 2px 10px rgba(0,0,0,0.05)"};
  const inpStyle={border:"1.5px solid #e0e0e0",borderRadius:10,padding:"9px 12px",fontSize:12,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",transition:"border-color .15s"};

  if(!authed)return(
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",alignItems:"center",justifyContent:"center",...SF}}>
      <Head><title>Вход — {slug}</title></Head>
      <div style={{...cardStyle,padding:28,width:300,animation:"scaleIn .22s ease both"}}>
        <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
        <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Панель магазина</div>
        <div style={{fontSize:12,color:"#aaa",marginBottom:18}}>/{slug}</div>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Пароль магазина"
          style={{...inpStyle,marginBottom:8}}/>
        {passErr&&<div style={{fontSize:12,color:"#e00",marginBottom:10}}>⚠ {passErr}</div>}
        <Btn onClick={login} disabled={passLoading} style={{width:"100%",justifyContent:"center"}}>
          {passLoading?"Вход...":"Войти"}
        </Btn>
      </div>
    </div>
  );

  if(!data)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#aaa",fontSize:13,...SF}}>Загрузка...</div>;

  const settings=data.settings;
  const newOrdersCount=data.orders.filter(o=>o.status==="Новый").length;
  const ownLeafCats=data.ownCatalog.categories.filter(c=>!data.ownCatalog.categories.some(x=>x.parentId===c.id));

  const tabs=[
    {id:"catalog",label:"Каталог"},
    ...(settings.useSharedCatalog?[{id:"prices",label:"Цены и остатки"}]:[]),
    {id:"orders",label:`Заказы${newOrdersCount?` (${newOrdersCount})`:""}`},
    {id:"settings",label:"Настройки"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#f5f5f7",...SF}}>
      <Head><title>{settings.name} — Панель</title></Head>
      <div style={{background:"rgba(255,255,255,0.9)",backdropFilter:"blur(12px)",borderBottom:"1px solid #ebebeb",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:20,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:32,height:32,borderRadius:10,overflow:"hidden",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
            {settings.logoImg?<img src={settings.logoImg} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:settings.logoText}
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,lineHeight:1.2}}>{settings.name}</div>
            <div style={{fontSize:10,color:"#aaa"}}>/shop/{slug}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:7}}>
          <a href={`/shop/${slug}`} target="_blank"
            style={{background:"none",border:"1.5px solid #e0e0e0",borderRadius:10,padding:"6px 10px",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5,textDecoration:"none",color:"#555",fontFamily:"inherit"}}>
            {I.eye} Витрина
          </a>
          <Btn variant="ghost" onClick={()=>{sessionStorage.removeItem("sellerauth_"+slug);setAuthed(false);}} style={{fontSize:11,padding:"6px 10px",color:"#aaa"}}>Выйти</Btn>
        </div>
      </div>

      <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #ebebeb",overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"12px 16px",background:"none",border:"none",borderBottom:tab===t.id?"2px solid #111":"2px solid transparent",fontSize:12,fontWeight:tab===t.id?700:400,cursor:"pointer",color:tab===t.id?"#111":"#888",whiteSpace:"nowrap",transition:"color .2s",fontFamily:"inherit"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:14,maxWidth:720,margin:"0 auto",animation:"fadeUp .24s ease both"}}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* CATALOG */}
        {tab==="catalog"&&(
          <div>
            <div style={{...cardStyle,padding:14,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{settings.useSharedCatalog?"Общий каталог":"Свой каталог"}</div>
                <div style={{fontSize:11,color:"#aaa"}}>{settings.useSharedCatalog?"Товары от супер-админа. Свои цены — во вкладке «Цены и остатки».":"Свои товары независимо от общего каталога."}</div>
              </div>
              <Btn variant="ghost" onClick={toggleCatalogMode} style={{whiteSpace:"nowrap",fontSize:12}}>
                {settings.useSharedCatalog?"→ Переключить на свой":"→ Переключить на общий"}
              </Btn>
            </div>

            {!settings.useSharedCatalog&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div>
                  <div style={{...cardStyle,padding:14,marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Добавить категорию</div>
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      <input value={newCat.name} onChange={e=>setNewCat(n=>({...n,name:e.target.value}))} placeholder="Название" style={inpStyle}/>
                      <select value={newCat.parentId} onChange={e=>setNewCat(n=>({...n,parentId:e.target.value}))} style={{...inpStyle,color:newCat.parentId?"#111":"#aaa"}}>
                        <option value="">— Корневая —</option>
                        {data.ownCatalog.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <Btn onClick={addOwnCat} style={{justifyContent:"center"}}>{I.plus} Добавить</Btn>
                    </div>
                  </div>
                  {renderOwnCatTree(null)}
                  {data.ownCatalog.categories.length===0&&<div style={{color:"#ccc",textAlign:"center",padding:"20px 0",fontSize:12}}>Нет категорий</div>}
                </div>
                <div>
                  <div style={{...cardStyle,padding:14,marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Добавить товар</div>
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      <label style={{border:"1.5px dashed #e0e0e0",borderRadius:12,height:70,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:"#fafafa"}}>
                        {newProd.img?<img src={newProd.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:
                          <div style={{textAlign:"center",color:"#bbb",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>{I.camera}<span style={{fontSize:11}}>Фото</span></div>}
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const r=new FileReader();r.onload=ev=>setNewProd(p=>({...p,img:ev.target.result}));r.readAsDataURL(e.target.files[0]);}}/>
                      </label>
                      <input value={newProd.name} onChange={e=>setNewProd(p=>({...p,name:e.target.value}))} placeholder="Название" style={inpStyle}/>
                      <div style={{display:"flex",gap:6}}>
                        <input value={newProd.price} onChange={e=>setNewProd(p=>({...p,price:e.target.value}))} placeholder="Цена" type="number" style={inpStyle}/>
                        <input value={newProd.stock} onChange={e=>setNewProd(p=>({...p,stock:e.target.value}))} placeholder="Остаток" type="number" style={inpStyle}/>
                      </div>
                      <select value={newProd.categoryId} onChange={e=>setNewProd(p=>({...p,categoryId:e.target.value}))} style={{...inpStyle,color:newProd.categoryId?"#111":"#aaa"}}>
                        <option value="">— Категория —</option>
                        {ownLeafCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <Btn onClick={addOwnProd} style={{justifyContent:"center"}}>{I.plus} Добавить товар</Btn>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {data.ownCatalog.products.map(p=>{
                      const cat=data.ownCatalog.categories.find(c=>c.id===p.categoryId);
                      return(
                        <div key={p.id} style={{...cardStyle,padding:"9px 11px",display:"flex",alignItems:"center",gap:8}}>
                          <label style={{width:42,height:42,borderRadius:10,overflow:"hidden",background:"#f5f5f5",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"1.5px dashed #e0e0e0"}}>
                            {p.img?<img src={p.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:I.box}
                            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const r=new FileReader();r.onload=ev=>updateOwnProdImg(p.id,ev.target.result);r.readAsDataURL(e.target.files[0]);}}/>
                          </label>
                          <div style={{flex:1,minWidth:0}}>
                            <EditableField value={p.name} onSave={name=>renameOwnProd(p.id,name)} style={{fontSize:12,fontWeight:600}}/>
                            <div style={{fontSize:10,color:"#aaa",marginTop:2}}>{p.price} ₽ · {p.stock} шт · {cat?.name||"—"}</div>
                          </div>
                          <Btn variant="danger" onClick={()=>deleteOwnProd(p.id)} style={{padding:"5px 8px",borderRadius:8}}>{I.trash}</Btn>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {settings.useSharedCatalog&&(
              <div style={{...cardStyle,padding:16,textAlign:"center",color:"#888",background:"#fafafa"}}>
                <div style={{fontSize:13,marginBottom:4}}>Используется общий каталог</div>
                <div style={{fontSize:11,color:"#bbb"}}>Товары управляются супер-администратором. Свои цены настрой во вкладке «Цены и остатки».</div>
              </div>
            )}
          </div>
        )}

        {/* PRICES */}
        {tab==="prices"&&settings.useSharedCatalog&&(
          <div>
            <div style={{fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:"0.5px",marginBottom:10}}>ЦЕНЫ И ОСТАТКИ ДЛЯ ЭТОГО МАГАЗИНА</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {data.sharedCatalog.products.map(p=>{
                const ov=data.prices[p.id]||{};
                const shopPrice=ov.price!==undefined?ov.price:p.basePrice;
                const shopStock=ov.stock!==undefined?ov.stock:(p.stock||0);
                const shopHidden=ov.hidden!==undefined?ov.hidden:false;
                const cat=data.sharedCatalog.categories.find(c=>c.id===p.categoryId);
                return<PriceRow key={p.id} p={p} shopPrice={shopPrice} shopStock={shopStock} shopHidden={shopHidden} catName={cat?.name||"—"} onSave={savePrice}/>;
              })}
              {data.sharedCatalog.products.length===0&&<div style={{color:"#ccc",textAlign:"center",padding:"30px 0",fontSize:13}}>Нет товаров</div>}
            </div>
          </div>
        )}

        {/* ORDERS */}
        {tab==="orders"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {data.orders.length===0&&<div style={{color:"#ccc",textAlign:"center",padding:"30px 0",fontSize:13}}>Заказов пока нет</div>}
            {data.orders.map(ord=>(
              <div key={ord.id} style={{...cardStyle,padding:"12px 14px",borderLeft:ord.status==="Новый"?"3px solid #111":"3px solid transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:700}}>№{String(ord.id).padStart(5,"0")}</span>
                    <span style={{fontSize:11,color:"#aaa",marginLeft:8}}>{ord.date}</span>
                  </div>
                  <select value={ord.status} onChange={e=>updateOrderStatus(ord.id,e.target.value)}
                    style={{fontSize:11,padding:"4px 8px",borderRadius:8,border:"1px solid #e0e0e0",cursor:"pointer",outline:"none",fontFamily:"inherit"}}>
                    {["Новый","В обработке","Выполнен","Отмена"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{fontSize:12,color:"#555",marginBottom:4}}>{ord.client} · @{ord.tg}</div>
                {ord.comment&&<div style={{fontSize:11,color:"#aaa",marginBottom:5,fontStyle:"italic"}}>"{ord.comment}"</div>}
                {ord.items.map((item,i)=>(
                  <div key={i} style={{fontSize:12,color:"#666",marginBottom:1}}>{item.name} × {item.qty} = {item.qty*item.price} ₽</div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,borderTop:"1px solid #f0f0f0",paddingTop:8,gap:6}}>
                  <span style={{fontSize:13,fontWeight:700}}>Итого: {ord.total} ₽</span>
                  <div style={{display:"flex",gap:6}}>
                    <Btn variant="ghost" onClick={()=>setReceiptOrder(ord)} style={{fontSize:11,padding:"6px 10px"}}>{I.print} Чек</Btn>
                    <Btn variant="danger" onClick={()=>deleteOrder(ord.id)} style={{fontSize:11,padding:"6px 10px"}}>{I.trash} Удалить</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS */}
        {tab==="settings"&&settingsForm&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{...cardStyle,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Название магазина</div>
              <input value={settingsForm.name||""} onChange={e=>setSettingsForm(f=>({...f,name:e.target.value}))} placeholder="Название" style={inpStyle}/>
            </div>
            <div style={{...cardStyle,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Логотип / Аватарка</div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div onClick={()=>logoRef.current?.click()}
                  style={{width:60,height:60,borderRadius:12,overflow:"hidden",background:"#111",border:"1.5px dashed #e0e0e0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:11,fontWeight:800,color:"#fff",letterSpacing:1}}>
                  {settingsForm.logoImg?<img src={settingsForm.logoImg} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:settingsForm.logoText}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:6}}>Нажми для загрузки или измени аббревиатуру:</div>
                  <input value={settingsForm.logoText||""} onChange={e=>setSettingsForm(f=>({...f,logoText:e.target.value.slice(0,3).toUpperCase()}))} maxLength={3} style={{...inpStyle,width:70}}/>
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}}
                onChange={e=>{const r=new FileReader();r.onload=ev=>setSettingsForm(f=>({...f,logoImg:ev.target.result}));r.readAsDataURL(e.target.files[0]);}}/>
              {settingsForm.logoImg&&(
                <Btn variant="ghost" onClick={()=>setSettingsForm(f=>({...f,logoImg:null}))} style={{marginTop:10,width:"100%",justifyContent:"center",color:"#aaa",fontSize:11}}>
                  {I.trash} Удалить изображение
                </Btn>
              )}
            </div>
            <div style={{...cardStyle,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>WhatsApp</div>
              <input value={settingsForm.whatsapp||""} onChange={e=>setSettingsForm(f=>({...f,whatsapp:e.target.value}))} placeholder="79001234567" style={inpStyle}/>
              <div style={{fontSize:11,color:"#bbb",marginTop:5}}>Без + и пробелов</div>
            </div>
            <div style={{...cardStyle,padding:14,background:"#fafafa"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>Ссылка на витрину</div>
              <code style={{fontSize:12,color:"#555"}}>{typeof window!=="undefined"?window.location.origin:""}/shop/{slug}</code>
            </div>
            <Btn onClick={saveSettings} disabled={saving} style={{justifyContent:"center",padding:"13px"}}>
              {I.check} {saving?"Сохраняется...":"Сохранить настройки"}
            </Btn>
          </div>
        )}
      </div>
      {receiptOrder&&<ReceiptModal order={receiptOrder} shopName={settings.name} onClose={()=>setReceiptOrder(null)}/>}
    </div>
  );
}

function PriceRow({p,shopPrice,shopStock,shopHidden,catName,onSave}){
  const [price,setPrice]=useState(String(shopPrice));
  const [stock,setStock]=useState(String(shopStock));
  const [hidden,setHidden]=useState(shopHidden);
  const [saved,setSaved]=useState(false);
  const changed=Number(price)!==shopPrice||Number(stock)!==shopStock||hidden!==shopHidden;
  async function save(){await onSave(p.id,Number(price),Number(stock),hidden);setSaved(true);setTimeout(()=>setSaved(false),1600);}
  return(
    <div style={{background:"#fff",border:"1px solid #ebebeb",borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.04)",padding:"9px 11px",display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
      <div style={{width:40,height:40,borderRadius:10,overflow:"hidden",background:"#f5f5f5",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {p.img?<img src={p.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{opacity:0.25}}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>}
      </div>
      <div style={{flex:1,minWidth:100}}>
        <div style={{fontSize:12,fontWeight:600}}>{p.name}</div>
        <div style={{fontSize:10,color:"#bbb"}}>{catName} · база: {p.basePrice} ₽ · в каталоге: {p.stock} шт</div>
      </div>
      <div style={{display:"flex",gap:5,alignItems:"flex-end",flexWrap:"wrap"}}>
        {[["Цена ₽",price,setPrice,68],["Остаток",stock,setStock,56]].map(([label,val,setter,w])=>(
          <div key={label} style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
            <div style={{fontSize:10,color:"#aaa"}}>{label}</div>
            <input value={val} onChange={e=>setter(e.target.value)} type="number"
              style={{width:w,textAlign:"center",padding:"5px 6px",borderRadius:8,border:"1.5px solid #e0e0e0",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
          </div>
        ))}
        <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
          <div style={{fontSize:10,color:"#aaa"}}>Скрыть</div>
          <input type="checkbox" checked={hidden} onChange={e=>setHidden(e.target.checked)} style={{width:15,height:15,accentColor:"#111",cursor:"pointer"}}/>
        </div>
        <button onClick={save}
          style={{background:saved?"#16a34a":changed?"#111":"#f0f0f0",color:saved||changed?"#fff":"#aaa",border:"none",borderRadius:10,padding:"7px 11px",fontSize:11,fontWeight:600,cursor:"pointer",transition:"background .2s",marginTop:14,fontFamily:"inherit"}}>
          {saved?"✓":"Сохр."}
        </button>
      </div>
    </div>
  );
}
