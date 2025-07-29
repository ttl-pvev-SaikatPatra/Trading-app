import React, { useState, useEffect } from 'react';
import './App.css';

// IMPORTANT: Update this with your actual trading bot Replit URL
const BOT_API_URL = 'https://351226f4-1f2a-4443-940f-ae9a0d2e2dcf-00-3jny10d9b384w.pike.replit.dev';

function App() {
  const [botData, setBotData] = useState({
    balance: 0,
    positions: [],
    orders: [],
    market_open: false,
    bot_status: 'Loading...',
    access_token_valid: false,
    daily_pnl: 0,
    total_trades: 0,
    win_rate: 0,
    last_update: 'Never'
  });

  const [refreshing, setRefreshing] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newToken, setNewToken] = useState('');

  const fetchBotStatus = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`${BOT_API_URL}/api/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      setBotData(prevData => ({
        ...prevData,
        ...data,
        last_update: new Date().toLocaleTimeString('en-IN')
      }));
    } catch (error) {
      console.error('Connection Error:', error);
      // Don't show alert in production, just log error
    } finally {
      setRefreshing(false);
    }
  };

  const controlBot = async (action) => {
    try {
      const response = await fetch(`${BOT_API_URL}/control/${action}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      alert(data.status || `${action} executed successfully`);
      fetchBotStatus();
    } catch (error) {
      alert(`Failed to ${action} bot. Check connection.`);
    }
  };

  const refreshAccessToken = async () => {
    try {
      if (!newToken.trim() || newToken.length !== 32) {
        alert('Please enter a valid 32-character access token');
        return;
      }

      const response = await fetch(`${BOT_API_URL}/api/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: newToken.trim() })
      });

      const data = await response.json();

      if (data.success) {
        alert('Access token updated successfully ✅');
        setShowTokenModal(false);
        setNewToken('');
        fetchBotStatus();
      } else {
        alert('Error: ' + (data.message || 'Failed to update token'));
      }
    } catch (error) {
      alert('Failed to refresh access token');
    }
  };

  const closePosition = async (symbol) => {
    if (window.confirm(`Are you sure you want to close ${symbol}?`)) {
      try {
        await fetch(`${BOT_API_URL}/api/close-position`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol })
        });
        fetchBotStatus();
      } catch (error) {
        alert('Failed to close position');
      }
    }
  };

  const calculateTotalPnL = () => {
    return botData.positions?.reduce((total, pos) => {
      const pnl = pos.pnl || 0;
      return total + pnl;
    }, 0) || 0;
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0'}`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      return new Date(timeString).toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return timeString;
    }
  };

  useEffect(() => {
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>🤖 Trading Bot Dashboard</h1>
          <span className={`market-status ${botData.market_open ? 'open' : 'closed'}`}>
            {botData.market_open ? '🟢 Market Open' : '🔴 Market Closed'}
          </span>
        </div>
        <button 
          className="refresh-btn"
          onClick={fetchBotStatus}
          disabled={refreshing}
        >
          {refreshing ? '🔄' : '⚙️'}
        </button>
      </header>

      <main className="main-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{formatCurrency(botData.balance)}</h3>
            <p>Available Balance</p>
          </div>

          <div className="stat-card">
            <h3>{botData.positions?.length || 0}</h3>
            <p>Active Positions</p>
          </div>

          <div className="stat-card">
            <h3 className={calculateTotalPnL() >= 0 ? 'profit' : 'loss'}>
              {formatCurrency(calculateTotalPnL())}
            </h3>
            <p>Unrealized P&L</p>
          </div>

          <div className="stat-card">
            <h3 className={botData.daily_pnl >= 0 ? 'profit' : 'loss'}>
              {formatCurrency(botData.daily_pnl)}
            </h3>
            <p>Daily P&L</p>
          </div>
        </div>

        {/* Bot Controls */}
        <div className="controls-section">
          <button 
            className="btn btn-success"
            onClick={() => controlBot('scan')}
          >
            🔍 Scan Now
          </button>

          <button 
            className="btn btn-warning"
            onClick={() => controlBot('pause')}
          >
            ⏸️ Pause Bot
          </button>

          <button 
            className="btn btn-info"
            onClick={() => controlBot('resume')}
          >
            ▶️ Resume
          </button>
        </div>

        {/* Token Management */}
        <div className="card">
          <div className="token-header">
            <h2>🔑 Token Management</h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowTokenModal(true)}
            >
              Refresh Token
            </button>
          </div>
          
          <div className="token-info">
            <p><strong>Status:</strong> 
              <span className={botData.access_token_valid ? 'profit' : 'loss'}>
                {botData.access_token_valid ? ' Valid ✅' : ' Invalid ❌'}
              </span>
            </p>
          </div>
        </div>

        {/* Active Positions */}
        <div className="card">
          <h2>📈 Active Positions</h2>
          {!botData.positions || botData.positions.length === 0 ? (
            <p className="no-positions">No active positions</p>
          ) : (
            <div className="positions-list">
              {botData.positions.map((position, index) => {
                const pnl = position.pnl || 0;
                const pnlPercent = position.pnl_percent || 0;

                return (
                  <div key={index} className="position-card">
                    <div className="position-header">
                      <div>
                        <h4>{position.symbol}</h4>
                        <p>{position.transaction_type || 'BUY'} • {position.quantity} shares</p>
                      </div>
                      <div className="pnl-info">
                        <p className={pnl >= 0 ? 'profit' : 'loss'}>
                          {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                        </p>
                        <p className={`pnl-percent ${pnl >= 0 ? 'profit' : 'loss'}`}>
                          ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>

                    <div className="position-details">
                      <div className="price-row">
                        <span>Entry: {formatCurrency(position.buy_price)}</span>
                        <span>Current: {formatCurrency(position.current_price)}</span>
                      </div>
                      <div className="price-row">
                        <span>Target: {formatCurrency(position.target_price)}</span>
                        <span>Stop Loss: {formatCurrency(position.stop_loss_price)}</span>
                      </div>
                      <p>Entry Time: {formatTime(position.entry_time)}</p>
                    </div>

                    <button 
                      className="btn btn-danger close-btn"
                      onClick={() => closePosition(position.symbol)}
                    >
                      Close Position
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bot Status */}
        <div className="card">
          <h2>🤖 Bot Status</h2>
          <div className="status-info">
            <p><strong>Status:</strong> {botData.bot_status}</p>
            <p><strong>Last Update:</strong> {botData.last_update}</p>
            <p><strong>Total Trades:</strong> {botData.total_trades}</p>
            <p><strong>Win Rate:</strong> {botData.win_rate?.toFixed(1) || 0}%</p>
          </div>
        </div>
      </main>

      {/* Token Modal */}
      {showTokenModal && (
        <div className="modal-overlay" onClick={() => setShowTokenModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>🔑 Refresh Access Token</h3>
            <p>Enter your new Zerodha access token below:</p>
            
            <textarea
              placeholder="Enter 32-character access token here..."
              value={newToken}
              onChange={e => setNewToken(e.target.value)}
              rows={3}
              className="token-input"
            />

            <div className="modal-buttons">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowTokenModal(false);
                  setNewToken('');
                }}
              >
                Cancel
              </button>
              
              <button 
                className="btn btn-primary"
                onClick={refreshAccessToken}
                disabled={!newToken.trim()}
              >
                Update Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
