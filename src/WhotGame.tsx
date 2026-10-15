import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";

/* ============================================================================
   APEXCLASH — NIGERIAN WHOT GAME ENGINE (v1.0 Production)
   Rules: Standard 54-Card Deck (1, 2, 5, 8, 14, 20)
   Dual-Clock: 10-Minute Total Match Limit • 30-Second Turn Watchdog
   Scoring: Stars = 2× Face Value • Lowest Points Wins On Timeout
   ============================================================================ */

const SHAPE_COLORS = {
  circle: "#3B82F6",   // Electric Blue
  triangle: "#DC2626", // Crimson
  cross: "#10B981",    // Emerald Green
  square: "#F59E0B",   // Amber
  star: "#F5A623",     // Apex Gold
  whot: "#F5A623",     // Apex Gold
};

// --- VECTOR SHAPE RENDERER ---
function ShapeIcon({ shape, size = 24, overrideColor }) {
  const color = overrideColor || SHAPE_COLORS[shape?.toLowerCase()] || "#FFFFFF";
  const s = shape?.toLowerCase();

  if (s === "circle") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="3.5" />
      </svg>
    );
  }

  if (s === "triangle") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <polygon points="12,3 21,19 3,19" stroke={color} strokeWidth="3.5" />
      </svg>
    );
  }

  if (s === "cross") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4V20M4 12H20" stroke={color} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (s === "square") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" stroke={color} strokeWidth="3.5" />
      </svg>
    );
  }

  if (s === "star") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    );
  }

  if (s === "whot") {
    return (
      <span
        style={{
          fontSize: size * 0.58,
          fontWeight: 900,
          color: "#F5A623",
          fontFamily: "DM Mono, monospace",
          letterSpacing: "-0.5px",
        }}
      >
        WHOT
      </span>
    );
  }

  return null;
}

export function WhotGame({ matchId, stake = 50, onExit }) {
  const [gameState, setGameState] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modals
  const [showWhotModal, setShowWhotModal] = useState(false);
  const [pendingCardId, setPendingCardId] = useState(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Dual Clocks
  const [matchTimeLeft, setMatchTimeLeft] = useState(600); // 10 minutes (seconds)
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);     // 30 seconds turn limit

  const timerRef = useRef(null);

  // 1. Fetch Sanitized Match State from Edge Function
  const fetchState = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUserId(session.user.id);

      const { data, error } = await supabase.functions.invoke("whot-get-state", {
        body: { match_id: matchId },
      });

      if (error || !data) {
        console.error("whot-get-state error:", error);
        setErrorMsg(error?.message || "Sync failure");
        return;
      }

      setGameState(data);
      if (typeof data.match_remaining_seconds === "number") {
        setMatchTimeLeft(data.match_remaining_seconds);
      }
      if (typeof data.turn_remaining_seconds === "number") {
        setTurnTimeLeft(data.turn_remaining_seconds);
      }
    } catch (err) {
      console.error("Network sync err:", err);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // 2. Realtime WebSocket Channel
  useEffect(() => {
    fetchState();

    const channel = supabase
      .channel(`whot_live_${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whot_games",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          fetchState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [matchId, fetchState]);

  // 3. Local Clocks Tick (Reconciled with Server on 0s)
  useEffect(() => {
    if (!gameState || gameState.status !== "in_progress") return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTurnTimeLeft((prevTurn) => {
        if (prevTurn <= 1) {
          fetchState(); // Trigger server watchdog evaluation
          return 0;
        }
        return prevTurn - 1;
      });

      setMatchTimeLeft((prevMatch) => {
        if (prevMatch <= 1) {
          fetchState(); // Trigger server 10-minute timeout calculation
          return 0;
        }
        return prevMatch - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.status, gameState?.turn_number, fetchState]);

  // 4. Move Legality Checker
  const isCardPlayable = (card) => {
    if (!gameState || !gameState.is_my_turn || submitting) return false;
    const top = gameState.top_discard;
    if (!top) return false;

    // Must defend Pick 2 / Pick 3 if penalty is active
    if (gameState.pending_draw_count > 0) {
      return card.number === top.number;
    }

    // Must match declared shape or play another Whot 20
    if (gameState.called_shape) {
      return card.shape === gameState.called_shape || card.number === 20;
    }

    // Standard shape / number match or Whot 20 wild
    return (
      card.shape === top.shape ||
      card.number === top.number ||
      card.number === 20
    );
  };

  // 5. Server-Authoritative Action Dispatcher
  const handleAction = async (payload) => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("whot-action", {
        body: { match_id: matchId, ...payload },
      });

      if (error || (data && data.error)) {
        setErrorMsg(error?.message || data?.error || "Action rejected by server");
      } else {
        await fetchState();
      }
    } catch (err) {
      setErrorMsg("Network timeout. Check your connection.");
    } finally {
      setSubmitting(false);
      setShowWhotModal(false);
      setShowQuitConfirm(false);
      setPendingCardId(null);
    }
  };

  const handleCardClick = (card) => {
    if (!isCardPlayable(card)) return;

    if (card.number === 20) {
      setPendingCardId(card.id);
      setShowWhotModal(true);
    } else {
      handleAction({ action: "play_card", card_id: card.id });
    }
  };

  const handleSelectShape = (shape) => {
    if (!pendingCardId) return;
    handleAction({
      action: "play_card",
      card_id: pendingCardId,
      called_shape: shape,
    });
  };

  const handleForfeit = () => {
    handleAction({ action: "forfeit" });
  };

  // Clock formatters
  const formatMatchTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] bg-[#0A0A0A] text-white">
        <div className="w-10 h-10 border-4 border-white/10 border-t-[#F5A623] rounded-full animate-spin" />
        <p className="mt-4 text-xs font-mono text-[#F5A623] tracking-widest uppercase">
          Dealing Whot Hand...
        </p>
      </div>
    );
  }

  const topCard = gameState?.top_discard;
  const isMyTurn = Boolean(gameState?.is_my_turn);
  const myHand = gameState?.my_hand || [];
  const oppCount = gameState?.opponent_card_count ?? 5;
  const marketCount = gameState?.market_count ?? 0;
  const isGameOver = gameState?.status === "completed";
  const amIWinner = gameState?.winner_id === currentUserId;
  const isDraw = gameState?.status === "completed" && !gameState?.winner_id;

  // Financial Ledger Math (10% Platform Rake)
  const potAmount = stake * 2;
  const platformFee = Math.round(potAmount * 0.10);
  const netPayout = potAmount - platformFee;

  return (
    <div className="flex flex-col justify-between w-full max-w-lg mx-auto h-[100dvh] max-h-[100dvh] bg-[#0A0A0A] text-white font-sans overflow-hidden p-3 select-none">
      
      {/* =====================================================================
          1. TOP UTILITY BAR (Match Clock, Clocks, Quit Button)
          ===================================================================== */}
      <header className="flex items-center justify-between px-3 py-2 bg-[#141414] border border-white/[0.08] rounded-xl shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
            WHOT 1v1
          </span>
        </div>

        {/* 10-Minute Match Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 border border-white/[0.06] rounded-lg">
          <span className="text-[10px] font-mono text-white/40">MATCH</span>
          <span
            className={`font-mono font-bold text-xs ${
              matchTimeLeft <= 60 ? "text-[#DC2626] animate-pulse" : "text-[#F5A623]"
            }`}
          >
            {formatMatchTime(matchTimeLeft)}
          </span>
        </div>

        {/* In-Game Quit / Forfeit Trigger */}
        {!isGameOver && (
          <button
            onClick={() => setShowQuitConfirm(true)}
            disabled={submitting}
            className="px-2.5 py-1 text-[11px] font-bold text-[#DC2626] bg-[#DC2626]/10 border border-[#DC2626]/30 hover:bg-[#DC2626]/20 rounded-lg transition"
          >
            Quit
          </button>
        )}
      </header>

      {/* =====================================================================
          2. OPPONENT & TURN STATUS STRIP
          ===================================================================== */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#141414]/60 border border-white/[0.04] rounded-xl my-2 shrink-0">
        {/* Opponent Card Count */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-10 bg-[#1E1E1E] border border-white/20 rounded-md flex items-center justify-center font-mono font-black text-xs text-white/70 shadow-inner">
            {oppCount}
          </div>
          <div>
            <span className="text-[10px] font-mono text-white/40 block">OPPONENT</span>
            <span className="text-xs font-bold text-white/80">{oppCount} Cards</span>
          </div>
        </div>

        {/* 30-Second Turn Watchdog Indicator */}
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
              isMyTurn
                ? "bg-[#F5A623]/15 border border-[#F5A623] text-[#F5A623]"
                : "bg-white/[0.04] border border-white/[0.08] text-white/40"
            }`}
          >
            <span>{isMyTurn ? "YOUR TURN" : "OPPONENT"}</span>
            <span>•</span>
            <span className={turnTimeLeft <= 5 ? "text-[#DC2626] animate-bounce" : ""}>
              {turnTimeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Banners (Penalty or Called Shape) */}
      {gameState?.called_shape && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-lg text-xs shrink-0">
          <span className="text-white/60">Required Shape:</span>
          <span className="font-bold uppercase text-[#F5A623] flex items-center gap-1">
            <ShapeIcon shape={gameState.called_shape} size={14} />
            {gameState.called_shape}
          </span>
        </div>
      )}

      {gameState?.pending_draw_count > 0 && (
        <div className="py-1.5 px-3 bg-[#DC2626]/15 border border-[#DC2626]/40 text-[#FF6B6B] text-center font-bold text-xs rounded-lg animate-pulse shrink-0">
          ⚠️ Defend Pick {gameState.pending_draw_count} or Draw!
        </div>
      )}

      {errorMsg && (
        <div className="py-1 px-3 bg-[#DC2626] text-white text-center font-semibold text-xs rounded-lg shrink-0">
          {errorMsg}
        </div>
      )}

      {/* =====================================================================
          3. BOARD CENTER: GENERAL MARKET & TOP DISCARD PILE
          ===================================================================== */}
      <div className="flex items-center justify-center gap-8 my-auto py-2">
        {/* Draw Pile (General Market) */}
        <div
          onClick={() => isMyTurn && !submitting && handleAction({ action: "draw_card" })}
          className={`w-24 h-36 bg-[#161616] border-2 rounded-2xl flex flex-col items-center justify-between p-2.5 transition select-none ${
            isMyTurn
              ? "border-dashed border-[#F5A623] cursor-pointer hover:scale-105 active:scale-95 shadow-lg shadow-[#F5A623]/10"
              : "border-white/10 opacity-40 cursor-not-allowed"
          }`}
        >
          <div className="text-[10px] font-mono font-extrabold text-[#F5A623] tracking-widest text-center mt-1">
            MARKET
          </div>
          <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center font-mono font-black text-xs text-white/50">
            {marketCount}
          </div>
          <span className="text-[9px] font-bold text-white/40 tracking-wider">
            {isMyTurn ? "TAP DRAW" : "WAIT"}
          </span>
        </div>

        {/* Top Active Discard Pile Card */}
        {topCard ? (
          <div className="w-24 h-36 bg-[#181818] border-2 border-white/20 rounded-2xl flex flex-col justify-between p-2.5 shadow-2xl relative select-none">
            {/* Top-Left Rank & Shape */}
            <div className="flex items-center justify-between">
              <span
                style={{ color: SHAPE_COLORS[topCard.shape] }}
                className="font-mono font-black text-sm"
              >
                {topCard.number === 20 ? "W" : topCard.number}
              </span>
              <ShapeIcon shape={topCard.shape} size={14} />
            </div>

            {/* Large Center Shape */}
            <div className="flex items-center justify-center my-auto">
              <ShapeIcon shape={topCard.shape} size={42} />
            </div>

            {/* Bottom-Right Inverted Rank & Shape */}
            <div className="flex items-center justify-between rotate-180">
              <span
                style={{ color: SHAPE_COLORS[topCard.shape] }}
                className="font-mono font-black text-sm"
              >
                {topCard.number === 20 ? "W" : topCard.number}
              </span>
              <ShapeIcon shape={topCard.shape} size={14} />
            </div>
          </div>
        ) : (
          <div className="w-24 h-36 bg-[#161616] border border-dashed border-white/10 rounded-2xl" />
        )}
      </div>

      {/* =====================================================================
          4. PLAYER HAND (SINGLE HORIZONTAL SCROLLING ROW ONLY)
          ===================================================================== */}
      <footer className="w-full bg-[#141414] border border-white/[0.08] rounded-2xl p-3 shrink-0">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-mono font-bold text-white/60">
            YOUR HAND ({myHand.length})
          </span>
          <span className="text-[11px] text-[#F5A623] font-medium">
            {isMyTurn ? "Tap a highlighted card" : "Waiting for opponent move..."}
          </span>
        </div>

        {/* Single Row Container: No Vertical Stacking */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-2 px-1 max-w-full scrollbar-none items-end min-h-[140px]">
          {myHand.map((card) => {
            const playable = isCardPlayable(card);
            const cardColor = SHAPE_COLORS[card.shape] || "#FFFFFF";

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`w-20 h-32 bg-[#181818] rounded-xl flex flex-col justify-between p-2 shrink-0 transition-all select-none ${
                  playable
                    ? "border-2 border-[#F5A623] -translate-y-2 cursor-pointer shadow-lg shadow-[#F5A623]/25 hover:scale-105 active:scale-95"
                    : isMyTurn
                    ? "border border-white/10 opacity-30 cursor-not-allowed"
                    : "border border-white/10 opacity-60 cursor-not-allowed"
                }`}
              >
                {/* Top Corner */}
                <div className="flex items-center justify-between">
                  <span style={{ color: cardColor }} className="font-mono font-black text-xs">
                    {card.number === 20 ? "W" : card.number}
                  </span>
                  <ShapeIcon shape={card.shape} size={12} />
                </div>

                {/* Center SVG Icon */}
                <div className="flex items-center justify-center my-auto">
                  <ShapeIcon shape={card.shape} size={30} />
                </div>

                {/* Bottom Corner */}
                <div className="flex items-center justify-between rotate-180">
                  <span style={{ color: cardColor }} className="font-mono font-black text-xs">
                    {card.number === 20 ? "W" : card.number}
                  </span>
                  <ShapeIcon shape={card.shape} size={12} />
                </div>
              </div>
            );
          })}
        </div>
      </footer>

      {/* =====================================================================
          5. MODAL: WHOT 20 SHAPE SELECTOR
          ===================================================================== */}
      {showWhotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-xs bg-[#141414] border border-white/[0.1] rounded-2xl p-6 text-center shadow-2xl">
            <h3 className="text-base font-black text-[#F5A623] mb-1">DECLARE SHAPE</h3>
            <p className="text-xs text-white/50 mb-5">Choose the shape your opponent must match:</p>
            <div className="grid grid-cols-3 gap-2.5">
              {["circle", "triangle", "cross", "square", "star"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelectShape(s)}
                  disabled={submitting}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-[#F5A623] hover:bg-[#F5A623]/10 transition"
                >
                  <ShapeIcon shape={s} size={28} />
                  <span className="text-[10px] font-bold text-white capitalize mt-1.5">{s}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. MODAL: QUIT / FORFEIT CONFIRMATION
          ===================================================================== */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-xs bg-[#141414] border border-[#DC2626]/40 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] font-bold flex items-center justify-center mx-auto mb-3">
              ⚠️
            </div>
            <h3 className="text-base font-black text-white mb-1">Quit & Forfeit Match?</h3>
            <p className="text-xs text-white/50 mb-5 leading-relaxed">
              If you leave now, your stake is forfeited and your opponent wins the pot.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleForfeit}
                disabled={submitting}
                className="w-full py-2.5 bg-[#DC2626] hover:bg-[#DC2626]/90 text-white font-extrabold text-xs rounded-xl transition"
              >
                {submitting ? "Forfeiting..." : "Yes, Forfeit Match"}
              </button>
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="w-full py-2 bg-white/[0.05] text-white/70 text-xs font-semibold rounded-xl hover:bg-white/[0.1] transition"
              >
                Keep Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          7. POST-MATCH SUMMARY & FINANCIAL BREAKDOWN SCREEN
          ===================================================================== */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-[#141414] border border-white/[0.1] rounded-2xl p-6 text-center shadow-2xl space-y-4">
            {/* Victory / Defeat Badge */}
            <div className="text-4xl">
              {isDraw ? "🤝" : amIWinner ? "🏆" : "💀"}
            </div>

            <div>
              <h2
                className={`text-2xl font-black ${
                  isDraw
                    ? "text-[#F5A623]"
                    : amIWinner
                    ? "text-emerald-400"
                    : "text-[#DC2626]"
                }`}
              >
                {isDraw ? "MATCH DRAW" : amIWinner ? "VICTORY!" : "DEFEAT"}
              </h2>
              <p className="text-xs text-white/50 mt-1">
                {isDraw
                  ? "Identical penalty points on time-out. Stakes 100% refunded."
                  : amIWinner
                  ? "You outplayed your opponent! 90% payout credited."
                  : "Match concluded. Better luck on the next round!"}
              </p>
            </div>

            {/* 10% Flat Rake Financial Breakdown */}
            <div className="p-4 bg-black/50 border border-white/[0.06] rounded-xl text-left space-y-2 font-mono text-xs">
              <div className="flex justify-between text-white/50">
                <span>Staked Stake:</span>
                <span>{stake} Coins</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Total Pot:</span>
                <span>{potAmount} Coins</span>
              </div>
              <div className="flex justify-between text-[#DC2626]/80">
                <span>Platform Rake (10%):</span>
                <span>-{isDraw ? 0 : platformFee} Coins</span>
              </div>
              <div className="pt-2 border-t border-white/[0.08] flex justify-between font-bold text-sm">
                <span className="text-white">Net Payout:</span>
                <span className={amIWinner ? "text-emerald-400" : isDraw ? "text-white" : "text-white/40"}>
                  {amIWinner ? `+${netPayout} Coins (₦${(netPayout * 10).toLocaleString()})` : isDraw ? `${stake} Coins` : "0 Coins"}
                </span>
              </div>
            </div>

            <button
              onClick={onExit}
              className="w-full py-3.5 bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black font-extrabold text-sm rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition"
            >
              Return to Arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default WhotGame;