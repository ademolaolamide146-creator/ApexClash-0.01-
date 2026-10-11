import React, { useState, useEffect } from 'react';
import {
  Trophy,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  Flame,
  Award,
  Zap,
} from 'lucide-react';
import { ActiveMatch } from '../types';
import { useAuth } from '../context/AuthContext';
import { WhotGame } from '../WhotGame';
import { TriviaGame } from '../TriviaGame';
import { ChessGame } from '../ChessGame';
import { LudoGame } from '../LudoGame';

interface ActiveGameBoardProps {
  match: ActiveMatch;
  onExit: () => void;
  onSettle: (matchId: string, result: 'win' | 'loss' | 'draw') => Promise<void>;
}

export const ActiveGameBoard: React.FC<ActiveGameBoardProps> = ({
  match,
  onExit,
  onSettle,
}) => {
  const { user } = useAuth();
  const [matchSeconds, setMatchSeconds] = useState<number>(0);
  const [settledResult, setSettledResult] = useState<'win' | 'loss' | 'draw' | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setMatchSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSettleMatch = async (result: 'win' | 'loss' | 'draw') => {
    setSettledResult(result);
    await onSettle(match.id, result);
  };

  if (match.gameId === 'whot') {
    return <WhotGame match={match} onExit={onExit} onSettle={onSettle} />;
  }

  if (match.gameId === 'trivia') {
    return <TriviaGame matchId={match.id} match={match} onExit={onExit} onSettle={onSettle} />;
  }

  if (match.gameId === 'chess') {
    return <ChessGame matchId={match.id} match={match} onExit={onExit} onSettle={(res) => handleSettleMatch(res.winner ? 'win' : 'loss')} />;
  }

  if (match.gameId === 'ludo') {
    return <LudoGame matchId={match.id} match={match} onExit={onExit} onSettle={(res) => handleSettleMatch(res.winner ? 'win' : 'loss')} />;
  }

  const pot = match.stakeCoins * 2;
  const rake = Math.round(pot * 0.1);
  const winnerPayout = pot - rake;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* 1. MATCH TOP STATUS BAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1E1911] via-[#121212] to-[#0D0D0D] border border-[#F5A623]/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
              LIVE CONTEST
            </span>
            <span className="text-xs font-mono text-neutral-400">
              ID: <strong className="text-white">{match.id}</strong>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {(match.gameId as string) === 'chess' && 'Speed Chess 5-Min Blitz'}
            {(match.gameId as string) === 'ludo' && 'Ludo Classic 4-Token Race'}
            {(match.gameId as string) === 'trivia' && 'Speed Trivia'}
            {(match.gameId as string) === 'whot' && 'Naija Whot'}
          </h2>
          <div className="flex items-center gap-3 text-xs font-mono text-neutral-300 mt-1">
            <span>Stake: <strong className="text-[#F5A623]">{match.stakeCoins} AC (₦{(match.stakeCoins * 10).toLocaleString()})</strong></span>
            <span>·</span>
            <span>Total Pot: <strong className="text-white">{pot} AC</strong></span>
            <span>·</span>
            <span>Victor Takes: <strong className="text-emerald-400">+{winnerPayout} AC (90%)</strong></span>
          </div>
        </div>

        {/* Live Clock & Escrow Safeguard */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-black/60 border border-white/[0.08] text-center font-mono">
            <span className="text-[10px] text-neutral-400 block uppercase">Match Clock</span>
            <span className="text-lg font-black text-[#F5A623] tracking-widest tabular-nums">
              {formatTimer(matchSeconds)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-300">
            <div className="flex items-center gap-1 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Escrow Active</span>
            </div>
            <span>Stakes Locked Safe</span>
          </div>
        </div>
      </div>

      {/* 2. PLAYER VS OPPONENT STRIP */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-[#F5A623]/30 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#E0921A] flex items-center justify-center font-bold text-black text-xs">
            {user?.username.slice(0, 2).toUpperCase() || 'ME'}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">You (Host)</span>
            <span className="font-bold text-white truncate block">{user?.username || 'Contender'}</span>
            <span className="text-[10px] text-neutral-400">Rating: 1,500 · Lagos</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-red-500/20 flex items-center gap-3 text-right justify-end">
          <div className="min-w-0">
            <span className="text-[10px] text-red-400 uppercase font-bold block">Opponent</span>
            <span className="font-bold text-white truncate block">{match.opponentName}</span>
            <span className="text-[10px] text-neutral-400">Rating: 1,480 · Abuja</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#DC2626] to-[#991B1B] flex items-center justify-center font-bold text-white text-xs">
            {match.opponentName.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      {/* 3. SETTLED RESULT BANNER OVERLAY (IF MATCH FINISHED) */}
      {settledResult && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1F1912] to-[#121212] border-2 border-[#F5A623] text-center space-y-3 animate-fade-in shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-black bg-[#F5A623]">
            <Trophy className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h3 className="text-2xl font-black text-white">
            {settledResult === 'win' && 'Match Victory Confirmed!'}
            {settledResult === 'draw' && 'Official Draw — 100% Refund'}
            {settledResult === 'loss' && 'Match Concluded'}
          </h3>
          <p className="text-xs font-mono text-neutral-300 max-w-md mx-auto">
            {settledResult === 'win' && (
              <>
                You won <strong>+{winnerPayout} Apex Coins (₦{(winnerPayout * 10).toLocaleString()})</strong>.
                10% flat rake ({rake} AC) deducted for platform maintenance.
              </>
            )}
            {settledResult === 'draw' && (
              <>
                Official stalemate recorded. 100% of your {match.stakeCoins} AC stake has been refunded with 0% platform fee.
              </>
            )}
            {settledResult === 'loss' && (
              <>
                Your opponent claimed the pot. Better luck in the next duel!
              </>
            )}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onExit}
              className="py-3 px-6 rounded-xl text-xs font-black bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-105 transition-all shadow-md cursor-pointer"
            >
              Acknowledge & Return to Arena Hub
            </button>
          </div>
        </div>
      )}

      {/* 4. DEFAULT SIMULATOR FOR LUDO / OTHERS */}
      {!settledResult && (
        <div className="p-6 sm:p-8 rounded-3xl bg-black/60 border border-white/[0.08] shadow-2xl space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center justify-center">
            <Flame className="w-10 h-10 text-[#F5A623] animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Match Arena Active ({match.gameId})</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto font-mono">
              Your match is securely synchronized over real-time WebSockets and escrow. Choose an action below to test settlement.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => handleSettleMatch('win')}
              className="py-3 px-6 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Claim Victory (Simulate Win)
            </button>
            <button
              type="button"
              onClick={() => handleSettleMatch('draw')}
              className="py-3 px-6 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              Agree to Draw (Simulate Refund)
            </button>
            <button
              type="button"
              onClick={() => handleSettleMatch('loss')}
              className="py-3 px-6 rounded-xl font-bold text-xs bg-[#DC2626] hover:bg-[#b91c1c] text-white shadow-lg shadow-[#DC2626]/20 transition-all cursor-pointer"
            >
              Forfeit / Concede Loss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
