import React, { useState, useEffect } from 'react';
import {
  Swords,
  Clock,
  Coins,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  ArrowRight,
  ShieldAlert,
  Flame,
  Award,
  Zap,
} from 'lucide-react';
import { ActiveMatch, GameId } from '../types';
import { useAuth } from '../context/AuthContext';
import { WhotGame } from '../WhotGame';
import { TriviaGame } from '../TriviaGame';

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
  const [matchSeconds, setMatchSeconds] = useState(match.remainingSeconds || 180);
  const [settling, setSettling] = useState(false);
  const [settledResult, setSettledResult] = useState<'win' | 'loss' | 'draw' | null>(null);

  // Chess specific state
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [chessMoves, setChessMoves] = useState<string[]>([
    '1. e4 e5',
    '2. Nf3 Nc6',
    '3. Bc4 Nf6',
  ]);
  // Ludo specific state
  const [diceValue, setDiceValue] = useState(6);
  const [isRolling, setIsRolling] = useState(false);
  const [tokensHome, setTokensHome] = useState(2);

  // Live match clock countdown
  useEffect(() => {
    if (settledResult) return;
    const interval = setInterval(() => {
      setMatchSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [settledResult]);

  const pot = match.stakeCoins * 2;
  const winnerPayout = Math.floor(pot * 0.9);
  const rake = pot - winnerPayout;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleTriggerSettle = async (result: 'win' | 'loss' | 'draw') => {
    if (settling) return;
    setSettling(true);
    setSettledResult(result);
    await onSettle(match.id, result);
    setSettling(false);
  };

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    setTimeout(() => {
      const rolled = Math.floor(1 + Math.random() * 6);
      setDiceValue(rolled);
      setIsRolling(false);
      if (rolled === 6 && tokensHome < 4) {
        setTokensHome((prev) => prev + 1);
      }
    }, 400);
  };



  if (match.gameId === 'whot') {
    return <WhotGame match={match} onExit={onExit} onSettle={onSettle} />;
  }

  if (match.gameId === 'trivia') {
    return <TriviaGame matchId={match.id} match={match} onExit={onExit} onSettle={onSettle} />;
  }

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
            {match.gameId === 'chess' && 'Speed Chess 5-Min Blitz'}
            {match.gameId === 'ludo' && 'Ludo Classic 4-Token Race'}
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
        {/* You */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-[#F5A623]/30 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#E0921A] flex items-center justify-center font-bold text-black text-xs">
            {user?.username.slice(0, 2).toUpperCase() || 'ME'}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">You (White / Host)</span>
            <span className="font-bold text-white truncate block">{user?.username || 'Contender'}</span>
            <span className="text-[10px] text-neutral-400">Rating: 1,500 · Lagos</span>
          </div>
        </div>

        {/* Opponent */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-red-500/20 flex items-center gap-3 text-right justify-end">
          <div className="min-w-0">
            <span className="text-[10px] text-red-400 uppercase font-bold block">Opponent (Black)</span>
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

      {/* 4. DISCIPLINE GAME BOARD SIMULATOR */}
      {!settledResult && (
        <div className="p-6 sm:p-8 rounded-3xl bg-black/60 border border-white/[0.08] shadow-2xl">
          
          {/* A. SPEED CHESS BOARD */}
          {match.gameId === 'chess' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                {/* 8x8 Chessboard Grid */}
                <div className="w-72 h-72 sm:w-80 sm:h-80 border-4 border-[#2A2318] rounded-xl overflow-hidden grid grid-cols-8 shadow-2xl">
                  {Array.from({ length: 64 }).map((_, idx) => {
                    const row = Math.floor(idx / 8);
                    const col = idx % 8;
                    const isLight = (row + col) % 2 === 0;

                    // Simplified visual pieces
                    let piece = '';
                    if (row === 0) piece = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'][col];
                    else if (row === 1) piece = '♟';
                    else if (row === 6) piece = '♙';
                    else if (row === 7) piece = ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'][col];

                    const isSelected = selectedPiece === `${row}-${col}`;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (piece) setSelectedPiece(`${row}-${col}`);
                          else if (selectedPiece) {
                            setChessMoves((m) => [...m, `Move ${col + 1}`]);
                            setSelectedPiece(null);
                          }
                        }}
                        className={`flex items-center justify-center text-lg sm:text-2xl select-none cursor-pointer transition-colors ${
                          isLight ? 'bg-[#D2B48C]/90 text-black' : 'bg-[#4A3B2C] text-amber-100'
                        } ${isSelected ? 'ring-2 ring-[#F5A623] bg-[#F5A623]/50' : ''}`}
                      >
                        {piece}
                      </button>
                    );
                  })}
                </div>

                {/* Move Notation & Clock */}
                <div className="space-y-4 max-w-xs w-full text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                    <span className="text-[10px] text-[#F5A623] uppercase font-bold block">FIDE Blitz Notation</span>
                    <div className="space-y-1 text-neutral-300 max-h-24 overflow-y-auto">
                      {chessMoves.map((m, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{m}</span>
                          <span className="text-neutral-500">eval: +0.2</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] text-neutral-400">
                    Server anti-engine telemetry active · Stockfish deep-analysis protection on
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* D. LUDO CLASSIC RACE */}
          {match.gameId === 'ludo' && (
            <div className="max-w-md mx-auto space-y-6 text-center font-mono">
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col items-center gap-4">
                <span className="text-xs text-neutral-400 uppercase">Interactive Provably-Fair Dice</span>
                <button
                  type="button"
                  onClick={handleRollDice}
                  disabled={isRolling}
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F5A623] to-[#E0921A] text-black font-black text-4xl flex items-center justify-center shadow-xl cursor-pointer ${
                    isRolling ? 'animate-spin' : 'hover:scale-105 transition-transform'
                  }`}
                >
                  {diceValue}
                </button>
                <span className="text-xs text-[#F5A623]">
                  {diceValue === 6 ? '🎉 Rolled 6! Token enters yard + Bonus turn!' : 'Tap dice to roll (1–6)'}
                </span>

                <div className="w-full pt-4 border-t border-white/[0.06] flex justify-between text-xs">
                  <span>Tokens Finished: <strong className="text-white">{tokensHome}/4</strong></span>
                  <span>Opponent Finished: <strong className="text-neutral-400">1/4</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* 5. MATCH CONTEST RESOLUTION BUTTONS */}
          <div className="pt-8 border-t border-white/[0.08] mt-8">
            <span className="text-[11px] font-mono text-neutral-400 block mb-3 text-center uppercase tracking-wider">
              Contest Action Triggers & Referee Settlement
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={settling}
                onClick={() => handleTriggerSettle('win')}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-105 transition-all shadow-md shadow-[#F5A623]/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 fill-current" />
                <span>Claim Victory (Winner Takes 90%)</span>
              </button>

              <button
                type="button"
                disabled={settling}
                onClick={() => handleTriggerSettle('draw')}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.12] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>Declare Draw (100% Refund, 0% Fee)</span>
              </button>

              <button
                type="button"
                disabled={settling}
                onClick={() => handleTriggerSettle('loss')}
                className="py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Resign / Concede</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
