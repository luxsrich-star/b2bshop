import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { ReceiptModal } from "@/components/Receipt";

function getDesc(pid, cats) {
  const ids=[], q=[pid];
  while(q.length){const id=q.shift();ids.push(id);cats.filter(c=>c.parentId===id).forEach(c=>q.push(c.id));}
  return ids;
}

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
  return<div ref={ref} style={{position:"absolute",inset:0,overflowY:"auto",background:"#f5f5f7",willChange:"transform"}}>{children}</div>;
}

const CartIcon=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.43 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>;
const SearchIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>;
const FolderIcon=()=><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>;
const BoxIcon=()=><svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{opacity:0.2}}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>;
const TrashIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>;
const CheckIcon=()=><svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>;
const PrintIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>;
const SendIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
const ChevRIcon=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>;

function ProductCard({p,qty,setQty,onAdd}){
  const out=p.stock===0;
  return(
    <div style={{width:160,flexShrink:0,background:"#fff",border:"1px solid #ebebeb",borderRadius:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",overflow:"hidden",display:"flex",flexDirection:"column",transition:"transform .18s,box-shadow .18s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.1)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.06)";}}>
      <div style={{height:130,background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,position:"relative"}}>
        {p.img
          ?<img src={p.img} alt={p.name} loading="lazy"
              style={{width:"100%",height:"100%",objectFit:"cover",transition:"opacity .3s"}}
              onLoad={e=>e.target.style.opacity=1}
              onError={e=>e.target.style.display="none"}/>
          :<BoxIcon/>}
      </div>
      <div style={{padding:"10px 10px 12px",flex:1,display:"flex",flexDirection:"column"}}>
        <div style={{fontSize:12,fontWeight:600,marginBottom:2,lineHeight:1.3,flex:1}}>{p.name}</div>
        <div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{p.price} ₽</div>
        <div style={{fontSize:10,color:out?"#dc2626":"#bbb",marginBottom:8}}>
          {out?"Нет в наличии":`${p.stock} шт`}
        </div>
        {!out&&(
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",border:"1.5px solid #ebebeb",borderRadius:10,padding:"4px 7px",marginBottom:6,background:"#fafafa"}}>
              <button onClick={()=>setQty(qty-1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#333",lineHeight:1,padding:"0 2px"}}>−</button>
              <span style={{fontSize:13,minWidth:18,textAlign:"center",fontWeight:600}}>{qty}</span>
              <button onClick={()=>setQty(qty+1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#333",lineHeight:1,padding:"0 2px"}}>+</button>
            </div>
            <button onClick={onAdd}
              style={{width:"100%",background:"#111",color:"#fff",border:"none",borderRadius:10,padding:"9px 0",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"background .15s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#222"}
              onMouseLeave={e=>e.currentTarget.style.background="#111"}>
              В корзину
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CatChip({cat,onClick}){
  return(
    <div onClick={onClick}
      style={{width:140,flexShrink:0,background:"#fff",border:"1px solid #ebebeb",borderRadius:16,boxShadow:"0 2px 10px rgba(0,0,0,0.05)",padding:"16px 14px",cursor:"pointer",display:"flex",flexDirection:"column",gap:8,transition:"transform .15s,box-shadow .15s,border-color .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.1)";e.currentTarget.style.borderColor="#ccc";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,0.05)";e.currentTarget.style.borderColor="#ebebeb";}}>
      <span style={{color:"#555"}}><FolderIcon/></span>
      <div style={{fontSize:13,fontWeight:600,lineHeight:1.3}}>{cat.name}</div>
    </div>
  );
}

function HSection({title,children}){
  return(
    <div style={{marginBottom:24}}>
      {title&&<div style={{fontSize:15,fontWeight:700,marginBottom:10,padding:"0 20px"}}>{title}</div>}
      <div style={{display:"flex",gap:12,overflowX:"auto",overflowY:"visible",padding:"4px 20px 12px",WebkitOverflowScrolling:"touch",scrollSnapType:"x mandatory",scrollbarWidth:"none"}}>
        <style>{`.hscroll::-webkit-scrollbar{display:none}`}</style>
        {children}
      </div>
    </div>
  );
}

export default function ShopPage(){
  const router=useRouter();
  const{slug}=router.query;
  const[shopData,setShopData]=useState(null);
  const[notFound,setNotFound]=useState(false);
  const nav=useSlideNav();
  const[search,setSearch]=useState("");
  const[quantities,setQtys]=useState({});
  const[cart,setCart]=useState([]);
  const[cartOpen,setCartOpen]=useState(false);
  const[step,setStep]=useState("cart");
  const[form,setForm]=useState({client:"",tg:"",comment:"",agreed:false});
  const[formErr,setFormErr]=useState("");
  const[submitting,setSubmitting]=useState(false);
  const[curOrder,setCurOrder]=useState(null);
  const[receiptOrd,setReceiptOrd]=useState(null);

  useEffect(()=>{
    if(!slug)return;
    fetch(`/api/shop/${slug}`).then(r=>{
      if(!r.ok)return setNotFound(true);
      r.json().then(setShopData);
    });
  },[slug]);

  const{settings,categories=[],products=[]}=shopData||{};
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal=cart.reduce((s,i)=>s+i.qty*i.price,0);

  function addToCart(p){
    const qty=quantities[p.id]||1;
    setCart(c=>{const ex=c.find(i=>i.id===p.id);if(ex)return c.map(i=>i.id===p.id?{...i,qty:i.qty+qty}:i);return[...c,{id:p.id,name:p.name,price:p.price,qty}];});
    setQtys(q=>({...q,[p.id]:1}));
  }
  function chQty(id,d){setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i));}

  async function confirmOrder(){
    if(!form.client.trim()||!form.tg.trim()||!form.agreed)return setFormErr("Заполни обязательные поля");
    setFormErr("");setSubmitting(true);
    const r=await fetch(`/api/shop/order/${slug}`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({client:form.client.trim(),tg:form.tg.trim().replace(/^@/,""),comment:form.comment,items:cart.map(i=>({name:i.name,qty:i.qty,price:i.price})),total:cartTotal})
    });
    setSubmitting(false);
    if(!r.ok){const d=await r.json();return setFormErr(d.error||"Ошибка при отправке");}
    const ord=await r.json();
    setCurOrder(ord);setCart([]);setStep("done");
    setForm({client:"",tg:"",comment:"",agreed:false});
  }

  function ShopContent({stack}){
    const catId=stack[stack.length-1]??null;
    const childCats=categories.filter(c=>c.parentId===catId);
    const allProducts=useMemo(()=>products,[]);
    const catProducts=useMemo(()=>{
      if(catId===null)return[];
      const ids=getDesc(catId,categories);
      return products.filter(p=>ids.includes(p.categoryId));
    },[catId]);
    const filteredAll=useMemo(()=>allProducts.filter(p=>search===""||p.name.toLowerCase().includes(search.toLowerCase())),[search]);
    const filteredCat=useMemo(()=>catProducts.filter(p=>search===""||p.name.toLowerCase().includes(search.toLowerCase())),[search,catProducts]);

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
              <HSection title="Разделы">
                {categories.filter(c=>c.parentId===null).map(cat=>(
                  <CatChip key={cat.id} cat={cat} onClick={()=>{nav.go([cat.id]);setSearch("");}}/>
                ))}
              </HSection>
            )}
            {Object.entries(groupByCategory(filteredAll)).map(([catName,prods])=>(
              <HSection key={catName} title={search?`Результаты — ${catName}`:catName}>
                {prods.map(p=>(
                  <ProductCard key={p.id} p={p}
                    qty={quantities[p.id]||1}
                    setQty={v=>setQtys(q=>({...q,[p.id]:Math.max(1,v)}))}
                    onAdd={()=>addToCart(p)}/>
                ))}
              </HSection>
            ))}
            {filteredAll.length===0&&(
              <div style={{color:"#bbb",textAlign:"center",padding:"60px 0",fontSize:13}}>Ничего не найдено</div>
            )}
          </>
        )}
        {catId!==null&&(
          <>
            {childCats.length>0&&!search&&(
              <HSection title="Подразделы">
                {childCats.map(cat=>(
                  <CatChip key={cat.id} cat={cat} onClick={()=>{nav.go([...stack,cat.id]);setSearch("");}}/>
                ))}
              </HSection>
            )}
            <HSection title={search?"Результаты поиска":"Товары"}>
              {filteredCat.length===0
                ?<div style={{color:"#bbb",fontSize:13,padding:"20px 0"}}>Ничего не найдено</div>
                :filteredCat.map(p=>(
                  <ProductCard key={p.id} p={p}
                    qty={quantities[p.id]||1}
                    setQty={v=>setQtys(q=>({...q,[p.id]:Math.max(1,v)}))}
                    onAdd={()=>addToCart(p)}/>
                ))
              }
            </HSection>
          </>
        )}
      </div>
    );
  }

  if(notFound)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{fontSize:40,color:"#ccc"}}><svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg></div>
      <div style={{fontSize:15,fontWeight:600}}>Магазин не найден</div>
      <div style={{fontSize:13,color:"#aaa"}}>Проверьте ссылку</div>
    </div>
  );

  if(!shopData)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#bbb",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
      Загрузка...
    </div>
  );

  const SF={fontFamily:"'DM Sans','Helvetica Neue',sans-serif"};

  return(
    <div style={{minHeight:"100vh",background:"#f5f5f7",...SF}}>
      <Head><title>{settings.name}</title></Head>
      <style>{`
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        input:focus,select:focus,textarea:focus{border-color:#111!important;box-shadow:0 0 0 3px rgba(0,0,0,0.06)!important;}
      `}</style>

      {/* Header */}
      <div style={{borderBottom:"1px solid #ebebeb",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,background:"rgba(255,255,255,0.92)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",zIndex:20,boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
        <div onClick={()=>{nav.go([]);setSearch("");}} style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
          <div style={{width:34,height:34,borderRadius:10,overflow:"hidden",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
            {settings.logoImg?<img src={settings.logoImg} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:settings.logoText}
          </div>
          <span style={{fontSize:13,fontWeight:700}}>{settings.name}</span>
        </div>
        <button onClick={()=>{setCartOpen(true);setStep("cart");}}
          style={{background:"none",border:"1.5px solid #e0e0e0",borderRadius:12,padding:"7px 14px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:7,color:"#333",transition:"border-color .15s,box-shadow .15s",fontFamily:"inherit"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#111";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.08)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#e0e0e0";e.currentTarget.style.boxShadow="";}}>
          <CartIcon/>
          {cartCount>0&&<span style={{background:"#111",color:"#fff",borderRadius:99,fontSize:10,padding:"1px 7px",fontWeight:700}}>{cartCount}</span>}
        </button>
      </div>

      {/* Breadcrumbs */}
      <div style={{background:"rgba(255,255,255,0.8)",backdropFilter:"blur(8px)",borderBottom:"1px solid #f0f0f0",padding:"9px 16px",display:"flex",gap:5,fontSize:12,color:"#aaa",flexWrap:"wrap",alignItems:"center"}}>
        <span onClick={()=>{nav.go([]);setSearch("");}} style={{cursor:"pointer",color:nav.stack.length===0?"#111":"#aaa",fontWeight:nav.stack.length===0?600:400}}>Все товары</span>
        {nav.stack.map((id,idx)=>{
          const cat=categories.find(c=>c.id===id);
          return(
            <span key={id} style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{color:"#ddd",display:"flex"}}><ChevRIcon/></span>
              <span onClick={()=>nav.go(nav.stack.slice(0,idx+1))}
                style={{cursor:"pointer",color:idx===nav.stack.length-1?"#111":"#aaa",fontWeight:idx===nav.stack.length-1?600:400,transition:"color .15s"}}>
                {cat?.name}
              </span>
            </span>
          );
        })}
      </div>

      {/* Search */}
      <div style={{background:"rgba(255,255,255,0.8)",backdropFilter:"blur(8px)",borderBottom:"1px solid #f0f0f0",padding:"8px 16px"}}>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#bbb",display:"flex",pointerEvents:"none"}}><SearchIcon/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск товаров..."
            style={{paddingLeft:34,background:"#f5f5f7",border:"1.5px solid #e8e8e8",borderRadius:12,padding:"8px 12px 8px 34px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color .15s",fontFamily:"inherit"}}/>
        </div>
      </div>

      {/* Animated content */}
      <div style={{position:"relative",overflow:"hidden",minHeight:"calc(100vh - 146px)"}}>
        {nav.busy&&nav.out!==null&&<AnimPane role="out" dir={nav.dir} onDone={()=>{}}><ShopContent stack={nav.out}/></AnimPane>}
        {nav.busy&&nav.inn!==null&&<AnimPane role="in" dir={nav.dir} onDone={nav.done}><ShopContent stack={nav.inn}/></AnimPane>}
        {!nav.busy&&<ShopContent stack={nav.stack}/>}
      </div>

      {/* Cart/Checkout modal */}
      {cartOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:100,display:"flex",alignItems:"flex-end",animation:"fadeIn .2s ease"}}
          onClick={e=>e.target===e.currentTarget&&setCartOpen(false)}>
          <div style={{background:"#fff",width:"100%",maxHeight:"88vh",borderRadius:"24px 24px 0 0",display:"flex",flexDirection:"column",boxShadow:"0 -8px 40px rgba(0,0,0,0.13)",animation:"slideUp .3s cubic-bezier(0.4,0,0.2,1)"}}>

            {/* CART */}
            {step==="cart"&&(
              <>
                <div style={{padding:"18px 20px 12px",borderBottom:"1px solid #f0f0f0",flexShrink:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:16,fontWeight:700}}>Корзина</div>
                    <button onClick={()=>setCartOpen(false)} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>✕</button>
                  </div>
                </div>
                {cart.length===0
                  ?<div style={{color:"#bbb",textAlign:"center",padding:"40px 0",fontSize:13,flex:1}}>Корзина пуста</div>
                  :<>
                    <div style={{overflowY:"auto",flex:1,padding:"0 20px"}}>
                      {cart.map(item=>(
                        <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:"1px solid #f5f5f5"}}>
                          <div style={{flex:1,paddingRight:8}}>
                            <div style={{fontSize:13,fontWeight:500}}>{item.name}</div>
                            <div style={{fontSize:11,color:"#aaa"}}>{item.price} ₽/шт</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,border:"1.5px solid #ebebeb",borderRadius:10,padding:"4px 8px",background:"#fafafa"}}>
                              <button onClick={()=>chQty(item.id,-1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#333"}}>−</button>
                              <span style={{fontSize:13,minWidth:18,textAlign:"center",fontWeight:600}}>{item.qty}</span>
                              <button onClick={()=>chQty(item.id,1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#333"}}>+</button>
                            </div>
                            <div style={{fontSize:13,fontWeight:600,minWidth:60,textAlign:"right"}}>{item.qty*item.price} ₽</div>
                            <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",display:"flex"}}><TrashIcon/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"14px 20px 36px",borderTop:"1px solid #f0f0f0",flexShrink:0,background:"#fff"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                        <span style={{fontSize:14,fontWeight:600}}>Итого</span>
                        <span style={{fontSize:17,fontWeight:700}}>{cartTotal} ₽</span>
                      </div>
                      <button onClick={()=>setStep("form")}
                        style={{width:"100%",background:"#111",color:"#fff",border:"none",borderRadius:14,padding:"15px 0",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"background .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#222"}
                        onMouseLeave={e=>e.currentTarget.style.background="#111"}>
                        Оформить заказ
                      </button>
                    </div>
                  </>
                }
              </>
            )}

            {/* FORM */}
            {step==="form"&&(
              <>
                <div style={{padding:"16px 20px 12px",borderBottom:"1px solid #f0f0f0",flexShrink:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <button onClick={()=>setStep("cart")} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:12,padding:0,display:"flex",alignItems:"center",gap:4,marginBottom:4,fontFamily:"inherit"}}>
                        ‹ Назад
                      </button>
                      <div style={{fontSize:16,fontWeight:700}}>Оформление заказа</div>
                    </div>
                    <button onClick={()=>setCartOpen(false)} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>✕</button>
                  </div>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"16px 20px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div>
                      <div style={{fontSize:11,color:"#aaa",marginBottom:5,fontWeight:600,letterSpacing:"0.4px"}}>ИМЯ / КОМПАНИЯ *</div>
                      <input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))}
                        placeholder="ИП Иванов или ООО Ромашка"
                        style={{border:"1.5px solid #e0e0e0",borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",transition:"border-color .15s"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"#aaa",marginBottom:5,fontWeight:600,letterSpacing:"0.4px"}}>TELEGRAM (без @) *</div>
                      <input value={form.tg} onChange={e=>setForm(f=>({...f,tg:e.target.value.replace(/^@/,"")}))}
                        placeholder="durov"
                        style={{border:"1.5px solid #e0e0e0",borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",transition:"border-color .15s"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"#aaa",marginBottom:5,fontWeight:600,letterSpacing:"0.4px"}}>КОММЕНТАРИЙ</div>
                      <textarea value={form.comment} onChange={e=>setForm(f=>({...f,comment:e.target.value}))}
                        placeholder="Дополнительные пожелания..." rows={2}
                        style={{border:"1.5px solid #e0e0e0",borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",resize:"none",lineHeight:1.5,fontFamily:"inherit",transition:"border-color .15s"}}/>
                    </div>
                    <label style={{display:"flex",gap:10,alignItems:"flex-start",cursor:"pointer"}}>
                      <input type="checkbox" checked={form.agreed} onChange={e=>setForm(f=>({...f,agreed:e.target.checked}))}
                        style={{width:16,height:16,accentColor:"#111",flexShrink:0,marginTop:2,cursor:"pointer"}}/>
                      <span style={{fontSize:12,color:"#888",lineHeight:1.4}}>Соглашаюсь с обработкой персональных данных</span>
                    </label>
                    <div style={{background:"#f5f5f7",borderRadius:14,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#aaa",marginBottom:2}}>Сумма заказа</div>
                      <div style={{fontSize:20,fontWeight:700}}>{cartTotal} ₽</div>
                    </div>
                    {formErr&&<div style={{fontSize:12,color:"#dc2626",display:"flex",alignItems:"center",gap:4}}>⚠ {formErr}</div>}
                  </div>
                </div>
                <div style={{padding:"12px 20px 36px",borderTop:"1px solid #f0f0f0",flexShrink:0,background:"#fff"}}>
                  <button onClick={confirmOrder}
                    disabled={submitting||!form.client.trim()||!form.tg.trim()||!form.agreed}
                    style={{width:"100%",background:"#111",color:"#fff",border:"none",borderRadius:14,padding:"15px 0",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:(submitting||!form.client.trim()||!form.tg.trim()||!form.agreed)?0.4:1,transition:"background .15s"}}>
                    {submitting?"Отправляем...":"Подтвердить заказ"}
                  </button>
                </div>
              </>
            )}

            {/* DONE */}
            {step==="done"&&curOrder&&(
              <>
                <div style={{padding:"18px 20px 12px",borderBottom:"1px solid #f0f0f0",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:16,fontWeight:700}}>Заказ принят</div>
                  <button onClick={()=>{setCartOpen(false);setStep("cart");}} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>✕</button>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"20px"}}>
                  <div style={{background:"#f5f5f7",borderRadius:16,padding:20,textAlign:"center",marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:8,color:"#16a34a"}}><CheckIcon/></div>
                    <div style={{fontSize:15,fontWeight:700}}>Заказ №{String(curOrder.id).padStart(5,"0")}</div>
                    <div style={{fontSize:12,color:"#888",marginTop:4}}>Мы свяжемся с вами в ближайшее время</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button onClick={()=>{setReceiptOrd(curOrder);setCartOpen(false);}}
                      style={{width:"100%",background:"#111",color:"#fff",border:"none",borderRadius:13,padding:"13px 0",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontFamily:"inherit"}}>
                      <PrintIcon/> Посмотреть и распечатать чек
                    </button>
                    {curOrder.tg&&(
                      <a href={`https://t.me/${curOrder.tg}?text=${encodeURIComponent(`Заказ №${String(curOrder.id).padStart(5,"0")}\nИТОГО: ${curOrder.total}₽`)}`}
                        target="_blank" rel="noreferrer"
                        style={{width:"100%",background:"#229ED9",color:"#fff",borderRadius:13,padding:"13px 0",fontSize:13,fontWeight:600,cursor:"pointer",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxSizing:"border-box"}}>
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
