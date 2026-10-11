import { supabase, isSupabaseConfigured } from '../supabaseClient';
export { supabase, isSupabaseConfigured };
import { UserProfile, Transaction, ActiveMatch } from '../types';

// Local fallback store keys
const USERS_STORAGE_KEY = 'apex_clash_users_store';
const SESSION_STORAGE_KEY = 'apex_clash_session_store';
const TRANSACTIONS_STORAGE_KEY = 'apex_clash_transactions_store';
const ACTIVE_MATCHES_STORAGE_KEY = 'apex_clash_active_matches_store';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  username: string;
  age_verified: boolean;
  wallet_balance_coins: number;
  locked_balance_coins?: number;
  won_matches: number;
  total_matches: number;
  created_at: string;
}

// Initial demo user and transactions if none exists
function initializeLocalStore(): void {
  try {
    const existing = localStorage.getItem(USERS_STORAGE_KEY);
    if (!existing) {
      const demoUsers: StoredUser[] = [
        {
          id: 'apex_demo_user_001',
          email: 'ademolaolamide146@gmail.com',
          passwordHash: 'ApexPass123!',
          username: 'ApexTitan_NG',
          age_verified: true,
          wallet_balance_coins: 350,
          locked_balance_coins: 50,
          won_matches: 14,
          total_matches: 18,
          created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        },
      ];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(demoUsers));
    }

    const existingTx = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (!existingTx) {
      const seedTx: Transaction[] = [
        {
          id: 'tx_seed_004',
          user_id: 'apex_demo_user_001',
          type: 'stake_locked',
          amount_coins: -50,
          amount_naira: -500,
          status: 'locked',
          reference_id: 'MATCH-CHESS-7819',
          description: 'Micro-Stake Locked: Speed Chess Duel vs Tunde_GM',
          created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          match_id: 'MATCH-CHESS-7819',
        },
        {
          id: 'tx_seed_003',
          user_id: 'apex_demo_user_001',
          type: 'win_payout',
          amount_coins: 180,
          amount_naira: 1800,
          status: 'completed',
          reference_id: 'MATCH-WHOT-3104',
          description: 'Match Victory: Naija Whot (Pot: 200 AC, 10% Flat Rake Deducted)',
          created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
          match_id: 'MATCH-WHOT-3104',
        },
        {
          id: 'tx_seed_002',
          user_id: 'apex_demo_user_001',
          type: 'deposit',
          amount_coins: 200,
          amount_naira: 2000,
          status: 'completed',
          reference_id: 'PSTK-DEP-49219',
          description: 'Naira Top-up via Paystack Checkout',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 'tx_seed_001',
          user_id: 'apex_demo_user_001',
          type: 'deposit',
          amount_coins: 100,
          amount_naira: 1000,
          status: 'completed',
          reference_id: 'PSTK-DEP-31011',
          description: 'Naira Top-up via Paystack Checkout',
          created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        },
      ];
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(seedTx));
    }

    const existingMatches = localStorage.getItem(ACTIVE_MATCHES_STORAGE_KEY);
    if (!existingMatches) {
      const seedMatches: ActiveMatch[] = [
        {
          id: 'MATCH-CHESS-7819',
          gameId: 'chess',
          stakeCoins: 50,
          potCoins: 100,
          opponentName: 'Tunde_GM (Abuja)',
          status: 'in_progress',
          startedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          remainingSeconds: 140,
        },
      ];
      localStorage.setItem(ACTIVE_MATCHES_STORAGE_KEY, JSON.stringify(seedMatches));
    }
  } catch {
    // LocalStorage might be restricted
  }
}

initializeLocalStore();

export function getLocalTransactions(userId?: string): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const all: Transaction[] = raw ? JSON.parse(raw) : [];
    if (userId) {
      return all.filter((t) => t.user_id === userId);
    }
    return all;
  } catch {
    return [];
  }
}

export function saveLocalTransaction(tx: Transaction): void {
  try {
    const all = getLocalTransactions();
    all.unshift(tx);
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function getLocalActiveMatches(): ActiveMatch[] {
  try {
    const raw = localStorage.getItem(ACTIVE_MATCHES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalActiveMatches(matches: ActiveMatch[]): void {
  try {
    localStorage.setItem(ACTIVE_MATCHES_STORAGE_KEY, JSON.stringify(matches));
  } catch {
    // ignore
  }
}

export function getLocalUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

export function getLocalSession(): { user: StoredUser } | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalSession(session: { user: StoredUser } | null): void {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function convertStoredUserToProfile(u: StoredUser): UserProfile {
  const coins = u.wallet_balance_coins ?? 0;
  const locked = u.locked_balance_coins ?? 0;
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    wallet_balance_coins: coins,
    wallet_balance_naira: coins * 10,
    locked_balance_coins: locked,
    won_matches: u.won_matches ?? 0,
    total_matches: u.total_matches ?? 0,
    win_rate: u.total_matches > 0 ? Math.round((u.won_matches / u.total_matches) * 100) : 0,
    age_verified: u.age_verified,
    terms_accepted_at: u.created_at,
    created_at: u.created_at,
  };
}

// ----------------------------------------------------
// STEP 3: RPC FUNCTIONS & MATCHMAKING INFRASTRUCTURE
// ----------------------------------------------------

import {
  UsernameCheckResponse,
  UsernameCheckResult,
  GameId,
  MatchData,
  MatchStatus,
  MatchParticipant,
  BotRosterEntry,
} from '../types';
import { NIGERIAN_BOT_ROSTER } from './botRoster';

const PRIVATE_ROOMS_STORAGE_KEY = 'apex_clash_private_rooms';
const QUEUE_STORAGE_KEY = 'apex_clash_queue_store';

// 1. RPC: check_username_availability
export async function checkUsernameAvailabilityRpc(
  username: string
): Promise<UsernameCheckResponse> {
  const clean = username.trim();
  if (clean.length < 3) {
    return {
      available: false,
      message: 'Username must be at least 3 characters',
      suggestions: [],
    };
  }

  // Attempt real Supabase RPC call first if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('check_username_availability', {
        p_username: clean,
      });
      if (!error && data) {
        return data as UsernameCheckResponse;
      }
    } catch {
      // Fallback to local check
    }
  }

  // Local fallback check
  const users = getLocalUsers();
  const lower = clean.toLowerCase();
  const isTaken = users.some((u) => u.username.toLowerCase() === lower);

  if (isTaken) {
    const randomSuffix = Math.floor(10 + Math.random() * 89);
    const suggestions = [
      `${clean}${randomSuffix}`,
      `${clean}_Apex`,
      `King_${clean}`,
      `${clean}_NG`,
    ];
    return {
      available: false,
      message: '✕ Username is already taken',
      suggestions,
    };
  }

  return {
    available: true,
    message: '✓ Username is available',
    suggestions: [],
  };
}

// 2. RPC: create_private_room
export async function createPrivateRoomRpc(
  gameKey: GameId,
  creatorId: string,
  stakeAmount: number,
  roomCode: string,
  creatorUsername: string
): Promise<{ matchId: string; error?: string }> {
  const potAmount = stakeAmount * 2;
  const feeAmount = Math.floor(potAmount * 0.1);
  const payoutAmount = potAmount - feeAmount;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('create_private_room', {
        p_game_key: gameKey,
        p_creator_id: creatorId,
        p_stake_amount: stakeAmount,
        p_room_code: roomCode,
      });

      if (!error && data) {
        return { matchId: data as string };
      }
    } catch {
      // Fallback to local room creation
    }
  }

  // Local fallback
  // Always cache room locally for immediate optimistic retrieval
  const matchId = `MATCH-${gameKey.toUpperCase()}-${roomCode}`;
  const roomData: MatchData = {
    id: matchId,
    game_id: gameKey,
    is_private: true,
    room_code: roomCode,
    stake_amount: stakeAmount,
    pot_amount: potAmount,
    fee_amount: feeAmount,
    payout_amount: payoutAmount,
    status: 'waiting',
    participants: [
      {
        user_id: creatorId,
        username: creatorUsername,
        color: 'white',
        rating: 1500,
        location: 'Lagos, Nigeria',
      },
    ],
    created_at: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(PRIVATE_ROOMS_STORAGE_KEY);
    const rooms: MatchData[] = raw ? JSON.parse(raw) : [];
    rooms.unshift(roomData);
    localStorage.setItem(PRIVATE_ROOMS_STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    // ignore
  }

  return { matchId };
}

// 2b. Query all private challenge rooms created by or involving a user
export async function fetchUserWhatsAppChallenges(userId: string): Promise<MatchData[]> {
  const EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes window
  let combined: MatchData[] = [];

  // Local storage rooms first
  try {
    const raw = localStorage.getItem(PRIVATE_ROOMS_STORAGE_KEY);
    if (raw) {
      const localRooms: MatchData[] = JSON.parse(raw);
      combined = localRooms.filter((r) => 
        r.participants?.some((p) => p.user_id === userId)
      );
    }
  } catch {
    // ignore
  }

  // Supabase rooms if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*, match_participants(*)')
        .eq('is_private', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        data.forEach((row: any) => {
          const isUserInMatch = 
            row.creator_id === userId || 
            row.match_participants?.some((p: any) => p.user_id === userId);

          if (isUserInMatch) {
            const existingIdx = combined.findIndex((m) => m.id === row.id || m.room_code === row.room_code);
            const formatted: MatchData = {
              id: row.id,
              game_id: (row.game_id || row.game_key || 'whot') as GameId,
              is_private: true,
              room_code: row.room_code,
              stake_amount: row.stake_amount || 100,
              pot_amount: (row.stake_amount || 100) * 2,
              fee_amount: Math.floor((row.stake_amount || 100) * 2 * 0.1),
              payout_amount: Math.floor((row.stake_amount || 100) * 2 * 0.9),
              status: row.status,
              participants: row.match_participants || [
                {
                  user_id: row.creator_id || userId,
                  username: 'Host',
                  color: 'white',
                  rating: 1500,
                  location: 'Lagos, Nigeria'
                }
              ],
              created_at: row.created_at || new Date().toISOString()
            };

            if (existingIdx >= 0) {
              combined[existingIdx] = formatted;
            } else {
              combined.push(formatted);
            }
          }
        });
      }
    } catch (err) {
      console.warn('fetchUserWhatsAppChallenges supabase check:', err);
    }
  }

  // Check for expired waiting challenges (older than 15 minutes)
  const now = Date.now();
  combined = combined.map((room) => {
    if (room.status === 'waiting') {
      const ageMs = now - new Date(room.created_at).getTime();
      if (ageMs > EXPIRATION_MS) {
        return { ...room, status: 'expired' as MatchStatus };
      }
    }
    return room;
  });

  // Sort by created_at desc
  combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return combined;
}

// 2c. Cancel a private room
export async function cancelPrivateRoomRpc(matchId: string, roomCode?: string): Promise<{ success: boolean }> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('id', matchId);
    } catch (err) {
      console.warn('cancelPrivateRoomRpc supabase error:', err);
    }
  }

  try {
    const raw = localStorage.getItem(PRIVATE_ROOMS_STORAGE_KEY);
    if (raw) {
      const rooms: MatchData[] = JSON.parse(raw);
      const updated = rooms.map((r) => 
        (r.id === matchId || (roomCode && r.room_code === roomCode))
          ? { ...r, status: 'cancelled' as MatchStatus }
          : r
      );
      localStorage.setItem(PRIVATE_ROOMS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  return { success: true };
}


// 3. RPC: join_private_room
export async function joinPrivateRoomRpc(
  roomCode: string,
  joinerId: string,
  joinerUsername: string
): Promise<{ matchId?: string; matchData?: MatchData; error?: string }> {
  const cleanCode = roomCode.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('join_private_room', {
        p_room_code: cleanCode,
        p_joiner_id: joinerId,
      });

      if (!error && data) {
        return { matchId: data as string };
      }
    } catch {
      // Fallback to local
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(PRIVATE_ROOMS_STORAGE_KEY);
    const rooms: MatchData[] = raw ? JSON.parse(raw) : [];
    const foundIndex = rooms.findIndex(
      (r) => r.room_code?.toUpperCase() === cleanCode && r.status === 'waiting'
    );

    if (foundIndex === -1) {
      return { error: `Room ${cleanCode} was not found or is already in progress.` };
    }

    const room = rooms[foundIndex];
    if (room.participants[0].user_id === joinerId) {
      return { error: 'You are the creator of this challenge room.' };
    }

    const updatedParticipants: MatchParticipant[] = [
      room.participants[0],
      {
        user_id: joinerId,
        username: joinerUsername,
        color: 'black',
        rating: 1480,
        location: 'Abuja, Nigeria',
      },
    ];

    const updatedRoom: MatchData = {
      ...room,
      status: 'in_progress',
      participants: updatedParticipants,
    };

    rooms[foundIndex] = updatedRoom;
    localStorage.setItem(PRIVATE_ROOMS_STORAGE_KEY, JSON.stringify(rooms));

    return { matchId: updatedRoom.id, matchData: updatedRoom };
  } catch (err: any) {
    return { error: err.message || 'Failed to join challenge room.' };
  }
}

// 4. Silent 2-Minute Bot Liquidity Matcher
export function selectBotOpponent(gameId: GameId, userRating: number = 1500): BotRosterEntry {
  // Sort bots by closest rating to user
  const sorted = [...NIGERIAN_BOT_ROSTER].sort((a: any, b: any) => {
    const aRating =
      gameId === 'chess'
        ? a.chess_rating ?? 1500
        : gameId === 'whot'
        ? a.whot_rating ?? 1500
        : gameId === 'trivia'
        ? a.trivia_rating ?? 1500
        : a.ludo_rating ?? 1500;
    const bRating =
      gameId === 'chess'
        ? b.chess_rating ?? 1500
        : gameId === 'whot'
        ? b.whot_rating ?? 1500
        : gameId === 'trivia'
        ? b.trivia_rating ?? 1500
        : b.ludo_rating ?? 1500;
    return Math.abs(aRating - userRating) - Math.abs(bRating - userRating);
  });

  // Pick one of top 5 closest
  const index = Math.floor(Math.random() * Math.min(5, sorted.length));
  return sorted[index] || {
    id: 'bot_fallback',
    username: 'ApexBot_NG',
    chess_rating: 1500,
    whot_rating: 1500,
    trivia_rating: 1500,
    ludo_rating: 1500,
    avatar: '🤖',
  };
}

// ----------------------------------------------------
// STEP 5: GAME STATE REHYDRATION (Tab-Switch & Refresh Protection)
// ----------------------------------------------------

// 1. Check for Active Matches First:
// SELECT match_id, matches(id, status, game_id, stake_amount, games(key))
// FROM match_participants WHERE user_id = user.id AND matches.status = 'in_progress'
export async function queryActiveMatchForUser(userId: string): Promise<ActiveMatch | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('match_participants')
        .select('match_id, matches!inner(id, status, game_id, stake_amount, games(key))')
        .eq('user_id', userId)
        .eq('matches.status', 'in_progress')
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0] as any;
        const m = row.matches;
        if (m && m.status === 'in_progress') {
          const gKey: GameId = m.games?.key || m.game_id || 'whot';
          const stake = m.stake_amount || 100;
          return {
            id: m.id || row.match_id,
            gameId: gKey,
            stakeCoins: stake,
            potCoins: stake * 2,
            opponentName: 'Peer Contender',
            status: 'in_progress',
            startedAt: new Date().toISOString(),
            remainingSeconds: 180,
          };
        }
      }
    } catch (err) {
      console.warn('queryActiveMatchForUser Supabase check:', err);
    }
  }

  // Local fallback check
  const matches = getLocalActiveMatches();
  const active = matches.find((m) => m.status === 'in_progress');
  return active || null;
}

// 2. Check Matchmaking Queue:
// Query matchmaking_queue for status = 'waiting' AND user_id = user.id
export async function queryMatchmakingQueueForUser(
  userId: string
): Promise<{ gameId: GameId; stake: number; elapsedSeconds: number; queueId: string } | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        const elapsed = Math.max(
          0,
          Math.floor((Date.now() - new Date(row.created_at).getTime()) / 1000)
        );
        return {
          gameId: (row.game_id || row.game_key || 'whot') as GameId,
          stake: row.stake_amount || 100,
          elapsedSeconds: elapsed,
          queueId: row.id,
        };
      }
    } catch (err) {
      console.warn('queryMatchmakingQueueForUser Supabase check:', err);
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const waiting = list.find((q: any) => q.user_id === userId && q.status === 'waiting');
    if (waiting) {
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - new Date(waiting.created_at).getTime()) / 1000)
      );
      return {
        gameId: waiting.game_id as GameId,
        stake: waiting.stake_amount,
        elapsedSeconds: elapsed,
        queueId: waiting.id,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

// Enter Matchmaking Queue
export async function enterMatchmakingQueue(
  userId: string,
  gameId: GameId,
  stakeAmount: number
): Promise<string> {
  const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('matchmaking_queue').insert([
        {
          id: queueId,
          user_id: userId,
          game_id: gameId,
          stake_amount: stakeAmount,
          status: 'waiting',
          created_at: now,
        },
      ]);
    } catch (err) {
      console.warn('enterMatchmakingQueue supabase insert:', err);
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const updated = list.map((q: any) =>
      q.user_id === userId && q.status === 'waiting' ? { ...q, status: 'cancelled' } : q
    );
    updated.unshift({
      id: queueId,
      user_id: userId,
      game_id: gameId,
      stake_amount: stakeAmount,
      status: 'waiting',
      created_at: now,
    });
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return queueId;
}

// Cancel Matchmaking Queue
export async function cancelMatchmakingQueue(userId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'waiting');
    } catch (err) {
      console.warn('cancelMatchmakingQueue error:', err);
    }
  }

  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map((q: any) =>
        q.user_id === userId && q.status === 'waiting' ? { ...q, status: 'cancelled' } : q
      );
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }
}

// 3. Finished Match Protection:
// Mark the queue row status as 'acknowledged' so refreshing the page never resurrects an already-finished match.
export async function acknowledgeFinishedMatch(userId: string, matchId?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'acknowledged' })
        .eq('user_id', userId)
        .in('status', ['waiting', 'matched']);
    } catch (err) {
      console.warn('acknowledgeFinishedMatch supabase error:', err);
    }
  }

  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map((q: any) =>
        q.user_id === userId ? { ...q, status: 'acknowledged' } : q
      );
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    }

    if (matchId) {
      const rawMatches = localStorage.getItem(ACTIVE_MATCHES_STORAGE_KEY);
      if (rawMatches) {
        const matches: ActiveMatch[] = JSON.parse(rawMatches);
        const remaining = matches.filter((m) => m.id !== matchId);
        localStorage.setItem(ACTIVE_MATCHES_STORAGE_KEY, JSON.stringify(remaining));
      }
    }
  } catch {
    // ignore
  }
}


