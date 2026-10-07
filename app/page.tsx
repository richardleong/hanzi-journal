"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Word, storage, REGISTER_OPTIONS, CONTEXT_OPTIONS } from "@/lib/storage";
import { VocabCard } from "@/components/VocabCard";
import { ReviewDeck } from "@/components/ReviewDeck";
import { PinyinInput } from "@/components/PinyinInput";
import { cn } from "@/lib/utils";
import { pinyinSortKey } from "@/lib/pinyin";
import { differenceInDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

type Tab = "review" | "add" | "browse" | "stats";

const TABS: { id: Tab; label: string; zh: string }[] = [
  { id: "review", label: "Review", zh: "复习" },
  { id: "add", label: "Add", zh: "添加" },
  { id: "browse", label: "Browse", zh: "词汇" },
  { id: "stats", label: "Stats", zh: "统计" },
];

const CATEGORIES = ["general", "greetings", "workplace", "numbers", "animals", "food", "family", "time", "phrases"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("review");
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [hanzi, setHanzi] = useState("");
  const [pinyin, setPinyin] = useState("");
  const [meaning, setMeaning] = useState("");
  const [category, setCategory] = useState("general");
  const [example, setExample] = useState("");
  const [register, setRegister] = useState("");
  const [context, setContext] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const hanziRef = useRef<HTMLInputElement>(null);

  // Browse state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "learning" | "mastered">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "pinyin">("newest");
  const [learningMode, setLearningMode] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await storage.getWords();
      setWords(data);
      // Nothing to review yet → start on Add
      if (data.length === 0) setActiveTab("add");
      setLoading(false);
    }
    load();
  }, []);

  const canSave = !!(hanzi.trim() && pinyin.trim() && meaning.trim());

  const handleAdd = async () => {
    if (!canSave) return;

    const newWord = await storage.addWord({
      hanzi: hanzi.trim(),
      pinyin: pinyin.trim(),
      meaning: meaning.trim(),
      category,
      example: example.trim(),
      ...(register && register !== "none" ? { register } : {}),
      ...(context.length > 0 ? { context } : {}),
    });

    if (newWord) {
      setWords([newWord, ...words]);
      setHanzi("");
      setPinyin("");
      setMeaning("");
      setExample("");
      setRegister("");
      setContext([]);
      hanziRef.current?.focus();

      toast("Saved to Journal", {
        description: `${hanzi.trim()} / ${pinyin.trim()}`,
      });
    } else {
      toast.error("Couldn't save — journal server unreachable", {
        description: "Is the backend running? (cd backend && node server.js)",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const success = await storage.deleteWord(id);
    if (success) {
      setWords(words.filter(w => w.id !== id));
      toast("Word removed from journal");
    }
  };

  const handleToggleMastered = async (id: string, currentStatus: boolean) => {
    const updated = await storage.updateWord(id, { mastered: !currentStatus });
    if (updated) {
      setWords(words => words.map(w => w.id === id ? updated : w));
      if (!currentStatus) {
        toast("Marked as mastered! 🎉");
      }
    }
  };

  // Stats computation
  const stats = useMemo(() => {
    let masteredCount = 0;
    const categoryCounts: Record<string, number> = {};
    const dates = new Set<string>();
    const todayWords: Word[] = [];

    const todayStr = startOfDay(new Date()).getTime();

    words.forEach(w => {
      if (w.mastered) masteredCount++;
      categoryCounts[w.category] = (categoryCounts[w.category] || 0) + 1;

      const wordDate = startOfDay(new Date(w.created_at)).getTime();
      dates.add(wordDate.toString());

      if (wordDate === todayStr) {
        todayWords.push(w);
      }
    });

    // Simple streak calculation
    let streak = 0;
    const sortedDates = Array.from(dates).map(Number).sort((a, b) => b - a);

    if (sortedDates.length > 0) {
      // Check if active today or yesterday to start streak
      const diffToLatest = differenceInDays(todayStr, sortedDates[0]);
      if (diffToLatest <= 1) {
        streak = 1;
        for (let i = 0; i < sortedDates.length - 1; i++) {
          if (differenceInDays(sortedDates[i], sortedDates[i + 1]) === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    return {
      total: words.length,
      mastered: masteredCount,
      activeDays: dates.size,
      streak,
      todayCount: todayWords.length,
      todayWords: todayWords.reverse(),
      categoryCounts,
    };
  }, [words]);

  // Browse filtering + sorting
  const filteredWords = useMemo(() => {
    const filtered = words.filter(w => {
      const matchesSearch =
        w.hanzi.includes(search) ||
        w.pinyin.toLowerCase().includes(search.toLowerCase()) ||
        w.meaning.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "mastered" && w.mastered) ||
        (filter === "learning" && !w.mastered);

      return matchesSearch && matchesFilter;
    });

    return filtered.sort((a, b) => {
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "pinyin") return pinyinSortKey(a.pinyin).localeCompare(pinyinSortKey(b.pinyin));
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // newest
    });
  }, [words, search, filter, sort]);

  const dailyGoal = 5;
  const progressPercent = Math.min((stats.todayCount / dailyGoal) * 100, 100);

  const download = (content: string, type: string, ext: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hanzi-journal-${new Date().toISOString().split('T')[0]}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const submitOnEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleAdd();
    }
  };

  if (loading) return (
    <div className="w-full max-w-3xl min-h-[600px] bg-paper sm:rounded-md journal-shadow relative overflow-hidden flex flex-col p-10">
      <Skeleton className="h-16 w-1/3 mb-4 bg-aged" />
      <Skeleton className="h-8 w-1/4 mb-10 bg-aged" />
      <div className="space-y-4">
        <Skeleton className="h-32 w-full bg-aged" />
        <Skeleton className="h-32 w-full bg-aged" />
        <Skeleton className="h-32 w-full bg-aged" />
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-3xl min-h-screen sm:min-h-0 bg-paper sm:rounded-md sm:journal-shadow relative overflow-hidden">
      {/* Spine */}
      <div className="absolute left-0 top-0 bottom-0 w-2.5 sm:w-6 bg-linear-to-r from-[#8b6914] via-[#c9a84c] to-[#8b6914] shadow-[inset_-3px_0_8px_rgba(0,0,0,0.3)] z-20" />

      <div className="ml-2.5 sm:ml-6 relative z-10">

        {/* Header */}
        <header className="bg-ink text-paper px-5 sm:px-10 pt-6 pb-5 sm:pt-8 sm:pb-6 border-b-4 border-gold">
          <div className="flex justify-between items-end gap-4">
            <div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-[0.12em] text-gold leading-none" style={{ textShadow: '0 0 30px rgba(184,134,11,0.4)' }}>
                汉字本
              </h1>
              <div className="font-mono text-[0.68rem] tracking-[0.2em] uppercase text-light-faded/80 mt-2.5">
                {dailyGoal} words a day
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-4xl text-gold font-bold leading-none">
                {stats.streak}<span className="text-2xl ml-0.5">🔥</span>
              </div>
              <div className="font-mono text-[0.65rem] tracking-[0.18em] uppercase text-light-faded/80 mt-1.5">day streak</div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/10 overflow-hidden rounded-full">
              <div
                className="h-full bg-linear-to-r from-[#8b6914] to-gold transition-all duration-700 ease-out rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="font-mono text-xs text-light-faded whitespace-nowrap">
              <span className="text-gold font-bold">{stats.todayCount}</span> / {dailyGoal} today
            </div>
          </div>
        </header>

        {/* Tabs */}
        <nav className="sticky top-0 z-30 grid grid-cols-4 border-b border-light-faded bg-aged/95 backdrop-blur-sm px-2 sm:px-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-3 -mb-px border-b-[2.5px] transition-colors",
                activeTab === t.id
                  ? "text-ink border-red"
                  : "text-faded border-transparent hover:text-ink"
              )}
            >
              <span className="font-serif text-base leading-none">{t.zh}</span>
              <span className={cn("font-mono text-[0.62rem] tracking-[0.14em] uppercase", activeTab === t.id && "font-bold")}>
                {t.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <main className="px-5 py-7 sm:p-10 min-h-[420px]">

          {/* TAB: REVIEW */}
          {activeTab === 'review' && (
            <ReviewDeck
              words={words}
              onToggleMastered={handleToggleMastered}
              onGoToAdd={() => setActiveTab('add')}
            />
          )}

          {/* TAB: ADD */}
          {activeTab === 'add' && (
            <div className="animate-in fade-in duration-300">

              {/* Today's slots */}
              <div className="mb-8">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="label">Today&apos;s words</span>
                  {stats.todayCount >= dailyGoal && (
                    <span className="font-mono text-[0.68rem] tracking-wider text-green">✓ Goal reached — keep going!</span>
                  )}
                </div>
                <div className="flex gap-2 sm:gap-3 flex-wrap">
                  {Array.from({ length: Math.max(dailyGoal, stats.todayCount) }).map((_, i) => {
                    const w = stats.todayWords[i];
                    return (
                      <div
                        key={i}
                        title={w ? `${w.pinyin} — ${w.meaning}` : undefined}
                        className={cn(
                          "h-14 min-w-14 px-2 flex items-center justify-center rounded-md font-serif text-xl transition-all",
                          w
                            ? "bg-ink text-gold"
                            : "border-[1.5px] border-dashed border-light-faded text-light-faded text-sm font-mono"
                        )}
                      >
                        {w ? w.hanzi : i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form */}
              <div className="bg-aged/50 border border-light-faded rounded-lg p-5 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-5">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="hanzi" className="label">Characters 汉字</label>
                    <input
                      id="hanzi"
                      ref={hanziRef}
                      autoFocus
                      type="text"
                      value={hanzi}
                      onChange={(e) => setHanzi(e.target.value)}
                      onKeyDown={submitOnEnter}
                      placeholder="你好"
                      className="field h-20 text-4xl text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="pinyin" className="label">Pinyin 拼音 <span className="normal-case tracking-normal text-light-faded">· type ni3 hao3</span></label>
                      <PinyinInput
                        id="pinyin"
                        value={pinyin}
                        onValueChange={setPinyin}
                        onKeyDown={submitOnEnter}
                        placeholder="nǐ hǎo"
                        className="field text-red font-mono tracking-wide"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="meaning" className="label">Meaning</label>
                      <input
                        id="meaning"
                        type="text"
                        value={meaning}
                        onChange={(e) => setMeaning(e.target.value)}
                        onKeyDown={submitOnEnter}
                        placeholder="Hello"
                        className="field"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-5">
                  <span className="label">Category</span>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <button key={c} type="button" data-active={category === c} onClick={() => setCategory(c)} className="chip">
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-5">
                  <label htmlFor="example" className="label">Example sentence <span className="normal-case tracking-normal text-light-faded">· optional</span></label>
                  <textarea
                    id="example"
                    value={example}
                    onChange={(e) => setExample(e.target.value)}
                    placeholder="你好，我叫 Rich。 — Hello, my name is Rich."
                    className="field h-auto min-h-[72px] py-2.5 text-sm resize-y"
                  />
                </div>

                {/* Collapsible + More Details */}
                <Collapsible open={showMore} onOpenChange={setShowMore} className="mt-5">
                  <CollapsibleTrigger
                    type="button"
                    className="label hover:text-ink transition-colors flex items-center gap-1.5 outline-none"
                  >
                    <span className={`inline-block text-sm transition-transform duration-200 ${showMore ? 'rotate-45' : ''}`}>+</span>
                    Register &amp; context
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="flex flex-col gap-5 pt-4">
                      <div className="flex flex-col gap-2">
                        <span className="label">Register</span>
                        <div className="flex flex-wrap gap-1.5">
                          {REGISTER_OPTIONS.map(r => (
                            <button
                              key={r}
                              type="button"
                              data-active={register === r}
                              onClick={() => setRegister(register === r ? "" : r)}
                              className="chip"
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="label">Where you&apos;d see / hear it</span>
                        <div className="flex flex-wrap gap-1.5">
                          {CONTEXT_OPTIONS.map(c => {
                            const selected = context.includes(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                data-active={selected}
                                onClick={() => {
                                  setContext(prev =>
                                    selected ? prev.filter(x => x !== c) : [...prev, c]
                                  );
                                }}
                                className="chip"
                              >
                                {c}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex items-center gap-4 mt-6">
                  <button onClick={handleAdd} disabled={!canSave} className="btn-ink w-full sm:w-auto">
                    Save to Journal
                  </button>
                  <span className="hidden sm:inline label normal-case tracking-normal text-light-faded">or press Enter</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BROWSE */}
          {activeTab === 'browse' && (
            <div className="animate-in fade-in duration-300">
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faded pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search hanzi, pinyin, or meaning…"
                  className="field pl-9 font-sans text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-6">
                <div className="flex gap-1.5">
                  {(['all', 'learning', 'mastered'] as const).map(f => (
                    <button key={f} data-active={filter === f} onClick={() => setFilter(f)} className="chip">
                      {f}
                    </button>
                  ))}
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="font-mono text-[0.68rem] tracking-wider uppercase text-faded bg-transparent border border-light-faded rounded-full px-3 py-1.5 outline-none hover:border-faded cursor-pointer"
                  aria-label="Sort"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="pinyin">A–Z pinyin</option>
                </select>
                <button
                  data-active={learningMode}
                  onClick={() => setLearningMode(m => !m)}
                  className="chip ml-auto data-[active=true]:bg-gold data-[active=true]:border-gold data-[active=true]:text-ink"
                >
                  {learningMode ? "◉ Answers hidden" : "○ Hide answers"}
                </button>
              </div>

              <div className="label mb-3">
                {filteredWords.length} word{filteredWords.length === 1 ? "" : "s"}
                {learningMode && <span className="normal-case tracking-normal text-light-faded"> · tap a card to reveal</span>}
              </div>

              {filteredWords.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredWords.map(w => (
                    <VocabCard
                      // Remount on toggle so revealed cards re-hide
                      key={`${w.id}-${learningMode}`}
                      word={w}
                      onDelete={handleDelete}
                      onToggleMastered={handleToggleMastered}
                      learningMode={learningMode}
                      onEdit={async (id, updates) => {
                        const updated = await storage.updateWord(id, updates);
                        if (updated) {
                          setWords(words => words.map(word => word.id === id ? updated : word));
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-faded text-sm">
                  <span className="font-serif text-6xl block mb-4 text-light-faded">空</span>
                  {words.length === 0 ? "Your journal is empty." : "No words match."}
                </div>
              )}
            </div>
          )}

          {/* TAB: STATS */}
          {activeTab === 'stats' && (
            <div className="animate-in fade-in duration-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
                {[
                  { n: stats.total, label: "Total words" },
                  { n: stats.mastered, label: "Mastered" },
                  { n: stats.activeDays, label: "Days active" },
                  { n: stats.streak, label: "Day streak" },
                ].map(s => (
                  <div key={s.label} className="bg-aged/60 border border-light-faded rounded-lg p-5 text-center">
                    <div className="font-mono text-3xl font-bold text-ink leading-none">{s.n}</div>
                    <div className="label mt-2.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {stats.total > 0 && (
                <>
                  <div className="label mb-3">Mastery</div>
                  <div className="h-3 bg-light-faded/30 rounded-full overflow-hidden mb-10">
                    <div className="h-full bg-green rounded-full transition-all" style={{ width: `${(stats.mastered / stats.total) * 100}%` }} />
                  </div>

                  <div className="label mb-4">By category</div>
                  <div className="space-y-2.5 mb-10">
                    {Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <div className="font-mono text-[0.68rem] tracking-[0.1em] uppercase text-faded w-24 shrink-0 truncate">
                          {cat}
                        </div>
                        <div className="flex-1 h-2 bg-light-faded/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-ink rounded-full"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                        <div className="font-mono text-xs text-faded w-6 text-right">
                          {count}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="bg-aged/60 border border-light-faded rounded-lg p-6">
                <div className="label mb-2">Export / Backup</div>
                <p className="text-sm text-faded mb-4">
                  Download your vocab as JSON (for backup) or plain text (for Anki/printing).
                </p>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => download(JSON.stringify(words, null, 2), 'application/json', 'json')}
                    className="btn-outline py-2 px-5"
                  >
                    ↓ JSON Backup
                  </button>
                  <button
                    onClick={() => download(
                      words.map(w => `${w.hanzi}\t${w.pinyin}\t${w.meaning}\t${w.example || ''}\t${w.register || ''}\t${(w.context || []).join(', ')}`).join('\n'),
                      'text/plain',
                      'txt',
                    )}
                    className="btn-outline py-2 px-5"
                  >
                    ↓ Text / Anki
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
