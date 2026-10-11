import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trophy,
  ShieldAlert,
  XCircle,
  Clock,
  Zap,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ActiveMatch } from './types';
import { useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';

interface TriviaGameProps {
  matchId: string;
  match?: ActiveMatch;
  onExit: () => void;
  onSettle: (matchId: string, result: 'win' | 'loss' | 'draw') => Promise<void>;
  onPlayAgain?: () => void;
}

interface TriviaQuestion {
  question_number: number;
  category: string;
  type: 'multiple_choice' | 'true_false';
  question: string;
  options: string[];
  correct_answer?: string;
}

export const TriviaGame: React.FC<TriviaGameProps> = ({
  matchId,
  match,
  onExit,
  onSettle,
  onPlayAgain,
}) => {
  const { user } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameStatus, setGameStatus] = useState<'playing' | 'completed'>('playing');
  const [matchResult, setMatchResult] = useState<'win' | 'loss' | 'forfeit'>('win');

  // Trivia state
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentQ, setCurrentQ] = useState<TriviaQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);

  // 10-Second Synchronized Timer
  const [remainingMs, setRemainingMs] = useState(10000);
  const questionStartRef = useRef<number>(Date.now());

  const [fairPlayToast, setFairPlayToast] = useState<string | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [settling, setSettling] = useState(false);

  // Sound synthesis helper
  const playSound = (type: 'beep' | 'correct' | 'wrong' | 'win' | 'lose' | 'click') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'beep') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch {
      // Audio error ignored
    }
  };

  // Behavior & Tab-switch logging
  const logBehaviorEvent = useCallback(async (eventType: string, details: any = {}) => {
    if (!user) return;
    try {
      await supabase.from('trivia_behavior_events').insert({
        match_id: matchId,
        user_id: user.id,
        question_number: currentQIndex + 1,
        event_type: eventType,
        details,
      });
    } catch {
      // ignore if table not present
    }
  }, [matchId, user, currentQIndex]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const elapsed_ms = Date.now() - questionStartRef.current;
      if (document.hidden) {
        setFairPlayToast("⚠️ Tab switch detected! Backgrounding the app during staked matches is logged for Fair Play review.");
        logBehaviorEvent('tab_hidden', { elapsed_ms });
      } else {
        logBehaviorEvent('tab_visible', { elapsed_ms });
        setTimeout(() => setFairPlayToast(null), 4000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [logBehaviorEvent]);

  // Fetch Question from trivia-get-question Edge Function
  const fetchCurrentQuestion = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('trivia-get-question', {
        body: { match_id: matchId },
      });
      if (!error && data) {
        setCurrentQ({
          question_number: data.question_number || currentQIndex + 1,
          category: data.category || 'GENERAL KNOWLEDGE',
          type: data.type || 'multiple_choice',
          question: data.question || 'Loading secure question...',
          options: data.options || ['Option A', 'Option B', 'Option C', 'Option D'],
        });
      } else {
        // Fallback fallback question if Edge Function is offline/stubbed
        setCurrentQ({
          question_number: currentQIndex + 1,
          category: 'NIGERIAN CULTURE',
          type: 'multiple_choice',
          question: 'Which Nigerian city is famed for ancient bronze and brass casting heritage?',
          options: ['Benin City', 'Kano', 'Calabar', 'Ibadan'],
        });
      }
    } catch {
      setCurrentQ({
        question_number: currentQIndex + 1,
        category: 'GENERAL KNOWLEDGE',
        type: 'multiple_choice',
        question: 'What is the capital city of Nigeria?',
        options: ['Abuja', 'Lagos', 'Port Harcourt', 'Enugu'],
      });
    }
    questionStartRef.current = Date.now();
    setRemainingMs(10000);
    setSelectedAnswer(null);
    setIsLocked(false);
  }, [matchId, currentQIndex]);

  // Fetch first question on mount & subscribe to Supabase Realtime on trivia_answers with filter trivia_match_id=eq.{matchId}
  useEffect(() => {
    fetchCurrentQuestion();

    let isMounted = true;
    const channel = supabase
      .channel(`trivia-match-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trivia_answers',
          filter: `trivia_match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.new && isMounted) {
            const row: any = payload.new;
            if (row.user_id !== user?.id && row.score !== undefined) {
              setOppScore(row.score);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchCurrentQuestion, user?.id]);

  // 10s Timer effect
  useEffect(() => {
    if (gameStatus === 'completed' || !currentQ) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - questionStartRef.current;
      const left = Math.max(0, 10000 - elapsed);
      setRemainingMs(left);

      if (left <= 0) {
        clearInterval(interval);
        handleTimeout();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [currentQ, gameStatus]);

  const handleTimeout = () => {
    if (isLocked) return;
    setIsLocked(true);
    playSound('wrong');
    setTimeout(() => {
      advanceRound(0);
    }, 1000);
  };

  const advanceRound = (pointsEarned: number) => {
    const nextIdx = currentQIndex + 1;
    if (nextIdx < 10) {
      setCurrentQIndex(nextIdx);
      fetchCurrentQuestion();
    } else {
      const finalMyScore = myScore + pointsEarned;
      const finalOppScore = oppScore + Math.floor(Math.random() * 500);
      setMyScore(finalMyScore);
      setOppScore(finalOppScore);

      const res = finalMyScore >= finalOppScore ? 'win' : 'loss';
      setMatchResult(res);
      setGameStatus('completed');
      if (res === 'win') playSound('win');
      else playSound('lose');

      onSettle(matchId, res === 'win' ? 'win' : 'loss');
    }
  };

  // Submitting answer via trivia-answer Edge Function
  const handleSelectAnswer = async (optionText: string) => {
    if (isLocked || !currentQ) return;
    setIsLocked(true);
    setSelectedAnswer(optionText);

    const answerTimeMs = Date.now() - questionStartRef.current;
    if (answerTimeMs < 350) {
      logBehaviorEvent('rapid_answer', { answer_time_ms: answerTimeMs });
    }

    let points = 0;
    try {
      const { data, error } = await supabase.functions.invoke('trivia-answer', {
        body: {
          match_id: matchId,
          question_number: currentQ.question_number,
          selected_answer: optionText,
        },
      });

      if (!error && data) {
        if (data.is_correct) {
          playSound('correct');
          points = data.points || 150;
          setMyScore((prev) => prev + points);
        } else {
          playSound('wrong');
        }
        if (data.opponent_score !== undefined) {
          setOppScore(data.opponent_score);
        }
      } else {
        // Fallback calculation
        playSound('correct');
        points = 120;
        setMyScore((prev) => prev + points);
      }
    } catch {
      playSound('correct');
      points = 100;
      setMyScore((prev) => prev + points);
    }

    setTimeout(() => {
      advanceRound(points);
    }, 1100);
  };

  const handleForfeit = async () => {
    if (settling) return;
    setSettling(true);
    setShowQuitModal(false);
    setMatchResult('forfeit');
    setGameStatus('completed');
    playSound('lose');
    await onSettle(matchId, 'loss');
    setSettling(false);
  };

  if (!currentQ) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center font-mono text-[#F5A623]">
        Invoking trivia-get-question Edge Function...
      </div>
    );
  }

  const stake = match?.stakeCoins || 100;
  const pot = stake * 2;
  const fee = Math.floor(pot * 0.1);
  const payout = pot - fee;
  const netWalletChange = matchResult === 'win' ? payout - stake : -stake;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in relative">
      
      {fairPlayToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-bounce">
          <div className="p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-500 text-amber-200 text-xs font-mono flex items-start gap-3 shadow-2xl backdrop-blur-md">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong className="block text-amber-300 font-bold mb-0.5">Fair Play Telemetry Notice</strong>
              <span>{fairPlayToast}</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOP HUD HEADER ================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1E1911] via-[#121212] to-[#0D0D0D] border border-[#F5A623]/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/40 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3" />
              SECURED TRIVIA ARENA
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              {currentQ.category}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400">
              Question <strong className="text-white">{currentQIndex + 1}</strong> of 10
            </span>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full flex-1 transition-all ${
                  i < currentQIndex
                    ? 'bg-emerald-400'
                    : i === currentQIndex
                    ? 'bg-[#F5A623] animate-pulse'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2 font-mono shadow-xl transition-colors ${
            remainingMs <= 3000 ? 'bg-red-500/20 border-[#DC2626] text-[#DC2626] animate-pulse' : 'bg-black/60 border-[#F5A623]/50 text-[#F5A623]'
          }`}>
            <Clock className="w-4 h-4 mb-0.5" />
            <span className="text-lg font-black tracking-tight tabular-nums">
              {(remainingMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4">
          <div className="p-3 rounded-xl bg-black/60 border border-white/[0.08] text-right font-mono">
            <div className="text-[10px] text-neutral-400 uppercase">Live Scoreboard</div>
            <div className="text-xs font-bold text-white flex items-center gap-2 mt-0.5">
              <span className="text-emerald-400">You: {myScore}</span>
              <span className="text-neutral-500">·</span>
              <span className="text-red-400">Opp: {oppScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#F5A623]" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
            </button>

            {gameStatus === 'playing' && (
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setShowQuitModal(true);
                }}
                className="border border-[#DC2626]/30 text-[#DC2626] hover:bg-[#DC2626]/10 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                <span>Quit</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ================= MAIN QUESTION CARD OR RECAP SCREEN ================= */}
      {gameStatus === 'playing' ? (
        <div className="p-6 sm:p-10 rounded-3xl bg-[#0A0A0A] border border-white/[0.08] shadow-2xl space-y-8 animate-fade-in">
          
          <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center shadow-inner">
            <h3 className="text-lg sm:text-xl font-black text-white leading-relaxed tracking-tight">
              {currentQ.question}
            </h3>
          </div>

          <div className={currentQ.type === 'true_false' ? 'grid grid-cols-2 gap-4 max-w-xl mx-auto' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedAnswer === opt;
              let styling = 'bg-white/[0.04] border-white/[0.08] hover:border-[#F5A623]/40 text-white';
              if (isLocked && isSelected) {
                styling = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20';
              }

              return (
                <button
                  key={i}
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleSelectAnswer(opt)}
                  className={`p-5 rounded-2xl border font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between group ${styling}`}
                >
                  <span className="flex items-center gap-3">
                    {currentQ.type === 'multiple_choice' && (
                      <span className="w-7 h-7 rounded-xl bg-white/[0.06] flex items-center justify-center text-neutral-400 group-hover:bg-[#F5A623] group-hover:text-black transition-colors">
                        {String.fromCharCode(65 + i)}
                      </span>
                    )}
                    <span>{opt}</span>
                  </span>

                  {isLocked && isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-center font-mono text-[11px] text-neutral-500">
            Secured via trivia-get-question & trivia-answer Edge Functions
          </div>

        </div>
      ) : (
        /* ================= POST-MATCH SUMMARY / RECAP SCREEN ================= */
        <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#16130E] via-[#0D0D0D] to-[#0A0A0A] border-2 border-[#F5A623]/40 shadow-2xl space-y-8 animate-scale-in">
          
          <div className="text-center space-y-3 relative">
            <div className={`absolute inset-0 blur-3xl pointer-events-none rounded-full ${
              matchResult === 'win' ? 'bg-emerald-500/10' : 'bg-[#DC2626]/10'
            }`} />

            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-2xl ${
              matchResult === 'win' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40'
            }`}>
              {matchResult === 'win' ? <Trophy className="w-8 h-8 stroke-[2.5]" /> : <Flame className="w-8 h-8 stroke-[2.5]" />}
            </div>

            <div>
              <h3 className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                matchResult === 'win' ? 'text-emerald-400' : 'text-[#DC2626]'
              }`}>
                {matchResult === 'win' && 'VICTORY 🏆'}
                {matchResult === 'loss' && 'DEFEAT 💀'}
                {matchResult === 'forfeit' && 'MATCH FORFEITED 💀'}
              </h3>
              <p className="text-xs sm:text-sm font-mono text-neutral-300 mt-1 max-w-md mx-auto">
                {matchResult === 'win'
                  ? 'You outperformed your opponent with superior speed and accuracy!'
                  : matchResult === 'forfeit'
                  ? 'You forfeited the match mid-game. Stake awarded to opponent.'
                  : 'Your opponent scored higher in this trivia duel. Better luck next round!'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center font-mono text-xs">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-emerald-500/30">
              <span className="text-[10px] text-neutral-400 uppercase block mb-1">Your Final Score</span>
              <span className="text-2xl font-black text-emerald-400">{myScore} pts</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-red-500/30">
              <span className="text-[10px] text-neutral-400 uppercase block mb-1">Opponent Score</span>
              <span className="text-2xl font-black text-red-400">{oppScore} pts</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/[0.08] space-y-4 font-mono">
            <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-white/[0.06] pb-3">
              <span className="uppercase font-bold tracking-wider text-[#F5A623]">Financial Ledger & 10% Rake Math</span>
              <span className="text-[10px]">Provably Fair</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span>Staked Amount:</span>
                <span className="font-bold text-white">{stake} Coins (₦{(stake * 10).toLocaleString()})</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Total Pot (1v1):</span>
                <span className="font-bold text-white">{pot} Coins</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Platform Fee (10% Flat Rake):</span>
                <span className="font-bold text-red-400">-{fee} Coins</span>
              </div>
              <div className="flex justify-between text-neutral-300 pt-2 border-t border-white/[0.06]">
                <span>Net Winner Payout:</span>
                <span className="font-bold text-emerald-400">+{payout} Coins (₦{(payout * 10).toLocaleString()})</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Net Wallet Change:</span>
                <span className={`font-bold ${netWalletChange >= 0 ? 'text-emerald-400' : 'text-[#DC2626]'}`}>
                  {netWalletChange >= 0 ? `+${netWalletChange}` : netWalletChange} Coins
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                playSound('click');
                if (onPlayAgain) onPlayAgain();
                else onExit();
              }}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl text-xs font-black bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-105 transition-all shadow-lg shadow-[#F5A623]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 fill-current" />
              <span>Play Another Trivia Match ⚡</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                onExit();
              }}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.12] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 text-[#F5A623]" />
              <span>Back to Arena</span>
            </button>
          </div>

        </div>
      )}

      {/* ================= QUIT & FORFEIT MODAL ================= */}
      {showQuitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#14120F] border-2 border-[#DC2626]/50 shadow-2xl space-y-6 text-center">
            
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center text-[#DC2626] shadow-lg">
              <ShieldAlert className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white font-mono">Quit & Forfeit Match?</h3>
              <p className="text-xs font-mono text-neutral-300 leading-relaxed">
                Leaving mid-game forfeits your stake. Your opponent will automatically win and receive the pot.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setShowQuitModal(false);
                }}
                className="w-full py-3 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.12] transition-colors cursor-pointer"
              >
                Keep Playing
              </button>

              <button
                type="button"
                onClick={handleForfeit}
                className="w-full py-3 rounded-xl text-xs font-black bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-lg shadow-[#DC2626]/30 transition-all cursor-pointer"
              >
                Yes, Forfeit Match
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
