import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL || "";
const BACKEND_URL = API_BASE;
const POLL_MS = 5000;
const HEALTH_PING_MS = 120000;
const SCAN_INTERVAL_MIN = 15;

function inr(n) { if (n === null || n === undefined) return "—"; return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
function pct(n) { if (n === null || n === undefined) return "—"; return Number(n).toFixed(2) + "%"; }

function nextScanCountdown() {
  const now = new Date();
  const m = now.getMinutes();
  const nextBlockMin = Math.ceil((m + 0.0001) / SCAN_INTERVAL_MIN) * SCAN_INTERVAL_MIN;
  const next = new Date(now);
  next.setSeconds(0, 0);
  if (nextBlockMin >= 60) { next.setHours(next.getHours() + 1); next.setMinutes(0); } else { next.setMinutes(nextBlockMin); }
  const diffMs = next - now;
  const ss = Math.max(0, Math.floor(diffMs / 1000));
  const mm = Math.floor(ss / 60);
  const remS = ss % 60;
  return `${String(mm).padStart(2, "0")}:${String(remS).padStart(2, "0")}`;
}
async function fetchJSON(path, options = {}) {
  const url = API_BASE + path;
  const headers = { "Content-Type": "application/json" };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(url, { ...options, headers, body });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

export default function App() {
  const [status, setStatus] = useState(null);
  const [universe, setUniverse] = useState({ version: null, session_universe: [], universe: [] });
  const [health, setHealth] = useState(null);
  const [lastHealthAt, setLastHealthAt] = useState(null);
  const [countdown, setCountdown] = useState(nextScanCountdown());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // auth helper
  const [reqToken, setReqToken] = useState("");
  const [reqTokenMsg, setReqTokenMsg] = useState("");

  const todayTradesRef = useRef([]);
  const [todayTrades, setTodayTrades] = useState([]);
  const prevPositionsRef = useRef({});

  // Prefill request_token if present
  useEffect(() => {
    const rt = getQueryParam("request_token");
    if (rt && rt.length === 32) {
      setReqToken(rt);
      setReqTokenMsg("Request token detected from URL. Verify & Save to finish login.");
    }
  }, []);

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        const [s, u, h] = await Promise.all([
          fetchJSON("/api/status").catch(() => null),
          fetchJSON("/api/universe").catch(() => ({ session_universe: [], universe: [], version: null })),
          fetchJSON("/health").catch(() => null),
        ]);
        if (s) setStatus(s);
        if (u) setUniverse(u);
        if (h) { setHealth(h); setLastHealthAt(new Date()); }
      } catch {
        setNote("Failed to load initial data");
      }
    };
    load();
  }, []);

  // Poll status
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const s = await fetchJSON("/api/status");
        setStatus(s);
        updateTradeStream(s.positions || []);
      } catch {}
    }, POLL_MS);
    return () => clearInterval(t);
  }, []);

  // Keep-alive
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const h = await fetchJSON("/health");
        setHealth(h);
        setLastHealthAt(new Date());
      } catch { setNote("Keep-alive failed"); }
    }, HEALTH_PING_MS);
    return () => clearInterval(t);
  }, []);

  // Countdown
  useEffect(() => {
    const t = setInterval(() => setCountdown(nextScanCountdown()), 1000);
    return () => clearInterval(t);
  }, []);

  const noTradeReason = useMemo(() => {
    const s = status;
    if (!s) return "Loading status…";
    if (s.auth_required || !s.access_token_valid) return "Authentication required";
    if (!s.market_open) return "Market closed";
    if (s.bot_status === "Paused") return "Bot paused";
    if ((s.positions || []).length >= (s.max_positions || 0)) return "Max positions reached";
    if (!universe.session_universe || universe.session_universe.length === 0) return "Watchlist empty";
    return "No qualifying signal";
  }, [status, universe]);

  function updateTradeStream(currPositions) {
    const prev = prevPositionsRef.current;
    const currMap = {};
    currPositions.forEach(p => {
      const k = `${p.symbol}_${p.entry_time}_${p.quantity}`;
      currMap[k] = p;
      if (!prev[k]) {
        todayTradesRef.current = [
          { type: "ENTRY", ts: new Date().toISOString(), symbol: p.symbol, side: p.transaction_type, qty: p.quantity, price: p.buy_price },
          ...todayTradesRef.current
        ];
      }
    });
    Object.keys(prev).forEach(k => {
      if (!currMap[k]) {
        const p = prev[k];
        todayTradesRef.current = [
          { type: "EXIT", ts: new Date().toISOString(), symbol: p.symbol, side: p.transaction_type, qty: p.quantity, price: p.current_price },
          ...todayTradesRef.current
        ];
      }
    });
    prevPositionsRef.current = currMap;
    setTodayTrades(todayTradesRef.current.slice(0, 50));
  }

  async function control(action) {
    setNote("");
    try {
      const resp = await fetchJSON(`/control/${action}`);
      setNote(resp.status || "OK");
      if (action.includes("rebuild")) {
        const u = await fetchJSON("/api/universe");
        setUniverse(u);
      }
    } catch (e) { setNote("Action failed: " + e.message); }
  }

  async function closePosition(symbol) {
    setNote("");
    try {
      const resp = await fetchJSON("/api/close-position", { method: "POST", body: { symbol } });
      setNote(resp.message || "Close requested");
    } catch (e) { setNote("Close failed: " + e.message); }
  }

  function kiteLogin() {
    if (!BACKEND_URL) { setNote("Backend URL is not configured"); return; }
    window.location.href = `${BACKEND_URL}/auth/login?next=/`;
  }

  async function submitRequestToken(e) {
    e.preventDefault();
    setReqTokenMsg("");
    if (!reqToken || reqToken.length !== 32) {
      setReqTokenMsg("Enter a valid 32-character request_token.");
      return;
    }
    try {
      setLoading(true);
      const resp = await fetchJSON("/session/exchange", { method: "POST", body: { request_token: reqToken } });
      if (resp.success) {
        setReqTokenMsg("Verified. Session active.");
        const s = await fetchJSON("/api/status");
        setStatus(s);
        const url = new URL(window.location.href);
        if (url.searchParams.get("request_token")) {
          url.searchParams.delete("request_token");
          window.history.replaceState({}, "", url.toString());
        }
      } else {
        setReqTokenMsg("Verification failed.");
      }
    } catch (e) {
      setReqTokenMsg("Verification failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const s = status || {};
  const positions = s.positions || [];
  const dailyPnL = s.daily_pnl ?? 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="title">Intraday Trading</div>
          <div className="meta muted">Next scan {countdown} • Keep-alive <span className={health?.flask_working ? "ok" : "bad"}>{health?.flask_working ? "OK" : "—"}</span> {lastHealthAt ? <span className="muted mono">@ {lastHealthAt.toLocaleTimeString()}</span> : null}</div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => control("scan")} disabled={s.auth_required || !s.access_token_valid}>Scan now</button>
          <button className="btn ghost" onClick={() => control("pause")}>Pause</button>
          <button className="btn ghost" onClick={() => control("resume")}>Resume</button>
          <button className="btn ghost" onClick={() => control("rebuild_and_scan")} disabled={s.auth_required || !s.access_token_valid}>Rebuild + Scan</button>
        </div>
      </header>

      {(s.auth_required || !s.access_token_valid) && (
        <div className="banner warn">
          <div className="banner-row">
            <div className="banner-title">Authentication required</div>
            <button className="btn success" onClick={kiteLogin}>Connect Zerodha</button>
          </div>
          <form className="auth-form" onSubmit={submitRequestToken}>
            <input
              className="input"
              placeholder="Paste 32-char request_token"
              value={reqToken}
              onChange={(e) => setReqToken(e.target.value.trim())}
              maxLength={64}
              inputMode="latin"
            />
            <button className="btn secondary" type="submit" disabled={loading}>Verify & Save</button>
          </form>
          {reqTokenMsg && <div className="muted">{reqTokenMsg}</div>}
        </div>
      )}

      {note && <div className="toast">{note}</div>}

      <section className="kpis">
        <div className="card kpi">
          <div className="kpi-label">Available Balance</div>
          <div className="kpi-value">{inr(s.balance)}</div>
          <div className="kpi-sub muted">Updated {s.last_update || "—"}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Daily PnL</div>
          <div className={`kpi-value ${dailyPnL >= 0 ? "pos" : "neg"}`}>{inr(dailyPnL)}</div>
          <div className="kpi-sub muted">Trades {s.total_trades ?? 0}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Bot / Market</div>
          <div className="kpi-value">
            <span className={`pill ${s.market_open ? "ok" : "bad"}`}>{s.market_open ? "Market Open" : "Market Closed"}</span>
            <span className="divider" />
            <span className="muted">{s.bot_status || "—"}</span>
          </div>
          <div className="kpi-sub muted">Reason: {noTradeReason}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Risk & Limits</div>
          <div className="kpi-value">
            <span>Risk/trade: <b>{pct((s.risk_per_trade || 0) * 100)}</b></span>
            <span className="divider" />
            <span>Max positions: <b>{s.max_positions ?? "—"}</b></span>
          </div>
          <div className="kpi-sub muted">Active: {(s.positions || []).length}</div>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h3>Active Positions</h3>
          <div className="muted">{positions.length} open</div>
        </div>
        {positions.length === 0 ? (
          <div className="empty">No active positions</div>
        ) : (
          <div className="table">
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
                  <div><button className="btn danger" onClick={() => closePosition(p.symbol)} disabled={s.auth_required || !s.access_token_valid}>Close</button></div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-head">
          <h3>Trade Sessions (today)</h3>
          <div className="muted">{todayTrades.length} events</div>
        </div>
        {todayTrades.length === 0 ? (
          <div className="empty">No entries/exits recorded yet</div>
        ) : (
          <ul className="log">
            {todayTrades.map((t, idx) => (
              <li key={idx}>
                <span className={`chip ${t.type === "ENTRY" ? "pos" : "warn"}`}>{t.type}</span>
                <span className="mono">{new Date(t.ts).toLocaleTimeString()}</span>
                <span>{t.symbol}</span>
                <span className="muted">{t.side}</span>
                <span className="muted">Qty {t.qty}</span>
                <span>@ {inr(t.price)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="section-head">
          <h3>Universe {universe.version ? `• ${universe.version}` : ""}</h3>
          <div className="muted one-line">Watchlist: {universe.session_universe?.join(", ") || "—"}</div>
        </div>
        {universe.universe?.length ? (
          <div className="table compact">
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
        ) : <div className="empty">No universe snapshot</div>}
      </section>

      <footer className="footer">
        <div className="muted">Zerodha Kite • VWAP + EMA20 (MTF) + ATR • MIS</div>
      </footer>
    </div>
  );
}
