import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { IC } from "@/components/Icons";
import { ReceiptModal, printReceipt } from "@/components/Receipt";

// ── helpers ──────────────────────────────────────────────────────────────────
function getDescendants(parentId, cats) {
  const ids=[]; const q=[parentId];
  while(q.length){const id=q.shift();ids.push(id);cats.filter(c=>c.parentId===id).forEach(c=>q.push(c.id));}
  return ids;
}

// ── slide nav hook ───────────────────────────────────────────────────────────
function useSlideNav() {
  const [stack, setStack]       = useState([]);
  const [outStack, setOutStack] = useState(null);
  const [inStack, setInStack]   = useState(null);
  const [dir, setDir]           = useState("fwd");
  const [busy, setBusy]         = useState(false);

  const go = useCallback((newStack) => {
    if (busy) return;
    setDir(newStack.length >= stack.length ? "fwd" : "bwd");
    setOutStack(stack);
    setInStack(newStack);
    setBusy(true);
  }, [busy, stack]);

  const done = useCallback(() => {
    setStack(inStack);
    setOutStack(null); setInStack(null); setBusy(false);
  }, [inStack]);

  return { stack, outStack, inStack, dir, busy, go, done };
}

// ── AnimPane ─────────────────────────────────────────────────────────────────
function AnimPane({ role, dir, children, onDone }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fwd = dir === "fwd";
    const fromX = role==="out" ? "0%" : (fwd ? "100%" : "-100%");
    const toX   = role==="out" ? (fwd ? "-100%" : "100%") : "0%";
    const anim = el.animate(
      [{ transform:`translateX(${fromX})`,opacity: role==="out"?1:0 },
       { transform:`translateX(${toX})`,  opacity: role==="out"?0:1 }],
      { duration:320, easing:"cubic-bezier(0.4,0,0.2,1)", fill:"forwards" }
    );
    if (role==="in") anim.onfinish = onDone;
  }, []);
  return <div ref={ref} style={{ position:"absolute",inset:0,overflowY:"auto",willChange:"transform" }}>{children}</div>;
}

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({ p, qty, setQty, onAdd }) {
  const out = p.stock === 0;
  return (
    <div className="card-hover" style={{ border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column",background:"#fff" }}>
      <div style={{ background:"#f0f0f0",height:130,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,color:"#ccc",position:"relative" }}>
        {p.img
          ? <img src={p.img} alt={p.name} loading="lazy"
              style={{ width:"100%",height:"100%",objectFit:"cover",transition:"opacity 0.3s" }}
              onLoad={e=>e.target.style.opacity=1}
              onError={e=>{ e.target.style.display="none"; }}
            />
          : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
      </div>
      <div style={{ padding:"10px 10px 12px",flex:1,display:"flex",flexDirection:"column" }}>
        <div style={{ fontSize:12,fontWeight:600,marginBottom:2,lineHeight:1.3 }}>{p.name}</div>
        <div style={{ fontSize:13,fontWeight:700,marginBottom:3 }}>{p.price} ₽</div>
        <div style={{ fontSize:10,color:out?"#e00":"#bbb",marginBottom:8 }}>{out?"Нет в наличии":`${p.stock} шт`}</div>
        {!out && (
          <>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",border:"1px solid #e5e5e5",borderRadius:8,padding:"5px 8px",marginBottom:6 }}>
              <button onClick={()=>setQty(qty-1)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:17,color:"#333",padding:"0 2px",lineHeight:1 }}>−</button>
              <span style={{ fontSize:13,minWidth:20,textAlign:"center" }}>{qty}</span>
              <button onClick={()=>setQty(qty+1)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:17,color:"#333",padding:"0 2px",lineHeight:1 }}>+</button>
            </div>
            <button onClick={onAdd} style={{ width:"100%",background:"#000",color:"#fff",border:"none",borderRadius:8,padding:"9px 0",fontSize:12,fontWeight:600,cursor:"pointer" }}>
              В корзину
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [shopData, setShopData]   = useState(null);
  const [notFound, setNotFound]   = useState(false);
  const nav = useSlideNav();

  const [search, setSearch]       = useState("");
  const [quantities, setQuantities] = useState({});
  const [cart, setCart]           = useState([]);
  const [cartOpen, setCartOpen]   = useState(false);
  const [checkoutStep, setCheckoutStep] = useState("cart"); // cart|form|done
  const [form, setForm]           = useState({ client:"", tg:"", comment:"", agreed:false });
  const [formErr, setFormErr]     = useState("");
  const [currentOrder, setCurrentOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/shop/${slug}`).then(r => {
      if (!r.ok) return setNotFound(true);
      return r.json().then(setShopData);
    });
  }, [slug]);

  const currentCatId = nav.stack[nav.stack.length-1] ?? null;
  const { settings, categories=[], products=[] } = shopData || {};

  const cartCount = cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal = cart.reduce((s,i)=>s+i.qty*i.price,0);

  const addToCart = (p) => {
    const qty = quantities[p.id] || 1;
    setCart(c => { const ex=c.find(i=>i.id===p.id); if(ex) return c.map(i=>i.id===p.id?{...i,qty:i.qty+qty}:i); return [...c,{id:p.id,name:p.name,price:p.price,qty}]; });
    setQuantities(q=>({...q,[p.id]:1}));
  };
  const chQty = (id,d) => setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i));

  async function confirmOrder() {
    if (!form.client.trim() || !form.tg.trim() || !form.agreed) return setFormErr("Заполни обязательные поля");
    setFormErr(""); setSubmitting(true);
    const r = await fetch(`/api/shop/order/${slug}`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ client:form.client.trim(), tg:form.tg.trim().replace(/^@/,""), comment:form.comment, items:cart.map(i=>({name:i.name,qty:i.qty,price:i.price})), total:cartTotal })
    });
    setSubmitting(false);
    if (!r.ok) return setFormErr("Ошибка при отправке");
    const ord = await r.json();
    setCurrentOrder(ord);
    setCart([]); setCheckoutStep("done");
    setForm({ client:"",tg:"",comment:"",agreed:false });
  }

  // ── shop content pane ──────────────────────────────────────────────────────
  function ShopContent({ stack }) {
    const catId = stack[stack.length-1] ?? null;
    const childCats = categories.filter(c=>c.parentId===catId);
    const prods = useMemo(() => {
      if (catId===null) return [];
      const ids = getDescendants(catId, categories);
      return products.filter(p=>ids.includes(p.categoryId)&&(search===""||p.name.toLowerCase().includes(search.toLowerCase())));
    }, [catId, search]);

    if (catId === null) return (
      <div style={{ padding:"16px 20px 80px" }}>
        <div style={{ fontSize:22,fontWeight:700,marginBottom:4,letterSpacing:"-0.5px" }}>Каталог</div>
        <div style={{ fontSize:13,color:"#aaa",marginBottom:16 }}>Выберите раздел</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          {categories.filter(c=>c.parentId===null).map(cat=>(
            <div key={cat.id} onClick={()=>nav.go([cat.id])}
              className="card-hover"
              style={{ border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 16px",cursor:"pointer",background:"#fff" }}>
              <div style={{ color:"#888",marginBottom:8 }}>{IC.folder}</div>
              <div style={{ fontSize:13,fontWeight:700 }}>{cat.name}</div>
              <div style={{ fontSize:11,color:"#bbb",marginTop:3 }}>{categories.filter(c=>c.parentId===cat.id).length} подкатегорий</div>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div style={{ padding:"16px 20px 80px" }}>
        <div style={{ fontSize:17,fontWeight:700,marginBottom:12 }}>{categories.find(c=>c.id===catId)?.name}</div>
        {childCats.length>0&&!search&&(
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
            {childCats.map(cat=>(
              <div key={cat.id} onClick={()=>nav.go([...stack,cat.id])}
                className="card-hover"
                style={{ border:"1px solid #e5e5e5",borderRadius:12,padding:"18px 14px",cursor:"pointer",background:"#fff" }}>
                <div style={{ color:"#888",marginBottom:6 }}>{IC.folder}</div>
                <div style={{ fontSize:13,fontWeight:600 }}>{cat.name}</div>
              </div>
            ))}
          </div>
        )}
        {(childCats.length===0||search)&&(
          prods.length===0
            ? <div style={{ color:"#bbb",textAlign:"center",marginTop:50,fontSize:13 }}>Ничего не найдено</div>
            : <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              {prods.map(p=>(
                <ProductCard key={p.id} p={p}
                  qty={quantities[p.id]||1}
                  setQty={v=>setQuantities(q=>({...q,[p.id]:Math.max(1,v)}))}
                  onAdd={()=>addToCart(p)}/>
              ))}
            </div>
        )}
      </div>
    );
  }

  if (notFound) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8 }}>
      <div style={{ fontSize:32 }}>🔒</div>
      <div style={{ fontSize:16,fontWeight:600 }}>Магазин не найден</div>
      <div style={{ fontSize:13,color:"#aaa" }}>Проверьте ссылку</div>
    </div>
  );

  if (!shopData) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#bbb",fontSize:13 }}>
      Загрузка...
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#f7f7f7" }}>
      <Head><title>{settings.name}</title></Head>

      {/* Header */}
      <div style={{ borderBottom:"1px solid #e5e5e5",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,background:"#fff",zIndex:20 }}>
        <div onClick={()=>{ nav.go([]); setSearch(""); }} style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer" }}>
          <div style={{ width:34,height:34,borderRadius:8,overflow:"hidden",background:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0 }}>
            {settings.logoImg ? <img src={settings.logoImg} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : settings.logoText}
          </div>
          <span style={{ fontSize:13,fontWeight:700 }}>{settings.name}</span>
        </div>
        <button onClick={()=>{ setCartOpen(true); setCheckoutStep("cart"); }}
          style={{ background:"none",border:"1px solid #e5e5e5",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:7,color:"#333" }}>
          {IC.cart}
          {cartCount>0&&<span style={{ background:"#000",color:"#fff",borderRadius:99,fontSize:10,padding:"1px 7px",fontWeight:700 }}>{cartCount}</span>}
        </button>
      </div>

      {/* Breadcrumbs */}
      <div style={{ background:"#fff",borderBottom:"1px solid #f0f0f0",padding:"9px 20px",display:"flex",gap:4,fontSize:12,color:"#aaa",flexWrap:"wrap",alignItems:"center" }}>
        <span onClick={()=>{ nav.go([]); setSearch(""); }} style={{ cursor:"pointer",color:nav.stack.length===0?"#000":"#aaa" }}>Главная</span>
        {nav.stack.map((id,idx)=>{
          const cat=categories.find(c=>c.id===id);
          return (
            <span key={id} style={{ display:"flex",gap:4,alignItems:"center" }}>
              <span style={{ color:"#ddd",display:"flex" }}>{IC.chevR}</span>
              <span onClick={()=>nav.go(nav.stack.slice(0,idx+1))}
                style={{ cursor:"pointer",color:idx===nav.stack.length-1?"#000":"#aaa",fontWeight:idx===nav.stack.length-1?600:400 }}>
                {cat?.name}
              </span>
            </span>
          );
        })}
      </div>

      {/* Search */}
      {currentCatId && (
        <div style={{ background:"#fff",borderBottom:"1px solid #f0f0f0",padding:"8px 20px" }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#bbb",pointerEvents:"none",display:"flex" }}>{IC.search}</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск товаров..."
              style={{ border:"1px solid #e5e5e5",borderRadius:8,padding:"8px 12px 8px 34px",fontSize:13,outline:"none",width:"100%",background:"#f7f7f7" }}/>
          </div>
        </div>
      )}

      {/* Animated content */}
      <div style={{ position:"relative",overflow:"hidden",minHeight:"calc(100vh - 130px)",background:"#f7f7f7" }}>
        {nav.busy && nav.outStack!==null && (
          <AnimPane role="out" dir={nav.dir} onDone={()=>{}}>
            <ShopContent stack={nav.outStack}/>
          </AnimPane>
        )}
        {nav.busy && nav.inStack!==null && (
          <AnimPane role="in" dir={nav.dir} onDone={nav.done}>
            <ShopContent stack={nav.inStack}/>
          </AnimPane>
        )}
        {!nav.busy && <ShopContent stack={nav.stack}/>}
      </div>

      {/* Cart/checkout modal */}
      {cartOpen && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.42)",zIndex:100,display:"flex",alignItems:"flex-end" }}
          onClick={e=>e.target===e.currentTarget&&setCartOpen(false)}>
          <div style={{ background:"#fff",width:"100%",maxHeight:"85vh",borderRadius:"20px 20px 0 0",display:"flex",flexDirection:"column",boxShadow:"0 -8px 40px rgba(0,0,0,0.12)",animation:"slideUp .28s cubic-bezier(0.4,0,0.2,1) both" }}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

            {/* CART */}
            {checkoutStep==="cart" && (
              <>
                <div style={{ padding:"18px 20px 12px",borderBottom:"1px solid #f0f0f0",flexShrink:0 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div style={{ fontSize:16,fontWeight:700 }}>Корзина</div>
                    <button onClick={()=>setCartOpen(false)} style={{ background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:18 }}>✕</button>
                  </div>
                </div>
                {cart.length===0
                  ? <div style={{ color:"#bbb",textAlign:"center",padding:"30px 0",fontSize:13,flex:1 }}>Корзина пуста</div>
                  : <>
                    <div style={{ overflowY:"auto",flex:1,padding:"0 20px" }}>
                      {cart.map(item=>(
                        <div key={item.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f0f0f0" }}>
                          <div style={{ flex:1,paddingRight:8 }}>
                            <div style={{ fontSize:13,fontWeight:500 }}>{item.name}</div>
                            <div style={{ fontSize:11,color:"#aaa" }}>{item.price} ₽/шт</div>
                          </div>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:6,border:"1px solid #e5e5e5",borderRadius:8,padding:"4px 8px" }}>
                              <button onClick={()=>chQty(item.id,-1)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#333" }}>−</button>
                              <span style={{ fontSize:13,minWidth:18,textAlign:"center" }}>{item.qty}</span>
                              <button onClick={()=>chQty(item.id,1)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#333" }}>+</button>
                            </div>
                            <div style={{ fontSize:13,fontWeight:600,minWidth:60,textAlign:"right" }}>{item.qty*item.price} ₽</div>
                            <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} style={{ background:"none",border:"none",color:"#ccc",cursor:"pointer",display:"flex" }}>{IC.trash}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:"14px 20px 32px",borderTop:"1px solid #f0f0f0",flexShrink:0,background:"#fff" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                        <span style={{ fontSize:14,fontWeight:600 }}>Итого</span>
                        <span style={{ fontSize:16,fontWeight:700 }}>{cartTotal} ₽</span>
                      </div>
                      <button onClick={()=>setCheckoutStep("form")}
                        style={{ width:"100%",background:"#000",color:"#fff",border:"none",borderRadius:12,padding:16,fontSize:15,fontWeight:700,cursor:"pointer" }}>
                        Оформить заказ
                      </button>
                    </div>
                  </>
                }
              </>
            )}

            {/* FORM */}
            {checkoutStep==="form" && (
              <>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                  <div>
                    <button onClick={()=>setCheckoutStep("cart")} style={{ background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:12,padding:0,display:"flex",alignItems:"center",gap:4 }}>
                      {IC.chevL} Назад
                    </button>
                    <div style={{ fontSize:16,fontWeight:700,marginTop:4 }}>Оформление заказа</div>
                  </div>
                  <button onClick={()=>setCartOpen(false)} style={{ background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:18 }}>✕</button>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  <div>
                    <div style={{ fontSize:11,color:"#aaa",marginBottom:4,fontWeight:600,letterSpacing:"0.4px" }}>ИМЯ / КОМПАНИЯ *</div>
                    <input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))}
                      placeholder="ИП Иванов или ООО Ромашка"
                      style={{ border:"1px solid #e5e5e5",borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none",width:"100%" }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11,color:"#aaa",marginBottom:4,fontWeight:600,letterSpacing:"0.4px" }}>TELEGRAM USERNAME * (без @)</div>
                    <input value={form.tg} onChange={e=>setForm(f=>({...f,tg:e.target.value.replace(/^@/,"")}))}
                      placeholder="durov"
                      style={{ border:"1px solid #e5e5e5",borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none",width:"100%" }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11,color:"#aaa",marginBottom:4,fontWeight:600,letterSpacing:"0.4px" }}>КОММЕНТАРИЙ</div>
                    <textarea value={form.comment} onChange={e=>setForm(f=>({...f,comment:e.target.value}))}
                      placeholder="Дополнительные пожелания..." rows={2}
                      style={{ border:"1px solid #e5e5e5",borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none",width:"100%",resize:"none",lineHeight:1.5 }}/>
                  </div>
                  <label style={{ display:"flex",gap:10,alignItems:"flex-start",cursor:"pointer" }}>
                    <input type="checkbox" checked={form.agreed} onChange={e=>setForm(f=>({...f,agreed:e.target.checked}))}
                      style={{ marginTop:2,width:16,height:16,accentColor:"#000",flexShrink:0 }}/>
                    <span style={{ fontSize:12,color:"#888",lineHeight:1.4 }}>Соглашаюсь с обработкой персональных данных</span>
                  </label>
                  <div style={{ background:"#f7f7f7",borderRadius:8,padding:"10px 14px" }}>
                    <div style={{ fontSize:11,color:"#aaa",marginBottom:2 }}>Сумма заказа</div>
                    <div style={{ fontSize:18,fontWeight:700 }}>{cartTotal} ₽</div>
                  </div>
                  {formErr && <div style={{ fontSize:12,color:"#e00" }}>{formErr}</div>}
                  <button onClick={confirmOrder} disabled={submitting}
                    style={{ width:"100%",background:"#000",color:"#fff",border:"none",borderRadius:10,padding:14,fontSize:14,fontWeight:600,cursor:"pointer",opacity:submitting?0.5:1 }}>
                    {submitting ? "Отправляем..." : "Подтвердить заказ"}
                  </button>
                </div>
              </>
            )}

            {/* DONE */}
            {checkoutStep==="done" && currentOrder && (
              <>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                  <div style={{ fontSize:16,fontWeight:700 }}>Заказ принят</div>
                  <button onClick={()=>{ setCartOpen(false); setCheckoutStep("cart"); }} style={{ background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:18 }}>✕</button>
                </div>
                <div style={{ background:"#f7f7f7",borderRadius:10,padding:16,textAlign:"center",marginBottom:14 }}>
                  <div style={{ fontSize:24,marginBottom:8,display:"flex",justifyContent:"center",color:"#000" }}>{IC.check}</div>
                  <div style={{ fontSize:15,fontWeight:700 }}>Заказ №{String(currentOrder.id).padStart(5,"0")}</div>
                  <div style={{ fontSize:12,color:"#888",marginTop:4 }}>Мы свяжемся с вами в ближайшее время</div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <button onClick={()=>{ setReceiptOrder(currentOrder); setCartOpen(false); }}
                    style={{ width:"100%",background:"#000",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
                    {IC.print} Посмотреть и распечатать чек
                  </button>
                  {currentOrder.tg && (
                    <a href={`https://t.me/${currentOrder.tg}?text=${encodeURIComponent(`Заказ №${String(currentOrder.id).padStart(5,"0")} от ${currentOrder.date}\n${currentOrder.items.map(i=>`${i.name} × ${i.qty} = ${i.qty*i.price}₽`).join("\n")}\nИТОГО: ${currentOrder.total}₽`)}`}
                      target="_blank" rel="noreferrer"
                      style={{ width:"100%",background:"#229ED9",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:13,fontWeight:600,cursor:"pointer",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxSizing:"border-box" }}>
                      {IC.send} Поделиться в Telegram
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {receiptOrder && <ReceiptModal order={receiptOrder} shopName={settings.name} onClose={()=>setReceiptOrder(null)}/>}
    </div>
  );
}
