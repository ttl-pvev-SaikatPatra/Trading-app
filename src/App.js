import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || ""; // e.g., "https://your-render-url"
const POLL_MS = 5000;           // status polling
const HEALTH_PING_MS = 120000;  // keep-alive ping
const SCAN_INTERVAL_MIN = 15;   // matches backend schedule.every(15).minutes

function formatINR(n) {
  if (n === null || n === undefined) return "-";
  try { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }); } catch { return String(n); }
}

function formatPct(n) {
  if (n === null || n === undefined) return "-";
  try { return Number(n).toFixed(2) + "%"; } catch { return String(n); }
}

function nextScanCountdown() {
  // Next quarter-hour boundary from now (aligned to :00, :15, :30, :45)
  const now = new Date();
  const m = now.getMinutes();
  const nextBlockMin = Math.ceil((m + 0.0001) / SCAN_INTERVAL_MIN) * SCAN_INTERVAL_MIN;
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
  return `${String(mm).padStart(2, "0")}:${String(remS).padStart(2, "0")}`;
}

function App() {
  const [auth, setAuth] = useState({
    accessToken: localStorage.getItem("kite_access_token") || "",
    requestToken: "",
    isAuthed: false,
  });

  const [status, setStatus] = useState(null);
  const [universe, setUniverse] = useState({ version: null, session_universe: [], universe: [] });
  const [health, setHealth] = useState(null);
  const [lastHealthAt, setLastHealthAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [countdown, setCountdown] = useState(nextScanCountdown());
  const pollTimer = useRef(null);
  const keepAliveTimer = useRef(null);
  const [todayTrades, setTodayTrades] = useState([]); // derived log of entries/closures
  const prevPositionsRef = useRef({}); // track changes to build todayTrades

  // Reason for no trade inference
  const noTradeReason = useMemo(() => {
    if (!status) return "Awaiting status...";
    if (!status.market_open) return "Market closed";
    if (status.bot_status === "Paused") return "Bot paused";
    if ((status.positions || []).length >= (status.max_positions || 0)) return "Max positions reached";
    // universe empty?
    if (!universe.session_universe || universe.session_universe.length === 0) return "Watchlist empty";
    // Otherwise likely no valid MTF/VWAP breakout signal seen recently
    return "No qualifying signal";
  }, [status, universe]);

  // Bootstrap auth state based on access_token validity
  useEffect(() => {
    const bootstrap = async () => {
      if (auth.accessToken) {
        try {
          await fetchJSON("/api/refresh-token", { method: "POST", body: { access_token: auth.accessToken } });
          setAuth(a => ({ ...a, isAuthed: true }));
          // Preload universe
          fetchUniverse();
        } catch {
          // ignore
        }
      }
    };
    bootstrap();
    // eslint-disable-next-line
  }, []);

  // Poll status
  useEffect(() => {
    if (!auth.isAuthed) return;
    const tick = async () => {
      try {
        const s = await fetchJSON("/api/status");
        setStatus(s);
        updateTodayTradesFromPositions(s.positions || []);
      } catch (e) {
        // silent
      }
    };
    tick();
    pollTimer.current = setInterval(tick, POLL_MS);
    return () => clearInterval(pollTimer.current);
  }, [auth.isAuthed]);

  // Keep-alive ping
  useEffect(() => {
    if (!auth.isAuthed) return;
    const ping = async () => {
      try {
        const h = await fetchJSON("/health");
        setHealth(h);
        setLastHealthAt(new Date());
      } catch (e) {
        setNote("Keep-alive failed");
      }
    };
    ping();
    keepAliveTimer.current = setInterval(ping, HEALTH_PING_MS);
    return () => clearInterval(keepAliveTimer.current);
  }, [auth.isAuthed]);

  // Countdown updater
  useEffect(() => {
    const t = setInterval(() => setCountdown(nextScanCountdown()), 1000);
    return () => clearInterval(t);
  }, []);

  async function fetchJSON(path, options = {}) {
    const url = API_BASE + path;
    const headers = { "Content-Type": "application/json" };
    const body = options.body ? JSON.stringify(options.body) : undefined;
    const res = await fetch(url, { ...options, headers, body });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function fetchUniverse() {
    try {
      const u = await fetchJSON("/api/universe");
      setUniverse(u);
    } catch {/* ignore */}
  }

  function updateTodayTradesFromPositions(currPositions) {
    const prev = prevPositionsRef.current;
    const prevKeys = Object.keys(prev);
    const currMap = {};
    currPositions.forEach(p => {
      const k = `${p.symbol}_${p.entry_time}_${p.quantity}`;
      currMap[k] = p;
      if (!prev[k]) {
        setTodayTrades(t => [
          { type: "ENTRY", ts: new Date().toISOString(), symbol: p.symbol, side: p.transaction_type, qty: p.quantity, price: p.buy_price },
          ...t
        ]);
      }
    });
    // detect exits
    prevKeys.forEach(k => {
      if (!currMap[k]) {
        const p = prev[k];
        setTodayTrades(t => [
          { type: "EXIT", ts: new Date().toISOString(), symbol: p.symbol, side: p.transaction_type, qty: p.quantity, price: p.current_price },
          ...t
        ]);
      }
    });
    prevPositionsRef.current = currMap;
  }

  async function handleRequestTokenExchange(e) {
    e.preventDefault();
    if (!auth.requestToken || auth.requestToken.length < 10) {
      setNote("Enter a valid request_token");
      return;
    }
    setLoading(true);
    setNote("");
    try {
      const resp = await fetchJSON("/session/exchange", { method: "POST", body: { request_token: auth.requestToken } });
      if (resp.success) {
        // verify status and store token from backend file later via refresh endpoint if needed
        // The backend stores access_token internally; we can ask user to paste if desired
        setAuth(a => ({ ...a, isAuthed: true }));
        setNote("Authenticated");
        fetchUniverse();
      } else {
        setNote("Auth failed");
      }
    } catch (e) {
      setNote("Auth failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccessTokenRefresh(e) {
    e.preventDefault();
    if (!auth.accessToken) return;
    setLoading(true);
    setNote("");
    try {
      const resp = await fetchJSON("/api/refresh-token", { method: "POST", body: { access_token: auth.accessToken } });
      if (resp.success) {
        localStorage.setItem("kite_access_token", auth.accessToken);
        setAuth(a => ({ ...a, isAuthed: true }));
        setNote("Access token accepted");
        fetchUniverse();
      } else {
        setNote("Token rejected");
      }
    } catch (e) {
      setNote("Token refresh failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function control(action) {
    setLoading(true);
    setNote("");
    try {
      const resp = await fetchJSON(`/control/${action}`);
      setNote(`Action: ${resp.status}`);
    } catch (e) {
      setNote("Action failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function rebuildUniverse() {
    setLoading(true);
    setNote("");
    try {
      const resp = await fetchJSON("/api/universe/rebuild", { method: "POST" });
      setUniverse(resp);
      setNote("Universe rebuilt");
    } catch (e) {
      setNote("Universe rebuild failed");
    } finally {
      setLoading(false);
    }
  }

  async function closePosition(symbol) {
    setLoading(true);
    setNote("");
    try {
      const resp = await fetchJSON("/api/close-position", { method: "POST", body: { symbol } });
      setNote(resp.message || "Close requested");
    } catch (e) {
      setNote("Close failed");
    } finally {
      setLoading(false);
    }
  }

  async function runBacktest() {
    setLoading(true);
    setNote("");
    try {
      const resp = await fetchJSON("/backtest/run", { method: "POST" });
      setNote(`Backtest OK. Final Equity: ${formatINR(resp.final_equity)}`);
    } catch (e) {
      setNote("Backtest failed");
    } finally {
      setLoading(false);
    }
  }

  function downloadBacktestCSV() {
    const url = API_BASE + "/backtest/csv";
    window.open(url, "_blank");
  }

  const positions = status?.positions || [];
  const dailyPnL = status?.daily_pnl ?? 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Intraday Trading Bot Dashboard</div>
        <div className="right">
          <div className="clock">Next scan: <span className="mono">{countdown}</span></div>
          <div className={`health ${health?.flask_working ? "ok" : "bad"}`}>
            Keep-alive: {health?.flask_working ? "OK" : "—"}{lastHealthAt ? ` @ ${lastHealthAt.toLocaleTimeString()}` : ""}
          </div>
        </div>
      </header>

      <section className="auth card">
        <h3>Authentication</h3>
        {!auth.isAuthed && (
          <>
            <form className="row" onSubmit={handleRequestTokenExchange}>
              <input
                placeholder="Paste request_token"
                value={auth.requestToken}
                onChange={e => setAuth(a => ({ ...a, requestToken: e.target.value }))}
              />
              <button className="btn" disabled={loading} type="submit">Exchange Token</button>
            </form>
            <div className="row">
              <input
                placeholder="Paste access_token"
                value={auth.accessToken}
                onChange={e => setAuth(a => ({ ...a, accessToken: e.target.value }))}
              />
              <button className="btn" disabled={loading} onClick={handleAccessTokenRefresh}>Use Access Token</button>
            </div>
          </>
        )}
        {auth.isAuthed && (
          <div className="okline">Authenticated • Monitoring enabled</div>
        )}
        {note && <div className="note">{note}</div>}
      </section>

      <section className="status card">
        <h3>Status</h3>
        <div className="stats">
          <div>
            <div className="label">Balance</div>
            <div className="value">{formatINR(status?.balance)}</div>
          </div>
          <div>
            <div className="label">Market</div>
            <div className={`value ${status?.market_open ? "ok" : "bad"}`}>{status?.market_open ? "Open" : "Closed"}</div>
          </div>
          <div>
            <div className="label">Bot status</div>
            <div className="value">{status?.bot_status || "—"}</div>
          </div>
          <div>
            <div className="label">Risk / trade</div>
            <div className="value">{formatPct((status?.risk_per_trade || 0) * 100)}</div>
          </div>
          <div>
            <div className="label">Max positions</div>
            <div className="value">{status?.max_positions ?? "—"}</div>
          </div>
          <div>
            <div className="label">Daily PnL</div>
            <div className={`value ${dailyPnL >= 0 ? "ok" : "bad"}`}>{formatINR(dailyPnL)}</div>
          </div>
          <div>
            <div className="label">Trades</div>
            <div className="value">{status?.total_trades ?? 0}</div>
          </div>
          <div>
            <div className="label">No-trade reason</div>
            <div className="value">{noTradeReason}</div>
          </div>
          <div>
            <div className="label">Updated</div>
            <div className="value">{status?.last_update || "—"}</div>
          </div>
        </div>
        <div className="controls">
          <button className="btn" disabled={!auth.isAuthed || loading} onClick={() => control("scan")}>Scan now</button>
          <button className="btn" disabled={!auth.isAuthed || loading} onClick={() => control("pause")}>Pause</button>
          <button className="btn" disabled={!auth.isAuthed || loading} onClick={() => control("resume")}>Resume</button>
          <button className="btn" disabled={!auth.isAuthed || loading} onClick={rebuildUniverse}>Rebuild+Scan</button>
          <button className="btn" disabled={!auth.isAuthed || loading} onClick={runBacktest}>Run Backtest</button>
          <button className="btn" disabled={!auth.isAuthed || loading} onClick={downloadBacktestCSV}>Download CSV</button>
        </div>
      </section>

      <section className="positions card">
        <h3>Active Positions</h3>
        {positions.length === 0 && <div className="muted">No active positions</div>}
        {positions.length > 0 && (
          <div className="table">
            <div className="thead">
              <div>Symbol</div><div>Side</div><div>Qty</div><div>Entry</div><div>Current</div><div>PnL</div><div>PnL %</div><div>Target</div><div>Stop</div><div>Since</div><div>Action</div>
            </div>
            {positions.map((p, i) => {
              const pnlOk = (p.pnl ?? 0) >= 0;
              return (
                <div className="trow" key={i}>
                  <div>{p.symbol}</div>
                  <div>{p.transaction_type}</div>
                  <div>{p.quantity}</div>
                  <div>{formatINR(p.buy_price)}</div>
                  <div>{formatINR(p.current_price)}</div>
                  <div className={pnlOk ? "ok" : "bad"}>{formatINR(p.pnl)}</div>
                  <div className={pnlOk ? "ok" : "bad"}>{formatPct(p.pnl_percent)}</div>
                  <div>{formatINR(p.target_price)}</div>
                  <div>{formatINR(p.stop_loss_price)}</div>
                  <div className="mono">{p.entry_time}</div>
                  <div><button className="btn danger" onClick={() => closePosition(p.symbol)}>Close</button></div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="activity card">
        <h3>Trade Sessions (today)</h3>
        {todayTrades.length === 0 && <div className="muted">No entries/exits recorded yet</div>}
        {todayTrades.length > 0 && (
          <ul className="log">
            {todayTrades.map((t, idx) => (
              <li key={idx}>
                <span className={`tag ${t.type === "ENTRY" ? "ok" : "warn"}`}>{t.type}</span>
                <span className="mono">{new Date(t.ts).toLocaleTimeString()}</span>
                <span>{t.symbol}</span>
                <span>{t.side}</span>
                <span>Qty {t.qty}</span>
                <span>@ {formatINR(t.price)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="universe card">
        <h3>Universe {universe.version ? `• ${universe.version}` : ""}</h3>
        <div className="muted">Session watchlist: {universe.session_universe?.join(", ") || "—"}</div>
        {universe.universe && universe.universe.length > 0 && (
          <div className="table compact">
            <div className="thead">
              <div>Symbol</div><div>Close</div><div>ATR %</div><div>Turnover (med 20)</div><div>Score</div>
            </div>
            {universe.universe.map((u, i) => (
              <div className="trow" key={i}>
                <div>{u.Symbol}</div>
                <div>{formatINR(u.Close)}</div>
                <div>{Number(u.ATR_pct).toFixed(2)}</div>
                <div>{formatINR(u.MedTurn20)}</div>
                <div>{Number(u.Score).toFixed(3)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        <div>Kite Connect Integrated • VWAP + EMA20 (MTF) + ATR • MIS day trading</div>
      </footer>
    </div>
  );
}

export default App;
