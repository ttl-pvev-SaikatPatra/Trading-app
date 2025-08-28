import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE =
process.env.REACT_APP_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL || "";
const BACKEND_URL = API_BASE;
const POLL_MS = 5000;
const HEALTH_PING_MS = 120000;
const SCAN_INTERVAL_MIN = 15;

function inr(n) {
if (n === null || n === undefined) return "—";
return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
function pct(n) {
if (n === null || n === undefined) return "—";
return Number(n).toFixed(2) + "%";
}
function nextScanCountdown() {
const now = new Date();
const m = now.getMinutes();
const nextBlockMin =
Math.ceil((m + 0.0001) / SCAN_INTERVAL_MIN) * SCAN_INTERVAL_MIN;
const next = new Date(now);
next.setSeconds(0, 0);
if (nextBlockMin >= 60) {
next.setHours(next.getHours() + 1);
next.setMinutes(0);
} else {
next.setMinutes(nextBlockMin);
}
const diffMs = next - now;
const ss = Math.max(0, Math.floor(diffMs / 1000));
const mm = Math.floor(ss / 60);
const remS = ss % 60;
return ${String(mm).padStart(2, "0")}:${String(remS).padStart(2, "0")};
}
async function fetchJSON(path, options = {}) {
const url = API_BASE + path;
const headers = { "Content-Type": "application/json" };
const body = options.body ? JSON.stringify(options.body) : undefined;
const res = await fetch(url, { ...options, headers, body });
if (!res.ok) throw new Error(HTTP ${res.status});
return res.json();
}
function getQueryParam(name) {
const params = new URLSearchParams(window.location.search);
return params.get(name);
}

/* ---------------- App Shell ---------------- */
function ThemeToggle() {
const [dark, setDark] = useState(() => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
return (
<button className="btn ghost" onClick={() => setDark(v => !v)} aria-label="Toggle theme">
{dark ? "🌙" : "☀️"}
</button>
);
}
function AppHeader({ onPrimary, canScan }) {
return (
<header className="app-header glass">
<div className="brand-box">
<img className="logo" alt="Logo" src="/logo.svg" onError={(e)=>{e.currentTarget.style.display="none"}} />
<div className="brand-meta">
<div className="brand-title">Nimbus Trader</div>
<div className="brand-sub">Fast. Calm. Precise.</div>
</div>
</div>
<div className="header-actions">
<ThemeToggle />
<button className="btn primary" onClick={onPrimary} disabled={!canScan}>Scan now</button>
</div>
</header>
);
}
function Tabs({ value, onChange, items }) {
return (
<div className="tabs">
{items.map(it => (
<button key={it.value} className={tab ${value===it.value?"active":""}} onClick={()=>onChange(it.value)}>
{it.icon ? <span className="tab-ico">{it.icon}</span> : null}{it.label}
</button>
))}
</div>
);
}
function SectionCard({ title, subtitle, children, actions, tone }) {
return (
<section className={card section ${tone||""}}>
<div className="section-head">
<div>
<h3>{title}</h3>
{subtitle ? <div className="muted one-line">{subtitle}</div> : null}
</div>
{actions ? <div className="section-actions">{actions}</div> : null}
</div>
{children}
</section>
);
}

/* ---------------- Auth Screen ---------------- */
function AuthScreen({ onKiteLogin, reqToken, setReqToken, onVerify, loading, message }) {
return (
<div className="auth-hero">
<div className="hero-bg" />
<div className="auth-card glass pop">
<div className="auth-brand-row">
<img className="logo lg" alt="Logo" src="/logo.svg" onError={(e)=>{e.currentTarget.style.display="none"}} />
<div className="auth-title">Welcome to Nimbus Trader</div>
</div>
<div className="auth-sub muted">Authenticate to start secure trading with Zerodha.</div>
<div className="auth-actions">
<button className="btn success wide" onClick={onKiteLogin}>Connect Zerodha</button>
<div className="auth-divider">or paste request_token</div>
<form className="auth-form" onSubmit={(e)=>{e.preventDefault(); onVerify();}}>
<input className="input" placeholder="32-char request_token" value={reqToken} onChange={(e)=>setReqToken(e.target.value.trim())} maxLength={64} />
<button className="btn secondary wide" type="submit" disabled={loading}>Verify & Save</button>
</form>
{message ? <div className="muted center">{message}</div> : null}
</div>
</div>
</div>
);
}

/* ---------------- Dashboard ---------------- */
function KPI({ label, value, sub, posneg }) {
return (
<div className="kpi card hover">
<div className="kpi-label">{label}</div>
<div className={kpi-value ${posneg||""}}>{value}</div>
{sub ? <div className="kpi-sub muted">{sub}</div> : null}
</div>
);
}

function Dashboard({
status, universe, todayTrades, positions,
onScan, onPause, onResume, onRebuild, onClosePosition, note
}) {
const [tab, setTab] = useState("overview");
const [expandPositions, setExpandPositions] = useState(false);
const [expandUniverse, setExpandUniverse] = useState(false);

const dailyPnL = status.daily_pnl ?? 0;
const reason = useMemo(() => {
const s = status;
if (!s) return "Loading status…";
if (s.auth_required || !s.access_token_valid) return "Authentication required";
if (!s.market_open) return "Market closed";
if (s.bot_status === "Paused") return "Bot paused";
if ((s.positions || []).length >= (s.max_positions || 0)) return "Max positions reached";
if (!universe.session_universe || universe.session_universe.length === 0) return "Watchlist empty";
return "No qualifying signal";
}, [status, universe]);

return (
<div className="dashboard">
{note && <div className="toast pop">{note}</div>}

text
  <Tabs
    value={tab}
    onChange={setTab}
    items={[
      { value: "overview", label: "Overview", icon:"🏠" },
      { value: "positions", label: "Positions", icon:"📈" },
      { value: "universe", label: "Universe", icon:"🛰️" },
      { value: "activity", label: "Activity", icon:"🧭" },
      { value: "controls", label: "Controls", icon:"⚙️" },
    ]}
  />

  {tab==="overview" && (
    <>
      <div className="bento">
        <KPI label="Available Balance" value={inr(status.balance)} sub={`Updated ${status.last_update || "—"}`} />
        <KPI label="Daily PnL" value={inr(dailyPnL)} sub={`Trades ${status.total_trades ?? 0}`} posneg={dailyPnL>=0 ? "pos" : "neg"} />
        <div className="card hover">
          <div className="kpi-label">Bot / Market</div>
          <div className="kpi-value">
            <span className={`pill ${status.market_open ? "ok" : "bad"}`}>{status.market_open ? "Market Open" : "Market Closed"}</span>
            <span className="divider" />
            <span className="muted">{status.bot_status || "—"}</span>
          </div>
          <div className="kpi-sub muted">Reason: {reason}</div>
        </div>
        <div className="card hover">
          <div className="kpi-label">Risk & Limits</div>
          <div className="kpi-value">
            <span>Risk/trade: <b>{pct((status.risk_per_trade || 0) * 100)}</b></span>
            <span className="divider" />
            <span>Max positions: <b>{status.max_positions ?? "—"}</b></span>
          </div>
          <div className="kpi-sub muted">Active: {(status.positions || []).length}</div>
        </div>
      </div>

      <SectionCard title="Quick Actions" subtitle="Run a scan or manage the bot">
        <div className="actions-row">
          <button className="btn primary" onClick={onScan} disabled={status.auth_required || !status.access_token_valid}>Scan now</button>
          <button className="btn ghost" onClick={onPause}>Pause</button>
          <button className="btn ghost" onClick={onResume}>Resume</button>
          <button className="btn ghost" onClick={onRebuild} disabled={status.auth_required || !status.access_token_valid}>Rebuild + Scan</button>
        </div>
      </SectionCard>
    </>
  )}

  {tab==="positions" && (
    <SectionCard
      title={`Active Positions (${positions.length})`}
      subtitle={positions.length ? "Tap Expand for full details" : "No active positions"}
      actions={positions.length ? <button className="btn ghost" onClick={()=>setExpandPositions(v=>!v)}>{expandPositions?"Collapse":"Expand"}</button> : null}
    >
      {!positions.length ? <div className="empty">No active positions</div> : (
        <div className={`table ${expandPositions ? "" : "compact"}`}>
          <div className="thead">
            <div>Symbol</div><div>Side</div><div>Qty</div><div>Entry</div>
            <div>Current</div><div>PnL</div><div>PnL %</div><div>Target</div>
            <div>Stop</div><div>Since</div><div>Action</div>
          </div>
          {positions.map((p, i) => {
            const ok = (p.pnl ?? 0) >= 0;
            return (
              <div className="trow" key={i}>
                <div>{p.symbol}</div>
                <div>{p.transaction_type}</div>
                <div>{p.quantity}</div>
                <div>{inr(p.buy_price)}</div>
                <div>{inr(p.current_price)}</div>
                <div className={ok ? "pos" : "neg"}>{inr(p.pnl)}</div>
                <div className={ok ? "pos" : "neg"}>{pct(p.pnl_percent)}</div>
                <div>{inr(p.target_price)}</div>
                <div>{inr(p.stop_loss_price)}</div>
                <div className="mono">{p.entry_time}</div>
                <div><button className="btn danger" onClick={()=>onClosePosition(p.symbol)} disabled={status.auth_required || !status.access_token_valid}>Close</button></div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  )}

  {tab==="universe" && (
    <SectionCard
      title={`Universe ${universe.version ? "-  "+universe.version : ""}`}
      subtitle={`Watchlist: ${universe.session_universe?.join(", ") || "—"}`}
      actions={universe.universe?.length ? <button className="btn ghost" onClick={()=>setExpandUniverse(v=>!v)}>{expandUniverse?"Collapse":"Expand"}</button> : null}
    >
      {!universe.universe?.length ? <div className="empty">No universe snapshot</div> : (
        <div className={`table ${expandUniverse ? "" : "compact"}`}>
          <div className="thead">
            <div>Symbol</div><div>Close</div><div>ATR%</div><div>Med Turn 20</div><div>Score</div>
          </div>
          {universe.universe.map((u, i) => (
            <div className="trow" key={i}>
              <div>{u.Symbol}</div>
              <div>{inr(u.Close)}</div>
              <div>{Number(u.ATR_pct).toFixed(2)}</div>
              <div>{inr(u.MedTurn20)}</div>
              <div>{Number(u.Score).toFixed(3)}</div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )}

  {tab==="activity" && (
    <SectionCard title="Trade Sessions (today)" subtitle={`${todayTrades.length} events`}>
      {!todayTrades.length ? <div className="empty">No entries/exits recorded yet</div> : (
        <ul className="log">
          {todayTrades.map((t, idx) => (
            <li key={idx} className="pop">
              <span className={`chip ${t.type==="ENTRY" ? "pos" : "warn"}`}>{t.type}</span>
              <span className="mono">{new Date(t.ts).toLocaleTimeString()}</span>
              <span>{t.symbol}</span>
              <span className="muted">{t.side}</span>
              <span className="muted">Qty {t.qty}</span>
              <span>@ {inr(t.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )}

  {tab==="controls" && (
    <SectionCard title="Controls" subtitle="Manage scans and utilities" tone="accent">
      <div className="actions-grid">
        <button className="btn primary" onClick={onScan} disabled={status.auth_required || !status.access_token_valid}>Scan now</button>
        <button className="btn ghost" onClick={onPause}>Pause</button>
        <button className="btn ghost" onClick={onResume}>Resume</button>
        <button className="btn ghost" onClick={onRebuild} disabled={status.auth_required || !status.access_token_valid}>Rebuild + Scan</button>
        <button className="btn ghost" onClick={async ()=>{ await fetchJSON("/backtest/run", { method:"POST" }); alert("Backtest started"); }}>Run Backtest</button>
        <button className="btn ghost" onClick={()=>window.open(API_BASE + "/backtest/csv", "_blank")}>Download CSV</button>
      </div>
    </SectionCard>
  )}

  <footer className="footer">
    <div className="muted">Zerodha Kite -  VWAP + EMA20 (MTF) + ATR -  MIS</div>
  </footer>
</div>
);
}

/* ---------------- Main App ---------------- */
export default function App() {
const [status, setStatus] = useState(null);
const [universe, setUniverse] = useState({ version: null, session_universe: [], universe: [] });
const [health, setHealth] = useState(null);
const [lastHealthAt, setLastHealthAt] = useState(null);
const [note, setNote] = useState("");
const [loading, setLoading] = useState(false);

const [reqToken, setReqToken] = useState("");
const [reqTokenMsg, setReqTokenMsg] = useState("");
const todayTradesRef = useRef([]); const [todayTrades, setTodayTrades] = useState([]); const prevPositionsRef = useRef({});

useEffect(()=>{ const rt = getQueryParam("request_token"); if (rt && rt.length===32) { setReqToken(rt); setReqTokenMsg("Token detected. Verify & Save."); } },[]);
useEffect(()=>{ (async()=>{
try{
const [s,u,h] = await Promise.all([
fetchJSON("/api/status").catch(()=>null),
fetchJSON("/api/universe").catch(()=>({ session_universe:[], universe:[], version:null })),
fetchJSON("/health").catch(()=>null),
]);
if (s) setStatus(s); if (u) setUniverse(u); if (h) { setHealth(h); setLastHealthAt(new Date()); }
}catch{ setNote("Failed to load initial data"); }
})(); },[]);
useEffect(()=>{ const t=setInterval(async()=>{ try{ const s = await fetchJSON("/api/status"); setStatus(s); updateStream(s.positions||[]); }catch{} }, POLL_MS); return ()=>clearInterval(t); },[]);
useEffect(()=>{ const t=setInterval(async()=>{ try{ const h=await fetchJSON("/health"); setHealth(h); setLastHealthAt(new Date()); }catch{ setNote("Keep-alive failed"); } }, HEALTH_PING_MS); return ()=>clearInterval(t); },[]);

function updateStream(currPositions){
const prev = prevPositionsRef.current; const currMap = {};
currPositions.forEach(p => { const k = ${p.symbol}_${p.entry_time}_${p.quantity}; currMap[k]=p; if(!prev[k]){ todayTradesRef.current = [{ type:"ENTRY", ts:new Date().toISOString(), symbol:p.symbol, side:p.transaction_type, qty:p.quantity, price:p.buy_price }, ...todayTradesRef.current]; }});
Object.keys(prev).forEach(k=>{ if(!currMap[k]){ const p=prev[k]; todayTradesRef.current = [{ type:"EXIT", ts:new Date().toISOString(), symbol:p.symbol, side:p.transaction_type, qty:p.quantity, price:p.current_price }, ...todayTradesRef.current]; }});
prevPositionsRef.current = currMap; setTodayTrades(todayTradesRef.current.slice(0,50));
}

async function control(action){
setNote("");
try{
const resp = await fetchJSON(/control/${action});
setNote(resp.status || "OK");
if (action.includes("rebuild")) {
const u = await fetchJSON("/api/universe");
setUniverse(u);
}
}catch(e){ setNote("Action failed: "+e.message); }
}
async function closePosition(symbol){
setNote("");
try{ const resp = await fetchJSON("/api/close-position", { method:"POST", body:{ symbol } }); setNote(resp.message || "Close requested"); }catch(e){ setNote("Close failed: "+e.message); }
}
function kiteLogin(){ if(!BACKEND_URL){ setNote("Backend URL is not configured"); return; } window.location.href = ${BACKEND_URL}/auth/login?next=/; }
async function verifyToken(){
setReqTokenMsg("");
if (!reqToken || reqToken.length !== 32) { setReqTokenMsg("Enter a valid 32-character request_token."); return; }
try{
setLoading(true);
const resp = await fetchJSON("/session/exchange", { method:"POST", body:{ request_token:reqToken } });
if (resp.success) {
setReqTokenMsg("Verified. Session active.");
const s = await fetchJSON("/api/status"); setStatus(s);
const url = new URL(window.location.href); if (url.searchParams.get("request_token")){ url.searchParams.delete("request_token"); window.history.replaceState({}, "", url.toString()); }
} else { setReqTokenMsg("Verification failed."); }
}catch(e){ setReqTokenMsg("Verification failed: "+e.message); }
finally{ setLoading(false); }
}

const s = status || {}; const positions = s.positions || [];
const isAuthed = !!s.access_token_valid && !s.auth_required;

return (
<div className="app gradient-bg">
{!isAuthed ? (
<AuthScreen onKiteLogin={kiteLogin} reqToken={reqToken} setReqToken={setReqToken} onVerify={verifyToken} loading={loading} message={reqTokenMsg} />
) : (
<>
<AppHeader onPrimary={()=>control("scan")} canScan={!s.auth_required && s.access_token_valid} />
<Dashboard
status={s}
universe={universe}
todayTrades={todayTrades}
positions={positions}
onScan={()=>control("scan")}
onPause={()=>control("pause")}
onResume={()=>control("resume")}
onRebuild={()=>control("rebuild_and_scan")}
onClosePosition={closePosition}
note={note}
/>
</>
)}
</div>
);
}
