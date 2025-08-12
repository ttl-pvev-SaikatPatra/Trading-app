import React, { useState, useEffect } from 'react';
import './App.css';

// Update this with your Render bot URL
const BOT_API_URL = 'https://trading-bot-ynt2.onrender.com';
const KITE_API_KEY = 'kzupphvp3hhsui2o'; // Your API key

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [requestToken, setRequestToken] = useState('');
  const [newToken, setNewToken] = useState('');
  const [authStep, setAuthStep] = useState(1);
  const [botInitialized, setBotInitialized] = useState(false);

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
    } finally {
      setRefreshing(false);
    }
  };

  // New function to authenticate and initialize bot
  const authenticateBot = async () => {
    try {
      if (!requestToken.trim() || requestToken.length !== 32) {
        alert('Please enter a valid 32-character request token');
        return;
      }

      const response = await fetch(`${BOT_API_URL}/set-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_token: requestToken.trim() })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Authentication successful! Bot is initializing...');
        setShowAuthModal(false);
        setRequestToken('');
        setBotInitialized(true);
        // Auto-initialize the bot
        await initializeBot();
        fetchBotStatus();
      } else {
        alert('❌ Authentication failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('❌ Failed to authenticate. Check connection.');
    }
  };

  // New function to initialize the bot
  const initializeBot = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/initialize`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('🤖 Bot initialized successfully!');
        fetchBotStatus();
      }
    } catch (error) {
      console.error('Failed to initialize bot:', error);
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

  const openZerodhaLogin = () => {
    const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${KITE_API_KEY}&v=3`;
    window.open(loginUrl, '_blank');
    setAuthStep(2);
  };

  // Rest of your existing functions remain the same...
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
    const interval = setInterval(fetchBotStatus, 30000);
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
        {/* Authentication Section - Show if bot not initialized */}
        {!botData.access_token_valid && (
          <div className="card auth-card">
            <h2>🔐 Bot Authentication Required</h2>
            <p>Your trading bot needs to be authenticated with Zerodha to start trading.</p>
            <button 
              className="btn btn-primary btn-large"
              onClick={() => setShowAuthModal(true)}
            >
              🚀 Authenticate & Start Bot
            </button>
          </div>
        )}

        {/* Stats Grid - Only show if authenticated */}
        {botData.access_token_valid && (
          <>
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
                className="btn btn-primary"
                onClick={() => controlBot('scan')}
              >
                🔄 Refresh Stock List & Scan
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
          </>
        )}

        {/* Token Management */}
        <div className="card">
          <div className="token-header">
            <h2>🔑 Token Management</h2>
            <div>
              <button 
                className="btn btn-primary"
                onClick={() => setShowTokenModal(true)}
                style={{ marginRight: '10px' }}
              >
                Refresh Token
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAuthModal(true)}
              >
                Re-authenticate
              </button>
            </div>
          </div>
          
          <div className="token-info">
            <p><strong>Status:</strong> 
              <span className={botData.access_token_valid ? 'profit' : 'loss'}>
                {botData.access_token_valid ? ' Valid ✅' : ' Invalid ❌'}
              </span>
            </p>
          </div>
        </div>

        {/* Rest of your existing components remain the same */}
        {/* Active Positions */}
        {botData.access_token_valid && botData.positions && (
          <div className="card">
            <h2>📈 Active Positions</h2>
            {botData.positions.length === 0 ? (
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
        )}

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

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content auth-modal" onClick={e => e.stopPropagation()}>
            <h3>🔐 Authenticate Trading Bot</h3>
            
            {authStep === 1 && (
              <div>
                <p><strong>Step 1:</strong> Click the button below to login to Zerodha:</p>
                <button 
                  className="btn btn-primary btn-large"
                  onClick={openZerodhaLogin}
                >
                  🔗 Login to Zerodha
                </button>
                <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
                  This will open Zerodha login in a new tab. After login, come back here.
                </p>
              </div>
            )}

            {authStep === 2 && (
              <div>
                <p><strong>Step 2:</strong> After logging in, copy the request_token from the URL:</p>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  Example: https://your-redirect-url/?request_token=<strong>XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX</strong>
                </p>
                
                <textarea
                  placeholder="Paste the 32-character request_token here..."
                  value={requestToken}
                  onChange={e => setRequestToken(e.target.value)}
                  rows={3}
                  className="token-input"
                />

                <div className="modal-buttons">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAuthModal(false);
                      setRequestToken('');
                      setAuthStep(1);
                    }}
                  >
                    Cancel
                  </button>
                  
                  <button 
                    className="btn btn-primary"
                    onClick={authenticateBot}
                    disabled={!requestToken.trim()}
                  >
                    🚀 Start Bot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Token Refresh Modal - Keep your existing modal */}
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
