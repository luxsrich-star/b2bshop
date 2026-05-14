import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { ReceiptModal } from "@/components/Receipt";

// ── helpers ───────────────────────────────────────────────────────────────────
function getDesc(pid, cats) {
  const ids=[], q=[pid];
  while(q.length){const id=q.shift();ids.push(id);cats.filter(c=>c.parentId===id).forEach(c=>q.push(c.id));}
  return ids;
}

// ── slide nav hook ────────────────────────────────────────────────────────────
function useSlideNav() {
  const [stack, setStack]   = useState([]);
  const [out,   setOut]     = useState(null);
  const [inn,   setInn]     = useState(null);
  const [dir,   setDir]     = useState("fwd");
  const [busy,  setBusy]    = useState(false);
  const go = useCallback((ns) => {
    if (busy) return;
    setDir(ns.length >= stack.length ? "fwd" : "bwd");
    setOut(stack); setInn(ns); setBusy(true);
  }, [busy, stack]);
  const done = useCallback(() => {
    setStack(inn); setOut(null); setInn(null); setBusy(false);
  }, [inn]);
  return { stack, out, inn, dir, busy, go, done };
}

// ── AnimPane ──────────────────────────────────────────────────────────────────
function AnimPane({ role, dir, onDone, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fwd = dir === "fwd";
    const fx = role==="out" ? "0%"   : (fwd ? "100%" : "-100%");
    const tx = role==="out" ? (fwd ? "-100%" : "100%") : "0%";
    const anim = el.animate(
      [{transform:`translateX(${fx})`,opacity:role==="out"?1:0},
       {transform:`translateX(${tx})`,opacity:role==="out"?0:1}],
      {duration:300,easing:"cubic-bezier(0.4,0,0.2,1)",fill:"forwards"}
    );
    if (role==="in") anim.onfinish = onDone;
  }, []);
  return (
    <div ref={ref} style={{position:"absolute",inset:0,overflowY:"auto",background:"#f5f5f7",willChange:"transform"}}>
      {children}
    </div>
  );
}

// ── product card ──────────────────────────────────────────────────────────────
function ProductCard({ p, qty, setQty, onAdd }) {
  const out = p.stock === 0;
  return (
    <div className="card" style={{
      width: 160, flexShrink: 0,
      display:"flex", flexDirection:"column", overflow:"hidden",
      borderRadius:16
    }}>
      <div style={{
        height:130, background:"#f0f0f0",
        display:"flex", alignItems:"center", justifyContent:"center",
        overflow:"hidden", flexShrink:0, color:"#ccc", position:"relative"
      }}>
        {p.img
          ? <img src={p.img} alt={p.name} loading="lazy"
              style={{width:"100%",height:"100%",objectFit:"cover",transition:"opacity .3s"}}
              onLoad={e=>e.target.style.opacity=1}
              onError={e=>e.target.style.display="none"}/>
          : <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
        }
      </div>
      <div style={{padding:"10px 10px 12px",flex:1,display:"flex",flexDirection:"column"}}>
        <div style={{fontSize:12,fontWeight:600,marginBottom:2,lineHeight:1.3,flex:1}}>{p.name}</div>
        <div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{p.price} ₽</div>
        <div style={{fontSize:10,color:out?"#e00":"#bbb",marginBottom:8}}>
          {out ? "Нет в наличии" : `${p.stock} шт`}
        </div>
        {!out && (
          <>
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              border:"1.5px solid #e8e8e8",borderRadius:10,padding:"4px 7px",marginBottom:6,
              background:"#fafafa"
            }}>
              <button onClick={()=>setQty(qty-1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:17,color:"#333",lineHeight:1,padding:"0 2px"}}>−</button>
              <span style={{fontSize:13,minWidth:18,textAlign:"center",fontWeight:600}}>{qty}</span>
              <button onClick={()=>setQty(qty+1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:17,color:"#333",lineHeight:1,padding:"0 2px"}}>+</button>
            </div>
            <button onClick={onAdd} className="btn-primary" style={{width:"100%",justifyContent:"center",padding:"9px 0",fontSize:12,borderRadius:10}}>
              В корзину
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── category chip ─────────────────────────────────────────────────────────────
function CatChip({ cat, onClick }) {
  return (
    <div onClick={onClick} className="card" style={{
      width:140, flexShrink:0, padding:"16px 14px",
      cursor:"pointer", borderRadius:16, display:"flex", flexDirection:"column", gap:6,
      transition:"transform .15s, box-shadow .15s, border-color .15s"
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.1)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="";}}>
      <span style={{fontSize:24}}>📁</span>
      <div style={{fontSize:13,fontWeight:600,lineHeight:1.3}}>{cat.name}</div>
    </div>
  );
}

// ── section with horizontal scroll ───────────────────────────────────────────
function HSection({ title, children }) {
  return (
    <div style={{marginBottom:24}}>
      {title && <div style={{fontSize:15,fontWeight:700,marginBottom:10,padding:"0 20px"}}>{title}</div>}
      <div className="hscroll">{children}</div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [shopData,  setShopData]  = useState(null);
  const [notFound,  setNotFound]  = useState(false);
  const nav = useSlideNav();

  const [search,     setSearch]    = useState("");
  const [quantities, setQtys]      = useState({});
  const [cart,       setCart]      = useState([]);
  const [cartOpen,   setCartOpen]  = useState(false);
  const [step,       setStep]      = useState("cart"); // cart|form|done
  const [form,       setForm]      = useState({client:"",tg:"",comment:"",agreed:false});
  const [formErr,    setFormErr]   = useState("");
  const [submitting, setSubmitting]= useState(false);
  const [curOrder,   setCurOrder]  = useState(null);
  const [receiptOrd, setReceiptOrd]= useState(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/shop/${slug}`).then(r => {
      if (!r.ok) return setNotFound(true);
      r.json().then(setShopData);
    });
  }, [slug]);

  const currentCatId = nav.stack[nav.stack.length-1] ?? null;
  const { settings, categories=[], products=[] } = shopData || {};

  const cartCount = cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal = cart.reduce((s,i)=>s+i.qty*i.price,0);

  function addToCart(p) {
    const qty = quantities[p.id] || 1;
    setCart(c=>{const ex=c.find(i=>i.id===p.id);if(ex)return c.map(i=>i.id===p.id?{...i,qty:i.qty+qty}:i);return[...c,{id:p.id,name:p.name,price:p.price,qty}];});
    setQtys(q=>({...q,[p.id]:1}));
  }
  function chQty(id,d) { setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i)); }

  async function confirmOrder() {
    if (!form.client.trim()||!form.tg.trim()||!form.agreed) return setFormErr("Заполни обязательные поля");
    setFormErr(""); setSubmitting(true);
    const r = await fetch(`/api/shop/order/${slug}`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({client:form.client.trim(),tg:form.tg.trim().replace(/^@/,""),comment:form.comment,items:cart.map(i=>({name:i.name,qty:i.qty,price:i.price})),total:cartTotal})
    });
    setSubmitting(false);
    if (!r.ok) return setFormErr("Ошибка при отправке");
    const ord = await r.json();
    setCurOrder(ord); setCart([]); setStep("done");
    setForm({client:"",tg:"",comment:"",agreed:false});
  }

  // ── shop content ──────────────────────────────────────────────────────────
  function ShopContent({ stack }) {
    const catId = stack[stack.length-1] ?? null;
    const childCats = categories.filter(c=>c.parentId===catId);

    // all products across all categories for "Все товары"
    const allProducts = useMemo(()=> products, []);

    // products visible in current category (recursive)
    const catProducts = useMemo(()=>{
      if (catId===null) return [];
      const ids = getDesc(catId, categories);
      return products.filter(p=>ids.includes(p.categoryId));
    },[catId]);

    const showAllProducts = catId===null; // root = show all products
    const filteredAll = useMemo(()=>
      allProducts.filter(p=>search===""||p.name.toLowerCase().includes(search.toLowerCase())),
    [search]);
    const filteredCat = useMemo(()=>
      catProducts.filter(p=>search===""||p.name.toLowerCase().includes(search.toLowerCase())),
    [search, catProducts]);

    // group products by category name for root "Все товары"
    function groupByCategory(prods) {
      const groups = {};
      prods.forEach(p => {
        const cat = categories.find(c=>c.id===p.categoryId);
        const key = cat?.name || "Без категории";
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      });
      return groups;
    }

    return (
      <div style={{paddingTop:8,paddingBottom:80}}>
        {/* Root: all products grouped */}
        {catId===null && (
          <>
            {/* Category chips */}
            {!search && categories.filter(c=>c.parentId===null).length > 0 && (
              <HSection title="Разделы">
                {categories.filter(c=>c.parentId===null).map(cat=>(
                  <CatChip key={cat.id} cat={cat} onClick={()=>{nav.go([cat.id]);setSearch("");}}/>
                ))}
              </HSection>
            )}
            {/* All products grouped */}
            {Object.entries(groupByCategory(filteredAll)).map(([catName, prods])=>(
              <HSection key={catName} title={search ? `Результаты — ${catName}` : catName}>
                {prods.map(p=>(
                  <ProductCard key={p.id} p={p}
                    qty={quantities[p.id]||1}
                    setQty={v=>setQtys(q=>({...q,[p.id]:Math.max(1,v)}))}
                    onAdd={()=>addToCart(p)}/>
                ))}
              </HSection>
            ))}
            {filteredAll.length===0 && (
              <div style={{color:"#bbb",textAlign:"center",padding:"50px 0",fontSize:13}}>Ничего не найдено</div>
            )}
          </>
        )}

        {/* Category view */}
        {catId !== null && (
          <>
            {/* Subcategories */}
            {childCats.length > 0 && !search && (
              <HSection title="Подразделы">
                {childCats.map(cat=>(
                  <CatChip key={cat.id} cat={cat} onClick={()=>{nav.go([...stack,cat.id]);setSearch("");}}/>
                ))}
              </HSection>
            )}
            {/* Products in category */}
            {(filteredCat.length > 0 || search) && (
              <HSection title={search ? "Результаты поиска" : "Товары"}>
                {filteredCat.length===0
                  ? <div style={{color:"#bbb",fontSize:13,padding:"20px 0"}}>Ничего не найдено</div>
                  : filteredCat.map(p=>(
                    <ProductCard key={p.id} p={p}
                      qty={quantities[p.id]||1}
                      setQty={v=>setQtys(q=>({...q,[p.id]:Math.max(1,v)}))}
                      onAdd={()=>addToCart(p)}/>
                  ))
                }
              </HSection>
            )}
          </>
        )}
      </div>
    );
  }

  if (notFound) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{fontSize:40}}>🔒</div>
      <div style={{fontSize:15,fontWeight:600}}>Магазин не найден</div>
      <div style={{fontSize:13,color:"#aaa"}}>Проверьте ссылку</div>
    </div>
  );

  if (!shopData) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#bbb",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
      Загрузка...
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f5f5f7",fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
      <Head><title>{settings.name}</title></Head>

      {/* Header */}
      <div style={{
        borderBottom:"1px solid #ebebeb",padding:"0 16px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        height:56,position:"sticky",top:0,background:"rgba(255,255,255,0.92)",
        backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",
        zIndex:20,boxShadow:"0 2px 12px rgba(0,0,0,0.05)"
      }}>
        <div onClick={()=>{nav.go([]);setSearch("");}} style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
          <div style={{width:34,height:34,borderRadius:10,overflow:"hidden",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
            {settings.logoImg ? <img src={settings.logoImg} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : settings.logoText}
          </div>
          <span style={{fontSize:13,fontWeight:700}}>{settings.name}</span>
        </div>
        <button onClick={()=>{setCartOpen(true);setStep("cart");}}
          style={{background:"none",border:"1.5px solid #e0e0e0",borderRadius:12,padding:"7px 14px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:7,color:"#333",transition:"border-color .15s,box-shadow .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#111";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.08)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#e0e0e0";e.currentTarget.style.boxShadow="";}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          {cartCount>0 && <span style={{background:"#111",color:"#fff",borderRadius:99,fontSize:10,padding:"1px 7px",fontWeight:700}}>{cartCount}</span>}
        </button>
      </div>

      {/* Breadcrumbs */}
      <div style={{background:"rgba(255,255,255,0.8)",backdropFilter:"blur(8px)",borderBottom:"1px solid #f0f0f0",padding:"9px 16px",display:"flex",gap:5,fontSize:12,color:"#aaa",flexWrap:"wrap",alignItems:"center"}}>
        <span onClick={()=>{nav.go([]);setSearch("");}} style={{cursor:"pointer",color:nav.stack.length===0?"#111":"#aaa",fontWeight:nav.stack.length===0?600:400}}>Все товары</span>
        {nav.stack.map((id,idx)=>{
          const cat=categories.find(c=>c.id===id);
          return (
            <span key={id} style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{color:"#ddd",fontSize:10}}>›</span>
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
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#bbb",display:"flex",pointerEvents:"none"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск товаров..."
            style={{paddingLeft:34,background:"#f5f5f7",border:"1.5px solid #e8e8e8",borderRadius:12,padding:"8px 12px 8px 34px",fontSize:13}}/>
        </div>
      </div>

      {/* Animated content */}
      <div style={{position:"relative",overflow:"hidden",minHeight:"calc(100vh - 146px)"}}>
        {nav.busy && nav.out!==null && <AnimPane role="out" dir={nav.dir} onDone={()=>{}}><ShopContent stack={nav.out}/></AnimPane>}
        {nav.busy && nav.inn!==null && <AnimPane role="in"  dir={nav.dir} onDone={nav.done}><ShopContent stack={nav.inn}/></AnimPane>}
        {!nav.busy && <ShopContent stack={nav.stack}/>}
      </div>

      {/* Cart modal */}
      {cartOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:100,display:"flex",alignItems:"flex-end"}}
          onClick={e=>e.target===e.currentTarget&&setCartOpen(false)}>
          <div className="bottom-sheet">

            {/* CART */}
            {step==="cart" && (
              <>
                <div style={{padding:"18px 20px 12px",borderBottom:"1px solid #f0f0f0",flexShrink:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:16,fontWeight:700}}>Корзина</div>
                    <button onClick={()=>setCartOpen(false)} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:20,lineHeight:1}}>✕</button>
                  </div>
                </div>
                {cart.length===0
                  ? <div style={{color:"#bbb",textAlign:"center",padding:"36px 0",fontSize:13,flex:1}}>Корзина пуста</div>
                  : <>
                    <div style={{overflowY:"auto",flex:1,padding:"0 20px"}}>
                      {cart.map(item=>(
                        <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:"1px solid #f5f5f5"}}>
                          <div style={{flex:1,paddingRight:8}}>
                            <div style={{fontSize:13,fontWeight:500}}>{item.name}</div>
                            <div style={{fontSize:11,color:"#aaa"}}>{item.price} ₽/шт</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,border:"1.5px solid #e8e8e8",borderRadius:10,padding:"4px 8px",background:"#fafafa"}}>
                              <button onClick={()=>chQty(item.id,-1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#333"}}>−</button>
                              <span style={{fontSize:13,minWidth:18,textAlign:"center",fontWeight:600}}>{item.qty}</span>
                              <button onClick={()=>chQty(item.id,1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#333"}}>+</button>
                            </div>
                            <div style={{fontSize:13,fontWeight:600,minWidth:60,textAlign:"right"}}>{item.qty*item.price} ₽</div>
                            <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",fontSize:14,display:"flex"}}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"14px 20px 36px",borderTop:"1px solid #f0f0f0",flexShrink:0,background:"#fff"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                        <span style={{fontSize:14,fontWeight:600}}>Итого</span>
                        <span style={{fontSize:17,fontWeight:700}}>{cartTotal} ₽</span>
                      </div>
                      <button onClick={()=>setStep("form")} className="btn-primary" style={{width:"100%",justifyContent:"center",padding:"15px 0",fontSize:15,borderRadius:14}}>
                        Оформить заказ
                      </button>
                    </div>
                  </>
                }
              </>
            )}

            {/* FORM */}
            {step==="form" && (
              <>
                <div style={{padding:"16px 20px 12px",borderBottom:"1px solid #f0f0f0",flexShrink:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <button onClick={()=>setStep("cart")} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:12,padding:0,display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
                        ‹ Назад
                      </button>
                      <div style={{fontSize:16,fontWeight:700}}>Оформление заказа</div>
                    </div>
                    <button onClick={()=>setCartOpen(false)} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:20,lineHeight:1}}>✕</button>
                  </div>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"16px 20px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div>
                      <div style={{fontSize:11,color:"#aaa",marginBottom:5,fontWeight:600,letterSpacing:"0.4px"}}>ИМЯ / КОМПАНИЯ *</div>
                      <input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} placeholder="ИП Иванов или ООО Ромашка"/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"#aaa",marginBottom:5,fontWeight:600,letterSpacing:"0.4px"}}>TELEGRAM (без @) *</div>
                      <input value={form.tg} onChange={e=>setForm(f=>({...f,tg:e.target.value.replace(/^@/,"")}))} placeholder="durov"/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"#aaa",marginBottom:5,fontWeight:600,letterSpacing:"0.4px"}}>КОММЕНТАРИЙ</div>
                      <textarea value={form.comment} onChange={e=>setForm(f=>({...f,comment:e.target.value}))} placeholder="Дополнительные пожелания..." rows={2} style={{resize:"none",lineHeight:1.5}}/>
                    </div>
                    <label style={{display:"flex",gap:10,alignItems:"flex-start",cursor:"pointer"}}>
                      <input type="checkbox" checked={form.agreed} onChange={e=>setForm(f=>({...f,agreed:e.target.checked}))} style={{width:16,height:16,accentColor:"#111",flexShrink:0,marginTop:2,borderRadius:4}}/>
                      <span style={{fontSize:12,color:"#888",lineHeight:1.4}}>Соглашаюсь с обработкой персональных данных</span>
                    </label>
                    <div style={{background:"#f5f5f7",borderRadius:14,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#aaa",marginBottom:2}}>Сумма заказа</div>
                      <div style={{fontSize:20,fontWeight:700}}>{cartTotal} ₽</div>
                    </div>
                    {formErr && <div style={{fontSize:12,color:"#e00"}}>{formErr}</div>}
                  </div>
                </div>
                <div style={{padding:"12px 20px 36px",borderTop:"1px solid #f0f0f0",flexShrink:0,background:"#fff"}}>
                  <button onClick={confirmOrder} disabled={submitting||!form.client.trim()||!form.tg.trim()||!form.agreed}
                    className="btn-primary" style={{width:"100%",justifyContent:"center",padding:"15px 0",fontSize:15,borderRadius:14,opacity:(submitting||!form.client.trim()||!form.tg.trim()||!form.agreed)?0.4:1}}>
                    {submitting ? "Отправляем..." : "Подтвердить заказ"}
                  </button>
                </div>
              </>
            )}

            {/* DONE */}
            {step==="done" && curOrder && (
              <>
                <div style={{padding:"18px 20px 12px",borderBottom:"1px solid #f0f0f0",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:16,fontWeight:700}}>Заказ принят</div>
                  <button onClick={()=>{setCartOpen(false);setStep("cart");}} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:20}}>✕</button>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"20px"}}>
                  <div style={{background:"#f5f5f7",borderRadius:16,padding:20,textAlign:"center",marginBottom:16}}>
                    <div style={{fontSize:28,marginBottom:8}}>✓</div>
                    <div style={{fontSize:15,fontWeight:700}}>Заказ №{String(curOrder.id).padStart(5,"0")}</div>
                    <div style={{fontSize:12,color:"#888",marginTop:4}}>Мы свяжемся с вами в ближайшее время</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button onClick={()=>{setReceiptOrd(curOrder);setCartOpen(false);}}
                      className="btn-primary" style={{width:"100%",justifyContent:"center",padding:"13px 0",fontSize:13,borderRadius:13}}>
                      🖨 Посмотреть и распечатать чек
                    </button>
                    {curOrder.tg && (
                      <a href={`https://t.me/${curOrder.tg}?text=${encodeURIComponent(`Заказ №${String(curOrder.id).padStart(5,"0")}\nИТОГО: ${curOrder.total}₽`)}`}
                        target="_blank" rel="noreferrer"
                        style={{width:"100%",background:"#229ED9",color:"#fff",borderRadius:13,padding:"13px 0",fontSize:13,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxSizing:"border-box"}}>
                        ✈️ Поделиться в Telegram
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {receiptOrd && <ReceiptModal order={receiptOrd} shopName={settings.name} onClose={()=>setReceiptOrd(null)}/>}
    </div>
  );
}
