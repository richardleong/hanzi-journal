import React from 'react';
import { Word } from '@/lib/storage';
import { Trash2, CheckCircle2, Circle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


interface VocabCardProps {
  word: Word;
  onDelete: (id: string) => void;
  onToggleMastered: (id: string, currentStatus: boolean) => void;
  onEdit?: (id: string, updates: Partial<Word>) => void;
  learningMode?: boolean;
}

export function VocabCard({ word, onDelete, onToggleMastered, onEdit, learningMode }: VocabCardProps) {
  let formattedDate = 'Unknown date';
  try {
    const date = new Date(word.created_at);
    if (!isNaN(date.getTime())) {
      formattedDate = format(date, 'd MMM yyyy');
    }
  } catch {
    console.warn('Invalid date:', word.created_at);
  }

  const [editMode, setEditMode] = React.useState(false);
  const [editMeaning, setEditMeaning] = React.useState(word.meaning);
  const [editExample, setEditExample] = React.useState(word.example || "");
  const [saving, setSaving] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);

  // Load the word's current values each time the editor opens
  const toggleEdit = () => {
    if (!editMode) {
      setEditMeaning(word.meaning);
      setEditExample(word.example || "");
    }
    setEditMode(!editMode);
  };

  const hidden = learningMode && !revealed && !editMode;

  const handleSave = async () => {
    if (!onEdit) return;
    setSaving(true);
    await onEdit(word.id, { meaning: editMeaning, example: editExample });
    setSaving(false);
    setEditMode(false);
  };

  const confirmDelete = () => {
    if (window.confirm(`Delete ${word.hanzi} from your journal?`)) onDelete(word.id);
  };

  return (
    <div
      onClick={hidden ? () => setRevealed(true) : undefined}
      className={cn(
        "group relative flex flex-col bg-white/55 border border-light-faded rounded-lg p-5 transition-all duration-200",
        "hover:shadow-[3px_3px_0_var(--color-gold)] hover:-translate-x-px hover:-translate-y-px",
        hidden && "cursor-pointer",
        word.mastered && "border-l-4 border-l-green"
      )}
    >
      {/* Top row: tags + actions */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[0.6rem] tracking-[0.12em] uppercase bg-ink text-paper px-2 py-0.5 rounded">
            {word.category}
          </span>
          {word.register && (
            <span className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-faded border border-light-faded px-2 py-0.5 rounded">
              {word.register}
            </span>
          )}
        </div>

        <div className="flex -mr-1.5 -mt-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger
              onClick={(e) => { e.stopPropagation(); toggleEdit(); }}
              className="text-faded hover:text-gold p-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              aria-label="Edit word"
            >
              <Pencil size={14} />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Edit word</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              onClick={(e) => { e.stopPropagation(); confirmDelete(); }}
              className="text-faded hover:text-red p-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-red/40"
              aria-label="Delete word"
            >
              <Trash2 size={14} />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Delete word</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col items-start mb-3">
        <div className={cn("font-mono text-sm text-red tracking-wider mb-1 transition-opacity", hidden && "opacity-0")}>
          {word.pinyin}
        </div>
        <div className="font-serif text-4xl font-normal text-ink leading-tight">
          {word.hanzi}
        </div>
      </div>

      {/* Edit Mode */}
      {editMode ? (
        <div className="w-full flex flex-col gap-2 mb-2" onClick={e => e.stopPropagation()}>
          <label className="label">Meaning</label>
          <input
            className="field h-9 text-sm font-sans"
            value={editMeaning}
            onChange={e => setEditMeaning(e.target.value)}
            disabled={saving}
          />
          <label className="label mt-1">Example</label>
          <textarea
            className="field h-auto min-h-[60px] py-2 text-sm"
            value={editExample}
            onChange={e => setEditExample(e.target.value)}
            disabled={saving}
          />
          <div className="flex gap-2 mt-2">
            <button className="btn-ink py-2 px-4" onClick={handleSave} disabled={saving || !editMeaning.trim()}>
              Save
            </button>
            <button className="btn-outline py-2 px-4" onClick={() => setEditMode(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      ) : hidden ? (
        <div className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-light-faded mb-2">
          Tap to reveal
        </div>
      ) : (
        <>
          <div className="text-base text-ink/80 mb-2 leading-relaxed">
            {word.meaning}
          </div>
          {word.example && (
            <div className="font-serif text-sm text-[#6b5a3e] leading-relaxed border-t border-light-faded/70 pt-2.5 mt-1">
              {word.example}
            </div>
          )}
        </>
      )}

      {word.context && word.context.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {word.context.map(c => (
            <span key={c} className="font-mono text-[0.58rem] tracking-wider uppercase bg-gold/10 text-[#8b6914] px-1.5 py-0.5 rounded">
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Footer: date + mastered toggle */}
      <div className="flex items-center justify-between mt-auto pt-4">
        <span className="font-mono text-[0.62rem] text-light-faded tracking-wider">{formattedDate}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMastered(word.id, word.mastered); }}
          className={cn(
            "flex items-center gap-1.5 font-mono text-[0.62rem] tracking-wider uppercase px-2.5 py-1 rounded-full transition-colors border outline-none",
            word.mastered
              ? "bg-green border-green text-white hover:bg-green/85"
              : "bg-transparent border-light-faded text-faded hover:border-green hover:text-green"
          )}
          title={word.mastered ? 'Mark as learning' : 'Mark as mastered'}
        >
          {word.mastered ? <CheckCircle2 size={12} /> : <Circle size={12} />}
          {word.mastered ? 'Mastered' : 'Learning'}
        </button>
      </div>
    </div>
  );
}
