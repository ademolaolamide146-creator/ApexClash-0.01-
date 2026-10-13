import React, { useState, useEffect } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Trophy,
  Swords,
  Share2,
  ShieldCheck,
  Check,
  Sparkles,
  Zap,
  Play,
  Clock,
  ShieldAlert,
  User as UserIcon,
  LogOut,
  Bell,
  Plus,
  ChevronRight,
  Sliders,
  Award,
  Crown,
  Flame,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GameId, StakeTier, DashboardTab, ActiveMatch, MatchParticipant, SavedBank, Transaction, getSafeCoins, getSafeNaira } from '../types';
import { BottomNavBar } from './BottomNavBar';
import { WalletView } from './WalletView';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import { ArenaHub } from './ArenaHub';
import { GameRulesModal } from './GameRulesModal';
import { MatchmakingQueueModal } from './MatchmakingQueueModal';
import { PrivateRoomLobbyModal } from './PrivateRoomLobbyModal';
import { MatchVersusModal } from './MatchVersusModal';
import { ActiveGameBoard } from './ActiveGameBoard';
import { RankingsView } from './RankingsView';
import { ProfileView } from './ProfileView';
import { TransactionDetailModal } from './TransactionDetailModal';
import {
  queryActiveMatchForUser,
  queryMatchmakingQueueForUser,
  acknowledgeFinishedMatch,
} from '../lib/supabase';
import { LegalDocType } from '../types';
import { supabase } from '../supabaseClient';

// Images
import whotImg from '../assets/images/game_whot_showcase_1791369306866.jpg';
import chessImg from '../assets/images/game_chess_showcase_1791369330468.jpg';
import ludoImg from '../assets/images/game_ludo_showcase_1791369354246.jpg';
import triviaImg from '../assets/images/game_trivia_showcase_1791369433515.jpg';

interface DashboardViewProps {
  onOpenWhatsApp: () => void;
  onLaunchMatchQueue?: (gameId: GameId, stake: number) => void;
  initialTab?: DashboardTab;
  initialQueueConfig?: { gameId: GameId; stake: number } | null;
  initialPrivateRoom?: { mode: 'create' | 'join'; roomCode?: string; gameId?: GameId; stake?: number } | null;
  onOpenDoc?: (doc: LegalDocType) => void;
  realProfileUsername?: string;
  realWallet?: { balance: number; locked_balance: number };
  realTransactions?: any[];
  onRefreshData?: () => void;
  savedBank?: SavedBank | null;
  onUpdateSavedBank?: (bank: SavedBank) => void;
  onCancelChallenge?: (matchId: string) => Promise<void>;
  activePrivateRoom?: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenWhatsApp,
  onLaunchMatchQueue,
  initialTab = 'home',
  initialQueueConfig,
  initialPrivateRoom,
  onOpenDoc,
  realProfileUsername,
  realWallet,
  realTransactions,
  onRefreshData,
  savedBank,
  onUpdateSavedBank,
  onCancelChallenge,
  activePrivateRoom,
}) => {
  const { user, wallet, transactions, activeMatches, signOut, settleMatch, lockStakeForMatch } = useAuth();
  
  // 1. PURGE ALL HARDCODED MOCK/DEMO MATCH STATES:
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [currentTab, setCurrentTab] = useState<DashboardTab>(initialTab);
  const [arenaSubView, setArenaSubView] = useState<'hub' | 'in-game' | 'matched'>('hub');
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const effectiveUsername = realProfileUsername || user?.username || 'Contender';
  const availableCoins =
    wallet?.available_coins !== undefined
      ? wallet.available_coins
      : (realWallet !== undefined ? realWallet.balance : 0);
  const lockedCoins =
    wallet?.locked_coins !== undefined
      ? wallet.locked_coins
      : (realWallet !== undefined ? realWallet.locked_balance : 0);
  const activityList = React.useMemo(() => {
    const map = new Map<string, any>();
    (transactions || []).forEach((tx) => {
      if (tx?.id) map.set(tx.id, tx);
      else if (tx?.reference_id) map.set(tx.reference_id, tx);
    });
    (realTransactions || []).forEach((tx) => {
      if (tx?.id) map.set(tx.id, { ...map.get(tx.id), ...tx });
      else if (tx?.reference_id) map.set(tx.reference_id, { ...map.get(tx.reference_id), ...tx });
    });
    const combined = Array.from(map.values());
    if (combined.length === 0) {
      return (realTransactions && realTransactions.length > 0) ? realTransactions : (transactions || []);
    }
    return combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [realTransactions, transactions]);

  // Sync tab if initialTab updates
  useEffect(() => {
    if (initialTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  // Modals
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);

  // Step 3 Modals State
  const [rulesGameId, setRulesGameId] = useState<GameId | null>(null);
  const [queueModal, setQueueModal] = useState<{
    isOpen: boolean;
    gameId: GameId;
    stake: number;
    initialElapsedSeconds?: number;
  }>({
    isOpen: false,
    gameId: 'whot',
    stake: 100,
    initialElapsedSeconds: 0,
  });

  // GAME STATE REHYDRATION (Strictly filter by user_id and in_progress)
  useEffect(() => {
    async function rehydrateGameState() {
      if (!user?.id) return;

      const { data: participants, error } = await supabase
        .from('match_participants')
        .select('match_id, color, matches!inner(id, status, stake_amount, games!inner(key))')
        .eq('user_id', user.id)
        .eq('matches.status', 'in_progress');

      if (error || !participants || participants.length === 0) {
        setActiveMatchId(null);
        setActiveMatch(null);
        return;
      }

      // Found an active match, hydrate
      const match = participants[0];
      setActiveMatchId(match.match_id);
      setActiveMatch({
        id: match.match_id,
        gameId: (match.matches as any).games.key,
        stakeCoins: (match.matches as any).stake_amount,
        status: 'in_progress',
      } as ActiveMatch);
      
      // If a match is genuinely in progress, transition to arena
      setArenaSubView('in-game');
      setCurrentTab('arena');
    }

    rehydrateGameState();
  }, [user]);

  const [joining, setJoining] = useState(false);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);

  const [privateRoomModal, setPrivateRoomModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'join';
    gameId?: GameId;
    roomCode?: string;
  }>({
    isOpen: false,
    mode: 'create',
  });

  const [versusModal, setVersusModal] = useState<{
    isOpen: boolean;
    gameId: GameId;
    stake: number;
    playerOne: MatchParticipant;
    playerTwo: MatchParticipant;
  } | null>(null);

  if (!user) return null;

  const handleOpenQueue = async (gameId: GameId, stake: number) => {
    if (joining || !stake || !gameId) return;
    setJoining(true);

    try {
      // 1. Refresh balance
      const { data: w } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
      if ((w?.balance || 0) < stake) {
        alert("Insufficient funds");
        setJoining(false);
        return;
      }

      // Fetch game row
      const { data: gameRow, error: gameErr } = await supabase
        .from('games')
        .select('id')
        .eq('key', gameId)
        .single();

      if (gameErr || !gameRow) {
        console.error("Game lookup error:", gameErr);
        alert("Could not load game details. Check console.");
        setJoining(false);
        return;
      }

      // Insert into queue
      const { data: queueRow, error: queueErr } = await supabase
        .from('matchmaking_queue')
        .insert({
          user_id: user.id,
          game_id: gameRow.id,
          stake_amount: stake,
          status: 'waiting'
        })
        .select()
        .single();

      if (queueErr) {
        console.error("Matchmaking queue insert error:", queueErr);
        alert(`Failed to join queue: ${queueErr.message}`);
        setJoining(false);
        return;
      }

      // ON SUCCESS
      setActiveQueueId(queueRow.id);
      setArenaSubView('hub');
      
      setQueueModal({
        isOpen: true,
        gameId,
        stake,
      });
    } catch (err: any) {
      console.error("Queue join error:", err);
      alert(`Error joining queue: ${err.message || 'Unknown error'}`);
    } finally {
      setJoining(false);
    }
  };

  const handleMatchFoundFromQueue = (opponent: MatchParticipant) => {
    const game = queueModal.gameId;
    const stake = queueModal.stake;
    setQueueModal((prev) => ({ ...prev, isOpen: false }));

    setVersusModal({
      isOpen: true,
      gameId: game,
      stake,
      playerOne: { user_id: user.id, username: user.username, color: 'white', rating: 1500, location: 'Lagos' },
      playerTwo: opponent,
    });
  };

  const handlePrivateRoomMatched = (
    gameId: GameId,
    stake: number,
    opponentName: string,
    opponentLocation: string
  ) => {
    setVersusModal({
      isOpen: true,
      gameId,
      stake,
      playerOne: { user_id: user.id, username: user.username, color: 'white', rating: 1500, location: 'Lagos' },
      playerTwo: { user_id: 'guest', username: opponentName, color: 'black', rating: 1480, location: opponentLocation },
    });
  };

  const handleVersusCountdownComplete = async () => {
    if (!versusModal) return;
    const { gameId, stake, playerTwo } = versusModal;
    setVersusModal(null);
    
    const targetMatchId = 'MATCH-' + gameId.toUpperCase() + '-' + Date.now();
    const newMatch: ActiveMatch = {
      id: targetMatchId,
      gameId,
      stakeCoins: stake,
      potCoins: stake * 2,
      opponentName: playerTwo.username || 'Opponent',
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      remainingSeconds: 180,
    };
    setActiveMatch(newMatch);
    setActiveMatchId(targetMatchId);
    setArenaSubView('in-game');
    setCurrentTab('arena');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100 flex flex-col pb-24">
      {/* 2. MAIN TAB CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1">
        
        {/* STRICT JSX RENDERING GUARDS */}
        {activeMatchId && currentTab === 'arena' && arenaSubView === 'in-game' && (
          <ActiveGameBoard
            match={activeMatch!}
            onExit={async () => {
              setActiveMatchId(null);
              setActiveMatch(null);
              setCurrentTab('home');
              setArenaSubView('hub');
            }}
            onSettle={async (matchId, result) => {
               setActiveMatchId(null);
               setActiveMatch(null);
               setCurrentTab('home');
               setArenaSubView('hub');
            }}
          />
        )}
        
        {currentTab !== 'arena' || arenaSubView !== 'in-game' ? (
          <>
            {currentTab === 'home' && (
              <div className="space-y-8 animate-fade-in pb-16">
                {/* 1. Greeting & Player ID Card */}
                <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#1A1813] via-[#121212] to-[#0A0A0A] border border-[#F5A623]/30 relative overflow-hidden flex flex-col justify-between shadow-2xl">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#F5A623]/8 rounded-full blur-3xl pointer-events-none" />
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                          Welcome back, {effectiveUsername} 👋
                        </h1>
                        <p className="text-xs text-neutral-400 font-mono mt-1">
                          Ready to compete? Check your wallet, review rankings, or jump into the arena.
                        </p>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] font-mono text-xs font-bold flex items-center gap-1.5">
                        <Crown className="w-4 h-4" />
                        <span>Bronze I • 1200 Elo</span>
                      </div>
                    </div>
                    {/* 2. Balance Overview */}
                    <div className="mt-6 p-6 rounded-2xl bg-black/50 border border-white/[0.1] backdrop-blur-sm space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider font-semibold">
                            Available Balance (Spendable)
                          </span>
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <div className="flex flex-wrap items-baseline gap-2.5">
                          <span className="text-4xl sm:text-5xl font-black font-mono text-[#F5A623] tabular-nums tracking-tight">
                            {availableCoins.toLocaleString()}
                          </span>
                          <span className="text-base sm:text-lg font-bold text-white font-mono">
                            Coins
                          </span>
                          <span className="text-sm sm:text-base font-bold font-mono text-emerald-400 ml-1">
                            ≈ ₦{(availableCoins * 10).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Escrow Locked Coins Strip */}
                      <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="text-neutral-400">Locked in Matches:</span>
                          <span className="text-red-400 font-bold tabular-nums">
                            {lockedCoins.toLocaleString()} Coins
                          </span>
                          <span className="text-neutral-500 text-[11px]">
                            (₦{(lockedCoins * 10).toLocaleString()})
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
                          Escrow Protected
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setArenaSubView('hub');
                          setCurrentTab('arena');
                        }}
                        className="py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F5A623]/20 cursor-pointer font-mono"
                      >
                        <Swords className="w-4 h-4 fill-current" />
                        <span>Enter Arena</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentTab('wallet')}
                        className="py-3 px-4 rounded-xl font-bold text-xs bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
                      >
                        <Coins className="w-4 h-4 text-[#F5A623]" />
                        <span>Wallet & Ledger</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between font-mono">
                    <span className="text-xs text-neutral-400 uppercase">Matches Played</span>
                    <span className="text-2xl font-black text-white mt-2">{user.won_matches ? user.won_matches * 2 : 0}</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between font-mono">
                    <span className="text-xs text-neutral-400 uppercase">Win Rate</span>
                    <span className="text-2xl font-black text-[#F5A623] mt-2">{user.win_rate ?? 0}%</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between font-mono">
                    <span className="text-xs text-neutral-400 uppercase">Best Game</span>
                    <span className="text-xl font-black mt-2 truncate text-white/40">N/A</span>
                  </div>
                </div>

                {/* 4. Activity */}
                <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#F5A623]" />
                        Recent Activity
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Tap any activity below to view full details and verified escrow ledger receipts
                      </p>
                    </div>

                    {activityList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCurrentTab('wallet')}
                        className="text-xs font-mono font-bold text-[#F5A623] hover:text-[#e0951e] flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-white/[0.04] cursor-pointer"
                      >
                        <span>View All ({activityList.length})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {activityList.length > 0 ? (
                    <div className="divide-y divide-white/[0.04] bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
                      {activityList.slice(0, 6).map((tx: any) => {
                        const coins = getSafeCoins(
                          tx.amount_coins !== undefined
                            ? tx.amount_coins
                            : (tx.coins !== undefined ? tx.coins : (tx.amount ?? 0))
                        );
                        const isRefund = tx.type === 'match_refund' || tx.type === 'refund';
                        const isPositive = coins >= 0 || isRefund;
                        const isDeposit = tx.type === 'deposit';
                        const isWin = tx.type === 'win_payout';
                        const isWithdraw = tx.type === 'withdrawal';
                        const isLocked = tx.type === 'stake_locked';

                        return (
                          <div
                            key={tx.id || tx.reference_id || Math.random().toString()}
                            onClick={() => setSelectedTransaction(tx)}
                            className="p-4 flex items-center justify-between gap-3 text-xs font-mono hover:bg-white/[0.05] active:bg-white/[0.08] transition-all cursor-pointer group"
                            role="button"
                            tabIndex={0}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-md ${
                                  isWin || isDeposit
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : isRefund
                                    ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                                    : isWithdraw
                                    ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                                    : 'bg-white/[0.06] text-neutral-300 border border-white/[0.1]'
                                }`}
                              >
                                {isWin ? (
                                  <Trophy className="w-4 h-4 text-amber-400" />
                                ) : isDeposit ? (
                                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                                ) : isRefund ? (
                                  <RotateCcw className="w-4 h-4 text-[#F5A623]" />
                                ) : isWithdraw ? (
                                  <ArrowUpRight className="w-4 h-4 text-[#F5A623]" />
                                ) : (
                                  <Lock className="w-4 h-4 text-amber-300" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <span className="text-white font-bold block truncate group-hover:text-[#F5A623] transition-colors">
                                  {isRefund
                                    ? 'Match Stake Refund'
                                    : (tx.description ||
                                        (tx.type ? String(tx.type).replace(/_/g, ' ').toUpperCase() : '') ||
                                        tx.reference_id ||
                                        'Transaction Activity')}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-neutral-500">
                                    {new Date(tx.created_at || Date.now()).toLocaleString('en-NG', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span
                                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                      tx.status === 'completed'
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                        : tx.status === 'locked'
                                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                                        : 'bg-neutral-500/15 text-neutral-400 border border-neutral-500/20'
                                    }`}
                                  >
                                    {tx.status === 'locked' ? 'In Escrow' : tx.status || 'Completed'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0 text-right">
                              <div>
                                <span
                                  className={`font-black tabular-nums block ${
                                    isPositive ? 'text-emerald-400' : 'text-neutral-200'
                                  }`}
                                >
                                  {isPositive ? `+${Math.abs(coins)}` : coins} Coins
                                </span>
                                <span className="text-[10px] text-neutral-500 block">
                                  ₦{getSafeNaira(coins)} NGN
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-[#F5A623] group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
                      <p className="text-xs text-neutral-400">
                        No recent activity yet. Deposit and play to start seeing your history!
                      </p>
                      <button
                        type="button"
                        onClick={() => setCurrentTab('arena')}
                        className="py-2.5 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black font-mono cursor-pointer shadow-lg shadow-[#F5A623]/20 hover:brightness-110"
                      >
                        Head to Arena
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {currentTab === 'arena' && arenaSubView !== 'in-game' && (
              <ArenaHub
                onOpenRules={(gameId: GameId) => setRulesGameId(gameId)}
                onOpenQueue={(gameId: GameId, stake: number) => handleOpenQueue(gameId, stake)}
                onOpenCreateRoom={(gameId?: GameId) =>
                  setPrivateRoomModal({ isOpen: true, mode: 'create', gameId })
                }
                onOpenJoinRoom={() => setPrivateRoomModal({ isOpen: true, mode: 'join' })}
                onOpenDeposit={() => setIsDepositModalOpen(true)}
                onRefundCompleted={() => {
                  if (onRefreshData) onRefreshData();
                }}
                isJoining={joining}
                onCancelChallenge={onCancelChallenge}
                walletBalance={availableCoins}
                onNavigateTab={(tab) => {
                  setArenaSubView('hub');
                  setCurrentTab(tab);
                }}
              />
            )}
            {currentTab === 'rankings' && <RankingsView />}
            {currentTab === 'wallet' && (
              <WalletView
                onOpenDeposit={() => setIsDepositModalOpen(true)}
                onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
                savedBank={savedBank}
                realWallet={realWallet}
                realTransactions={activityList}
                onRefreshData={onRefreshData}
              />
            )}
            {currentTab === 'profile' && (
              <ProfileView
                onOpenDoc={onOpenDoc}
                onSignOut={signOut}
                realProfileUsername={effectiveUsername}
                realWallet={realWallet}
                savedBank={savedBank}
                onUpdateSavedBank={onUpdateSavedBank}
              />
            )}
          </>
        ) : null}
      </main>
      
      <BottomNavBar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (!activeMatchId) {
            setArenaSubView('hub');
          }
          setCurrentTab(tab);
        }}
        lockedCoinsCount={wallet?.locked_coins ?? 0}
      />
      {/* 4. MODALS */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        currentBalance={availableCoins}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        savedBank={savedBank ?? null}
        availableCoins={availableCoins}
        onBankUpdated={(bank) => {
          if (onUpdateSavedBank) onUpdateSavedBank(bank);
        }}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Game Rules "How It Works" Modal */}
      {rulesGameId && (
        <GameRulesModal
          isOpen={Boolean(rulesGameId)}
          gameId={rulesGameId}
          onClose={() => setRulesGameId(null)}
          onPlayNow={() => {
            setRulesGameId(null);
            setCurrentTab('arena');
          }}
        />
      )}

      {/* Real-time Matchmaking Queue Modal with 2-Minute Silent Fallback */}
      <MatchmakingQueueModal
        isOpen={queueModal.isOpen}
        gameId={queueModal.gameId}
        stakeCoins={queueModal.stake}
        initialElapsedSeconds={queueModal.initialElapsedSeconds || 0}
        onClose={() => {
          setQueueModal((prev) => ({ ...prev, isOpen: false, initialElapsedSeconds: 0 }));
          setArenaSubView('hub');
        }}
        onMatchFound={handleMatchFoundFromQueue}
      />

      {/* Private WhatsApp Challenge Room Modal (Create & Join) */}
      <PrivateRoomLobbyModal
        isOpen={privateRoomModal.isOpen}
        initialMode={privateRoomModal.mode}
        initialGame={privateRoomModal.gameId}
        initialRoomCode={privateRoomModal.roomCode}
        onClose={() => setPrivateRoomModal((prev) => ({ ...prev, isOpen: false }))}
        onRefundCompleted={() => {
          if (onRefreshData) onRefreshData();
        }}
        onMatchMatched={handlePrivateRoomMatched}
      />

      {/* Match Confirmed 10-Second Countdown VS Screen */}
      {versusModal && (
        <MatchVersusModal
          isOpen={versusModal.isOpen}
          gameId={versusModal.gameId}
          stakeCoins={versusModal.stake}
          playerOne={versusModal.playerOne}
          playerTwo={versusModal.playerTwo}
          onCountdownComplete={handleVersusCountdownComplete}
        />
      )}

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        isOpen={Boolean(selectedTransaction)}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onGoToWallet={() => {
          setSelectedTransaction(null);
          setCurrentTab('wallet');
        }}
      />
    </div>
  );
};
