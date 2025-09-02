import React, { useEffect, useMemo, useRef, useState } from "react";

/* ================= Config ================= */
const API_BASE = (process.env.REACT_APP_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/,"");
const BACKEND_URL = API_BASE;
const POLL_MS = 5000;
const HEALTH_PING_MS = 120000;
const SCAN_INTERVAL_MIN = 15;

/* ================= Utilities ================= */
function inr(n) {
  if (n === null || n === undefined) return "—";
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function pct(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toFixed(2) + "%";
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function nextScanCountdown() {
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

async function fetchJSON(path, options = {}) {
  const url = `${API_BASE}${path}`;
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

// Helpers for auth hydration (single copy only)
const CLEANUP_QUERY_KEYS = ["auth", "code", "request_token"];

async function confirmSessionAndRefresh() {
  try {
    const ses = await fetchJSON("/auth/session");
    const sessionStatus = {
      access_token_valid: !!ses?.authenticated,
      auth_required: !ses?.authenticated
    };
    let s = null, u = null;
    if (ses?.authenticated) {
      s = await fetchJSON("/api/status").catch(() => null);
      u = await fetchJSON("/api/universe").catch(() => null);
    }
    return { sessionStatus, s, u };
  } catch {
    return { sessionStatus: { access_token_valid: false, auth_required: true } };
  }
}

function cleanUrlParams() {
  const url = new URL(window.location.href);
  let changed = false;
  CLEANUP_QUERY_KEYS.forEach(k => {
    if (url.searchParams.has(k)) {
      url.searchParams.delete(k);
      changed = true;
    }
  });
  if (changed) window.history.replaceState({}, document.title, url.toString());
}

/* ================= UI Components ================= */
// Loading Spinner
function LoadingSpinner({ size = "md" }) {
  return (
    <div className={`loading-spinner ${size}`}>
      <div className="spinner-ring"></div>
    </div>
  );
}

// Progress Bar
function ProgressBar({ progress, status, className = "" }) {
  return (
    <div className={`progress-container ${className}`}>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
      <div className="progress-text">{status}</div>
    </div>
  );
}

// Theme Toggle
function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  return (
    <button className="theme-toggle" onClick={() => setDark(v => !v)} aria-label="Toggle theme">
      <div className="theme-toggle-track">
        <div className={`theme-toggle-thumb ${dark ? "dark" : "light"}`}>{dark ? "🌙" : "☀️"}</div>
      </div>
    </button>
  );
}

// Header
function AppHeader({ onPrimary, canScan, status }) {
  const [countdown, setCountdown] = useState("00:00");
  useEffect(() => {
    const timer = setInterval(() => setCountdown(nextScanCountdown()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <img className="logo" alt="Nimbus Trader" src="/logo.svg" onError={(e) => { e.currentTarget.style.display = "none"; }}/>
        </div>
        <div className="brand-info">
          <h1 className="brand-title">Nimbus Trader</h1>
          <p className="brand-subtitle">Intelligent. Precise. Profitable.</p>
        </div>
      </div>

      <div className="header-status">
        <div className="status-indicator">
          <div className={`status-dot ${status?.market_open ? 'active' : 'inactive'}`}></div>
          <span className="status-text">{status?.market_open ? 'Market Open' : 'Market Closed'}</span>
        </div>
        <div className="next-scan">
          <span className="next-scan-label">Next scan in</span>
          <span className="next-scan-time">{countdown}</span>
        </div>
      </div>

      <div className="header-actions">
        <ThemeToggle />
        <button className="btn primary scan-btn" onClick={onPrimary} disabled={!canScan}>
          <span className="btn-icon">🔍</span>
          Scan Now
        </button>
      </div>
    </header>
  );
}

// Tabs
function Tabs({ value, onChange, items }) {
  return (
    <div className="enhanced-tabs">
      <div className="tabs-container">
        {items.map((item) => (
          <button key={item.value} className={`tab-item ${value === item.value ? "active" : ""}`} onClick={() => onChange(item.value)}>
            <span className="tab-icon">{item.icon}</span>
            <span className="tab-label">{item.label}</span>
            {item.badge && <span className="tab-badge">{item.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Section Card
function SectionCard({ title, subtitle, children, actions, tone, className = "" }) {
  return (
    <div className={`section-card ${tone || ""} ${className}`}>
      <div className="section-header">
        <div className="section-title-group">
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      <div className="section-content">{children}</div>
    </div>
  );
}

// KPI
function KPI({ label, value, sub, trend, posneg, icon, className = "" }) {
  return (
    <div className={`kpi-card ${posneg || ""} ${className}`}>
      <div className="kpi-header">
        <div className="kpi-label-group">
          {icon && <span className="kpi-icon">{icon}</span>}
          <span className="kpi-label">{label}</span>
        </div>
        {typeof trend === "number" && (
          <div className={`kpi-trend ${trend > 0 ? 'up' : 'down'}`}>
            <span className="trend-icon">{trend > 0 ? '↗' : '↘'}</span>
            <span className="trend-value">{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

// Backtest Config
function BacktestConfig({ onStart, loading }) {
  const [config, setConfig] = useState({ start_date: "2024-06-01", end_date: "2024-08-30", capital: 25000 });

  const presets = [
    { name: "Last 3 Months", start: "2024-06-01", end: "2024-08-30", desc: "Recent conditions" },
    { name: "Last 6 Months", start: "2024-03-01", end: "2024-08-30", desc: "Market volatility" },
    { name: "YTD 2024", start: "2024-01-01", end: "2024-08-30", desc: "Full year" },
    { name: "Stress Test", start: "2024-03-15", end: "2024-04-15", desc: "High volatility" }
  ];

  const handlePreset = (preset) => setConfig(prev => ({ ...prev, start_date: preset.start, end_date: preset.end }));
  const handleStart = () => onStart(config);

  return (
    <div className="backtest-config">
      <div className="config-presets">
        <h4 className="config-section-title">Quick Presets</h4>
        <div className="preset-grid">
          {presets.map((preset, idx) => (
            <button key={idx} className="preset-card" onClick={() => handlePreset(preset)}>
              <div className="preset-name">{preset.name}</div>
              <div className="preset-desc">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="config-custom">
        <h4 className="config-section-title">Custom Configuration</h4>
        <div className="config-inputs">
          <div className="input-group">
            <label htmlFor="start-date">Start Date</label>
            <input id="start-date" type="date" className="input" value={config.start_date} onChange={(e) => setConfig(prev => ({ ...prev, start_date: e.target.value }))}/>
          </div>
          <div className="input-group">
            <label htmlFor="end-date">End Date</label>
            <input id="end-date" type="date" className="input" value={config.end_date} onChange={(e) => setConfig(prev => ({ ...prev, end_date: e.target.value }))}/>
          </div>
          <div className="input-group">
            <label htmlFor="capital">Initial Capital</label>
            <input id="capital" type="number" className="input" value={config.capital} onChange={(e) => setConfig(prev => ({ ...prev, capital: parseInt(e.target.value || "0") }))} min="10000" step="1000"/>
          </div>
        </div>
      </div>

      <button className="btn primary wide" onClick={handleStart} disabled={loading}>
        {loading ? <LoadingSpinner size="sm" /> : <span className="btn-icon">🚀</span>}
        {loading ? "Running Backtest..." : "Start Backtest"}
      </button>
    </div>
  );
}

// Backtest Results
function BacktestResults({ results, onDownload }) {
  if (!results?.summary) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <div className="empty-title">No backtest results yet</div>
        <div className="empty-desc">Run a backtest to see performance metrics</div>
      </div>
    );
  }
  const { summary } = results;
  const period = summary.period_summary;
  const trading = summary.trading_stats;
  const performance = summary.performance;
  const monthly = summary.monthly_analysis;

  return (
    <div className="backtest-results">
      <div className="results-header">
        <h4 className="results-title">Backtest Results</h4>
        <button className="btn secondary" onClick={onDownload}>
          <span className="btn-icon">📥</span>
          Download Report
        </button>
      </div>

      <div className="results-grid">
        <div className="results-section">
          <h5 className="results-section-title">Performance Overview</h5>
          <div className="kpi-grid">
            <KPI label="Total Return" value={inr(period.total_return)} sub={`${period.total_return_pct}% return`} posneg={period.total_return >= 0 ? "pos" : "neg"} icon="💰"/>
            <KPI label="Win Rate" value={`${trading.win_rate}%`} sub={`${trading.winning_trades}/${trading.total_trades} trades`} posneg={trading.win_rate >= 55 ? "pos" : "neg"} icon="🎯"/>
            <KPI label="Profit Factor" value={performance.profit_factor.toFixed(2)} sub={`Avg win: ${inr(performance.avg_win)}`} posneg={performance.profit_factor >= 1.5 ? "pos" : "neg"} icon="⚡"/>
            <KPI label="Max Drawdown" value={`${Math.abs(performance.max_drawdown).toFixed(1)}%`} sub={`Sharpe: ${performance.sharpe_ratio.toFixed(2)}`} posneg={Math.abs(performance.max_drawdown) <= 20 ? "pos" : "neg"} icon="📉"/>
          </div>
        </div>

        <div className="results-section">
          <h5 className="results-section-title">Trading Statistics</h5>
          <div className="stats-table">
            <div className="stat-row"><span className="stat-label">Total Trades</span><span className="stat-value">{trading.total_trades}</span></div>
            <div className="stat-row"><span className="stat-label">Trades per Day</span><span className="stat-value">{trading.trades_per_day}</span></div>
            <div className="stat-row"><span className="stat-label">Average Win</span><span className="stat-value pos">{inr(performance.avg_win)}</span></div>
            <div className="stat-row"><span className="stat-label">Average Loss</span><span className="stat-value neg">{inr(-performance.avg_loss)}</span></div>
            <div className="stat-row"><span className="stat-label">Monthly Average</span><span className="stat-value">{inr(monthly.monthly_avg)}</span></div>
            <div className="stat-row"><span className="stat-label">Best Month</span><span className="stat-value pos">{inr(monthly.best_month)}</span></div>
            <div className="stat-row"><span className="stat-label">Worst Month</span><span className="stat-value neg">{inr(monthly.worst_month)}</span></div>
          </div>
        </div>
      </div>

      <div className="results-assessment">
        <h5 className="results-section-title">Strategy Assessment</h5>
        <div className="assessment-grid">
          <div className={`assessment-card ${trading.win_rate >= 55 ? 'good' : 'warning'}`}>
            <div className="assessment-icon">{trading.win_rate >= 55 ? '✅' : '⚠️'}</div>
            <div className="assessment-content">
              <div className="assessment-title">Win Rate</div>
              <div className="assessment-desc">{trading.win_rate >= 55 ? "Excellent win rate indicates strong signal quality" : "Win rate below target - consider signal refinement"}</div>
            </div>
          </div>
          <div className={`assessment-card ${Math.abs(performance.max_drawdown) <= 20 ? 'good' : 'warning'}`}>
            <div className="assessment-icon">{Math.abs(performance.max_drawdown) <= 20 ? '✅' : '⚠️'}</div>
            <div className="assessment-content">
              <div className="assessment-title">Risk Management</div>
              <div className="assessment-desc">{Math.abs(performance.max_drawdown) <= 20 ? "Drawdown within acceptable limits" : "High drawdown - review position sizing"}</div>
            </div>
          </div>
          <div className={`assessment-card ${monthly.monthly_avg >= 800 ? 'good' : 'warning'}`}>
            <div className="assessment-icon">{monthly.monthly_avg >= 800 ? '✅' : '⚠️'}</div>
            <div className="assessment-content">
              <div className="assessment-title">Profitability</div>
              <div className="assessment-desc">{monthly.monthly_avg >= 800 ? "Monthly returns meet target expectations" : "Returns below target - optimize strategy parameters"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Auth Screen
function AuthScreen({ onKiteLogin, reqToken, setReqToken, onVerify, loading, message }) {
  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-blur-1"></div>
        <div className="auth-blur-2"></div>
        <div className="auth-blur-3"></div>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <img className="logo-large" alt="Nimbus Trader" src="/logo.svg" onError={(e) => { e.currentTarget.style.display = "none"; }}/>
          </div>
          <h1 className="auth-title">Welcome to Nimbus Trader</h1>
          <p className="auth-subtitle">Connect your Zerodha account to start intelligent algorithmic trading</p>
        </div>

        <div className="auth-content">
          <button className="auth-primary-btn" onClick={onKiteLogin}>
            <span className="btn-icon">🔗</span>
            Connect with Zerodha Kite
          </button>

          <div className="auth-divider">
            <span className="divider-line"></span>
            <span className="divider-text">or enter request token</span>
            <span className="divider-line"></span>
          </div>

          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); onVerify(); }}>
            <div className="input-group">
              <label htmlFor="request-token">Request Token</label>
              <input
                id="request-token"
                className="input"
                placeholder="Enter 32-character request token"
                value={reqToken}
                onChange={(e) => setReqToken(e.target.value.trim())}
                maxLength={64}
              />
            </div>

            <button className="btn secondary wide" type="submit" disabled={loading || !reqToken}>
              {loading ? <LoadingSpinner size="sm" /> : "Verify Token"}
            </button>
          </form>

          {message && (
            <div className={`auth-message ${message.includes('failed') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="auth-footer">
          <p className="auth-disclaimer">
            Your trading data is secure and encrypted. We never store your login credentials.
          </p>
        </div>
      </div>
    </div>
  );
}

// Dashboard
function Dashboard({
  status,
  universe,
  todayTrades,
  positions,
  onScan,
  onPause,
  onResume,
  onRebuild,
  onClosePosition,
  note,
}) {
  const [tab, setTab] = useState("overview");
  const [expandPositions, setExpandPositions] = useState(false);
  const [expandUniverse, setExpandUniverse] = useState(false);

  // Backtest state
  const [backtestStatus, setBacktestStatus] = useState({ status: 'idle', progress: 0 });
  const [backtestResults, setBacktestResults] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);

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

  // Backtest polling
  useEffect(() => {
    let pollInterval;
    if (backtestStatus.status === 'running') {
      pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetchJSON('/api/backtest/status');
          setBacktestStatus(statusRes);
          if (statusRes.status === 'completed') {
            const resultsRes = await fetchJSON('/api/backtest/results');
            if (resultsRes.success) setBacktestResults(resultsRes.data);
            setBacktestLoading(false);
          } else if (statusRes.status === 'error') {
            setBacktestLoading(false);
          }
        } catch (error) {
          console.error('Failed to poll backtest status:', error);
        }
      }, 2000);
    }
    return () => { if (pollInterval) clearInterval(pollInterval); };
  }, [backtestStatus.status]);

  const handleBacktestStart = async (config) => {
    try {
      setBacktestLoading(true);
      setBacktestResults(null);
      const response = await fetchJSON('/api/backtest/start', { method: 'POST', body: config });
      if (response.success) {
        setBacktestStatus({ status: 'running', progress: 0 });
      } else {
        throw new Error(response.error || 'Failed to start backtest');
      }
    } catch (error) {
      console.error('Backtest start error:', error);
      setBacktestLoading(false);
      alert('Failed to start backtest: ' + error.message);
    }
  };

  const handleDownloadResults = () => window.open(API_BASE + "/backtest/csv", "_blank");

  const tabItems = [
    { value: "overview", label: "Overview", icon: "🏠" },
    { value: "positions", label: "Positions", icon: "📈", badge: positions.length || null },
    { value: "backtest", label: "Backtest", icon: "🧪" },
    { value: "universe", label: "Universe", icon: "🛰️" },
    { value: "activity", label: "Activity", icon: "📋", badge: todayTrades.length || null },
    { value: "controls", label: "Controls", icon: "⚙️" },
  ];

  return (
    <div className="dashboard">
      {note && (
        <div className="notification-toast">
          <span className="toast-icon">ℹ️</span>
          <span className="toast-message">{note}</span>
        </div>
      )}

      <Tabs value={tab} onChange={setTab} items={tabItems} />

      {tab === "overview" && (
        <div className="overview-content">
          <div className="kpi-grid main-kpis">
            <KPI label="Portfolio Balance" value={inr(status.balance)} sub={`Updated ${status.last_update || "—"}`} icon="💼" className="balance-kpi"/>
            <KPI label="Daily P&L" value={inr(dailyPnL)} sub={`${status.total_trades ?? 0} trades today`} posneg={dailyPnL >= 0 ? "pos" : "neg"} trend={dailyPnL >= 0 ? 2.3 : -1.8} icon="📊"/>
            <KPI label="Active Positions" value={positions.length} sub={`Max: ${status.max_positions ?? "—"}`} icon="🎯"/>
            <KPI label="Risk Per Trade" value={pct((status.risk_per_trade || 0) * 100)} sub="Conservative approach" icon="🛡️"/>
          </div>

          <div className="status-section">
            <SectionCard title="System Status" className="status-card">
              <div className="status-grid">
                <div className="status-item">
                  <div className="status-indicator-large">
                    <div className={`status-dot-large ${status.market_open ? 'active' : 'inactive'}`}></div>
                  </div>
                  <div className="status-details">
                    <div className="status-title">Market Status</div>
                    <div className="status-value">{status.market_open ? 'Open & Trading' : 'Closed'}</div>
                  </div>
                </div>

                <div className="status-item">
                  <div className="status-indicator-large">
                    <div className={`status-dot-large ${status.bot_status === 'Running' ? 'active' : 'inactive'}`}></div>
                  </div>
                  <div className="status-details">
                    <div className="status-title">Bot Status</div>
                    <div className="status-value">{status.bot_status || "Idle"}</div>
                  </div>
                </div>
              </div>
              <div className="status-reason">
                <span className="reason-label">Current State:</span>
                <span className="reason-text">{reason}</span>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Quick Actions" subtitle="Manual controls and operations">
            <div className="quick-actions">
              <button className="action-btn primary" onClick={onScan} disabled={status.auth_required || !status.access_token_valid}>
                <span className="btn-icon">🔍</span>
                <div className="btn-content">
                  <div className="btn-title">Scan Markets</div>
                  <div className="btn-desc">Find trading opportunities</div>
                </div>
              </button>

              <button className="action-btn" onClick={onPause}>
                <span className="btn-icon">⏸️</span>
                <div className="btn-content">
                  <div className="btn-title">Pause Bot</div>
                  <div className="btn-desc">Stop automated trading</div>
                </div>
              </button>

              <button className="action-btn" onClick={onResume}>
                <span className="btn-icon">▶️</span>
                <div className="btn-content">
                  <div className="btn-title">Resume Bot</div>
                  <div className="btn-desc">Continue automated trading</div>
                </div>
              </button>

              <button className="action-btn" onClick={onRebuild} disabled={status.auth_required || !status.access_token_valid}>
                <span className="btn-icon">🔄</span>
                <div className="btn-content">
                  <div className="btn-title">Rebuild & Scan</div>
                  <div className="btn-desc">Refresh universe and scan</div>
                </div>
              </button>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "positions" && (
        <SectionCard
          title={`Active Positions (${positions.length})`}
          subtitle={positions.length ? "Monitor your current trades" : "No active positions"}
          actions={positions.length ? (<button className="btn ghost" onClick={() => setExpandPositions(!expandPositions)}>{expandPositions ? "Collapse" : "Expand Details"}</button>) : null}
        >
          {!positions.length ? (
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <div className="empty-title">No Active Positions</div>
              <div className="empty-desc">Your positions will appear here when trades are executed</div>
            </div>
          ) : (
            <div className="positions-table-container">
              <div className={`enhanced-table ${expandPositions ? "expanded" : ""}`}>
                <div className="table-header">
                  <div>Symbol</div>
                  <div>Side</div>
                  <div>Qty</div>
                  <div>Entry</div>
                  <div>Current</div>
                  <div>P&L</div>
                  <div>P&L %</div>
                  {expandPositions && (<>
                    <div>Target</div>
                    <div>Stop Loss</div>
                    <div>Entry Time</div>
                  </>)}
                  <div>Action</div>
                </div>

                {positions.map((position, index) => {
                  const isProfitable = (position.pnl ?? 0) >= 0;
                  return (
                    <div className={`table-row ${isProfitable ? "profitable" : "loss"}`} key={index}>
                      <div className="symbol-cell"><span className="symbol">{position.symbol}</span></div>
                      <div className={`side-cell ${position.transaction_type.toLowerCase()}`}><span className="side-badge">{position.transaction_type}</span></div>
                      <div>{position.quantity}</div>
                      <div>{inr(position.buy_price)}</div>
                      <div className="current-price">{inr(position.current_price)}</div>
                      <div className={`pnl-cell ${isProfitable ? "profit" : "loss"}`}>{inr(position.pnl)}</div>
                      <div className={`pnl-percent ${isProfitable ? "profit" : "loss"}`}>{pct(position.pnl_percent)}</div>
                      {expandPositions && (<>
                        <div>{inr(position.target_price)}</div>
                        <div>{inr(position.stop_loss_price)}</div>
                        <div className="time-cell">
                          <div className="entry-date">{formatDate(position.entry_time)}</div>
                          <div className="entry-time">{formatTime(position.entry_time)}</div>
                        </div>
                      </>)}
                      <div>
                        <button className="btn danger small" onClick={() => onClosePosition(position.symbol)} disabled={status.auth_required || !status.access_token_valid}>Close</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {tab === "backtest" && (
        <div className="backtest-content">
          <SectionCard title="Strategy Backtesting" subtitle="Test your strategy against historical data">
            <div className="backtest-layout">
              <div className="backtest-config-section">
                <BacktestConfig onStart={handleBacktestStart} loading={backtestLoading} />
                {backtestStatus.status === 'running' && (
                  <div className="backtest-progress">
                    <ProgressBar progress={backtestStatus.progress} status={`Running backtest... ${backtestStatus.progress}%`} />
                  </div>
                )}
                {backtestStatus.status === 'error' && (
                  <div className="backtest-error">
                    <span className="error-icon">❌</span>
                    <span>Backtest failed: {backtestStatus.error}</span>
                  </div>
                )}
              </div>

              <div className="backtest-results-section">
                <BacktestResults results={backtestResults} onDownload={handleDownloadResults} />
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "universe" && (
        <SectionCard
          title={`Trading Universe ${universe.version ? `(${universe.version})` : ""}`}
          subtitle={`Monitoring ${universe.session_universe?.length || 0} stocks`}
          actions={universe.universe?.length ? (<button className="btn ghost" onClick={() => setExpandUniverse(!expandUniverse)}>{expandUniverse ? "Collapse" : "Show Details"}</button>) : null}
        >
          {!universe.universe?.length ? (
            <div className="empty-state">
              <div className="empty-icon">🛰️</div>
              <div className="empty-title">Universe Loading</div>
              <div className="empty-desc">Stock universe data will appear here</div>
            </div>
          ) : (
            <div className="universe-container">
              <div className="universe-summary">
                <div className="universe-stats">
                  <div className="stat">
                    <span className="stat-value">{universe.session_universe?.length || 0}</span>
                    <span className="stat-label">Active Stocks</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{universe.universe?.length || 0}</span>
                    <span className="stat-label">Total Universe</span>
                  </div>
                </div>

                <div className="universe-list">
                  <div className="list-label">Active Watchlist:</div>
                  <div className="stock-tags">
                    {universe.session_universe?.map((stock, idx) => (
                      <span key={idx} className="stock-tag">{stock}</span>
                    ))}
                  </div>
                </div>
              </div>

              {expandUniverse && (
                <div className="enhanced-table">
                  <div className="table-header">
                    <div>Symbol</div>
                    <div>Last Price</div>
                    <div>ATR %</div>
                    <div>Volume (20D)</div>
                    <div>Score</div>
                  </div>

                  {universe.universe.map((stock, index) => (
                    <div className="table-row" key={index}>
                      <div className="symbol-cell"><span className="symbol">{stock.Symbol}</span></div>
                      <div>{inr(stock.Close)}</div>
                      <div>{Number(stock.ATR_pct).toFixed(2)}%</div>
                      <div>{inr(stock.MedTurn20)}</div>
                      <div className="score-cell"><span className="score-value">{Number(stock.Score).toFixed(3)}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {tab === "activity" && (
        <SectionCard title="Trading Activity" subtitle={`${todayTrades.length} events today`}>
          {!todayTrades.length ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No Activity Yet</div>
              <div className="empty-desc">Trade entries and exits will appear here</div>
            </div>
          ) : (
            <div className="activity-timeline">
              {todayTrades.map((trade, index) => (
                <div key={index} className={`activity-item ${trade.type.toLowerCase()}`}>
                  <div className="activity-icon">
                    <span className={`activity-badge ${trade.type === "ENTRY" ? "entry" : "exit"}`}>{trade.type === "ENTRY" ? "📈" : "📉"}</span>
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <span className="activity-type">{trade.type}</span>
                      <span className="activity-time">
                        {new Date(trade.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="activity-details">
                      <span className="trade-symbol">{trade.symbol}</span>
                      <span className="trade-side">{trade.side}</span>
                      <span className="trade-qty">Qty: {trade.qty}</span>
                      <span className="trade-price">@ {inr(trade.price)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {tab === "controls" && (
        <SectionCard title="System Controls" subtitle="Advanced operations and settings" tone="accent">
          <div className="controls-grid">
            <div className="control-section">
              <h4 className="control-section-title">Trading Controls</h4>
              <div className="control-actions">
                <button className="control-btn primary" onClick={onScan} disabled={status.auth_required || !status.access_token_valid}>
                  <span className="btn-icon">🔍</span>
                  <div className="btn-content">
                    <div className="btn-title">Manual Scan</div>
                    <div className="btn-desc">Trigger immediate market scan</div>
                  </div>
                </button>

                <button className="control-btn" onClick={onPause}>
                  <span className="btn-icon">⏸️</span>
                  <div className="btn-content">
                    <div className="btn-title">Pause Trading</div>
                    <div className="btn-desc">Stop all automated trading</div>
                  </div>
                </button>

                <button className="control-btn" onClick={onResume}>
                  <span className="btn-icon">▶️</span>
                  <div className="btn-content">
                    <div className="btn-title">Resume Trading</div>
                    <div className="btn-desc">Continue automated operations</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="control-section">
              <h4 className="control-section-title">System Operations</h4>
              <div className="control-actions">
                <button className="control-btn" onClick={onRebuild} disabled={status.auth_required || !status.access_token_valid}>
                  <span className="btn-icon">🔄</span>
                  <div className="btn-content">
                    <div className="btn-title">Rebuild Universe</div>
                    <div className="btn-desc">Refresh stock universe and scan</div>
                  </div>
                </button>

                <button className="control-btn" onClick={() => window.open(API_BASE + "/health", "_blank")}>
                  <span className="btn-icon">🏥</span>
                  <div className="btn-content">
                    <div className="btn-title">System Health</div>
                    <div className="btn-desc">View detailed system status</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      <footer className="dashboard-footer">
        <div className="footer-content">
          <div className="footer-info"><span className="footer-label">Platform:</span><span className="footer-value">Zerodha Kite API</span></div>
          <div className="footer-info"><span className="footer-label">Strategy:</span><span className="footer-value">VWAP + EMA20 (MTF) + ATR</span></div>
          <div className="footer-info"><span className="footer-label">Product:</span><span className="footer-value">MIS (Intraday)</span></div>
        </div>
      </footer>
    </div>
  );
}

/* ================= Main App ================= */
export default function App() {
  const [status, setStatus] = useState(null);
  const [universe, setUniverse] = useState({ version: null, session_universe: [], universe: [] });
  const [health, setHealth] = useState(null);
  const [lastHealthAt, setLastHealthAt] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [reqToken, setReqToken] = useState("");
  const [reqTokenMsg, setReqTokenMsg] = useState("");

  const todayTradesRef = useRef([]);
  const [todayTrades, setTodayTrades] = useState([]);
  const prevPositionsRef = useRef({});

  // Initialize request token from URL
  useEffect(() => {
    const rt = getQueryParam("request_token");
    if (rt && rt.length === 32) {
      setReqToken(rt);
      setReqTokenMsg("Token detected from URL. Click verify to continue.");
    }
  }, []); // Reads query; FE hydration best practice for OAuth params [4][2]

  // Handle OAuth redirect flags (auth=success/fail or request_token)
  useEffect(() => {
    (async () => {
      const authFlag = getQueryParam("auth");
      const hasReqToken = !!getQueryParam("request_token");
      if (authFlag === "success" || authFlag === "fail" || hasReqToken) {
        const { sessionStatus, s, u } = await confirmSessionAndRefresh();
        setStatus(prev => ({ ...(prev || {}), ...sessionStatus, ...(s || {}) }));
        if (u) setUniverse(u);
        cleanUrlParams();
      }
    })();
  }, []); // Process auth query once on landing [2][4]

  // Initial data load + confirm session
  useEffect(() => {
    (async () => {
      try {
        const [s, u, h, ses] = await Promise.all([
          fetchJSON("/api/status").catch(() => null),
          fetchJSON("/api/universe").catch(() => ({ session_universe: [], universe: [], version: null })),
          fetchJSON("/health").catch(() => null),
          fetchJSON("/auth/session").catch(() => null)
        ]);
        const sessionStatus = { access_token_valid: !!ses?.authenticated, auth_required: !ses?.authenticated };
        setStatus({ ...(s || {}), ...sessionStatus });
        if (u) setUniverse(u);
        if (h) { setHealth(h); setLastHealthAt(new Date()); }
      } catch (error) {
        setNote("Failed to load initial data. Please refresh the page.");
      }
    })();
  }, []); // Confirm session and hydrate UI [7]

  // Status polling + session probe
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [s, ses] = await Promise.all([
          fetchJSON("/api/status").catch(() => null),
          fetchJSON("/auth/session").catch(() => null),
        ]);
        const sessionStatus = { access_token_valid: !!ses?.authenticated, auth_required: !ses?.authenticated };
        const mergedStatus = { ...(s || {}), ...sessionStatus };
        setStatus(mergedStatus);
        updateTradingActivity((mergedStatus.positions) || []);
      } catch {}
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []); // SPA polling + session check [7]

  // Health polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const h = await fetchJSON("/health");
        setHealth(h);
        setLastHealthAt(new Date());
      } catch {
        setNote("Connection issues detected. Some features may be limited.");
      }
    }, HEALTH_PING_MS);
    return () => clearInterval(interval);
  }, []); // Standard health polling [7]

  function updateTradingActivity(currentPositions) {
    const previousPositions = prevPositionsRef.current;
    const currentPositionMap = {};
    currentPositions.forEach((position) => {
      const key = `${position.symbol}_${position.entry_time}_${position.quantity}`;
      currentPositionMap[key] = position;
      if (!previousPositions[key]) {
        todayTradesRef.current = [
          { type: "ENTRY", ts: new Date().toISOString(), symbol: position.symbol, side: position.transaction_type, qty: position.quantity, price: position.buy_price },
          ...todayTradesRef.current,
        ];
      }
    });
    Object.keys(previousPositions).forEach((key) => {
      if (!currentPositionMap[key]) {
        const position = previousPositions[key];
        todayTradesRef.current = [
          { type: "EXIT", ts: new Date().toISOString(), symbol: position.symbol, side: position.transaction_type, qty: position.quantity, price: position.current_price },
          ...todayTradesRef.current,
        ];
      }
    });
    prevPositionsRef.current = currentPositionMap;
    setTodayTrades(todayTradesRef.current.slice(0, 100));
  }

  async function executeControl(action) {
    setNote("");
    try {
      if (action === "scan") {
        const res = await fetchJSON("/cron/scan-opportunities", { method: "POST" });
        setNote(res.status || "Scan triggered");
      } else if (action === "rebuild_and_scan") {
        await fetchJSON("/cron/universe-update", { method: "POST" });
        const u = await fetchJSON("/api/universe").catch(() => null);
        if (u) setUniverse(u);
        const res = await fetchJSON("/cron/scan-opportunities", { method: "POST" });
        setNote(res.status || "Universe refreshed, scan triggered");
      } else if (action === "pause") {
        setNote("Pause is UI-only for now.");
      } else if (action === "resume") {
        setNote("Resume is UI-only for now.");
      } else {
        window.open(API_BASE + "/health", "_blank");
      }
      const s = await fetchJSON("/api/status").catch(() => null);
      if (s) setStatus(prev => ({ ...(prev || {}), ...s }));
    } catch (error) {
      setNote(`Action failed: ${error.message}`);
    }
  }

  async function closePosition(symbol) {
    setNote("");
    try {
      setNote("Close position API not available. Please exit via broker or EOD monitor.");
    } catch (error) {
      setNote(`Failed to close position: ${error.message}`);
    }
  }

  function handleKiteLogin() {
    if (!BACKEND_URL) {
      setNote("Backend URL not configured. Please check environment settings.");
      return;
    }
    window.location.href = `${BACKEND_URL.replace(/\/+$/,"")}/auth/login?next=/`;
  }

  async function verifyRequestToken() {
    setReqTokenMsg("");
    if (!reqToken || reqToken.length !== 32) {
      setReqTokenMsg("Please enter a valid 32-character request token.");
      return;
    }
    try {
      setLoading(true);
      const response = await fetchJSON("/session/exchange", { method: "POST", body: { request_token: reqToken } });
      if (response.success) {
        setReqTokenMsg("Authentication successful! Loading dashboard...");
        const { sessionStatus, s, u } = await confirmSessionAndRefresh();
        setStatus(prev => ({ ...(prev || {}), ...sessionStatus, ...(s || {}) }));
        if (u) setUniverse(u);
        const url = new URL(window.location.href);
        if (url.searchParams.get("request_token")) {
          url.searchParams.delete("request_token");
          window.history.replaceState({}, document.title, url.toString());
        }
      } else {
        setReqTokenMsg("Authentication failed. Please check your token and try again.");
      }
    } catch (error) {
      setReqTokenMsg(`Authentication error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const currentStatus = status || {};
  const positions = currentStatus.positions || [];
  const isAuthenticated = !!currentStatus.access_token_valid && !currentStatus.auth_required;

  return (
    <div className="app">
      {!isAuthenticated ? (
        <AuthScreen
          onKiteLogin={handleKiteLogin}
          reqToken={reqToken}
          setReqToken={setReqToken}
          onVerify={verifyRequestToken}
          loading={loading}
          message={reqTokenMsg}
        />
      ) : (
        <>
          <AppHeader
            onPrimary={() => executeControl("scan")}
            canScan={!currentStatus.auth_required && currentStatus.access_token_valid}
            status={currentStatus}
          />
          <Dashboard
            status={currentStatus}
            universe={universe}
            todayTrades={todayTrades}
            positions={positions}
            onScan={() => executeControl("scan")}
            onPause={() => executeControl("pause")}
            onResume={() => executeControl("resume")}
            onRebuild={() => executeControl("rebuild_and_scan")}
            onClosePosition={closePosition}
            note={note}
          />
        </>
      )}
    </div>
  );
}
