export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  wallet_balance_coins: number;
  wallet_balance_naira: number;
  locked_balance_coins?: number;
  won_matches: number;
  total_matches: number;
  win_rate: number;
  age_verified: boolean;
  terms_accepted_at: string;
  created_at: string;
}

export interface WalletState {
  available_coins: number;
  locked_coins: number;
  total_coins: number;
  available_naira: number;
  locked_naira: number;
  total_naira: number;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'stake_locked'
  | 'win_payout'
  | 'match_refund'
  | 'platform_rake';

export type TransactionStatus = 'completed' | 'pending' | 'locked';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount_coins: number;
  amount_naira: number;
  status: TransactionStatus;
  reference_id: string;
  description: string;
  created_at: string;
  match_id?: string;
}

export interface ActiveMatch {
  id: string;
  gameId: GameId;
  stakeCoins: number;
  potCoins: number;
  opponentName: string;
  status: 'searching' | 'in_progress';
  startedAt: string;
  remainingSeconds: number;
}

export type DashboardTab = 'home' | 'arena' | 'rankings' | 'wallet' | 'profile';

export interface BankInfo {
  code: string;
  name: string;
  slug: string;
}

export interface SavedBank {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
}

export interface StakeTier {
  coins: number;
  naira: number;
  popular?: boolean;
  label: string;
}

export type GameId = 'whot' | 'chess' | 'trivia' | 'ludo';

export interface GameInfo {
  id: GameId;
  name: string;
  tagline: string;
  category: string;
  avgMatchDuration: string;
  skillType: string;
  image: string;
  rulesHighlight: string[];
  description: string;
}

export interface MatchRoom {
  roomId: string;
  gameId: GameId;
  stakeCoins: number;
  creatorUsername: string;
  creatorAvatar?: string;
  createdAt: number;
  expiresAt: number;
  status: 'waiting' | 'in_progress' | 'completed';
}

export interface BotRosterEntry {
  id: string;
  username: string;
  avatar_url?: string;
  location: string;
  chess_rating: number;
  whot_rating: number;
  trivia_rating: number;
  ludo_rating: number;
}

export type MatchmakingQueueStatus = 'waiting' | 'matched' | 'cancelled' | 'acknowledged';
export type MatchStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'expired';


export interface MatchParticipant {
  user_id: string;
  username: string;
  avatar_url?: string;
  color: 'white' | 'black';
  rating: number;
  location?: string;
  is_bot?: boolean;
}

export interface MatchData {
  id: string;
  game_id: GameId;
  is_private: boolean;
  room_code?: string;
  stake_amount: number;
  pot_amount: number;
  fee_amount: number;
  payout_amount: number;
  status: MatchStatus;
  participants: MatchParticipant[];
  created_at: string;
}

export interface UsernameCheckResponse {
  available: boolean;
  message: string;
  suggestions: string[];
}

export type UsernameCheckResult = UsernameCheckResponse;

export interface QueueEntry {
  id: string;
  user_id: string;
  game_id: GameId;
  stake_amount: number;
  status: MatchmakingQueueStatus;
  created_at: string;
}

export type LegalDocType = 'terms' | 'privacy' | 'fair_play' | 'responsible_gaming' | 'skill_compliance';

export const getSafeCoins = (amt: any): number => {
  if (amt === null || amt === undefined) return 0;
  const num = typeof amt === 'number' ? amt : parseFloat(String(amt));
  return isNaN(num) ? 0 : Math.round(num);
};

export const getSafeNaira = (amt: any): string => {
  const coins = getSafeCoins(amt);
  return (coins * 10).toLocaleString();
};

