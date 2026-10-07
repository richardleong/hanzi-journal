"use client";

import { useEffect, useMemo, useState } from "react";
import { Word } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface ReviewDeckProps {
  words: Word[];
  onToggleMastered: (id: string, currentStatus: boolean) => void;
  onGoToAdd: () => void;
}

const SESSION_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Learning words first (newest weighted in), topped up with a few mastered ones to keep them fresh. */
function buildQueue(words: Word[]): string[] {
  const learning = shuffle(words.filter(w => !w.mastered));
  const mastered = shuffle(words.filter(w => w.mastered));
  const picked = [...learning.slice(0, SESSION_SIZE)];
  for (const w of mastered) {
    if (picked.length >= SESSION_SIZE) break;
    picked.push(w);
  }
  return shuffle(picked).map(w => w.id);
}

export function ReviewDeck({ words, onToggleMastered, onGoToAdd }: ReviewDeckProps) {
  const [queue, setQueue] = useState<string[]>(() => buildQueue(words));
  const [revealed, setRevealed] = useState(false);
  const [gotIt, setGotIt] = useState(0);
  const [again, setAgain] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(queue.length);

  const byId = useMemo(() => new Map(words.map(w => [w.id, w])), [words]);
  const current = queue.length > 0 ? byId.get(queue[0]) : undefined;

  const restart = () => {
    const q = buildQueue(words);
    setQueue(q);
    setSessionTotal(q.length);
    setGotIt(0);
    setAgain(0);
    setRevealed(false);
  };

  const next = (knewIt: boolean) => {
    if (!current) return;
    if (knewIt) {
      setGotIt(n => n + 1);
      setQueue(q => q.slice(1));
    } else {
      setAgain(n => n + 1);
      // Show it again a few cards later
      setQueue(q => {
        const rest = q.slice(1);
        const at = Math.min(3, rest.length);
        return [...rest.slice(0, at), q[0], ...rest.slice(at)];
      });
    }
    setRevealed(false);
  };

  // Keyboard: space/enter reveals, ← again, → got it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && (e.key === "ArrowRight" || e.key === "Enter")) {
        e.preventDefault();
        next(true);
      } else if (revealed && e.key === "ArrowLeft") {
        e.preventDefault();
        next(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (words.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="font-serif text-6xl block mb-4 text-light-faded">空</span>
        <p className="text-faded mb-6">Nothing to review yet — add your first word.</p>
        <button onClick={onGoToAdd} className="btn-ink">+ Add a word</button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="text-center py-14 animate-in fade-in duration-300">
        <span className="font-serif text-6xl block mb-3 text-gold">好</span>
        <h2 className="font-serif text-2xl text-ink mb-2">Session done</h2>
        <p className="text-faded mb-8">
          {gotIt} card{gotIt === 1 ? "" : "s"} reviewed
          {again > 0 && <> · {again} retr{again === 1 ? "y" : "ies"}</>}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={restart} className="btn-ink">Review again</button>
          <button onClick={onGoToAdd} className="btn-outline">+ Add new words</button>
        </div>
      </div>
    );
  }

  const done = sessionTotal - queue.length;

  return (
    <div className="animate-in fade-in duration-300">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1 bg-light-faded/40 overflow-hidden rounded-full">
          <div className="h-full bg-red transition-all duration-500" style={{ width: `${(done / sessionTotal) * 100}%` }} />
        </div>
        <span className="label">{done} / {sessionTotal}</span>
      </div>

      {/* Flashcard */}
      <button
        type="button"
        onClick={() => setRevealed(true)}
        disabled={revealed}
        className={cn(
          "w-full bg-white/60 border border-light-faded rounded-md min-h-[300px] flex flex-col items-center justify-center px-6 py-10 transition-shadow",
          !revealed && "hover:shadow-[3px_3px_0_var(--color-gold)] cursor-pointer"
        )}
      >
        <div className={cn("font-mono text-lg text-red tracking-wider mb-2 transition-opacity", revealed ? "opacity-100" : "opacity-0")}>
          {current.pinyin}
        </div>
        <div className="font-serif text-6xl md:text-7xl text-ink leading-tight">{current.hanzi}</div>

        {revealed ? (
          <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="text-lg text-ink">{current.meaning}</div>
            {current.example && (
              <div className="font-serif text-base text-faded mt-3 max-w-md">{current.example}</div>
            )}
          </div>
        ) : (
          <div className="mt-8 label">Tap to reveal · space</div>
        )}
      </button>

      {/* Actions */}
      <div className={cn("grid grid-cols-2 gap-3 mt-5 transition-opacity", revealed ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <button onClick={() => next(false)} className="btn-outline py-3.5">← Again</button>
        <button onClick={() => next(true)} className="btn-ink py-3.5">Got it →</button>
      </div>

      <div className="flex justify-center mt-4 h-6">
        {revealed && (
          <button
            onClick={() => onToggleMastered(current.id, current.mastered)}
            className="label hover:text-green transition-colors"
          >
            {current.mastered ? "✓ Mastered — mark as learning" : "Mark as mastered"}
          </button>
        )}
      </div>
    </div>
  );
}
