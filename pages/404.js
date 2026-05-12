export default function NotFound() {
  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontSize:48,fontWeight:800,color:"#000" }}>404</div>
      <div style={{ fontSize:16,color:"#555" }}>Страница не найдена</div>
      <a href="/" style={{ marginTop:12,fontSize:13,color:"#000",borderBottom:"1px solid #000" }}>На главную</a>
    </div>
  );
}
