import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { ReceiptModal } from "@/components/Receipt";

function getDesc(pid, cats) {
  const ids=[], q=[pid];
  while(q.length){const id=q.shift();ids.push(id);cats.filter(c=>c.parentId===id).forEach(c=>q.push(c.id));}
  return ids;
}

// ── dark mode ──────────────────────────────────────────────────────────────────
function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const d = saved === "dark";
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    document.body.classList.toggle("dark", d);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
    document.body.classList.toggle("dark", next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next ? "#111111" : "#f5f5f7");
  }
  return { dark, toggle };
}

// ── slide nav ─────────────────────────────────────────────────────────────────
function useSlideNav() {
  const [stack,setStack]=useState([]);
  const [out,setOut]=useState(null);
  const [inn,setInn]=useState(null);
  const [dir,setDir]=useState("fwd");
  const [busy,setBusy]=useState(false);
  const go=useCallback((ns)=>{
    if(busy)return;
    setDir(ns.length>=stack.length?"fwd":"bwd");
    setOut(stack);setInn(ns);setBusy(true);
  },[busy,stack]);
  const done=useCallback(()=>{setStack(inn);setOut(null);setInn(null);setBusy(false);},[inn]);
  return{stack,out,inn,dir,busy,go,done};
}

function AnimPane({role,dir,onDone,children}){
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    const fwd=dir==="fwd";
    const fx=role==="out"?"0%":(fwd?"100%":"-100%");
    const tx=role==="out"?(fwd?"-100%":"100%"):"0%";
    const anim=el.animate(
      [{transform:`translateX(${fx})`,opacity:role==="out"?1:0},
       {transform:`translateX(${tx})`,opacity:role==="out"?0:1}],
      {duration:300,easing:"cubic-bezier(0.4,0,0.2,1)",fill:"forwards"}
    );
    if(role==="in")anim.onfinish=onDone;
  },[]);
  return(
    <div ref={ref} style={{position:"absolute",inset:0,overflowY:"auto",background:"var(--bg)",willChange:"transform",WebkitOverflowScrolling:"touch"}}>
      {children}
    </div>
  );
}

// ── icons ─────────────────────────────────────────────────────────────────────
const CartIcon =()=><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.43 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>;
const SearchIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>;
const FolderIcon=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>;
const BoxIcon  =()=><svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" style={{opacity:0.2}}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>;
const TrashIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>;
const CheckIcon=()=><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>;
const PrintIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>;
const SendIcon =()=><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
const BackIcon =()=><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>;
const ChevR   =()=><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>;
const SunIcon =()=><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>;
const MoonIcon=()=><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>;

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({ p, qty, setQty, onAdd }) {
  const out = p.stock === 0;
  return (
    <div style={{
      background:"var(--surface)", border:"1px solid var(--border)",
      borderRadius:16, overflow:"hidden", display:"flex", flexDirection:"column",
      boxShadow:"0 2px 12px var(--shadow)",
      transition:"transform .18s, box-shadow .18s",
      width:"100%",
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px var(--shadow)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 12px var(--shadow)";}}>
      <div style={{height:120,background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
        {p.img
          ?<img src={p.img} alt={p.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",transition:"opacity .3s"}} onLoad={e=>e.target.style.opacity=1} onError={e=>e.target.style.display="none"}/>
          :<BoxIcon/>}
      </div>
      <div style={{padding:"9px 10px 11px",flex:1,display:"flex",flexDirection:"column"}}>
        <div style={{fontSize:12,fontWeight:600,marginBottom:2,lineHeight:1.3,flex:1,color:"var(--text)"}}>{p.name}</div>
        <div style={{fontSize:13,fontWeight:700,marginBottom:2,color:"var(--text)"}}>{p.price} ₽</div>
        <div style={{fontSize:10,marginBottom:7,fontWeight:600,
          color:out?"#dc2626":p.stock<=5?"#f59e0b":"var(--text3)"}}>
          {out?"Нет в наличии":p.stock<=5?`Осталось ${p.stock} шт`:`${p.stock} шт`}
        </div>
        {!out&&(
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",border:"1.5px solid var(--border)",borderRadius:9,padding:"3px 6px",marginBottom:5,background:"var(--surface2)"}}>
              <button onClick={()=>setQty(Math.max(1,qty-1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"var(--text)",lineHeight:1}}>−</button>
              <span style={{fontSize:12,minWidth:16,textAlign:"center",fontWeight:600,color:"var(--text)"}}>{qty}</span>
              <button onClick={()=>setQty(Math.min(p.stock,qty+1))} style={{background:"none",border:"none",cursor:qty>=p.stock?"not-allowed":"pointer",fontSize:16,color:qty>=p.stock?"var(--text3)":"var(--text)",lineHeight:1}}>+</button>
            </div>
            <button onClick={onAdd} style={{width:"100%",background:"var(--accent)",color:"var(--accent-t)",border:"none",borderRadius:9,padding:"8px 0",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"opacity .15s"}}>
              В корзину
            </button>
          </>
        )}
        {out&&(
          <button disabled style={{width:"100%",background:"var(--surface2)",color:"var(--text3)",border:"1px solid var(--border)",borderRadius:9,padding:"8px 0",fontSize:11,fontWeight:500,cursor:"not-allowed",fontFamily:"inherit"}}>
            Нет в наличии
          </button>
        )}
      </div>
    </div>
  );
}

// ── CatChip ───────────────────────────────────────────────────────────────────
function CatChip({ cat, onClick }) {
  return (
    <div onClick={onClick}
      style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,boxShadow:"0 2px 8px var(--shadow)",padding:"14px 12px",cursor:"pointer",display:"flex",flexDirection:"column",gap:7,transition:"transform .15s,border-color .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="var(--accent)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="var(--border)";}}>
      <span style={{color:"var(--text2)"}}><FolderIcon/></span>
      <div style={{fontSize:13,fontWeight:600,lineHeight:1.3,color:"var(--text)"}}>{cat.name}</div>
    </div>
  );
}

// ── TWO-ROW SECTION ───────────────────────────────────────────────────────────
function TwoRowSection({ title, children }) {
  // If ≤ 4 items, single row; otherwise two rows
  const count = Array.isArray(children) ? children.length : 1;
  const twoRow = count > 4;

  return (
    <div style={{marginBottom:24}}>
      {title&&<div style={{fontSize:15,fontWeight:700,marginBottom:10,padding:"0 16px",color:"var(--text)"}}>{title}</div>}
      {twoRow ? (
        <div style={{
          display:"grid",
          gridTemplateRows:"1fr 1fr",
          gridAutoFlow:"column",
          gridAutoColumns:160,
          gap:10,
          overflowX:"auto",
          overflowY:"visible",
          padding:"4px 16px 12px",
          WebkitOverflowScrolling:"touch",
          scrollSnapType:"x mandatory",
          scrollbarWidth:"none",
        }}>
          <style>{`.two-row-scroll::-webkit-scrollbar{display:none}`}</style>
          {children}
        </div>
      ) : (
        <div style={{
          display:"flex",gap:10,overflowX:"auto",overflowY:"visible",
          padding:"4px 16px 12px",WebkitOverflowScrolling:"touch",
          scrollSnapType:"x mandatory",scrollbarWidth:"none",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function CatRow({ title, children }) {
  return (
    <div style={{marginBottom:20}}>
      {title&&<div style={{fontSize:14,fontWeight:700,marginBottom:8,padding:"0 16px",color:"var(--text)"}}>{title}</div>}
      <div style={{display:"flex",gap:10,overflowX:"auto",overflowY:"visible",padding:"4px 16px 10px",WebkitOverflowScrolling:"touch",scrollSnapType:"x mandatory",scrollbarWidth:"none"}}>
        {children}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { dark, toggle: toggleDark } = useDark();

  const [shopData,setShopData]   = useState(null);
  const [notFound,setNotFound]   = useState(false);
  const nav = useSlideNav();

  const [search,setSearch]       = useState("");
  const [quantities,setQtys]     = useState({});
  const [cart,setCart]           = useState([]);
  const [cartOpen,setCartOpen]   = useState(false);
  const [step,setStep]           = useState("cart");
  const [form,setForm]           = useState({client:"",tg:"",comment:"",agreed:false});
  const [formErr,setFormErr]     = useState("");
  const [submitting,setSubmitting]=useState(false);
  const [curOrder,setCurOrder]   = useState(null);
  const [receiptOrd,setReceiptOrd]=useState(null);

  useEffect(()=>{
    if(!slug)return;
    fetch(`/api/shop/${slug}`).then(r=>{
      if(!r.ok)return setNotFound(true);
      r.json().then(setShopData);
    });
  },[slug]);

  const {settings,categories=[],products=[]}=shopData||{};
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal=cart.reduce((s,i)=>s+i.qty*i.price,0);

  function addToCart(p){
    const qty=Math.min(quantities[p.id]||1,p.stock);
    if(qty<=0)return;
    setCart(c=>{const ex=c.find(i=>i.id===p.id);if(ex)return c.map(i=>i.id===p.id?{...i,qty:Math.min(i.qty+qty,p.stock)}:i);return[...c,{id:p.id,name:p.name,price:p.price,qty,stock:p.stock}];});
    setQtys(q=>({...q,[p.id]:1}));
  }
  function chQty(id,d){setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(1,Math.min(i.qty+d,i.stock||999))}:i));}

  async function confirmOrder(){
    if(!form.client.trim()||!form.tg.trim()||!form.agreed)return setFormErr("Заполни обязательные поля");
    setFormErr("");setSubmitting(true);
    const r=await fetch(`/api/shop/order/${slug}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client:form.client.trim(),tg:form.tg.trim().replace(/^@/,""),comment:form.comment,items:cart.map(i=>({name:i.name,qty:i.qty,price:i.price})),total:cartTotal})});
    setSubmitting(false);
    if(!r.ok){const d=await r.json();return setFormErr(d.error||"Ошибка");}
    const ord=await r.json();
    setCurOrder(ord);setCart([]);setStep("done");
    setForm({client:"",tg:"",comment:"",agreed:false});
  }

  function ShopContent({ stack }) {
    const catId = stack[stack.length-1]??null;
    const childCats = categories.filter(c=>c.parentId===catId);

    const catProducts = useMemo(()=>{
      if(catId===null)return[];
      const ids=getDesc(catId,categories);
      return products.filter(p=>ids.includes(p.categoryId));
    },[catId]);

    const filteredAll = useMemo(()=>products.filter(p=>search===""||p.name.toLowerCase().includes(search.toLowerCase())),[search]);
    const filteredCat = useMemo(()=>catProducts.filter(p=>search===""||p.name.toLowerCase().includes(search.toLowerCase())),[search,catProducts]);

    function groupByCategory(prods){
      const groups={};
      prods.forEach(p=>{
        const cat=categories.find(c=>c.id===p.categoryId);
        const key=cat?.name||"Без категории";
        if(!groups[key])groups[key]=[];
        groups[key].push(p);
      });
      return groups;
    }

    return(
      <div style={{paddingTop:8,paddingBottom:80}}>
        {catId===null&&(
          <>
            {!search&&categories.filter(c=>c.parentId===null).length>0&&(
              <CatRow title="Разделы">
                {categories.filter(c=>c.parentId===null).map(cat=>(
                  <div key={cat.id} style={{flexShrink:0,width:140,scrollSnapAlign:"start"}}>
                    <CatChip cat={cat} onClick={()=>{nav.go([cat.id]);setSearch("");}}/>
                  </div>
                ))}
              </CatRow>
            )}
            {Object.entries(groupByCategory(filteredAll)).map(([catName,prods])=>(
              <TwoRowSection key={catName} title={catName}>
                {prods.map(p=>(
                  <div key={p.id} style={{scrollSnapAlign:"start"}}>
                    <ProductCard p={p}
                      qty={quantities[p.id]||1}
                      setQty={v=>setQtys(q=>({...q,[p.id]:Math.max(1,Math.min(v,p.stock||1))}))}
                      onAdd={()=>addToCart(p)}/>
                  </div>
                ))}
              </TwoRowSection>
            ))}
            {filteredAll.length===0&&<div style={{color:"var(--text3)",textAlign:"center",padding:"60px 0",fontSize:13}}>Ничего не найдено</div>}
          </>
        )}
        {catId!==null&&(
          <>
            {childCats.length>0&&!search&&(
              <CatRow title="Подразделы">
                {childCats.map(cat=>(
                  <div key={cat.id} style={{flexShrink:0,width:140,scrollSnapAlign:"start"}}>
                    <CatChip cat={cat} onClick={()=>{nav.go([...stack,cat.id]);setSearch("");}}/>
                  </div>
                ))}
              </CatRow>
            )}
            <TwoRowSection title={search?"Результаты поиска":"Товары"}>
              {filteredCat.length===0
                ?<div style={{color:"var(--text3)",fontSize:13,padding:"20px 0"}}>Ничего не найдено</div>
                :filteredCat.map(p=>(
                  <div key={p.id} style={{scrollSnapAlign:"start"}}>
                    <ProductCard p={p}
                      qty={quantities[p.id]||1}
                      setQty={v=>setQtys(q=>({...q,[p.id]:Math.max(1,Math.min(v,p.stock||1))}))}
                      onAdd={()=>addToCart(p)}/>
                  </div>
                ))
              }
            </TwoRowSection>
          </>
        )}
      </div>
    );
  }

  if(notFound)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,background:"var(--bg)"}}>
      <Head><title>Не найдено</title><meta name="theme-color" content="#f5f5f7"/></Head>
      <div style={{fontSize:40,color:"var(--text3)"}}>🔒</div>
      <div style={{fontSize:15,fontWeight:600,color:"var(--text)"}}>Магазин не найден</div>
    </div>
  );

  if(!shopData)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text2)",fontSize:13,background:"var(--bg)"}}>
      <Head><title>Загрузка...</title><meta name="theme-color" content="#f5f5f7"/></Head>
      Загрузка...
    </div>
  );

  const showBack = nav.stack.length > 0;
  const inpStyle = {border:"1.5px solid var(--border)",borderRadius:12,padding:"10px 13px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",background:"var(--surface)",color:"var(--text)",transition:"border-color .15s"};

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      <Head>
        <title>{settings.name}</title>
        <meta name="theme-color" content={dark?"#111111":"#f5f5f7"}/>
      </Head>
      <style>{`
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        *{scrollbar-width:none} *::-webkit-scrollbar{display:none}
        /* fix iOS overscroll white */
        html,body{background-color:var(--bg);overscroll-behavior:none;}
      `}</style>

      {/* Header */}
      <div style={{borderBottom:"1px solid var(--border)",padding:"0 12px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,background:"var(--surface)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",zIndex:20,boxShadow:"0 2px 12px var(--shadow)",gap:8,transition:"background .5s,border-color .5s"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
          {showBack&&(
            <button onClick={()=>nav.go(nav.stack.slice(0,-1))} style={{background:"none",border:"1.5px solid var(--border)",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text)",flexShrink:0}}><BackIcon/></button>
          )}
          <div onClick={()=>{nav.go([]);setSearch("");}} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",minWidth:0}}>
            <div style={{width:32,height:32,borderRadius:9,overflow:"hidden",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"var(--accent-t)",flexShrink:0}}>
              {settings.logoImg?<img src={settings.logoImg} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:settings.logoText}
            </div>
            <span style={{fontSize:13,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{settings.name}</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
          <button onClick={toggleDark} style={{background:"none",border:"1.5px solid var(--border)",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text)"}}>
            {dark?<SunIcon/>:<MoonIcon/>}
          </button>
          <button onClick={()=>{setCartOpen(true);setStep("cart");}}
            style={{background:"none",border:"1.5px solid var(--border)",borderRadius:11,padding:"7px 12px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:7,color:"var(--text)"}}>
            <CartIcon/>
            {cartCount>0&&<span style={{background:"var(--accent)",color:"var(--accent-t)",borderRadius:99,fontSize:10,padding:"1px 7px",fontWeight:700}}>{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"8px 14px",display:"flex",gap:5,fontSize:12,color:"var(--text2)",flexWrap:"wrap",alignItems:"center",transition:"background .5s,border-color .5s"}}>
        <span onClick={()=>{nav.go([]);setSearch("");}} style={{cursor:"pointer",color:nav.stack.length===0?"var(--text)":"var(--text2)",fontWeight:nav.stack.length===0?600:400}}>Все товары</span>
        {nav.stack.map((id,idx)=>{
          const cat=categories.find(c=>c.id===id);
          return(
            <span key={id} style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{color:"var(--text3)"}}><ChevR/></span>
              <span onClick={()=>nav.go(nav.stack.slice(0,idx+1))} style={{cursor:"pointer",color:idx===nav.stack.length-1?"var(--text)":"var(--text2)",fontWeight:idx===nav.stack.length-1?600:400}}>
                {cat?.name}
              </span>
            </span>
          );
        })}
      </div>

      {/* Search */}
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"8px 14px",transition:"background .5s,border-color .5s"}}>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",display:"flex",pointerEvents:"none"}}><SearchIcon/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск товаров..."
            style={{...inpStyle,paddingLeft:34,background:"var(--surface2)"}}/>
        </div>
      </div>

      {/* Content */}
      <div style={{position:"relative",overflow:"hidden",minHeight:"calc(100vh - 160px)"}}>
        {nav.busy&&nav.out!==null&&<AnimPane role="out" dir={nav.dir} onDone={()=>{}}><ShopContent stack={nav.out}/></AnimPane>}
        {nav.busy&&nav.inn!==null&&<AnimPane role="in"  dir={nav.dir} onDone={nav.done}><ShopContent stack={nav.inn}/></AnimPane>}
        {!nav.busy&&<ShopContent stack={nav.stack}/>}
      </div>

      {/* Cart modal */}
      {cartOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",alignItems:"flex-end",animation:"fadeIn .2s ease"}}
          onClick={e=>e.target===e.currentTarget&&setCartOpen(false)}>
          <div style={{background:"var(--surface)",width:"100%",maxHeight:"88vh",borderRadius:"22px 22px 0 0",display:"flex",flexDirection:"column",boxShadow:"0 -8px 40px var(--shadow)",animation:"slideUp .3s cubic-bezier(0.4,0,0.2,1)",transition:"background .5s"}}>

            {step==="cart"&&(
              <>
                <div style={{padding:"18px 20px 12px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>Корзина</div>
                    <button onClick={()=>setCartOpen(false)} style={{background:"none",border:"none",color:"var(--text2)",cursor:"pointer",fontSize:22,lineHeight:1}}>✕</button>
                  </div>
                </div>
                {cart.length===0
                  ?<div style={{color:"var(--text3)",textAlign:"center",padding:"40px 0",fontSize:13,flex:1}}>Корзина пуста</div>
                  :<>
                    <div style={{overflowY:"auto",flex:1,padding:"0 20px"}}>
                      {cart.map(item=>(
                        <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:"1px solid var(--border)"}}>
                          <div style={{flex:1,paddingRight:8}}>
                            <div style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{item.name}</div>
                            <div style={{fontSize:11,color:"var(--text2)"}}>{item.price} ₽/шт</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,border:"1.5px solid var(--border)",borderRadius:10,padding:"4px 8px",background:"var(--surface2)"}}>
                              <button onClick={()=>chQty(item.id,-1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"var(--text)"}}>−</button>
                              <span style={{fontSize:13,minWidth:18,textAlign:"center",fontWeight:600,color:"var(--text)"}}>{item.qty}</span>
                              <button onClick={()=>chQty(item.id,1)} style={{background:"none",border:"none",cursor:item.qty>=(item.stock||999)?"not-allowed":"pointer",fontSize:16,color:item.qty>=(item.stock||999)?"var(--text3)":"var(--text)"}}>+</button>
                            </div>
                            <div style={{fontSize:13,fontWeight:600,minWidth:60,textAlign:"right",color:"var(--text)"}}>{item.qty*item.price} ₽</div>
                            <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",display:"flex"}}><TrashIcon/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"14px 20px 36px",borderTop:"1px solid var(--border)",flexShrink:0,background:"var(--surface)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                        <span style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>Итого</span>
                        <span style={{fontSize:17,fontWeight:700,color:"var(--text)"}}>{cartTotal} ₽</span>
                      </div>
                      <button onClick={()=>setStep("form")} style={{width:"100%",background:"var(--accent)",color:"var(--accent-t)",border:"none",borderRadius:14,padding:"15px 0",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                        Оформить заказ
                      </button>
                    </div>
                  </>
                }
              </>
            )}

            {step==="form"&&(
              <>
                <div style={{padding:"16px 20px 12px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
                  <button onClick={()=>setStep("cart")} style={{background:"none",border:"none",color:"var(--text2)",cursor:"pointer",fontSize:12,padding:0,display:"flex",alignItems:"center",gap:4,marginBottom:4,fontFamily:"inherit"}}>‹ Назад</button>
                  <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>Оформление</div>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"16px 20px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div>
                      <div style={{fontSize:11,color:"var(--text2)",marginBottom:5,fontWeight:600,letterSpacing:"0.4px"}}>ИМЯ / КОМПАНИЯ *</div>
                      <input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} placeholder="ИП Иванов или ООО Ромашка" style={inpStyle}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"var(--text2)",marginBottom:5,fontWeight:600,letterSpacing:"0.4px"}}>TELEGRAM (без @) *</div>
                      <input value={form.tg} onChange={e=>setForm(f=>({...f,tg:e.target.value.replace(/^@/,"")}))} placeholder="durov" style={inpStyle}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"var(--text2)",marginBottom:5,fontWeight:600,letterSpacing:"0.4px"}}>КОММЕНТАРИЙ</div>
                      <textarea value={form.comment} onChange={e=>setForm(f=>({...f,comment:e.target.value}))} placeholder="Дополнительные пожелания..." rows={2} style={{...inpStyle,resize:"none",lineHeight:1.5}}/>
                    </div>
                    <label style={{display:"flex",gap:10,alignItems:"flex-start",cursor:"pointer"}}>
                      <input type="checkbox" checked={form.agreed} onChange={e=>setForm(f=>({...f,agreed:e.target.checked}))} style={{width:16,height:16,accentColor:"var(--accent)",flexShrink:0,marginTop:2,cursor:"pointer"}}/>
                      <span style={{fontSize:12,color:"var(--text2)",lineHeight:1.4}}>Соглашаюсь с обработкой персональных данных</span>
                    </label>
                    <div style={{background:"var(--surface2)",borderRadius:13,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"var(--text2)",marginBottom:2}}>Сумма заказа</div>
                      <div style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>{cartTotal} ₽</div>
                    </div>
                    {formErr&&<div style={{fontSize:12,color:"#dc2626"}}>⚠ {formErr}</div>}
                  </div>
                </div>
                <div style={{padding:"12px 20px 36px",borderTop:"1px solid var(--border)",flexShrink:0,background:"var(--surface)"}}>
                  <button onClick={confirmOrder} disabled={submitting||!form.client.trim()||!form.tg.trim()||!form.agreed}
                    style={{width:"100%",background:"var(--accent)",color:"var(--accent-t)",border:"none",borderRadius:14,padding:"15px 0",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:(submitting||!form.client.trim()||!form.tg.trim()||!form.agreed)?0.4:1}}>
                    {submitting?"Отправляем...":"Подтвердить заказ"}
                  </button>
                </div>
              </>
            )}

            {step==="done"&&curOrder&&(
              <>
                <div style={{padding:"18px 20px 12px",borderBottom:"1px solid var(--border)",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>Заказ принят</div>
                  <button onClick={()=>{setCartOpen(false);setStep("cart");}} style={{background:"none",border:"none",color:"var(--text2)",cursor:"pointer",fontSize:22,lineHeight:1}}>✕</button>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"20px"}}>
                  <div style={{background:"var(--surface2)",borderRadius:16,padding:20,textAlign:"center",marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:8,color:"#16a34a"}}><CheckIcon/></div>
                    <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>Заказ №{String(curOrder.id).padStart(5,"0")}</div>
                    <div style={{fontSize:12,color:"var(--text2)",marginTop:4}}>Мы свяжемся с вами в ближайшее время</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button onClick={()=>{setReceiptOrd(curOrder);setCartOpen(false);}}
                      style={{width:"100%",background:"var(--accent)",color:"var(--accent-t)",border:"none",borderRadius:13,padding:"13px 0",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontFamily:"inherit"}}>
                      <PrintIcon/> Посмотреть чек
                    </button>
                    {curOrder.tg&&(
                      <a href={`https://t.me/${curOrder.tg}?text=${encodeURIComponent(`Заказ №${String(curOrder.id).padStart(5,"0")}\nИТОГО: ${curOrder.total}₽`)}`}
                        target="_blank" rel="noreferrer"
                        style={{width:"100%",background:"#229ED9",color:"#fff",borderRadius:13,padding:"13px 0",fontSize:13,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxSizing:"border-box"}}>
                        <SendIcon/> Поделиться в Telegram
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {receiptOrd&&<ReceiptModal order={receiptOrd} shopName={settings.name} onClose={()=>setReceiptOrd(null)}/>}
    </div>
  );
}
