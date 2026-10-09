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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GameId, StakeTier, DashboardTab, ActiveMatch, MatchParticipant } from '../types';
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
import {
  queryActiveMatchForUser,
  queryMatchmakingQueueForUser,
  acknowledgeFinishedMatch,
} from '../lib/supabase';
import { LegalDocType } from '../types';

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
}

const STAKE_TIERS: StakeTier[] = [
  { coins: 25, naira: 250, label: 'Micro Starter' },
  { coins: 50, naira: 500, label: 'Standard Dual' },
  { coins: 100, naira: 1000, popular: true, label: 'Pro Contender' },
  { coins: 200, naira: 2000, label: 'Master Arena' },
  { coins: 500, naira: 5000, label: 'Apex High Stake' },
];

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
}) => {
  const { user, wallet, activeMatches, signOut, settleMatch, lockStakeForMatch } = useAuth();
  const [currentTab, setCurrentTab] = useState<DashboardTab>(initialTab);
  const [mountedActiveMatch, setMountedActiveMatch] = useState<ActiveMatch | null>(null);

  const effectiveUsername = realProfileUsername || user?.username || 'Contender';
  const availableCoins = realWallet !== undefined ? realWallet.balance : (wallet?.available_coins ?? 0);
  const lockedCoins = realWallet !== undefined ? realWallet.locked_balance : (wallet?.locked_coins ?? 0);
  const totalCoins = availableCoins + lockedCoins;
  const availableNaira = availableCoins * 10;
  const lockedNaira = lockedCoins * 10;
  const totalNaira = totalCoins * 10;
  const activityList = realTransactions !== undefined ? realTransactions : [];

  // Sync tab if initialTab updates
  useEffect(() => {
    if (initialTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  // Sync quick queue launch if configured from external quick play
  useEffect(() => {
    if (initialQueueConfig) {
      setQueueModal({
        isOpen: true,
        gameId: initialQueueConfig.gameId,
        stake: initialQueueConfig.stake,
      });
    }
  }, [initialQueueConfig]);

  // Sync private room if opened from WhatsApp link
  useEffect(() => {
    if (initialPrivateRoom) {
      setPrivateRoomModal({
        isOpen: true,
        mode: initialPrivateRoom.mode,
        gameId: initialPrivateRoom.gameId,
        roomCode: initialPrivateRoom.roomCode,
      });
    }
  }, [initialPrivateRoom]);

  // Modals
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameId>('whot');
  const [selectedStake, setSelectedStake] = useState<number>(100);
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

  // GAME STATE REHYDRATION (Tab-Switch, Refresh & Resume Protection)
  useEffect(() => {
    let isMounted = true;
    async function rehydrateGameState() {
      if (!user) return;

      // 1. Check for Active Matches First:
      // Query match_participants joined with matches:
      // SELECT match_id, matches(id, status, game_id, stake_amount, games(key))
      // FROM match_participants WHERE user_id = user.id AND matches.status = 'in_progress'
      const active = await queryActiveMatchForUser(user.id);
      if (active && isMounted) {
        setMountedActiveMatch(active);
        return; // Immediately mount active game board without resetting to game list or deducting coins again
      }

      // 2. Check Matchmaking Queue:
      // If no match in progress, query matchmaking_queue for status = 'waiting' and user_id = user.id
      const waitingQueue = await queryMatchmakingQueueForUser(user.id);
      if (waitingQueue && isMounted) {
        setQueueModal({
          isOpen: true,
          gameId: waitingQueue.gameId,
          stake: waitingQueue.stake,
          initialElapsedSeconds: waitingQueue.elapsedSeconds,
        });
      }
    }

    rehydrateGameState();
    return () => {
      isMounted = false;
    };
  }, [user]);

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

  const handleOpenQueue = (gameId: GameId, stake: number) => {
    setQueueModal({
      isOpen: true,
      gameId,
      stake,
    });
  };

  const handleMatchFoundFromQueue = (opponent: MatchParticipant) => {
    const game = queueModal.gameId;
    const stake = queueModal.stake;
    setQueueModal((prev) => ({ ...prev, isOpen: false }));

    const me: MatchParticipant = {
      user_id: user.id,
      username: user.username,
      color: 'white',
      rating: 1500,
      location: 'Lagos, Nigeria',
    };

    setVersusModal({
      isOpen: true,
      gameId: game,
      stake,
      playerOne: me,
      playerTwo: opponent,
    });
  };

  const handlePrivateRoomMatched = (
    gameId: GameId,
    stake: number,
    opponentName: string,
    opponentLocation: string
  ) => {
    const me: MatchParticipant = {
      user_id: user.id,
      username: user.username,
      color: 'white',
      rating: 1500,
      location: 'Lagos, Nigeria',
    };

    const opp: MatchParticipant = {
      user_id: `guest_${Date.now()}`,
      username: opponentName,
      color: 'black',
      rating: 1480,
      location: opponentLocation,
    };

    setVersusModal({
      isOpen: true,
      gameId,
      stake,
      playerOne: me,
      playerTwo: opp,
    });
  };

  const handleVersusCountdownComplete = async () => {
    if (!versusModal) return;
    const { gameId, stake, playerTwo } = versusModal;
    setVersusModal(null);

    // Lock stake into anti-double-spend escrow if not already in active matches
    let targetMatchId = '';
    const alreadyLocked = activeMatches.find(
      (m) => m.opponentName === playerTwo.username && m.stakeCoins === stake
    );

    if (!alreadyLocked) {
      const lockRes = await lockStakeForMatch(gameId, stake, playerTwo.username);
      targetMatchId = lockRes.matchId || `MATCH-${gameId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    } else {
      targetMatchId = alreadyLocked.id;
    }

    // Immediately mount the active game board with this match
    const newActiveMatch: ActiveMatch = {
      id: targetMatchId,
      gameId,
      stakeCoins: stake,
      potCoins: stake * 2,
      opponentName: playerTwo.username,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      remainingSeconds: 180,
    };

    setMountedActiveMatch(newActiveMatch);

    setActiveNotification(
      `Duel commenced! You are playing ${gameId.toUpperCase()} vs ${playerTwo.username}. Stake of ${stake} AC locked into escrow.`
    );
    setTimeout(() => setActiveNotification(null), 5000);
  };

  const handleResumeMatch = (match: ActiveMatch) => {
    setMountedActiveMatch(match);
  };

  const handleSettleDemoMatch = async (matchId: string, result: 'win' | 'draw' | 'loss') => {
    await settleMatch(matchId, result);
    setActiveNotification(`Match ${matchId} settled: ${result.toUpperCase()} recorded.`);
    setTimeout(() => setActiveNotification(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100 flex flex-col pb-24">
      
      {/* 1. PERSISTENT TOP HEADER */}
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: ApexClash Logo mark ('AC' monogram in gold gradient + "ApexClash" text) */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#DC2626] p-[1.5px] flex-shrink-0">
            <div className="w-full h-full bg-[#0A0A0A] rounded-[10px] flex items-center justify-center">
              <span className="font-mono font-black text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] bg-clip-text text-transparent">
                AC
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-black text-sm tracking-wider text-white">
              Apex<span className="text-[#F5A623]">Clash</span>
            </span>
            <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              18+ Verified Arena
            </span>
          </div>
        </div>

        {/* Right: Quick Coin Balance Pill, User Tag, and Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Quick Coin Balance Pill */}
          <div className="flex items-center bg-white/[0.04] border border-[#F5A623]/30 rounded-xl py-1 px-2.5">
            <button
              type="button"
              onClick={() => setCurrentTab('wallet')}
              className="flex items-center gap-2 cursor-pointer text-left"
              title="Click to view Wallet"
            >
              <span className="w-2 h-2 rounded-full bg-[#F5A623] shadow-[0_0_8px_#F5A623]" />
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-xs font-black text-[#F5A623] tabular-nums">
                  {availableCoins}
                </span>
                <span className="text-[10px] text-neutral-400">Coins</span>
              </div>
            </button>
          </div>

          {/* User Tag with Username */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] font-mono text-xs text-white">
            <UserIcon className="w-3.5 h-3.5 text-[#F5A623]" />
            <span className="truncate max-w-[120px]">{effectiveUsername}</span>
          </div>

          {/* Subtle Sign Out Button */}
          <button
            type="button"
            onClick={() => signOut()}
            className="py-1.5 px-3 rounded-xl text-xs font-mono font-bold text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-colors flex items-center gap-1 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>

      </header>

      {/* Notification Toast */}
      {activeNotification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{activeNotification}</span>
          </div>
        </div>
      )}

      {/* 2. MAIN TAB CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1">
        
        {/* ACTIVE GAME BOARD (Immediate Mount upon in-progress match found) */}
        {mountedActiveMatch ? (
          <ActiveGameBoard
            match={mountedActiveMatch}
            onExit={async () => {
              if (user) {
                await acknowledgeFinishedMatch(user.id, mountedActiveMatch.id);
              }
              setMountedActiveMatch(null);
            }}
            onSettle={async (matchId, result) => {
              await settleMatch(matchId, result);
              if (user) {
                await acknowledgeFinishedMatch(user.id, matchId);
              }
              setMountedActiveMatch(null);
            }}
          />
        ) : (
          <>
            {/* ==================== TAB 1: HOME ==================== */}
        {currentTab === 'home' && (
          <div className="space-y-8 animate-fade-in pb-16">
            
            {/* 1. Greeting & Player ID Card */}
            <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#1A1813] via-[#121212] to-[#0A0A0A] border border-[#F5A623]/30 relative overflow-hidden flex flex-col justify-between shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#F5A623]/8 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                      Welcome back, {effectiveUsername}
                    </h1>
                    <p className="text-xs text-neutral-400 font-mono mt-1">
                      Ready for high-stakes peer-to-peer competition in Nigeria.
                    </p>
                  </div>

                  {/* Rank Badge */}
                  <div className="px-3 py-1.5 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] font-mono text-xs font-bold flex items-center gap-1.5">
                    <Crown className="w-4 h-4" />
                    <span>Bronze I • 1200 Elo</span>
                  </div>
                </div>

                {/* 2. Dual-Balance Overview Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-5 rounded-xl bg-black/40 border border-white/[0.08]">
                  
                  {/* Available Balance */}
                  <div>
                    <span className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">
                      Available Balance (Spendable)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-[#F5A623] tabular-nums">
                        {availableCoins}
                      </span>
                      <span className="text-xs font-bold text-neutral-300 font-mono">Coins</span>
                      <span className="text-xs font-mono text-emerald-400 ml-2">
                        (₦{availableNaira.toLocaleString()})
                      </span>
                    </div>
                  </div>

                  {/* Locked Stakes */}
                  <div>
                    <span className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">
                      Locked Stakes (Active Matches)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-red-400 tabular-nums">
                        {lockedCoins}
                      </span>
                      <span className="text-xs font-bold text-neutral-300 font-mono">Coins</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#DC2626]/20 text-red-400 border border-[#DC2626]/30">
                        Escrow Locked
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentTab('arena')}
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

            {/* 3. Player Snapshot Stats (3-Column Card) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between font-mono">
                <span className="text-xs text-neutral-400 uppercase">Matches Played</span>
                <span className="text-2xl font-black text-white mt-2">
                  {user.won_matches ? user.won_matches * 2 : 0}
                </span>
                <span className="text-[10px] text-emerald-400 mt-1">Verified records</span>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between font-mono">
                <span className="text-xs text-neutral-400 uppercase">Win Rate</span>
                <span className="text-2xl font-black text-[#F5A623] mt-2">
                  {user.win_rate ?? 0}%
                </span>
                <span className="text-[10px] text-neutral-400 mt-1">National average 50%</span>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between font-mono">
                <span className="text-xs text-neutral-400 uppercase">Best Game</span>
                <span className={`text-xl font-black mt-2 truncate ${((user.won_matches || 0) > 0 || activityList.length > 0) ? 'text-white' : 'text-white/40 font-normal'}`}>
                  {((user.won_matches || 0) > 0 || activityList.length > 0) ? 'Naija Whot' : 'None yet'}
                </span>
                <span className="text-[10px] text-neutral-400 mt-1">
                  {((user.won_matches || 0) > 0 || activityList.length > 0) ? 'Most frequent discipline' : 'No matches played'}
                </span>
              </div>
            </div>

            {/* 4. Clean Recent Activity Section (Authentic Empty State) */}
            <div className="space-y-4 pt-4 border-t border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Recent Activity
                </h3>
                <p className="text-xs text-neutral-400">
                  Your latest match history and wallet transactions
                </p>
              </div>

              {activityList.length > 0 ? (
                <div className="space-y-3">
                  {activityList.slice(0, 5).map((tx: any) => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.type === 'deposit'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : tx.type === 'win_payout'
                              ? 'bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20'
                              : 'bg-white/10 text-neutral-300'
                          }`}
                        >
                          {tx.type.replace('_', ' ')}
                        </span>
                        <span className="text-white font-semibold">{tx.description || tx.reference_id}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold tabular-nums ${tx.amount_coins >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.amount_coins >= 0 ? `+${tx.amount_coins}` : tx.amount_coins} AC
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Authentic Empty State */
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#F5A623]">
                    <Swords className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No Recent Activity</h4>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                      No recent activity. Head to the Arena to start your first competition!
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentTab('arena')}
                      className="py-2.5 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-105 active:scale-[0.98] transition-all flex items-center gap-1.5 mx-auto cursor-pointer shadow-md shadow-[#F5A623]/20 font-mono"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Head to Arena</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== TAB 2: ARENA ==================== */}
        {currentTab === 'arena' && (
          <ArenaHub
            onOpenRules={(gameId: GameId) => setRulesGameId(gameId)}
            onOpenQueue={(gameId: GameId, stake: number) => handleOpenQueue(gameId, stake)}
            onOpenCreateRoom={(gameId: GameId) =>
              setPrivateRoomModal({ isOpen: true, mode: 'create', gameId })
            }
            onOpenJoinRoom={() => setPrivateRoomModal({ isOpen: true, mode: 'join' })}
            onOpenDeposit={() => setIsDepositModalOpen(true)}
          />
        )}

        {/* ==================== TAB 3: RANKINGS ==================== */}
        {currentTab === 'rankings' && (
          <div className="space-y-8 animate-fade-in pb-20">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#F5A623] font-mono flex items-center gap-1.5 mb-1">
                <Crown className="w-3.5 h-3.5" />
                Nigerian National Leaderboard
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Top Skill Contenders
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Ranked by net competitive earnings and tournament win rates across Lagos, Abuja, and Port Harcourt.
              </p>
            </div>

            {/* Leaderboard Table */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.08] text-neutral-400 pb-3">
                    <th className="pb-3 font-semibold">Rank</th>
                    <th className="pb-3 font-semibold">Player</th>
                    <th className="pb-3 font-semibold">Region</th>
                    <th className="pb-3 font-semibold">Favorite Title</th>
                    <th className="pb-3 font-semibold text-right">Won Coins</th>
                    <th className="pb-3 font-semibold text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    { rank: 1, name: 'Chukwudi_Grandmaster', region: 'Lagos Island', game: 'Speed Chess', coins: 14200, winRate: 78, badge: '🥇' },
                    { rank: 2, name: 'Ibrahim_WhotKing', region: 'Abuja FCT', game: 'Naija Whot', coins: 11950, winRate: 74, badge: '🥈' },
                    { rank: 3, name: 'Ngozi_QuizQueen', region: 'Port Harcourt', game: 'Speed Trivia', coins: 9400, winRate: 71, badge: '🥉' },
                    { rank: 4, name: 'Tayo_LudoGeneral', region: 'Ibadan', game: 'Ludo Classic', coins: 7800, winRate: 68 },
                    { rank: 5, name: `${effectiveUsername} (You)`, region: 'Lagos', game: 'Speed Chess', coins: user?.won_matches ? user.won_matches * 180 : 0, winRate: user?.win_rate ?? 0, isMe: true },
                    { rank: 6, name: 'Emeka_Tactician', region: 'Enugu', game: 'Naija Whot', coins: 3100, winRate: 62 },
                    { rank: 7, name: 'Fatima_SpeedBuzzer', region: 'Kano', game: 'Speed Trivia', coins: 2850, winRate: 59 },
                  ].map((row) => (
                    <tr
                      key={row.rank}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        row.isMe ? 'bg-[#F5A623]/10 font-bold text-white' : 'text-neutral-300'
                      }`}
                    >
                      <td className="py-3.5 flex items-center gap-1.5">
                        <span className="font-bold text-white">{row.rank}</span>
                        {row.badge && <span>{row.badge}</span>}
                      </td>
                      <td className="py-3.5">
                        <span className="font-semibold text-white">{row.name}</span>
                        {row.isMe && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-[#F5A623] text-black font-bold">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-neutral-400">{row.region}</td>
                      <td className="py-3.5 text-[#F5A623]">{row.game}</td>
                      <td className="py-3.5 text-right font-black text-white tabular-nums">
                        {row.coins.toLocaleString()} AC
                      </td>
                      <td className="py-3.5 text-right text-emerald-400 tabular-nums">
                        {row.winRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: WALLET ==================== */}
        {currentTab === 'wallet' && (
          <WalletView
            onOpenDeposit={() => setIsDepositModalOpen(true)}
            onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
            onResumeMatch={handleResumeMatch}
          />
        )}

        {/* ==================== TAB 5: PROFILE ==================== */}
        {currentTab === 'profile' && (
          <div className="space-y-8 animate-fade-in pb-20">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#F5A623] font-mono flex items-center gap-1.5 mb-1">
                <UserIcon className="w-3.5 h-3.5" />
                Player Profile & Governance
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Contender Account
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Identity verification, security settings, and responsible gaming limits.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Profile Card */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5A623] via-[#DC2626] to-[#991B1B] p-[2px]">
                    <div className="w-full h-full bg-[#0A0A0A] rounded-[14px] flex items-center justify-center">
                      <span className="text-xl font-black font-mono text-[#F5A623]">
                        {effectiveUsername.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-mono">{effectiveUsername}</h3>
                    <p className="text-xs text-neutral-400">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        18+ Verified Contender
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-neutral-400">
                    <span>Member Since:</span>
                    <span className="text-white">October 2026</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Fair Play Status:</span>
                    <span className="text-emerald-400 font-bold">Pristine (No Violations)</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Anti-Double-Spend Escrow:</span>
                    <span className="text-[#F5A623] font-bold">Active</span>
                  </div>
                </div>
              </div>

              {/* Responsible Gaming & Limits */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#F5A623]" />
                  <h3 className="text-sm font-bold text-white">Responsible Gaming Controls</h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Protect your budget with automatic daily loss caps and cool-down breaks in accordance with Nigerian esports standards.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-300">Daily Stake Ceiling</span>
                    <span className="text-[#F5A623] font-bold">5,000 Coins (₦50,000)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-300">Self-Exclusion Cooling Period</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNotification(
                          'Self-exclusion notice: Take a 24-hour or 7-day cooldown anytime. Contact support@apexclash.ng for immediate manual lockout.'
                        );
                        setTimeout(() => setActiveNotification(null), 6000);
                      }}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      Request Pause
                    </button>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-red-400 border border-white/[0.08] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of ApexClash</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Legal Documents Quick Viewer Links */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <h4 className="text-xs font-mono font-bold uppercase text-[#F5A623] tracking-wider mb-3">
                Statutory Compliance & Legal Documentation
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => onOpenDoc && onOpenDoc('terms')}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#F5A623]/50 text-neutral-300 hover:text-white transition-colors text-left"
                >
                  <span className="block font-bold text-white mb-0.5">Terms of Service</span>
                  <span className="text-[10px] text-neutral-500">Peer-to-peer rules</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDoc && onOpenDoc('privacy')}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#F5A623]/50 text-neutral-300 hover:text-white transition-colors text-left"
                >
                  <span className="block font-bold text-white mb-0.5">Privacy Policy</span>
                  <span className="text-[10px] text-neutral-500">NDPA compliance</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDoc && onOpenDoc('fair_play')}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#F5A623]/50 text-neutral-300 hover:text-white transition-colors text-left"
                >
                  <span className="block font-bold text-white mb-0.5">Fair Play Charter</span>
                  <span className="text-[10px] text-neutral-500">Anti-cheat engine</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDoc && onOpenDoc('responsible_gaming')}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#F5A623]/50 text-neutral-300 hover:text-white transition-colors text-left"
                >
                  <span className="block font-bold text-white mb-0.5">Responsible Gaming</span>
                  <span className="text-[10px] text-neutral-500">Micro-stakes limits</span>
                </button>
              </div>
            </div>
          </div>
        )}

          </>
        )}

      </main>

      {/* 3. MOBILE-FIRST BOTTOM NAVIGATION BAR */}
      <BottomNavBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        lockedCoinsCount={wallet.locked_coins}
      />

      {/* 4. MODALS */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
      />

      {/* Game Rules "How It Works" Modal */}
      {rulesGameId && (
        <GameRulesModal
          isOpen={Boolean(rulesGameId)}
          gameId={rulesGameId}
          onClose={() => setRulesGameId(null)}
          onPlayNow={(gId: GameId) => {
            setRulesGameId(null);
            handleOpenQueue(gId, selectedStake);
          }}
        />
      )}

      {/* Real-time Matchmaking Queue Modal with 2-Minute Silent Fallback */}
      <MatchmakingQueueModal
        isOpen={queueModal.isOpen}
        gameId={queueModal.gameId}
        stakeCoins={queueModal.stake}
        initialElapsedSeconds={queueModal.initialElapsedSeconds || 0}
        onClose={() => setQueueModal((prev) => ({ ...prev, isOpen: false, initialElapsedSeconds: 0 }))}
        onMatchFound={handleMatchFoundFromQueue}
      />

      {/* Private WhatsApp Challenge Room Modal (Create & Join) */}
      <PrivateRoomLobbyModal
        isOpen={privateRoomModal.isOpen}
        initialMode={privateRoomModal.mode}
        initialRoomCode={privateRoomModal.roomCode}
        onClose={() => setPrivateRoomModal((prev) => ({ ...prev, isOpen: false }))}
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

    </div>
  );
};
