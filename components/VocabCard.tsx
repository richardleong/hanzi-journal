import React from 'react';
import { Word } from '@/lib/storage';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface VocabCardProps {
  word: Word;
  onDelete: (id: string) => void;
  onToggleMastered: (id: string, currentStatus: boolean) => void;
}

export function VocabCard({ word, onDelete, onToggleMastered }: VocabCardProps) {
  const formattedDate = format(new Date(word.created_at), 'MMM dd, yyyy');

  return (
    <div className={cn(
      "group relative bg-aged border border-light-faded p-5 pt-7 pb-4 transition-all duration-200 cursor-default",
      "hover:shadow-[3px_3px_0_var(--color-gold)] hover:-translate-x-[1px] hover:-translate-y-[1px]"
    )}>
      {/* Top Left: Category */}
      <div className="absolute top-2 left-2 font-mono text-[0.55rem] tracking-widest uppercase bg-ink text-gold px-1.5 py-0.5">
        {word.category}
      </div>

      {/* Top Right: Delete Button */}
      <button 
        onClick={() => onDelete(word.id)}
        className="absolute top-2 right-2 text-light-faded hover:text-red opacity-0 group-hover:opacity-100 transition-opacity p-1"
        title="Delete word"
      >
        <Trash2 size={14} />
      </button>

      <div className="font-mono text-[0.5rem] text-light-faded tracking-[0.15em] mb-3">
        {formattedDate}
      </div>

      <div className="flex flex-col items-start mb-2.5">
        <div className="font-mono text-sm text-red tracking-wider mb-1">
          {word.pinyin}
        </div>
        <div className="font-serif text-3xl font-normal text-ink leading-tight">
          {word.hanzi}
        </div>
      </div>

      <div className="font-sans text-sm text-faded italic mb-2 leading-relaxed">
        {word.meaning}
      </div>

      {word.example && (
        <div className="font-serif text-xs text-[#6b5a3e] leading-relaxed border-t border-light-faded pt-2 mt-2">
          {word.example}
        </div>
      )}

      {/* Bottom Right: Mastered Toggle */}
      <div className="absolute bottom-3 right-3">
        <button
          onClick={() => onToggleMastered(word.id, word.mastered)}
          className={cn(
            "flex items-center gap-1 font-mono text-[0.55rem] tracking-wider px-2 py-1 transition-colors border",
            word.mastered 
              ? "bg-green border-green text-white" 
              : "bg-transparent border-light-faded text-faded hover:border-faded"
          )}
        >
          <CheckCircle2 size={12} />
          {word.mastered ? 'MASTERED' : 'LEARNING'}
        </button>
      </div>
    </div>
  );
}
