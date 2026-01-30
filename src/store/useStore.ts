import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  username: string;
}

interface Wallet {
  id: string;
  currency: string;
  balance: number;
  lockedBalance: number;
  address?: string;
}

interface Trade {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  amount: number;
  price: number;
  total: number;
  fee: number;
  status: string;
  createdAt: string;
}

interface Price {
  pair: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface AppState {
  user: User | null;
  wallets: Wallet[];
  trades: Trade[];
  prices: Price[];
  selectedPair: string;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setWallets: (wallets: Wallet[]) => void;
  setTrades: (trades: Trade[]) => void;
  setPrices: (prices: Price[]) => void;
  setSelectedPair: (pair: string) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  wallets: [],
  trades: [],
  prices: [],
  selectedPair: 'BTC/USDT',
  isLoading: true,

  setUser: (user) => set({ user }),
  setWallets: (wallets) => set({ wallets }),
  setTrades: (trades) => set({ trades }),
  setPrices: (prices) => set({ prices }),
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, wallets: [], trades: [] }),
}));
