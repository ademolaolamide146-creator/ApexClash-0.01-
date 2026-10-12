import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trophy,
  ShieldAlert,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Flame,
  Volume2,
  VolumeX,
  Clock,
  Zap,
  CheckCircle2,
  Handshake,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { ActiveMatch } from './types';
import { Chess } from 'chess.js';

// Simple sound synthesizer
const playSound = (type: 'move' | 'capture' | 'win' | 'loss' | 'click' | 'check' | 'invalid') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'invalid') {
      osc.frequency.setValueAtTime(150, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'move') {
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'capture' || type === 'check') {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.50, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'loss') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch {
    // AudioContext blocked or unsupported
  }
};

interface ChessGameState {
  id: string;
  match_id: string;
  fen: string;
  pgn: string;
  moves: any[];
  white_time_ms: number; // 600,000 ms (10 mins)
  black_time_ms: number; // 600,000 ms (10 mins)
  turn_started_at: string | null;
  status: 'in_progress' | 'completed';
  winner_id: string | null;
  white_player_id: string;
  black_player_id: string;
  my_color: 'white' | 'black';
  is_my_turn: boolean;
  end_reason?: string;
}

interface ChessGameProps {
  matchId: string;
  match?: ActiveMatch;
  onExit: () => void;
  onSettle?: (result: { winner: boolean; payout: number }) => void;
}

// Simple FEN parser to get pieces on board for SVG render
const parseFen = (fen: string): (string | null)[][] => {
  const board: (string | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  
  for (let r = 0; r < 8; r++) {
    const rowStr = rows[r];
    let c = 0;
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (!isNaN(Number(char))) {
        c += Number(char);
      } else {
        board[r][c] = char;
        c++;
      }
    }
  }
  return board;
};

// SVG Chess Piece Renderer
const ChessPieceSymbol: React.FC<{ piece: string }> = ({ piece }) => {
  const isWhite = piece === piece.toUpperCase();
  const type = piece.toLowerCase();
  
  const colorClass = isWhite ? 'text-amber-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]';
  
  let symbol = '';
  switch (type) {
    case 'k': symbol = isWhite ? '♔' : '♚'; break;
    case 'q': symbol = isWhite ? '♕' : '♛'; break;
    case 'r': symbol = isWhite ? '♖' : '♜'; break;
    case 'b': symbol = isWhite ? '♗' : '♝'; break;
    case 'n': symbol = isWhite ? '♘' : '♞'; break;
    case 'p': symbol = isWhite ? '♙' : '♟'; break;
    default: symbol = '';
  }

  return (
    <span className={`text-4xl sm:text-5xl select-none font-bold transition-transform hover:scale-110 ${colorClass}`}>
      {symbol}
    </span>
  );
};

export const ChessGame: React.FC<ChessGameProps> = ({ matchId, match, onExit, onSettle }) => {
  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [toast, setToast] = useState<{msg: string} | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals
  const [showResignModal, setShowResignModal] = useState<boolean>(false);
  const [showDrawModal, setShowDrawModal] = useState<boolean>(false);

  // Clocks local state
  const [whiteTime, setWhiteTime] = useState<number>(600000);
  const [blackTime, setBlackTime] = useState<number>(600000);

  const currentUserIdRef = useRef<string | null>(null);

  const fetchGameState = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      currentUserIdRef.current = userId || null;

      let { data: chessRow } = await supabase
        .from('chess_games')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();

      if (!chessRow) {
        const { data: byId } = await supabase
          .from('chess_games')
          .select('*')
          .eq('id', matchId)
          .maybeSingle();
        chessRow = byId;
      }

      if (chessRow) {
        const myColor = chessRow.white_player_id === userId ? 'white' : 'black';
        const activeTurn = chessRow.fen.split(' ')[1] === 'w' ? 'white' : 'black';
        const isMyTurn = myColor === activeTurn && chessRow.status === 'in_progress';

        setGameState({
          id: chessRow.id,
          match_id: chessRow.match_id || matchId,
          fen: chessRow.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          pgn: chessRow.pgn || '',
          moves: chessRow.moves || [],
          white_time_ms: chessRow.white_time_ms ?? 600000,
          black_time_ms: chessRow.black_time_ms ?? 600000,
          turn_started_at: chessRow.turn_started_at,
          status: chessRow.status || 'in_progress',
          winner_id: chessRow.winner_id || null,
          white_player_id: chessRow.white_player_id,
          black_player_id: chessRow.black_player_id,
          my_color: myColor,
          is_my_turn: isMyTurn,
          end_reason: chessRow.end_reason,
        });

        setWhiteTime(chessRow.white_time_ms ?? 600000);
        setBlackTime(chessRow.black_time_ms ?? 600000);
      } else {
        const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        setGameState({
          id: matchId,
          match_id: matchId,
          fen: defaultFen,
          pgn: '',
          moves: [],
          white_time_ms: 600000,
          black_time_ms: 600000,
          turn_started_at: null,
          status: 'in_progress',
          winner_id: null,
          white_player_id: userId || 'player-white',
          black_player_id: 'bot-black',
          my_color: 'white',
          is_my_turn: true,
        });
      }
    } catch (err: any) {
      console.error('Error fetching chess state:', err);
      setErrorMsg(err.message || 'Failed to load chess match');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchGameState();

    const channel = supabase
      .channel(`chess_match_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chess_games',
          filter: `match_id=eq.${matchId}`,
        },
        (payload: any) => {
          if (payload.new) {
            const updated = payload.new;
            const userId = currentUserIdRef.current;
            const myColor = updated.white_player_id === userId ? 'white' : 'black';
            const activeTurn = updated.fen.split(' ')[1] === 'w' ? 'white' : 'black';
            const isMyTurn = myColor === activeTurn && updated.status === 'in_progress';

            if (soundEnabled && gameState && updated.fen !== gameState.fen) {
              playSound('move');
            }

            setGameState({
              id: updated.id,
              match_id: updated.match_id || matchId,
              fen: updated.fen,
              pgn: updated.pgn || '',
              moves: updated.moves || [],
              white_time_ms: updated.white_time_ms ?? 600000,
              black_time_ms: updated.black_time_ms ?? 600000,
              turn_started_at: updated.turn_started_at,
              status: updated.status || 'in_progress',
              winner_id: updated.winner_id || null,
              white_player_id: updated.white_player_id,
              black_player_id: updated.black_player_id,
              my_color: myColor,
              is_my_turn: isMyTurn,
              end_reason: updated.end_reason,
            });

            setWhiteTime(updated.white_time_ms ?? 600000);
            setBlackTime(updated.black_time_ms ?? 600000);

            if (updated.status === 'completed') {
              const isWinner = updated.winner_id === userId;
              if (soundEnabled) {
                playSound(isWinner ? 'win' : 'loss');
              }
              const stake = match?.stakeCoins || 500;
              const payout = isWinner ? Math.round(stake * 2 * 0.9) : 0;
              if (onSettle) {
                onSettle({ winner: isWinner, payout });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchGameState, soundEnabled, match?.stakeCoins, onSettle, gameState]);

  // Synchronized Clock countdown ticker
  useEffect(() => {
    if (!gameState || gameState.status !== 'in_progress' || !gameState.turn_started_at) return;

    const timer = setInterval(() => {
      const activeTurn = gameState.fen.split(' ')[1] === 'w' ? 'white' : 'black';
      const elapsed = Date.now() - new Date(gameState.turn_started_at!).getTime();

      if (activeTurn === 'white') {
        const remaining = Math.max(0, gameState.white_time_ms - elapsed);
        setWhiteTime(remaining);
        if (remaining <= 0) {
          handleTimeout('white');
        }
      } else {
        const remaining = Math.max(0, gameState.black_time_ms - elapsed);
        setBlackTime(remaining);
        if (remaining <= 0) {
          handleTimeout('black');
        }
      }
    }, 200);

    return () => clearInterval(timer);
  }, [gameState]);

  const handleTimeout = async (colorTimedOut: 'white' | 'black') => {
    try {
      const winnerId = colorTimedOut === 'white' ? gameState?.black_player_id : gameState?.white_player_id;
      await supabase.functions.invoke('chess-finish', {
        body: { match_id: matchId, reason: 'timeout', winner_id: winnerId },
      });
    } catch {
      setGameState((prev) => prev ? { ...prev, status: 'completed', end_reason: 'timeout' } : null);
    }
  };

  const formatTime = (ms: number): string => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate valid moves when selection changes
  useEffect(() => {
    if (!gameState || !selectedSquare) {
      setValidMoves([]);
      return;
    }
    const chess = new Chess(gameState.fen);
    try {
      const moves = chess.moves({ square: selectedSquare as any, verbose: true });
      setValidMoves(moves.map(m => m.to));
    } catch {
      setValidMoves([]);
    }
  }, [gameState?.fen, selectedSquare]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSquareClick = async (r: number, c: number) => {
    if (!gameState || gameState.status !== 'in_progress' || !gameState.is_my_turn) return;

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = gameState.my_color === 'white' 
      ? ['8', '7', '6', '5', '4', '3', '2', '1'] 
      : ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    const actualR = gameState.my_color === 'white' ? r : 7 - r;
    const actualC = gameState.my_color === 'white' ? c : 7 - c;
    const squareNotation = `${files[actualC]}${ranks[actualR]}`;

    if (!selectedSquare) {
      const board = parseFen(gameState.fen);
      const piece = board[actualR][actualC];
      if (piece) {
        const isWhitePiece = piece === piece.toUpperCase();
        const myIsWhite = gameState.my_color === 'white';
        if (isWhitePiece === myIsWhite) {
          setSelectedSquare(squareNotation);
          if (soundEnabled) playSound('click');
        }
      }
    } else {
      if (selectedSquare === squareNotation) {
        setSelectedSquare(null);
        return;
      }

      // Check if valid move
      if (!validMoves.includes(squareNotation)) {
        // Check if user clicked another friendly piece instead
        const board = parseFen(gameState.fen);
        const piece = board[actualR][actualC];
        if (piece) {
            const isWhitePiece = piece === piece.toUpperCase();
            const myIsWhite = gameState.my_color === 'white';
            if (isWhitePiece === myIsWhite) {
                setSelectedSquare(squareNotation);
                if (soundEnabled) playSound('click');
                return;
            }
        }
        
        // Invalid move
        setToast({ msg: "Invalid Move: That piece cannot move there." });
        if (soundEnabled) playSound('invalid');
        setSelectedSquare(null);
        return;
      }

      const from = selectedSquare;
      const to = squareNotation;
      setSelectedSquare(null);

      try {
        const { data, error } = await supabase.functions.invoke('chess-move', {
          body: {
            match_id: matchId,
            from,
            to,
            promotion: 'q',
          },
        });

        if (error || (data && data.error)) {
          console.warn('Server move invoke returned error:', error || data?.error);
        } else if (data && data.fen) {
          setGameState((prev) => prev ? {
            ...prev,
            fen: data.fen,
            pgn: data.pgn || prev.pgn,
            is_my_turn: false,
          } : null);
          if (soundEnabled) playSound('capture');
        }
      } catch (err: any) {
        console.error('Move submission error:', err);
        setErrorMsg('Move failed. Please try again.');
        setTimeout(() => setErrorMsg(null), 3000);
      }
    }
  };

  const handleResign = async () => {
    try {
      const opponentId = gameState?.my_color === 'white' ? gameState?.black_player_id : gameState?.white_player_id;
      await supabase.functions.invoke('chess-finish', {
        body: { match_id: matchId, reason: 'resign', winner_id: opponentId },
      });
      setShowResignModal(false);
      setGameState((prev) => prev ? { ...prev, status: 'completed', end_reason: 'resign', winner_id: opponentId || null } : null);
    } catch {
      setShowResignModal(false);
    }
  };

  const handleOfferDraw = async () => {
    try {
      await supabase.functions.invoke('chess-finish', {
        body: { match_id: matchId, reason: 'draw' },
      });
      setShowDrawModal(false);
      setGameState((prev) => prev ? { ...prev, status: 'completed', end_reason: 'draw' } : null);
    } catch {
      setShowDrawModal(false);
    }
  };

  if (loading || !gameState) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#F5A623] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-mono text-sm">Loading Speed Chess Blitz Arena...</p>
      </div>
    );
  }

  const board = parseFen(gameState.fen);
  const isWhitePlayer = gameState.my_color === 'white';
  const myTime = isWhitePlayer ? whiteTime : blackTime;
  const oppTime = isWhitePlayer ? blackTime : whiteTime;

  if (gameState.status === 'completed') {
    const isWinner = gameState.winner_id === currentUserIdRef.current;
    const isDraw = gameState.end_reason === 'draw';
    const stake = match?.stakeCoins || 500;
    const totalPot = stake * 2;
    const fee = isDraw ? 0 : Math.round(totalPot * 0.1);
    const netPayout = isDraw ? stake : (isWinner ? totalPot - fee : 0);
    const netWalletChange = isDraw ? 0 : (isWinner ? netPayout - stake : -stake);

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-16 px-4">
        <div className={`p-8 rounded-2xl border text-center relative overflow-hidden backdrop-blur-md shadow-2xl ${
          isDraw 
            ? 'bg-[#1A1A1A]/90 border-amber-500/30 shadow-amber-500/10'
            : isWinner 
              ? 'bg-[#1A1A1A]/90 border-emerald-500/30 shadow-emerald-500/20'
              : 'bg-[#1A1A1A]/90 border-[#DC2626]/30 shadow-[#DC2626]/20'
        }`}>
          <div className="absolute top-0 right-0 p-6 opacity-10">
            {isDraw ? <Handshake className="w-32 h-32 text-amber-400" /> : isWinner ? <Trophy className="w-32 h-32 text-emerald-400" /> : <XCircle className="w-32 h-32 text-[#DC2626]" />}
          </div>

          <div className="inline-flex p-4 rounded-2xl mb-4 bg-white/[0.04] border border-white/10">
            {isDraw ? (
              <Handshake className="w-12 h-12 text-amber-400 animate-pulse" />
            ) : isWinner ? (
              <Trophy className="w-12 h-12 text-emerald-400 animate-bounce" />
            ) : (
              <ShieldAlert className="w-12 h-12 text-[#DC2626] animate-pulse" />
            )}
          </div>

          <h2 className={`text-3xl font-black uppercase tracking-wider mb-2 ${
            isDraw ? 'text-amber-400' : isWinner ? 'text-emerald-400 font-mono' : 'text-[#DC2626]'
          }`}>
            {isDraw ? 'Match Drawn 🤝' : isWinner ? 'Victory 🏆' : 'Defeat 💀'}
          </h2>

          <p className="text-gray-300 text-sm max-w-md mx-auto">
            {isDraw
              ? 'Match ended in a draw. 100% of your stake has been fully refunded to your wallet.'
              : isWinner
                ? 'Brilliant tactical play! You outmaneuvered your opponent in Speed Chess.'
                : 'Your opponent secured checkmate or time advantage. Better luck next blitz!'}
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Financial Ledger</span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {isDraw ? '0% Fee Refund' : '10% Fair Rake'}
            </span>
          </div>

          <div className="space-y-3 font-mono text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Staked Amount:</span>
              <span className="font-bold text-white">{stake} Coins (₦{stake * 10})</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Total Pot:</span>
              <span className="font-bold text-white">{isDraw ? stake : totalPot} Coins</span>
            </div>
            {!isDraw && (
              <div className="flex justify-between text-gray-300">
                <span>Platform Fee (10%):</span>
                <span className="font-bold text-[#DC2626]">-{fee} Coins</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-3 flex justify-between text-base">
              <span className="font-bold text-white">Net Wallet Change:</span>
              <span className={`font-black ${netWalletChange > 0 ? 'text-emerald-400' : netWalletChange < 0 ? 'text-[#DC2626]' : 'text-amber-400'}`}>
                {netWalletChange > 0 ? `+${netWalletChange}` : netWalletChange} Coins (₦{netWalletChange * 10})
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-center">
            <span className="text-xs text-gray-400 block mb-1">Total Moves</span>
            <span className="text-xl font-bold font-mono text-white">{gameState.moves?.length || 12}</span>
          </div>
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-center">
            <span className="text-xs text-gray-400 block mb-1">End Condition</span>
            <span className="text-sm font-bold font-mono uppercase text-amber-400">{gameState.end_reason || 'Checkmate'}</span>
          </div>
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-center">
            <span className="text-xs text-gray-400 block mb-1">Result</span>
            <span className={`text-sm font-bold uppercase ${isWinner ? 'text-emerald-400' : isDraw ? 'text-amber-400' : 'text-[#DC2626]'}`}>
              {isDraw ? 'Draw' : isWinner ? 'Win' : 'Loss'}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-4 px-6 rounded-xl font-bold bg-[#F5A623] hover:bg-[#e0951e] text-black shadow-lg shadow-[#F5A623]/20 flex items-center justify-center gap-2 transition-all"
          >
            Play Another Chess Match ⚔️
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onExit}
            className="py-4 px-6 rounded-xl font-bold border border-white/10 hover:bg-white/5 text-gray-300 transition-all flex items-center justify-center gap-2"
          >
            Back to Arena
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16 px-4">
      {errorMsg && (
        <div className="bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] p-4 rounded-xl text-center text-sm font-bold">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-between bg-[#1A1A1A] border border-white/10 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center justify-center">
            <Flame className="w-5 h-5 text-[#F5A623]" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-wide">Speed Chess 10-Min Blitz</h1>
            <p className="text-xs text-gray-400 font-mono">Match ID: {matchId.slice(0, 8)}...</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/10 text-gray-300 transition-all"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#F5A623]" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>

          <button
            onClick={() => setShowDrawModal(true)}
            className="px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Handshake className="w-3.5 h-3.5" />
            Offer Draw
          </button>

          <button
            onClick={() => setShowResignModal(true)}
            className="px-3 py-1.5 rounded-xl border border-[#DC2626]/30 text-[#DC2626] hover:bg-[#DC2626]/10 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            Resign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-1 order-2 lg:order-1">
          <div className={`p-4 rounded-2xl border bg-[#1A1A1A] flex items-center justify-between shadow-lg ${
            !gameState.is_my_turn ? 'border-amber-500/50 bg-amber-500/5 shadow-amber-500/10' : 'border-white/10'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div>
                <span className="text-xs text-gray-400 block font-mono">Opponent</span>
                <span className="text-sm font-bold text-white">Grandmaster AI / Rival</span>
              </div>
            </div>
            <div className={`text-xl font-mono font-black ${oppTime <= 30000 ? 'text-[#DC2626] animate-pulse' : 'text-white'}`}>
              <Clock className="w-4 h-4 inline mr-1.5 opacity-70" />
              {formatTime(oppTime)}
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-white/10 p-4 rounded-2xl text-center space-y-2">
            <span className="text-xs text-gray-400 font-mono uppercase tracking-wider block">Current Status</span>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold font-mono ${
              gameState.is_my_turn 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}>
              <Zap className="w-4 h-4" />
              {gameState.is_my_turn ? 'Your Turn to Move' : "Opponent's Turn..."}
            </div>
          </div>

          <div className={`p-4 rounded-2xl border bg-[#1A1A1A] flex items-center justify-between shadow-lg ${
            gameState.is_my_turn ? 'border-emerald-500/50 bg-emerald-500/5 shadow-emerald-500/10' : 'border-white/10'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <div>
                <span className="text-xs text-gray-400 block font-mono">You ({gameState.my_color})</span>
                <span className="text-sm font-bold text-white">Contender</span>
              </div>
            </div>
            <div className={`text-xl font-mono font-black ${myTime <= 30000 ? 'text-[#DC2626] animate-pulse' : 'text-white'}`}>
              <Clock className="w-4 h-4 inline mr-1.5 opacity-70" />
              {formatTime(myTime)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 order-1 lg:order-2 flex flex-col items-center">
          <div className="bg-[#111111] border-2 border-white/10 rounded-2xl p-3 shadow-2xl relative">
            <div className="grid grid-cols-8 gap-0 w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] rounded-xl overflow-hidden border border-white/10">
              {board.map((row, r) =>
                row.map((piece, c) => {
                  const actualR = isWhitePlayer ? r : 7 - r;
                  const actualC = isWhitePlayer ? c : 7 - c;
                  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                  const ranks = isWhitePlayer ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
                  const squareNotation = `${files[actualC]}${ranks[actualR]}`;
                  const isSelected = selectedSquare === squareNotation;
                  const isValidMove = validMoves.includes(squareNotation);
                  const isDark = (actualR + actualC) % 2 === 1;

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => handleSquareClick(actualR, actualC)}
                      className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                        isDark ? 'bg-[#1A1A1A]' : 'bg-[#2A2415]'
                      } ${isSelected ? 'ring-2 ring-inset ring-[#F5A623] bg-[#F5A623]/20' : 'hover:bg-white/[0.08]'}`}
                    >
                      {/* Valid Move Indicator */}
                      {isValidMove && (
                        <div className={`absolute w-3 h-3 rounded-full ${parseFen(gameState.fen)[actualR][actualC] ? 'border-2 border-[#F5A623]' : 'bg-[#F5A623]/80'}`}></div>
                      )}
                      
                      {actualC === 0 && (
                        <span className="absolute top-0.5 left-1 text-[9px] font-mono text-white/30 select-none">
                          {ranks[actualR]}
                        </span>
                      )}
                      {actualR === 7 && (
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-white/30 select-none">
                          {files[actualC]}
                        </span>
                      )}

                      {piece && <ChessPieceSymbol piece={piece} />}

                      {isSelected && (
                        <div className="absolute w-3 h-3 rounded-full bg-[#F5A623] animate-ping opacity-75"></div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Invalid Move Toast */}
            {toast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#141414]/95 border border-[#DC2626] rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5 z-40 animate-fade-in">
                <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
                <span className="font-bold text-xs text-white">{toast.msg}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showResignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Resign & Forfeit Match?</h3>
                <p className="text-xs text-gray-400 mt-1">Leaving mid-game forfeits your stake. Your opponent will automatically receive the pot.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowResignModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 font-bold text-sm transition-all"
              >
                Keep Playing
              </button>
              <button
                onClick={handleResign}
                className="flex-1 py-3 px-4 rounded-xl bg-[#DC2626] hover:bg-[#b91c1c] text-white font-bold text-sm shadow-lg shadow-[#DC2626]/20 transition-all"
              >
                Yes, Resign Match
              </button>
            </div>
          </div>
        </div>
      )}

      {showDrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <Handshake className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Offer Draw to Opponent?</h3>
                <p className="text-xs text-gray-400 mt-1">If accepted, the match ends in a draw and 100% of your stake is instantly refunded with zero platform fee.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDrawModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleOfferDraw}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm shadow-lg shadow-amber-500/20 transition-all"
              >
                Confirm Draw Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
