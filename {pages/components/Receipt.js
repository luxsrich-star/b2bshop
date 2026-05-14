import { rubles } from "@/lib/numWords";
import { IC } from "./Icons";

export function printReceipt(order, shopName) {
  const rows = order.items.map((item, i) => `
    <tr>
      <td>${i + 1}</td><td>${item.name}</td>
      <td>${Number(item.price).toFixed(2)}</td>
      <td>${item.qty}</td><td>шт</td>
      <td>${(item.qty * item.price).toFixed(2)}</td>
    </tr>`).join("");
  const totalQty = order.items.reduce((s, i) => s + i.qty, 0);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>order-${String(order.id).padStart(5,"0")}.pdf</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Times New Roman',serif;font-size:11pt;color:#000;padding:30px 40px}
    .shop{font-weight:bold;text-decoration:underline;margin-bottom:2px}
    .phone{margin-bottom:28px}
    .title{text-align:center;font-weight:bold;font-size:13pt;margin-bottom:28px}
    .client{margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:10.5pt}
    th{border:1px solid #000;padding:5px 7px;text-align:center;font-weight:bold;background:#f0f0f0}
    td{border:1px solid #000;padding:4px 7px;vertical-align:middle;text-align:center}
    td:nth-child(2){text-align:left}
    tr:nth-child(even) td{background:#fafafa}
    .tot td{font-weight:bold;background:#f0f0f0!important}
    .words{margin-top:16px}
    @media print{body{padding:20px 30px}}
  </style></head><body>
  <div class="shop">${shopName}</div>
  <div class="phone">, тел.</div>
  <div class="title">ЗАКАЗ № ${String(order.id).padStart(5,"0")} от ${order.date.split(" ")[0]}</div>
  <div class="client">Заказчик <b>${order.client}</b>${order.tg ? `&nbsp;&nbsp;@${order.tg}` : ""}</div>
  <table>
    <thead><tr><th width="30">№</th><th>Наименование товара</th><th width="70">Цена</th><th width="58">Кол-во</th><th width="58">Ед. изм.</th><th width="72">Сумма</th></tr></thead>
    <tbody>${rows}
      <tr class="tot"><td colspan="3"></td><td>Итого:</td><td>${totalQty}</td><td>${Number(order.total).toFixed(2)}</td></tr>
    </tbody>
  </table>
  <div class="words">Итого к оплате: ${rubles(order.total)}</div>
  </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html); w.document.close();
  setTimeout(() => w.print(), 500);
}

export function ReceiptModal({ order, shopName, onClose }) {
  if (!order) return null;
  const totalQty = order.items.reduce((s, i) => s + i.qty, 0);
  const S = { fontFamily: "'DM Sans',sans-serif" };
  return (
    <div className="fade-in" style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:12,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)", fontFamily:"'Times New Roman',serif" }}>
        <div style={{ padding:"24px 24px 0" }}>
          <div style={{ fontWeight:"bold",fontSize:13,textDecoration:"underline" }}>{shopName}</div>
          <div style={{ fontSize:12,marginBottom:22,color:"#555" }}>, тел.</div>
          <div style={{ textAlign:"center",fontWeight:"bold",fontSize:15,marginBottom:22 }}>
            ЗАКАЗ № {String(order.id).padStart(5,"0")} от {order.date.split(" ")[0]}
          </div>
          <div style={{ fontSize:13,marginBottom:14 }}>
            Заказчик <b>{order.client}</b>
            {order.tg && <span style={{ marginLeft:8,color:"#555" }}>@{order.tg}</span>}
            {order.comment && <div style={{ color:"#777",marginTop:4,fontStyle:"italic" }}>"{order.comment}"</div>}
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11 }}>
              <thead>
                <tr style={{ background:"#f5f5f5" }}>
                  {["№","Наименование","Цена","Кол-во","Ед.","Сумма"].map(h=>(
                    <th key={h} style={{ border:"1px solid #ccc",padding:"5px 6px",textAlign:"center",fontWeight:"bold" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.items.map((item,i)=>(
                  <tr key={i} style={{ background:i%2===1?"#fafafa":"#fff" }}>
                    <td style={{ border:"1px solid #ddd",padding:"4px 6px",textAlign:"center",color:"#888" }}>{i+1}</td>
                    <td style={{ border:"1px solid #ddd",padding:"4px 6px" }}>{item.name}</td>
                    <td style={{ border:"1px solid #ddd",padding:"4px 6px",textAlign:"center" }}>{Number(item.price).toFixed(2)}</td>
                    <td style={{ border:"1px solid #ddd",padding:"4px 6px",textAlign:"center" }}>{item.qty}</td>
                    <td style={{ border:"1px solid #ddd",padding:"4px 6px",textAlign:"center",color:"#888" }}>шт</td>
                    <td style={{ border:"1px solid #ddd",padding:"4px 6px",textAlign:"center",fontWeight:600 }}>{(item.qty*item.price).toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ background:"#f0f0f0" }}>
                  <td colSpan={3} style={{ border:"1px solid #ccc",padding:"5px 6px" }}></td>
                  <td style={{ border:"1px solid #ccc",padding:"5px 6px",textAlign:"center",fontWeight:"bold" }}>Итого:</td>
                  <td style={{ border:"1px solid #ccc",padding:"5px 6px",textAlign:"center",fontWeight:"bold" }}>{totalQty}</td>
                  <td style={{ border:"1px solid #ccc",padding:"5px 6px",textAlign:"center",fontWeight:"bold" }}>{Number(order.total).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ fontSize:12,marginTop:12,marginBottom:4,fontStyle:"italic" }}>Итого к оплате: {rubles(order.total)}</div>
        </div>
        <div style={{ display:"flex",gap:8,padding:16,borderTop:"1px solid #eee",flexWrap:"wrap",...S }}>
          <button onClick={()=>printReceipt(order,shopName)}
            style={{ flex:1,background:"#000",color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,minWidth:120 }}>
            {IC.print} Распечатать
          </button>
          {order.tg && (
            <a href={`https://t.me/${order.tg}?text=${encodeURIComponent(`Заказ №${String(order.id).padStart(5,"0")} от ${order.date}\n${order.items.map(i=>`${i.name} × ${i.qty} = ${i.qty*i.price}₽`).join("\n")}\nИТОГО: ${order.total}₽`)}`}
              target="_blank" rel="noreferrer"
              style={{ flex:1,background:"#229ED9",color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontSize:12,fontWeight:600,cursor:"pointer",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6,minWidth:120 }}>
              {IC.send} Telegram
            </a>
          )}
          <button onClick={onClose}
            style={{ background:"none",border:"1px solid #e5e5e5",borderRadius:8,padding:"10px 14px",fontSize:12,cursor:"pointer",color:"#888" }}>✕</button>
        </div>
      </div>
    </div>
  );
}
