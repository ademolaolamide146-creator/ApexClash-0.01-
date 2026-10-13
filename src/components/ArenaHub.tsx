import React, { useState } from 'react';
import { GameId, DashboardTab } from '../types';
import {
  Swords,
  Users,
  Clock,
  Zap,
  Target,
  Share2,
  HelpCircle,
  ShieldCheck,
  Play,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WhatsAppChallengesHub } from './WhatsAppChallengesHub';
import { MicroStakePicker, STAKE_TIERS_CONFIG } from './MicroStakePicker';
import { GameRulesModal } from './GameRulesModal';

import whotImg from '../assets/images/game_whot_showcase_1791369306866.jpg';
import chessImg from '../assets/images/game_chess_showcase_1791369330468.jpg';
import ludoImg from '../assets/images/game_ludo_showcase_1791369354246.jpg';
import triviaImg from '../assets/images/game_trivia_showcase_1791369433515.jpg';

interface ArenaHubProps {
  onOpenRules?: (gameId: GameId) => void;
  onOpenQueue: (gameId: GameId, stake: number) => void;
  onOpenCreateRoom: (gameId?: GameId) => void;
  onOpenJoinRoom: () => void;
  onOpenDeposit: () => void;
  onRefundCompleted?: () => void;
  isJoining?: boolean;
  onCancelChallenge?: (matchId: string) => Promise<void>;
  walletBalance?: number;
  onNavigateTab?: (tab: DashboardTab) => void;
}

export const ArenaHub: React.FC<ArenaHubProps> = ({
  onOpenRules,
  onOpenQueue,
  onOpenCreateRoom,
  onOpenJoinRoom,
  onOpenDeposit,
  onRefundCompleted,
  isJoining,
  onCancelChallenge,
  walletBalance: propWalletBalance,
  onNavigateTab,
}) => {
  const { wallet } = useAuth();
  const effectiveWalletBalance =
    propWalletBalance !== undefined
      ? propWalletBalance
      : wallet?.available_coins ?? 0;

  // 1. ARENA NAVIGATION & SUB-VIEW STATE MACHINE
  const [arenaSubView, setArenaSubView] = useState<'hub' | 'stake-picker'>('hub');
  const [selectedGame, setSelectedGame] = useState<GameId>('whot');
  const [selectedStake, setSelectedStake] = useState<number | null>(() => {
    // Pick the first tier the user can afford, or 25 as default
    const affordableTier = STAKE_TIERS_CONFIG.find(
      (t) => effectiveWalletBalance >= t.coins
    );
    return affordableTier ? affordableTier.coins : null;
  });

  // 3. RULES MODAL STATE
  const [rulesModalGame, setRulesModalGame] = useState<GameId | null>(null);

  const gamesList = [
    {
      id: 'whot' as GameId,
      name: 'Naija Whot',
      tag: "Nigeria's #1 Skill Card Game",
      desc: "Clear your hand before your opponent. Master Hold On, Pick Two, Pick Three, Suspension and General Market cards. Zero luck — purely strategic card management.",
      badge: 'Most Popular',
      pace: '3m Fast Duel',
      stakes: '25 – 500 Coins',
      engine: 'Strict Naija Rules',
      icon: Zap,
      image: whotImg,
    },
    {
      id: 'chess' as GameId,
      name: 'Speed Chess',
      tag: '5-Minute Blitz Clock',
      desc: 'Server-validated moves with FIDE rules, anti-engine cheat detection, and synchronized timers. True intellectual combat with instant payout on checkmate or resignation.',
      badge: 'High Stakes',
      pace: '5m Clock per side',
      stakes: '25 – 500 Coins',
      engine: 'Stockfish Validation',
      icon: Target,
      image: chessImg,
    },
    {
      id: 'trivia' as GameId,
      name: 'Speed Trivia',
      tag: 'Naija Culture & World Knowledge',
      desc: '10 rapid-fire questions testing Nigerian history, Afrobeats, sport legends, and science. Real-time scoring based on accuracy and buzzer reaction speed.',
      badge: 'Fastest Payout',
      pace: '10 Questions (15s)',
      stakes: '25 – 500 Coins',
      engine: 'Split-Second Buzzer',
      icon: Users,
      image: triviaImg,
    },
    {
      id: 'ludo' as GameId,
      name: 'Ludo Classic',
      tag: 'Tactical 4-Token Race',
      desc: 'Roll 6 to launch, cut rival tokens to reset them, and strategize token blocks. First to get all 4 tokens safely into home wins the locked pot.',
      badge: 'Classic Arena',
      pace: '2-Player Quick Board',
      stakes: '25 – 500 Coins',
      engine: 'Server-Authoritative Dice',
      icon: Clock,
      image: ludoImg,
    },
  ];

  // Handler: "Play" / "Play Public Queue" from Game Card
  const handleSelectGameForPlay = (gameId: GameId) => {
    setSelectedGame(gameId);
    // If current selectedStake is unaffordable, auto-adjust to best affordable or null
    if (selectedStake === null || effectiveWalletBalance < selectedStake) {
      const affordableTier = STAKE_TIERS_CONFIG.find(
        (t) => effectiveWalletBalance >= t.coins
      );
      setSelectedStake(affordableTier ? affordableTier.coins : null);
    }
    setArenaSubView('stake-picker');
  };

  // Handler: "How It Works"
  const handleOpenRulesModal = (gameId: GameId) => {
    setRulesModalGame(gameId);
    if (onOpenRules) {
      onOpenRules(gameId);
    }
  };

  // Handler: "Play {Game}" inside Rules Modal -> Route to Stake Picker
  const handlePlayFromRulesModal = (gameId: GameId) => {
    setRulesModalGame(null);
    handleSelectGameForPlay(gameId);
  };

  // Handler: "Find Match" inside Stake Picker -> Transition to Queue
  const handleFindMatch = (gameId: GameId, stake: number) => {
    if (effectiveWalletBalance < stake) {
      return;
    }
    onOpenQueue(gameId, stake);
  };

  // Handler: Fund Wallet action
  const handleFundWallet = () => {
    if (onNavigateTab) {
      onNavigateTab('wallet');
    } else {
      onOpenDeposit();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ======================================================== */}
      {/* SUB-VIEW 1: STAKE PICKER                                 */}
      {/* ======================================================== */}
      {arenaSubView === 'stake-picker' ? (
        <MicroStakePicker
          gameId={selectedGame}
          walletBalance={effectiveWalletBalance}
          selectedStake={selectedStake}
          isJoining={isJoining}
          onSelectStake={(stake) => setSelectedStake(stake)}
          onBack={() => setArenaSubView('hub')}
          onFindMatch={handleFindMatch}
          onFundWallet={handleFundWallet}
        />
      ) : (
        /* ======================================================== */
        /* SUB-VIEW 2: ARENA HUB                                    */
        /* ======================================================== */
        <div className="space-y-8">
          {/* 1. ARENA HERO BANNER & PRIVATE ROOM QUICK BAR */}
          <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#1A1813] via-[#121212] to-[#0A0A0A] border border-[#F5A623]/30 relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#F5A623]/8 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-2 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] text-xs font-mono font-bold uppercase tracking-wider">
                <Swords className="w-3.5 h-3.5" />
                <span>ApexClash PvP Matchmaking</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                The Competitive Arena
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300 font-sans max-w-xl">
                Choose your battle discipline. Select a micro-stake tier, challenge friends privately over WhatsApp, or enter the 2-minute public liquidity queue for verified Nigerian competition.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 flex-shrink-0">
              <button
                type="button"
                onClick={onOpenJoinRoom}
                className="py-3 px-5 rounded-xl font-mono font-bold text-xs bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.15] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <ShieldCheck className="w-4 h-4 text-[#F5A623]" />
                <span>Enter Room Code</span>
              </button>
            </div>
          </div>

          {/* 2. DEDICATED WHATSAPP CHALLENGES HUB CARD */}
          <WhatsAppChallengesHub
            onCreateChallenge={onOpenCreateRoom}
            onJoinRoom={onOpenJoinRoom}
            onRefundCompleted={onRefundCompleted}
            onCancelChallenge={onCancelChallenge}
          />

          {/* 3. THE 4 DISCIPLINE SHOWCASE CARDS */}
          <div className="space-y-8">
            {gamesList.map((game) => (
              <div
                key={game.id}
                className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#1A1813] via-[#121212] to-[#0A0A0A] border border-[#F5A623]/30 hover:border-[#F5A623]/70 transition-all duration-300 relative overflow-hidden shadow-2xl w-full flex flex-col justify-between"
              >
                {/* Ambient Background Glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#F5A623]/6 rounded-full blur-3xl pointer-events-none" />

                {/* Top Showcase Artwork Banner */}
                <div className="relative h-48 sm:h-56 md:h-64 w-full rounded-2xl overflow-hidden mb-6 border border-white/[0.08] group">
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />

                  {/* Badges on Top of Image */}
                  <div className="absolute top-3.5 left-3.5 flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-[#F5A623]/40 text-xs font-mono text-[#F5A623] font-bold shadow-lg">
                      {game.badge}
                    </span>
                  </div>

                  {/* Title & Tag overlaid at bottom of image */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-[#F5A623] font-bold block mb-1">
                        {game.tag}
                      </span>
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-mono tracking-tight drop-shadow-lg">
                        {game.name}
                      </h3>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black/80 backdrop-blur-md border border-[#F5A623]/30 flex items-center justify-center text-[#F5A623] shadow-xl flex-shrink-0">
                      <game.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                  </div>
                </div>

                {/* Game Description & Features */}
                <div className="space-y-4 mb-6">
                  <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
                    {game.desc}
                  </p>

                  {/* Game Specification Strips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-black/50 border border-white/[0.08]">
                      <span className="text-[10px] text-neutral-500 block uppercase">Match Pace</span>
                      <span className="text-white font-bold">{game.pace}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/50 border border-white/[0.08]">
                      <span className="text-[10px] text-neutral-500 block uppercase">Available Stakes</span>
                      <span className="text-[#F5A623] font-bold">{game.stakes}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/50 border border-white/[0.08] col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-neutral-500 block uppercase">Rule Engine</span>
                      <span className="text-emerald-400 font-bold">{game.engine}</span>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS (Stacked directly on top of each other) */}
                <div className="flex flex-col gap-3 w-full pt-2">
                  {/* Button 1: Play Public Queue -> Routes to Stake Picker */}
                  <button
                    type="button"
                    onClick={() => handleSelectGameForPlay(game.id)}
                    className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[#F5A623]/25 cursor-pointer"
                  >
                    <Swords className="w-4 h-4 fill-current flex-shrink-0" />
                    <span>Play Public Queue (Select Stake Tier)</span>
                  </button>

                  {/* Button 2: Challenge Friend on WhatsApp */}
                  <button
                    type="button"
                    onClick={() => onOpenCreateRoom(game.id)}
                    className="w-full py-3.5 px-5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/40 font-mono font-bold text-xs sm:text-sm uppercase tracking-wider active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
                  >
                    <Share2 className="w-4 h-4 flex-shrink-0" />
                    <span>Challenge Friend on WhatsApp</span>
                  </button>

                  {/* Button 3: How It Works & Official Rules */}
                  <button
                    type="button"
                    onClick={() => handleOpenRulesModal(game.id)}
                    className="w-full py-3.5 px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.1] font-mono font-bold text-xs tracking-wider active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-[#F5A623] flex-shrink-0" />
                    <span>How It Works & Official Rules</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ACTIVE HOW IT WORKS MODAL                             */}
      {/* ======================================================== */}
      {rulesModalGame && (
        <GameRulesModal
          isOpen={Boolean(rulesModalGame)}
          gameId={rulesModalGame}
          onClose={() => setRulesModalGame(null)}
          onPlayNow={(gId) => handlePlayFromRulesModal(gId)}
        />
      )}
    </div>
  );
};
