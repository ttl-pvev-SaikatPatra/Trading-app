import React, { useEffect, useState } from "react";
import "./index.css";

function App() {
  const [status, setStatus] = useState({});
  const [token, setToken] = useState("");
  const [countdown, setCountdown] = useState(900); // 15 min default
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError("Failed to fetch status");
    }
  };

  const authenticate = async () => {
    try {
      const res = await fetch("/session/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_token: token }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("Auth failed");
      fetchStatus();
    } catch (err) {
      setError("Authentication failed");
    }
  };

  return (
    <div className="container">
      <h1>📈 Trading Bot Dashboard</h1>

      <div className="section">
        <label>Request Token:</label>
        <input value={token} onChange={(e) => setToken(e.target.value)} />
        <button onClick={authenticate}>Authenticate</button>
      </div>

      <div className="section">
        <p><strong>Bot Status:</strong> {status.bot_status}</p>
        <p><strong>Balance:</strong> ₹{status.balance?.toFixed(2)}</p>
        <p><strong>Daily PnL:</strong> ₹{status.daily_pnl?.toFixed(2)}</p>
        <p><strong>Trades Today:</strong> {status.total_trades}</p>
        <p><strong>Win Rate:</strong> {status.win_rate}%</p>
        <p><strong>Market:</strong> {status.market_open ? "Open" : "Closed"}</p>
        <p><strong>Next Trade In:</strong> {countdown}s</p>
      </div>

      <div className="section">
        <h2>Active Positions</h2>
        {status.positions?.length ? (
          <ul>
            {status.positions.map((pos) => (
              <li key={pos.symbol}>
                {pos.symbol} ({pos.transaction_type}) - Qty: {pos.quantity} - PnL: ₹{pos.pnl.toFixed(2)}
              </li>
            ))}
          </ul>
        ) : (
          <p>No active positions</p>
        )}
      </div>

      <div className="section">
        <h2>Keep-Alive Status</h2>
        <KeepAlive />
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}

function KeepAlive() {
  const [ping, setPing] = useState("");

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/health");
        const data = await res.json();
        setPing(`✅ ${data.status} at ${data.timestamp}`);
      } catch {
        setPing("❌ Keep-alive failed");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return <p>{ping}</p>;
}

export default App;
