// src/App.js
import React, { useEffect, useState } from "react";
import "./index.css";

const API = "http://localhost:5000"; // Flask backend

export default function App() {
  const [balance, setBalance] = useState(null);
  const [pnl, setPnl] = useState({ realized: 0, unrealized: 0 });
  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState({});
  const [lastPing, setLastPing] = useState(null);

  // Generic fetch helper
  const fetchData = async (endpoint, setter) => {
    try {
      const res = await fetch(`${API}${endpoint}`);
      const data = await res.json();
      setter(data);
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
    }
  };

  useEffect(() => {
    fetchData("/balance", setBalance);
    fetchData("/pnl", setPnl);
    fetchData("/sessions/active", setPositions);
    fetchData("/sessions/history", setHistory);
    fetchData("/status", setStatus);
    fetchData("/ping", (d) => setLastPing(d.time));

    const interval = setInterval(() => {
      fetchData("/balance", setBalance);
      fetchData("/pnl", setPnl);
      fetchData("/sessions/active", setPositions);
      fetchData("/status", setStatus);
      fetchData("/ping", (d) => setLastPing(d.time));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Trading Bot Dashboard</h1>
        <span className={`status ${status.status === "running" ? "ok" : "stopped"}`}>
          {status.status || "Unknown"}
        </span>
      </header>

      <section className="card">
        <h2>Account Balance</h2>
        <p><strong>Cash:</strong> ₹{balance?.balance?.toFixed(2) || "--"}</p>
        <p><strong>Equity:</strong> ₹{balance?.equity?.toFixed(2) || "--"}</p>
        <p><strong>Max Positions:</strong> {balance?.max_positions || "--"}</p>
      </section>

      <section className="card">
        <h2>Today’s P&L</h2>
        <p className="profit">Realized: ₹{pnl.realized.toFixed(2)}</p>
        <p className="profit">Unrealized: ₹{pnl.unrealized.toFixed(2)}</p>
        <p>Total Trades: {pnl.today_trades || "--"}</p>
      </section>

      <section className="card">
        <h2>Active Positions</h2>
        {positions.length === 0 ? <p>No open positions</p> : (
          <table>
            <thead>
              <tr>
                <th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>SL</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => (
                <tr key={i}>
                  <td>{pos.symbol}</td>
                  <td>{pos.side}</td>
                  <td>{pos.quantity}</td>
                  <td>{pos.entry_price}</td>
                  <td>{pos.stop_loss}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Trade History (Today)</h2>
        {history.length === 0 ? <p>No trades yet</p> : (
          <ul>
            {history.map((t, i) => (
              <li key={i}>
                {t.timestamp} — {t.symbol} {t.side} {t.quantity} @ {t.price}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer>
        <p><strong>Last Ping:</strong> {lastPing || "--"}</p>
        <p><strong>Reason:</strong> {status.reason_no_trade}</p>
        <p><strong>Next Scan:</strong> {status.next_scan}</p>
      </footer>
    </div>
  );
}
