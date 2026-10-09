import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, X, RefreshCw } from 'lucide-react';

export interface ErrorCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  autoDismissSeconds?: number;
  className?: string;
  variant?: 'card' | 'inline' | 'banner';
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  title = 'Action Encountered An Issue',
  message,
  onRetry,
  retryLabel = 'Try Again',
  onDismiss,
  autoDismissSeconds,
  className = '',
  variant = 'card',
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    autoDismissSeconds && autoDismissSeconds > 0 ? autoDismissSeconds : null
  );

  useEffect(() => {
    if (!autoDismissSeconds || autoDismissSeconds <= 0) return;

    setSecondsLeft(autoDismissSeconds);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (onDismiss) {
            setTimeout(() => {
              onDismiss();
            }, 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoDismissSeconds, onDismiss]);

  return (
    <div
      role="alert"
      className={`bg-[#141414] border border-[#DC2626]/40 rounded-2xl p-4 shadow-xl flex items-start gap-3 relative text-left transition-all duration-200 animate-fade-in ${className}`}
    >
      {/* Icon: Crimson warning badge [#DC2626]/20 */}
      <div className="w-9 h-9 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/30 flex items-center justify-center flex-shrink-0 text-[#DC2626] mt-0.5">
        <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
      </div>

      {/* Elements: Title, error message text, optional Retry button (gold outline), close button */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
            {title}
          </h4>
          {secondsLeft !== null && secondsLeft > 0 && (
            <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.08]">
              {secondsLeft}s
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-white/70 leading-relaxed break-words">
          {message}
        </p>

        {onRetry && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#F5A623] border border-[#F5A623] hover:bg-[#F5A623]/10 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{retryLabel}</span>
            </button>
          </div>
        )}
      </div>

      {/* Close ✕ button */}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close error"
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-sm font-mono"
        >
          ✕
        </button>
      )}
    </div>
  );
};
