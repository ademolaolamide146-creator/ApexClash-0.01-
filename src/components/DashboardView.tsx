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
import { GameId, StakeTier, DashboardTab, ActiveMatch, MatchParticipant, SavedBank } from '../types';
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
  savedBank?: SavedBank | null;
  onUpdateSavedBank?: (bank: SavedBank) => void;
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
  savedBank,
  onUpdateSavedBank,
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
      const active = await queryActiveMatchForUser(user.id);
      
      // Strict Validation: Ensure status is 'in_progress' and a valid game ID is found
      if (active && active.status === 'in_progress' && active.gameId) {
        setMountedActiveMatch(active);
        return; 
      }

      // 2. Check Matchmaking Queue:
      const waitingQueue = await queryMatchmakingQueueForUser(user.id);
      // Ensure it's not already acknowledged or completed
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
    if (availableCoins < stake) {
      setIsDepositModalOpen(true);
      return;
    }
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
        {mountedActiveMatch && currentTab === 'arena' ? (
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

                {/* 2. Balance Overview: Bold Available Balance with Small Locked Stakes UI Below */}
                <div className="mt-6 p-6 rounded-2xl bg-black/50 border border-white/[0.1] backdrop-blur-sm space-y-4">
                  {/* Primary Hero: Bold Available Balance */}
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
                        ≈ ₦{availableNaira.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Secondary Compact UI: Small Locked Stakes Strip Below */}
                  <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-neutral-400">Locked in Matches:</span>
                      <span className="text-red-400 font-bold tabular-nums">
                        {lockedCoins.toLocaleString()} Coins
                      </span>
                      <span className="text-neutral-500 text-[11px]">
                        (₦{lockedNaira.toLocaleString()})
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
                <span className="text-xl font-black mt-2 truncate text-white/40 font-normal">
                  —
                </span>
                <span className="text-[10px] text-neutral-400 mt-1">
                  No matches played
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
            walletBalance={availableCoins}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {/* ==================== TAB 3: RANKINGS ==================== */}
        {currentTab === 'rankings' && <RankingsView />}

        {/* ==================== TAB 4: WALLET ==================== */}
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

        {/* ==================== TAB 5: PROFILE ==================== */}
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
        )}

      </main>

      {/* 3. MOBILE-FIRST BOTTOM NAVIGATION BAR */}
      <BottomNavBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
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
