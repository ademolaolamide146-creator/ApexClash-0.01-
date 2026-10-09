import React, { useState, useEffect } from 'react';
import { X, Swords, Clock, Ban, ShieldCheck, User, Zap, Sparkles } from 'lucide-react';
import { GameId, MatchParticipant } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  selectBotOpponent,
  enterMatchmakingQueue,
  cancelMatchmakingQueue,
} from '../lib/supabase';

interface MatchmakingQueueModalProps {
  isOpen: boolean;
  gameId: GameId;
  stakeCoins: number;
  initialElapsedSeconds?: number;
  onClose: () => void;
  onMatchFound: (opponent: MatchParticipant) => void;
}

export const MatchmakingQueueModal: React.FC<MatchmakingQueueModalProps> = ({
  isOpen,
  gameId,
  stakeCoins,
  initialElapsedSeconds = 0,
  onClose,
  onMatchFound,
}) => {
  const { user } = useAuth();
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);
  const [isCancelled, setIsCancelled] = useState(false);

  // Sync initial timer and register in queue
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setElapsedSeconds(initialElapsedSeconds);
        setIsCancelled(false);
        if (user) {
          enterMatchmakingQueue(user.id, gameId, stakeCoins);
        }
      }, 0);
    }
  }, [isOpen, initialElapsedSeconds, gameId, stakeCoins, user]);

  // 120-second (2-minute) timer
  useEffect(() => {
    if (!isOpen || isCancelled) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        // 2-minute (120s) silent fallback trigger
        if (next >= 120) {
          clearInterval(interval);
          handleSilentLiquidityMatch();
          return 120;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isCancelled]);

  if (!isOpen) return null;

  const handleSilentLiquidityMatch = () => {
    const bot = selectBotOpponent(gameId, 1500);
    const opponent: MatchParticipant = {
      user_id: bot.id,
      username: bot.username,
      color: 'black',
      rating:
        gameId === 'chess'
          ? bot.chess_rating
          : gameId === 'whot'
          ? bot.whot_rating
          : gameId === 'trivia'
          ? bot.trivia_rating
          : bot.ludo_rating,
      location: bot.location,
      is_bot: true,
    };
    onMatchFound(opponent);
  };

  const handleCancel = async () => {
    setIsCancelled(true);
    if (user) {
      await cancelMatchmakingQueue(user.id);
    }
    onClose();
  };

  const handleManualPairTest = () => {
    handleSilentLiquidityMatch();
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const gameTitles: Record<GameId, { name: string; icon: string }> = {
    whot: { name: 'Naija Whot', icon: '🂡' },
    chess: { name: 'Speed Chess', icon: '♞' },
    trivia: { name: 'Speed Trivia', icon: '⚡' },
    ludo: { name: 'Ludo Classic', icon: '🎲' },
  };

  const gameInfo = gameTitles[gameId];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md bg-[#0F0F0F] border border-[#F5A623]/30 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 animate-fade-in text-center">
        
        {/* Top Gold Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#F5A623] to-[#E0921A]" />

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/25 text-[#F5A623] text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Swords className="w-3.5 h-3.5" />
            <span>Public Arena Queue</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Matching Opponent...
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {gameInfo.name} · {stakeCoins} Coins (₦{(stakeCoins * 10).toLocaleString()})
          </p>
        </div>

        {/* Animated Pulsing Gold Ring & Timer */}
        <div className="relative w-36 h-36 mx-auto my-8 flex items-center justify-center">
          {/* Pulsing Outer Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-[#F5A623]/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-[#F5A623]/40 animate-pulse" />

          {/* Rotating Spinner */}
          <div className="w-32 h-32 rounded-full border-4 border-[#F5A623] border-t-transparent animate-spin" />

          {/* Central Counter Display */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl mb-0.5">{gameInfo.icon}</span>
            <span className="font-mono font-black text-lg text-white tabular-nums tracking-wider">
              {formatTimer(elapsedSeconds)}
            </span>
            <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
              / 02:00
            </span>
          </div>
        </div>

        {/* Search status & Silent Liquidity Notice */}
        <div className="space-y-2 mb-6">
          <p className="text-xs text-neutral-300">
            Scanning active players across Lagos, Abuja, Port Harcourt & Ibadan
          </p>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>2-Min Liquidity Guarantee:</span>
            <span className="text-emerald-400 font-bold">Active</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Ban className="w-4 h-4 text-neutral-400" />
            <span>Cancel Search & Return to Arena</span>
          </button>

          {/* Instant Match Sim for Reviewer Testing */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleManualPairTest}
              className="text-xs text-neutral-500 hover:text-[#F5A623] font-mono transition-colors cursor-pointer"
            >
              [Simulate Instant Contender Found]
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
