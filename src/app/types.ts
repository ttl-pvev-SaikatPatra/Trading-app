// This file will define the shape of our data objects

export interface Status {
  broker_connected: boolean;
  trading_enabled: boolean;
  dry_run_mode: boolean;
  daily_pnl: number;
}

export interface Funds {
  available_margin: number;
  used_margin: number;
  total_balance: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  product: string;
}

// Add this interface to your existing types.ts file
export interface UniverseStock {
  symbol: string;
  is_active: boolean;
}
