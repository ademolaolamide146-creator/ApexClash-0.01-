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
}) => {
  const { user, wallet, activeMatches, signOut, settleMatch, lockStakeForMatch } = useAuth();
  
  // 1. PURGE ALL HARDCODED MOCK/DEMO MATCH STATES:
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [currentTab, setCurrentTab] = useState<DashboardTab>(initialTab);
  const [arenaSubView, setArenaSubView] = useState<'hub' | 'in-game' | 'matched'>('hub');
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);

  const effectiveUsername = realProfileUsername || user?.username || 'Contender';
  const availableCoins = realWallet !== undefined ? realWallet.balance : (wallet?.available_coins ?? 0);
  const lockedCoins = realWallet !== undefined ? realWallet.locked_balance : (wallet?.locked_coins ?? 0);
  const activityList = realTransactions !== undefined ? realTransactions : [];

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
    
    // Logic to lock and launch...
    setActiveMatchId('MATCH-' + Date.now()); // Temporary
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
                /* ... Home screen content ... */
                <div className="text-white">Home Screen</div>
            )}
            {currentTab === 'arena' && arenaSubView === 'hub' && (
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
        onSelectTab={setCurrentTab}
        lockedCoinsCount={wallet?.locked_coins ?? 0}
      />
      {/* ... Add other modals ... */}
    </div>
  );
};
