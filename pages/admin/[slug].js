import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { ReceiptModal } from "@/components/Receipt";

// ── icons ─────────────────────────────────────────────────────────────────────
const I = {
  eye:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>,
  trash:  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  plus:   <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  check:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  folder: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>,
  file:   <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></svg>,
  camera: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M1 5v14h22V5H1M12 17a5 5 0 0 1-5-5 5 5 0 0 1 5-5 5 5 0 0 1 5 5 5 5 0 0 1-5 5z"/></svg>,
  print:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>,
  drag:   <span style={{fontSize:16,lineHeight:1,userSelect:"none",color:"var(--text3)"}}>⠿</span>,
  sun:    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>,
  moon:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>,
  box:    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{opacity:0.2}}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>,
};

// ── dark mode ──────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  const root = document.documentElement;
  if (dark) {
    root.style.setProperty("--bg",       "#111111");
    root.style.setProperty("--surface",  "#1e1e1e");
    root.style.setProperty("--surface2", "#252525");
    root.style.setProperty("--border",   "#333333");
    root.style.setProperty("--text",     "#eeeeee");
    root.style.setProperty("--text2",    "#999999");
    root.style.setProperty("--text3",    "#555555");
    root.style.setProperty("--accent",   "#eeeeee");
    root.style.setProperty("--accent-t", "#111111");
    root.style.setProperty("--shadow",   "rgba(0,0,0,0.45)");
    root.classList.add("dark");
    document.body.classList.add("dark");
    document.body.style.background = "#111111";
  } else {
    root.style.setProperty("--bg",       "#f5f5f7");
    root.style.setProperty("--surface",  "#ffffff");
    root.style.setProperty("--surface2", "#f0f0f2");
    root.style.setProperty("--border",   "#e8e8e8");
    root.style.setProperty("--text",     "#111111");
    root.style.setProperty("--text2",    "#555555");
    root.style.setProperty("--text3",    "#aaaaaa");
    root.style.setProperty("--accent",   "#111111");
    root.style.setProperty("--accent-t", "#ffffff");
    root.style.setProperty("--shadow",   "rgba(0,0,0,0.07)");
    root.classList.remove("dark");
    document.body.classList.remove("dark");
    document.body.style.background = "#f5f5f7";
  }
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", dark ? "#111111" : "#f5f5f7");
}

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const d = localStorage.getItem("theme") === "dark";
    setDark(d);
    applyTheme(d);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    applyTheme(next);
  }
  return { dark, toggle };
}

// ── helpers ───────────────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant="primary", style={} }) {
  const cls = variant==="primary"?"btn-primary":variant==="ghost"?"btn-ghost":"btn-danger";
  return <button className={cls} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

function EditableField({ value, onSave, style={} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setVal(value); }, [value]);
  if (!editing) return (
    <span onClick={()=>setEditing(true)} title="Нажми чтобы переименовать"
      style={{ cursor:"pointer", borderBottom:"1px dashed var(--border)", display:"inline-block", ...style }}>
      {val}
    </span>
  );
  return (
    <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
      onBlur={()=>{ onSave(val); setEditing(false); }}
      onKeyDown={e=>{ if(e.key==="Enter"){onSave(val);setEditing(false);}if(e.key==="Escape")setEditing(false); }}
      style={{ fontSize:12,fontWeight:600,border:"1.5px solid var(--accent)",borderRadius:8,padding:"3px 8px",
        width:Math.max((val||"").length*8,80),fontFamily:"inherit",background:"var(--surface)",color:"var(--text)" }}/>
  );
}

// ── compress image on client ──────────────────────────────────────────────────
function compressImage(file, maxPx=800, quality=0.8) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = url;
  });
}

// ── PricesTab ─────────────────────────────────────────────────────────────────
function PricesTab({ products, categories, prices, slug, onSave, onSaveOrder }) {
  const [order, setOrder]   = useState(() => [...products].sort((a,b)=>(a.order??999)-(b.order??999)).map(p=>p.id));
  const [rows, setRows]     = useState(() => products.reduce((acc,p) => {
    const ov = prices[p.id]||{};
    acc[p.id] = { price:ov.price??p.basePrice, stock:ov.stock??p.stock??0, hidden:ov.hidden??false, cost:ov.cost??p.cost??0 };
    return acc;
  },{}));
  const [saved, setSaved]   = useState({});
  const timers              = useRef({});
  const dragId              = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    setOrder([...products].sort((a,b)=>(a.order??999)-(b.order??999)).map(p=>p.id));
    setRows(products.reduce((acc,p) => {
      const ov=prices[p.id]||{};
      acc[p.id]={price:ov.price??p.basePrice,stock:ov.stock??p.stock??0,hidden:ov.hidden??false,cost:ov.cost??p.cost??0};
      return acc;
    },{}));
  }, [products.length]);

  function autoSave(id, newRow) {
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      await onSave(id, newRow.price, newRow.stock, newRow.hidden, newRow.cost);
      setSaved(s=>({...s,[id]:true}));
      setTimeout(()=>setSaved(s=>({...s,[id]:false})),1400);
    }, 800);
  }
  function update(id, field, value) {
    const newRow={...(rows[id]||{}),[field]:value};
    setRows(r=>({...r,[id]:newRow}));
    autoSave(id, newRow);
  }
  function onDragStart(e,id){ dragId.current=id; e.dataTransfer.effectAllowed="move"; }
  function onDragOver(e,id){ e.preventDefault(); setDragOver(id); }
  function onDrop(e,id){
    e.preventDefault();
    if(!dragId.current||dragId.current===id)return;
    const from=order.indexOf(dragId.current), to=order.indexOf(id);
    const next=[...order]; next.splice(from,1); next.splice(to,0,dragId.current);
    setOrder(next); setDragOver(null); dragId.current=null;
    onSaveOrder(next);
  }

  const sorted=order.map(id=>products.find(p=>p.id===id)).filter(Boolean);

  return (
    <div>
      <div style={{fontSize:11,color:"var(--text3)",fontWeight:700,letterSpacing:"0.5px",marginBottom:10}}>
        ЦЕНЫ И ОСТАТКИ — перетащи ⠿ чтобы изменить порядок
      </div>
      <div style={{maxHeight:"calc(100vh - 240px)",overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
        {sorted.map(p=>{
          const row = rows[p.id] || {};
          const cat=categories.find(c=>c.id===p.categoryId);
          const profit=(row.price||0)-(row.cost||0);
          return(
            <div key={p.id} draggable
              onDragStart={e=>onDragStart(e,p.id)}
              onDragOver={e=>onDragOver(e,p.id)}
              onDrop={e=>onDrop(e,p.id)}
              onDragEnd={()=>{dragId.current=null;setDragOver(null);}}
              style={{background:"var(--surface)",border:`1.5px solid ${dragOver===p.id?"var(--accent)":"var(--border)"}`,borderRadius:12,padding:"9px 11px",display:"flex",alignItems:"center",gap:9,flexWrap:"wrap",transition:"border-color .15s",cursor:"default"}}>
              <div style={{cursor:"grab",flexShrink:0}}>{I.drag}</div>
              <div style={{width:40,height:40,borderRadius:10,overflow:"hidden",background:"var(--surface2)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {p.img?<img src={p.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:I.box}
              </div>
              <div style={{flex:1,minWidth:80}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{p.name}</div>
                <div style={{fontSize:10,color:"var(--text3)"}}>{cat?.name||"—"} · база: {p.basePrice}₽</div>
                {profit>0&&<span className="profit-badge">+{profit}₽</span>}
              </div>
              {[["Цена",row.price||0,"price",68,10],["Себест.",row.cost||0,"cost",64,10],["Остаток",row.stock||0,"stock",52,1]].map(([label,val,field,w,step])=>(
                <div key={field} style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                  <div style={{fontSize:10,color:"var(--text3)"}}>{label}</div>
                  <div style={{display:"flex",alignItems:"center",border:"1.5px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
                    <button onClick={()=>update(p.id,field,Math.max(0,(val)-step))}
                      style={{background:"var(--surface2)",border:"none",cursor:"pointer",padding:"4px 6px",fontSize:13,color:"var(--text2)",lineHeight:1}}>−</button>
                    <input value={val} onChange={e=>update(p.id,field,Number(e.target.value))} type="number"
                      style={{width:w,textAlign:"center",padding:"4px 2px",border:"none",fontSize:12,outline:"none",fontFamily:"inherit",background:"var(--surface)",color:"var(--text)",borderRadius:0}}/>
                    <button onClick={()=>update(p.id,field,(val)+step)}
                      style={{background:"var(--surface2)",border:"none",cursor:"pointer",padding:"4px 6px",fontSize:13,color:"var(--text2)",lineHeight:1}}>+</button>
                  </div>
                </div>
              ))}
              <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                <div style={{fontSize:10,color:"var(--text3)"}}>Скрыть</div>
                <input type="checkbox" checked={row.hidden||false} onChange={e=>update(p.id,"hidden",e.target.checked)} style={{width:15,height:15,accentColor:"var(--accent)",cursor:"pointer"}}/>
              </div>
              <div style={{width:22,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {saved[p.id]&&<span style={{color:"#16a34a",fontSize:16,fontWeight:700}}>✓</span>}
              </div>
            </div>
          );
        })}
        {sorted.length===0&&<div style={{color:"var(--text3)",textAlign:"center",padding:"30px 0",fontSize:13}}>Нет товаров</div>}
      </div>
    </div>
  );
}

// ── OwnProductsList ───────────────────────────────────────────────────────────
function OwnProductsList({ products, categories, onDelete, onRename, onUpdateImg, onSavePriceStock, onUpdateMultiPrices }) {
  const [order, setOrder]   = useState(()=>[...products].sort((a,b)=>(a.order??999)-(b.order??999)).map(p=>p.id));
  const [rows, setRows]     = useState(()=>products.reduce((acc,p)=>{acc[p.id]={price:p.price||0,stock:p.stock||0,cost:p.cost||0};return acc;},{}));
  const [saved, setSaved]   = useState({});
  const [expandedId,setExpandedId]=useState(null);
  const [multiEdits,setMultiEdits]=useState({});
  const timers              = useRef({});
  const dragId              = useRef(null);
  const [dragOver,setDragOver]=useState(null);

  useEffect(()=>{
    setOrder([...products].sort((a,b)=>(a.order??999)-(b.order??999)).map(p=>p.id));
    setRows(products.reduce((acc,p)=>{acc[p.id]={price:p.price||0,stock:p.stock||0,cost:p.cost||0};return acc;},{}));
  },[products.length]);

  function autoSave(id,newRow){
    clearTimeout(timers.current[id]);
    timers.current[id]=setTimeout(async()=>{
      await onSavePriceStock(id,newRow.price,newRow.stock,newRow.cost);
      setSaved(s=>({...s,[id]:true}));
      setTimeout(()=>setSaved(s=>({...s,[id]:false})),1400);
    },800);
  }
  function update(id,field,value){const r={...(rows[id]||{}),[field]:Math.max(0,Number(value))};setRows(r2=>({...r2,[id]:r}));autoSave(id,r);}
  function onDragStart(e,id){dragId.current=id;e.dataTransfer.effectAllowed="move";}
  function onDragOver(e,id){e.preventDefault();setDragOver(id);}
  function onDrop(e,id){
    e.preventDefault();
    if(!dragId.current||dragId.current===id)return;
    const from=order.indexOf(dragId.current),to=order.indexOf(id);
    const next=[...order];next.splice(from,1);next.splice(to,0,dragId.current);
    setOrder(next);setDragOver(null);dragId.current=null;
    // save order
    onSavePriceStock(null,null,null,null,next);
  }

  const sorted=order.map(id=>products.find(p=>p.id===id)).filter(Boolean);

  return(
    <div style={{maxHeight:"calc(100vh-300px)",overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
      <div style={{fontSize:11,color:"var(--text3)",fontWeight:600,marginBottom:6}}>
        ТОВАРЫ ({sorted.length}) — перетащи ⠿ чтобы изменить порядок
      </div>
      {sorted.map(p=>{
        const cat=categories.find(c=>c.id===p.categoryId);
        const row=rows[p.id]||{};
        const profit=(row.price||0)-(row.cost||0);
        return(
          <div key={p.id} draggable
            onDragStart={e=>onDragStart(e,p.id)} onDragOver={e=>onDragOver(e,p.id)}
            onDrop={e=>onDrop(e,p.id)} onDragEnd={()=>{dragId.current=null;setDragOver(null);}}
            style={{background:"var(--surface)",border:`1.5px solid ${dragOver===p.id?"var(--accent)":"var(--border)"}`,borderRadius:12,padding:"9px 11px",display:"flex",alignItems:"center",gap:8,transition:"border-color .15s"}}>
            <div style={{cursor:"grab",flexShrink:0}}>{I.drag}</div>
            <label style={{width:40,height:40,borderRadius:10,overflow:"hidden",background:"var(--surface2)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"1.5px dashed var(--border)"}}>
              {p.img?<img src={p.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:I.box}
              <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                const compressed=await compressImage(e.target.files[0]);
                onUpdateImg(p.id,compressed);
              }}/>
            </label>
            <div style={{flex:1,minWidth:0}}>
              <EditableField value={p.name} onSave={name=>onRename(p.id,name)} style={{fontSize:12,fontWeight:600}}/>
              <div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>
  {cat?.name || "—"}
</div>
             {profit > 0 && (
  <span className="profit-badge">
             +{profit}₽
  </span>
)}
            </div>
            {[["Цена",row.price,"price",64,10],["Себест.",row.cost,"cost",58,10],["Остаток",row.stock,"stock",48,1]].map(([label,val,field,w,step])=>(
              <div key={field} style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                <div style={{fontSize:10,color:"var(--text3)"}}>{label}</div>
                <div style={{display:"flex",alignItems:"center",border:"1.5px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
                  <button onClick={()=>update(p.id,field,(val||0)-step)} style={{background:"var(--surface2)",border:"none",cursor:"pointer",padding:"4px 5px",fontSize:13,color:"var(--text2)",lineHeight:1}}>−</button>
                  <input value={val??""} onChange={e=>update(p.id,field,e.target.value)} type="number"
                    style={{width:w,textAlign:"center",padding:"4px 2px",border:"none",fontSize:12,outline:"none",fontFamily:"inherit",background:"var(--surface)",color:"var(--text)",borderRadius:0}}/>
                  <button onClick={()=>update(p.id,field,(val||0)+step)} style={{background:"var(--surface2)",border:"none",cursor:"pointer",padding:"4px 5px",fontSize:13,color:"var(--text2)",lineHeight:1}}>+</button>
                </div>
              </div>
            ))}
            <div style={{width:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {saved[p.id]&&<span style={{color:"#16a34a",fontSize:16,fontWeight:700}}>✓</span>}
            </div>
            <button onClick={()=>setExpandedId(expandedId===p.id?null:p.id)}
              style={{background:"none",border:`1.5px solid ${expandedId===p.id?"var(--accent)":"var(--border)"}`,borderRadius:8,padding:"5px 8px",cursor:"pointer",color:expandedId===p.id?"var(--accent)":"var(--text3)",fontSize:10,fontWeight:600,fontFamily:"inherit"}}>
              ₽±
            </button>
            <button className="btn-danger" onClick={()=>onDelete(p.id)} style={{padding:"5px 8px",borderRadius:8}}>{I.trash}</button>
          </div>
          {/* multiprices inline editor */}
          {expandedId===p.id&&(
            <div style={{borderTop:"1px solid var(--border)",padding:"10px 11px",background:"var(--surface2)",borderRadius:"0 0 12px 12px"}}>
              <div style={{fontSize:11,color:"var(--text2)",marginBottom:8,fontWeight:600}}>ВАРИАНТЫ ЦЕН</div>
              <MultiPricesEditor
                value={multiEdits[p.id]  p.multiPrices  []}
                onChange={mp=>{
                  setMultiEdits(m=>({...m,[p.id]:mp}));
                }}/>
              <button className="btn-primary" onClick={async()=>{
                const mp=multiEdits[p.id]??p.multiPrices??[];
                await onUpdateMultiPrices(p.id,mp);
                setExpandedId(null);
              }} style={{justifyContent:"center",marginTop:10,width:"100%",fontSize:11}}>
                {I.check} Сохранить варианты цен
              </button>
            </div>
          )}
        </div>
        );
      })}
      {sorted.length===0&&<div style={{color:"var(--text3)",textAlign:"center",padding:"20px 0",fontSize:12}}>Нет товаров</div>}
    </div>
  );
}

// ── HistoryTab ────────────────────────────────────────────────────────────────
function HistoryTab({ slug, log, onDeleteEntry, onClearAll }) {
  const dotColors = { add:"#16a34a", delete:"#dc2626", edit:"#2563eb", move:"#9333ea" };
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:"var(--text3)",fontWeight:700,letterSpacing:"0.5px"}}>
          ИСТОРИЯ ИЗМЕНЕНИЙ ({log.length})
        </div>
        {log.length>0&&(
          <button className="btn-danger" onClick={()=>{if(confirm("Очистить всю историю?"))onClearAll();}} style={{fontSize:10,padding:"5px 10px"}}>
            Очистить всё
          </button>
        )}
      </div>
      <div style={{maxHeight:"calc(100vh - 240px)",overflowY:"auto"}}>
        {log.length===0&&<div style={{color:"var(--text3)",textAlign:"center",padding:"30px 0",fontSize:13}}>История пуста</div>}
        {log.map(entry=>(
          <div key={entry.id} className="log-entry">
            <div className="log-dot" style={{background:dotColors[entry.dot] || "var(--text3)"}}></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,color:"var(--text)",fontWeight:500}}>{entry.action}</div>
              {entry.details&&<div style={{fontSize:11,color:"var(--text2)",marginTop:2}}>{entry.details}</div>}
              <div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{entry.date}</div>
            </div>
            <button onClick={()=>onDeleteEntry(entry.id)}
              style={{
  background:"none",
  border:`1.5px solid ${expandedId===p.id ? "var(--accent)" : "var(--border)"}`,
  borderRadius:8,
  padding:"5px 8px",
  cursor:"pointer",
  color:expandedId===p.id ? "var(--accent)" : "var(--text3)",
  fontSize:10,
  fontWeight:600,
  fontFamily:"inherit"
}}>
              {I.trash}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function SellerPanel() {
  const router = useRouter();
  const { slug } = router.query;
  const { dark, toggle: toggleDark } = useDark();

  const [authed, setAuthed]     = useState(false);
  const [pass, setPass]         = useState("");
  const [passErr, setPassErr]   = useState("");
  const [passLoading, setPL]    = useState(false);
  const [tab, setTab]           = useState("catalog");
  const [data, setData]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const [newCat,setNewCat]      = useState({name:"",parentId:""});
  const [newProd,setNewProd]    = useState({name:"",price:"",stock:"",cost:"",categoryId:"",img:null,multiPrices:[],useMultiPrices:false});
  const [imgUploading,setImgUploading] = useState(false);
  const [imgProgress,setImgProgress]  = useState(0);
  const logoRef = useRef(null);

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
    setPassErr("");setPL(true);
    const r=await fetch("/api/admin/shop-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,password:pass})});
    setPL(false);
    if(r.ok){sessionStorage.setItem("sellerauth_"+slug,"1");setAuthed(true);loadData();}
    else{const d=await r.json();setPassErr(d.error||"Неверный пароль");}
  }

  async function saveSettings(){
    setSaving(true);
    await fetch(`/api/admin/shop-data?slug=${slug}&action=saveSettings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settingsForm)});
    setSaving(false);loadData();
  }

  async function savePrice(productId,price,stock,hidden,cost){
    await fetch(`/api/admin/shop-data?slug=${slug}&action=savePrice`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,price,stock,hidden,cost})});
    loadData();
  }

  async function saveSharedOrder(order){
    await fetch(`/api/admin/shop-data?slug=${slug}&action=saveOrder`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order,catalogType:"shared"})});
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
  async function deleteOwnCat(id){if(!confirm("Удалить?"))return;await fetch(`/api/admin/shop-data?slug=${slug}&action=deleteOwnCategory&id=${id}`,{method:"DELETE"});loadData();}
  async function renameOwnCat(id,name){await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnCategory&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});loadData();}
  async function moveOwnCat(id,parentId){await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnCategory&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({parentId:parentId||null})});loadData();}

  async function addOwnProd(){
    if(!newProd.name||!newProd.price||!newProd.categoryId)return;
    setImgUploading(true);setImgProgress(30);
    await fetch(`/api/admin/shop-data?slug=${slug}&action=addOwnProduct`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newProd)});
    setImgProgress(100);setTimeout(()=>{setImgUploading(false);setImgProgress(0);},400);
    setNewProd(p=>({...p,name:"",price:"",stock:"",cost:"",img:null}));loadData();
  }
  async function deleteOwnProd(id){if(!confirm("Удалить товар?"))return;await fetch(`/api/admin/shop-data?slug=${slug}&action=deleteOwnProduct&id=${id}`,{method:"DELETE"});loadData();}
  async function renameOwnProd(id,name){await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnProduct&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});loadData();}
  async function updateOwnProdImg(id,img){await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnProduct&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({img})});loadData();}

  async function saveOwnPriceStock(id,price,stock,cost,orderArr){
    if(orderArr){
      await fetch(`/api/admin/shop-data?slug=${slug}&action=saveOrder`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order:orderArr,catalogType:"own"})});
    } else {
      await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnProduct&id=${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({price,stock,cost})});
    }
    loadData();
  }

  async function updateOrderStatus(id,status){await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOrder`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});loadData();}
  async function deleteOrder(id){if(!confirm("Удалить заказ?"))return;await fetch(`/api/admin/shop-data?slug=${slug}&action=deleteOrder&id=${id}`,{method:"DELETE"});loadData();}

  async function deleteLogEntry(id){await fetch(`/api/admin/shop-data?slug=${slug}&action=deleteLogEntry&id=${id}`,{method:"DELETE"});loadData();}
  async function clearLog(){await fetch(`/api/admin/shop-data?slug=${slug}&action=clearLog`,{method:"DELETE"});loadData();}

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
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,padding:"8px 10px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0,color:"var(--text2)"}}>
                  {hasKids?I.folder:I.file}
                  <div style={{flex:1,minWidth:0}}>
                    <EditableField value={cat.name} onSave={name=>renameOwnCat(cat.id,name)} style={{fontSize:12,fontWeight:600}}/>
                    {!hasKids&&<div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{prodCount} товаров</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <select value={cat.parentId||""} onChange={e=>moveOwnCat(cat.id,e.target.value)}
                    style={{fontSize:10,padding:"3px 5px",borderRadius:8,width:90,color:"var(--text2)"}}>
                    <option value="">Корневая</option>
                    {cats.filter(c=>c.id!==cat.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button className="btn-danger" onClick={()=>deleteOwnCat(cat.id)} style={{padding:"4px 7px",borderRadius:8,fontSize:10}}>{I.trash}</button>
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

  if(!authed)return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <Head><title>Вход — {slug}</title><meta name="theme-color" content="#f5f5f7"/></Head>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:28,width:300,boxShadow:"0 4px 24px var(--shadow)",animation:"scaleIn .22s ease both"}}>
        <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
        <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:"var(--text)"}}>Панель магазина</div>
        <div style={{fontSize:12,color:"var(--text2)",marginBottom:18}}>/{slug}</div>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Пароль магазина" style={{marginBottom:8}}/>
        {passErr&&<div style={{fontSize:12,color:"#dc2626",marginBottom:8}}>⚠ {passErr}</div>}
        <button className="btn-primary" onClick={login} disabled={passLoading} style={{width:"100%",justifyContent:"center"}}>
          {passLoading?<span className="spinner"/>:"Войти"}
        </button>
      </div>
    </div>
  );

  if(!data)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text2)",fontSize:13,background:"var(--bg)"}}>Загрузка...</div>;

  const settings=data.settings;
  const newOrdersCount=data.orders.filter(o=>o.status==="Новый").length;
  const ownLeafCats=data.ownCatalog.categories.filter(c=>!data.ownCatalog.categories.some(x=>x.parentId===c.id));

  const tabs=[
    {id:"catalog",label:"Каталог"},
    ...(settings.useSharedCatalog?[{id:"prices",label:"Цены и остатки"}]:[]),
    {id:"orders",label:`Заказы${newOrdersCount?` (${newOrdersCount})`:""}`},
    {id:"history",label:`История${data.log?.length?` (${data.log.length})`:""}`},
    {id:"settings",label:"Настройки"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      <Head>
        <title>{settings.name} — Панель</title>
        <meta name="theme-color" content={dark?"#111111":"#f5f5f7"}/>
      </Head>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:20,boxShadow:"0 2px 8px var(--shadow)"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:32,height:32,borderRadius:10,overflow:"hidden",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"var(--accent-t)",flexShrink:0}}>
            {settings.logoImg?<img src={settings.logoImg} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:settings.logoText}
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,lineHeight:1.2,color:"var(--text)"}}>{settings.name}</div>
            <div style={{fontSize:10,color:"var(--text3)"}}>/shop/{slug}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:7}}>
          <button onClick={toggleDark} className="btn-ghost" style={{padding:"6px 10px",fontSize:11}}>{dark?I.sun:I.moon}</button>
          <a href={`/shop/${slug}`} target="_blank" className="btn-ghost" style={{fontSize:11,padding:"6px 10px",textDecoration:"none"}}>{I.eye} Витрина</a>
          <button className="btn-ghost" onClick={()=>{sessionStorage.removeItem("sellerauth_"+slug);setAuthed(false);}} style={{fontSize:11,padding:"6px 10px",color:"var(--text3)"}}>Выйти</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"var(--surface)",borderBottom:"1px solid var(--border)",overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"12px 16px",background:"none",border:"none",borderBottom:tab===t.id?"2px solid var(--accent)":"2px solid transparent",fontSize:12,fontWeight:tab===t.id?700:400,cursor:"pointer",color:tab===t.id?"var(--text)":"var(--text2)",whiteSpace:"nowrap",transition:"color .2s",fontFamily:"inherit"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:14,maxWidth:720,margin:"0 auto",animation:"fadeUp .24s ease both"}}>

        {/* CATALOG */}
        {tab==="catalog"&&(
          <div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:14,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:2,color:"var(--text)"}}>{settings.useSharedCatalog?"Общий каталог":"Свой каталог"}</div>
                <div style={{fontSize:11,color:"var(--text2)"}}>{settings.useSharedCatalog?"Товары от супер-админа.":"Свои товары независимо."}</div>
              </div>
              <button className="btn-ghost" onClick={toggleCatalogMode} style={{whiteSpace:"nowrap",fontSize:12}}>
                {settings.useSharedCatalog?"→ Свой каталог":"→ Общий каталог"}
              </button>
            </div>

            {!settings.useSharedCatalog&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div>
                  <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:14,marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:10,color:"var(--text)"}}>Добавить категорию</div>
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      <input value={newCat.name} onChange={e=>setNewCat(n=>({...n,name:e.target.value}))} placeholder="Название"/>
                      <select value={newCat.parentId} onChange={e=>setNewCat(n=>({...n,parentId:e.target.value}))} style={{color:newCat.parentId?"var(--text)":"var(--text3)"}}>
                        <option value="">— Корневая —</option>
                        {data.ownCatalog.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button className="btn-primary" onClick={addOwnCat} style={{justifyContent:"center"}}>{I.plus} Добавить</button>
                    </div>
                  </div>
                  {renderOwnCatTree(null)}
                  {data.ownCatalog.categories.length===0&&<div style={{color:"var(--text3)",textAlign:"center",padding:"20px 0",fontSize:12}}>Нет категорий</div>}
                </div>
                <div>
                  <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:14,marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:10,color:"var(--text)"}}>Добавить товар</div>
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      <label style={{border:"1.5px dashed var(--border)",borderRadius:12,height:70,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:"var(--surface2)"}}>
                        {newProd.img
                          ?<img src={newProd.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          :<div style={{textAlign:"center",color:"var(--text3)",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>{I.camera}<span style={{fontSize:11}}>Фото</span></div>}
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                          const compressed=await compressImage(e.target.files[0]);
                          setNewProd(p=>({...p,img:compressed}));
                        }}/>
                      </label>
                      {imgUploading&&<div className="upload-progress"><div className="upload-progress-bar" style={{width:imgProgress+"%"}}/></div>}
                      <input value={newProd.name} onChange={e=>setNewProd(p=>({...p,name:e.target.value}))} placeholder="Название"/>
                      <div style={{display:"flex",gap:6}}>
                        <input value={newProd.price} onChange={e=>setNewProd(p=>({...p,price:e.target.value}))} placeholder="Цена" type="number"/>
                        <input value={newProd.cost||""} onChange={e=>setNewProd(p=>({...p,cost:e.target.value}))} placeholder="Себест." type="number"/>
                        <input value={newProd.stock} onChange={e=>setNewProd(p=>({...p,stock:e.target.value}))} placeholder="Остаток" type="number"/>
                      </div>
                      <select value={newProd.categoryId} onChange={e=>setNewProd(p=>({...p,categoryId:e.target.value}))} style={{color:newProd.categoryId?"var(--text)":"var(--text3)"}}>
                        <option value="">— Категория —</option>
                        {ownLeafCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {/* multiprices toggle */}
                      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:"var(--text2)"}}>
                        <input type="checkbox" checked={newProd.useMultiPrices||false} onChange={e=>setNewProd(p=>({...p,useMultiPrices:e.target.checked,multiPrices:[]}))} style={{width:14,height:14,accentColor:"var(--accent)",cursor:"pointer"}}/>
                        Мультицены (несколько вариантов цены)
                      </label>
                      {newProd.useMultiPrices&&(
                        <div>
                          <div style={{fontSize:11,color:"var(--text2)",marginBottom:6}}>Варианты цен (клиент выберет при добавлении в корзину):</div>
                          <MultiPricesEditor value={newProd.multiPrices||[]} onChange={mp=>setNewProd(p=>({...p,multiPrices:mp}))}/>
                        </div>
                      )}
                      <button className="btn-primary" onClick={addOwnProd} disabled={imgUploading} style={{justifyContent:"center"}}>
                        {imgUploading?<><span className="spinner"/>Загружаем...</>:<>{I.plus} Добавить товар</>}
                      </button>
                    </div>
                  </div>
                  <OwnProductsList
                    products={data.ownCatalog.products}
                    categories={data.ownCatalog.categories}
                    onDelete={deleteOwnProd}
                    onRename={renameOwnProd}
                    onUpdateImg={updateOwnProdImg}
                    onSavePriceStock={saveOwnPriceStock}
                    onUpdateMultiPrices={async(id,mp)=>{
                      await fetch(`/api/admin/shop-data?slug=${slug}&action=updateOwnProduct&id=${id}`,{
                        method:"PUT",headers:{"Content-Type":"application/json"},
                        body:JSON.stringify({multiPrices:mp})
                      });
                      loadData();
                    }}
                  />
                </div>
              </div>
            )}
            {settings.useSharedCatalog&&(
              <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:14,padding:14,textAlign:"center",color:"var(--text2)"}}>
                <div style={{fontSize:13,marginBottom:4}}>Используется общий каталог</div>
                <div style={{fontSize:11,color:"var(--text3)"}}>Настрой цены и остатки во вкладке «Цены и остатки».</div>
              </div>
            )}
          </div>
        )}

        {/* PRICES */}
        {tab==="prices"&&settings.useSharedCatalog&&(
          <PricesTab
            products={data.sharedCatalog.products}
            categories={data.sharedCatalog.categories}
            prices={data.prices}
            slug={slug}
            onSave={savePrice}
            onSaveOrder={saveSharedOrder}
          />
        )}

        {/* ORDERS */}
        {tab==="orders"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {data.orders.length===0&&<div style={{color:"var(--text3)",textAlign:"center",padding:"30px 0",fontSize:13}}>Заказов пока нет</div>}
            {data.orders.map(ord=>(
              <div key={ord.id} style={{background:"var(--surface)",border:`1px solid ${ord.status==="Новый"?"var(--accent)":"var(--border)"}`,borderRadius:14,padding:"12px 14px",borderLeft:ord.status==="Новый"?"3px solid var(--accent)":"3px solid transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>№{String(ord.id).padStart(5,"0")}</span>
                    <span style={{fontSize:11,color:"var(--text3)",marginLeft:8}}>{ord.date}</span>
                  </div>
                  <select value={ord.status} onChange={e=>updateOrderStatus(ord.id,e.target.value)}
                    style={{fontSize:11,padding:"4px 8px",borderRadius:8,cursor:"pointer",outline:"none",width:"auto"}}>
                    {["Новый","В обработке","Выполнен","Отмена"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>{ord.client} · @{ord.tg}</div>
                {ord.comment&&<div style={{fontSize:11,color:"var(--text3)",marginBottom:5,fontStyle:"italic"}}>"{ord.comment}"</div>}
                {ord.items.map((item,i)=><div key={i} style={{fontSize:12,color:"var(--text2)",marginBottom:1}}>{item.name} × {item.qty} = {item.qty*item.price} ₽</div>)}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,borderTop:"1px solid var(--border)",paddingTop:8,gap:6}}>
                  <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>Итого: {ord.total} ₽</span>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn-ghost" onClick={()=>setReceiptOrder(ord)} style={{fontSize:11,padding:"6px 10px"}}>{I.print} Чек</button>
                    <button className="btn-danger" onClick={()=>deleteOrder(ord.id)} style={{fontSize:11,padding:"6px 10px"}}>{I.trash} Удалить</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY */}
        {tab==="history"&&(
          <HistoryTab
            slug={slug}
            log={data.log||[]}
            onDeleteEntry={deleteLogEntry}
            onClearAll={clearLog}
          />
        )}

        {/* SETTINGS */}
        {tab==="settings"&&settingsForm&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:"var(--text)"}}>Название магазина</div>
              <input value={settingsForm.name||""} onChange={e=>setSettingsForm(f=>({...f,name:e.target.value}))} placeholder="Название"/>
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:10,color:"var(--text)"}}>Логотип</div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div onClick={()=>logoRef.current?.click()}
                  style={{width:60,height:60,borderRadius:12,overflow:"hidden",background:"var(--accent)",border:"1.5px dashed var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:11,fontWeight:800,color:"var(--accent-t)",letterSpacing:1}}>
                  {settingsForm.logoImg?<img src={settingsForm.logoImg} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:settingsForm.logoText}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:"var(--text2)",marginBottom:6}}>Нажми для загрузки или аббревиатура:</div>
                  <input value={settingsForm.logoText||""} onChange={e=>setSettingsForm(f=>({...f,logoText:e.target.value.slice(0,3).toUpperCase()}))} maxLength={3} style={{width:70}}/>
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}}
                onChange={async e=>{const c=await compressImage(e.target.files[0]);setSettingsForm(f=>({...f,logoImg:c}));}}/>
              {settingsForm.logoImg&&(
                <button className="btn-ghost" onClick={()=>setSettingsForm(f=>({...f,logoImg:null}))} style={{marginTop:10,width:"100%",justifyContent:"center",fontSize:11}}>
                  {I.trash} Удалить изображение
                </button>
              )}
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:"var(--text)"}}>WhatsApp</div>
              <input value={settingsForm.whatsapp||""} onChange={e=>setSettingsForm(f=>({...f,whatsapp:e.target.value}))} placeholder="79001234567"/>
            </div>
            <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:14,padding:14}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:3,color:"var(--text)"}}>Ссылка на витрину</div>
              <code style={{fontSize:12,color:"var(--text2)"}}>{typeof window!=="undefined"?window.location.origin:""}/shop/{slug}</code>
            </div>
            <button className="btn-primary" onClick={saveSettings} disabled={saving} style={{justifyContent:"center",padding:"13px"}}>
              {saving?<span className="spinner"/>:<>{I.check} Сохранить настройки</>}
            </button>
          </div>
        )}
      </div>
      {receiptOrder&&<ReceiptModal order={receiptOrder} shopName={settings.name} onClose={()=>setReceiptOrder(null)}/>}
    </div>
  );
}

// ── MultiPricesEditor — компонент редактирования мультицен ────────────────────
function MultiPricesEditor({ value = [], onChange }) {
  function add() {
    onChange([...value, { name: "", price: "", minOrder: "" }]);
  }
  function remove(i) {
    onChange(value.filter((_, j) => j !== i));
  }
  function update(i, field, val) {
    onChange(value.map((mp, j) => j === i ? { ...mp, [field]: val } : mp));
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {value.map((mp, i) => (
        <div key={i} style={{ display:"flex", gap:6, alignItems:"center", background:"var(--surface2)", borderRadius:10, padding:"8px 10px" }}>
          <div style={{ flex:2 }}>
            <div style={{ fontSize:10, color:"var(--text3)", marginBottom:3 }}>Название</div>
            <input value={mp.name} onChange={e=>update(i,"name",e.target.value)} placeholder="Опт от 5 000₽"
              style={{ fontSize:11, padding:"5px 8px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontFamily:"inherit", outline:"none", width:"100%" }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:"var(--text3)", marginBottom:3 }}>Цена ₽</div>
            <input value={mp.price} onChange={e=>update(i,"price",e.target.value)} placeholder="350" type="number"
              style={{ fontSize:11, padding:"5px 8px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontFamily:"inherit", outline:"none", width:"100%", textAlign:"center" }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:"var(--text3)", marginBottom:3 }}>От ₽</div>
            <input value={mp.minOrder||""} onChange={e=>update(i,"minOrder",e.target.value)} placeholder="5000" type="number"
              style={{ fontSize:11, padding:"5px 8px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontFamily:"inherit", outline:"none", width:"100%", textAlign:"center" }}/>
          </div>
          <button onClick={()=>remove(i)}
            style={{ background:"none", border:"1.5px solid #fca5a5", borderRadius:8, padding:"5px 8px", cursor:"pointer", color:"#dc2626", flexShrink:0, marginTop:14 }}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={add} className="btn-ghost" style={{ fontSize:11, justifyContent:"center" }}>
        + Добавить вариант цены
      </button>
    </div>
  );
}
