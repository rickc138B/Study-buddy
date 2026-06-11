import { useState, useEffect } from "react";

const SOURCES = [
  "All", "Vanguard", "Premium Times", "Daily Trust",
  "Channels TV", "BusinessDay", "ThisDay", "Arise TV", "Sun News"
];

export default function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState("All");
  const [cachedAt, setCachedAt] = useState(null);

  const fetchNews = async (refresh = false) => {
    setLoading(true);
    try {
      const endpoint = refresh ? "/api/news/refresh" : "/api/news";
      const res = await fetch(`http://localhost:3001${endpoint}`);
      const data = await res.json();
      setArticles(data.articles);
      setCachedAt(data.cachedAt);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  const filtered = activeSource === "All"
    ? articles
    : articles.filter(a => a.source === activeSource);

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 20px", fontFamily: "Georgia, serif", background: "#0a0a0a", minHeight: "100vh", color: "#f0e6d2" }}>
      <div style={{ marginBottom: "28px", borderBottom: "1px solid rgba(212,175,55,0.2)", paddingBottom: "20px" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "28px", margin: "0 0 4px", color: "#f0e6d2" }}>
          Nigeria <span style={{ color: "#d4af37", fontStyle: "italic" }}>Political</span> Monitor
        </h1>
        <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.5)", fontFamily: "monospace" }}>
          {cachedAt ? `Last fetched: ${new Date(cachedAt).toLocaleTimeString()}` : "Loading..."}
          <button onClick={() => fetchNews(true)} style={{ marginLeft: "16px", background: "transparent", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37", padding: "3px 12px", cursor: "pointer", fontSize: "10px", borderRadius: "3px" }}>
            ↺ Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        {SOURCES.map(s => (
          <button key={s} onClick={() => setActiveSource(s)} style={{
            padding: "5px 14px", borderRadius: "3px", cursor: "pointer", fontSize: "11px", fontFamily: "monospace",
            background: activeSource === s ? "rgba(212,175,55,0.15)" : "transparent",
            border: activeSource === s ? "1px solid rgba(212,175,55,0.6)" : "1px solid rgba(212,175,55,0.15)",
            color: activeSource === s ? "#d4af37" : "rgba(212,175,55,0.5)",
          }}>{s}</button>
        ))}
      </div>

      {loading && <div style={{ color: "rgba(212,175,55,0.5)", fontFamily: "monospace", fontSize: "12px" }}>Fetching feeds...</div>}

      {!loading && filtered.map((a, i) => (
        <div key={i} style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#d4af37", marginBottom: "6px", opacity: 0.7 }}>
            {a.source} · {a.published ? new Date(a.published).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
          </div>
          <a href={a.link} target="_blank" rel="noreferrer" style={{ color: "#f0e6d2", fontSize: "16px", lineHeight: "1.5", textDecoration: "none", fontWeight: "600" }}>
            {a.title}
          </a>
          {a.summary && <p style={{ margin: "8px 0 0", fontSize: "13px", color: "rgba(240,230,210,0.6)", lineHeight: "1.65" }}>{a.summary}</p>}
        </div>
      ))}

      {!loading && filtered.length === 0 && (
        <div style={{ color: "rgba(212,175,55,0.4)", fontFamily: "monospace", fontSize: "12px" }}>No political articles found.</div>
      )}
    </div>
  );
}
