import "@/styles/globals.css";
import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Apply saved theme immediately to prevent flash
    const saved = localStorage.getItem("theme");
    const dark = saved === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.body.classList.toggle("dark", dark);
    // Set CSS var on root too
    if (dark) {
      document.documentElement.style.setProperty("--bg", "#111111");
      document.documentElement.style.setProperty("--surface", "#1e1e1e");
      document.documentElement.style.setProperty("--surface2", "#252525");
      document.documentElement.style.setProperty("--border", "#333333");
      document.documentElement.style.setProperty("--text", "#eeeeee");
      document.documentElement.style.setProperty("--text2", "#999999");
      document.documentElement.style.setProperty("--text3", "#555555");
      document.documentElement.style.setProperty("--accent", "#eeeeee");
      document.documentElement.style.setProperty("--accent-t", "#111111");
      document.documentElement.style.setProperty("--shadow", "rgba(0,0,0,0.45)");
    }
  }, []);

  return <Component {...pageProps} />;
}
