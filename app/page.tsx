"use client";

import { useState, useEffect, useMemo } from "react";
import { Word, storage, REGISTER_OPTIONS, CONTEXT_OPTIONS } from "@/lib/storage";
import { VocabCard } from "@/components/VocabCard";
import { Toggle } from "@/components/ui/toggle";
import { PinyinInput } from "@/components/PinyinInput";
import { cn } from "@/lib/utils";
import { pinyinSortKey } from "@/lib/pinyin";
import { differenceInDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tab = "add" | "browse" | "stats";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("add");
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

  // Browse state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "learning" | "mastered">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "pinyin">("newest");
  const [learningMode, setLearningMode] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await storage.getWords();
      setWords(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleAdd = async () => {
    if (!hanzi.trim() || !pinyin.trim() || !meaning.trim()) return;

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

      toast("Saved to Journal", {
        description: `${hanzi.trim()} / ${pinyin.trim()}`,
      });
    } else {
      // Alert the user if the save failed
      alert("Failed to save to journal. If using Supabase, ensure you have granted permissions.");
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
      setWords(words.map(w => w.id === id ? updated : w));
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
    let todayCount = 0;

    const todayStr = startOfDay(new Date()).getTime();

    words.forEach(w => {
      if (w.mastered) masteredCount++;
      categoryCounts[w.category] = (categoryCounts[w.category] || 0) + 1;

      const wordDate = startOfDay(new Date(w.created_at)).getTime();
      dates.add(wordDate.toString());

      if (wordDate === todayStr) {
        todayCount++;
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
      todayCount,
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

  if (loading) return (
    <div className="w-full max-w-3xl min-h-[600px] bg-paper rounded-sm journal-shadow relative overflow-hidden flex flex-col p-10">
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
    <div className="w-full max-w-3xl bg-paper rounded-sm journal-shadow relative overflow-hidden">
      {/* Spine */}
      <div className="absolute left-0 top-0 bottom-0 w-7 bg-linear-to-r from-[#8b6914] via-[#c9a84c] to-[#8b6914] shadow-[inset_-3px_0_8px_rgba(0,0,0,0.3)] z-10" />
      {/* Red margin line */}
      <div className="absolute left-[68px] top-0 bottom-0 w-[1.5px] bg-red/20 z-0" />

      <div className="ml-7 relative z-10">

        {/* Header */}
        <div className="bg-ink text-paper px-10 py-7 border-b-4 border-gold">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="font-serif text-4xl md:text-5xl font-bold tracking-[0.15em] text-gold leading-none" style={{ textShadow: '0 0 30px rgba(184,134,11,0.4)' }}>
                汉字本
              </div>
              <div className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-light-faded mt-2">
                Vocab Journal · {dailyGoal} words a day
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-4xl text-gold font-bold leading-none">{stats.streak}</div>
              <div className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-light-faded mt-1">day streak</div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/10 overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-[#8b6914] to-gold transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="font-mono text-xs text-light-faded whitespace-nowrap">
              {stats.todayCount} / {dailyGoal} today
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-[1.5px] border-light-faded bg-aged px-10">
          {(['add', 'browse', 'stats'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "font-mono text-xs tracking-[0.2em] uppercase py-3 px-4 transition-all mb-[-1.5px] border-b-[2.5px]",
                activeTab === t
                  ? "text-ink border-red font-bold"
                  : "text-faded border-transparent hover:text-ink"
              )}
            >
              {t === 'add' ? '+ Add' : t}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-8 md:p-10 min-h-[400px]">

          {/* TAB: ADD */}
          {activeTab === 'add' && (
            <div className="animate-in fade-in duration-300">
              {stats.todayCount >= dailyGoal && (
                <div className="bg-ink text-gold p-3 font-mono text-xs tracking-widest flex items-center gap-2 mb-6">
                  <span>✓</span> {dailyGoal} words reached today — well done. Keep going if you want!
                </div>
              )}

              {/* Preview */}
              <div className="mb-6">
                <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-faded mb-2">Live Preview</div>
                <div className="bg-aged border border-light-faded p-5 min-h-[80px] flex items-center gap-4 flex-wrap">
                  {hanzi || pinyin || meaning ? (
                    <div className="flex flex-col items-center mx-2">
                      <div className="font-mono text-sm text-red tracking-wider mb-1">{pinyin || 'pīn yīn'}</div>
                      <div className="font-serif text-3xl text-ink leading-tight">{hanzi || '汉字'}</div>
                    </div>
                  ) : (
                    <span className="font-mono text-[0.65rem] text-light-faded tracking-[0.15em]">TYPE BELOW TO PREVIEW</span>
                  )}
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-faded">Chinese Characters 汉字</label>
                  <input
                    type="text"
                    value={hanzi}
                    onChange={(e) => setHanzi(e.target.value)}
                    placeholder="e.g. 你好"
                    className="h-[36px] font-serif text-base bg-transparent border-b-[1.5px] border-light-faded px-1 py-0 text-ink outline-none transition-colors focus:border-red"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-faded">Pinyin 拼音</label>
                  <PinyinInput
                    value={pinyin}
                    onValueChange={setPinyin}
                    placeholder="e.g. nǐ hǎo (type ni3 hao3)"
                    className="h-[36px] font-sans text-base py-0"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-faded">Meaning (English)</label>
                  <input
                    type="text"
                    value={meaning}
                    onChange={(e) => setMeaning(e.target.value)}
                    placeholder="e.g. Hello"
                    className="h-[36px] font-serif text-base bg-transparent border-b-[1.5px] border-light-faded px-1 py-0 text-ink outline-none transition-colors focus:border-red"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-faded">Category</label>
                  <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                    <SelectTrigger className="w-full h-[36px] font-serif text-base bg-transparent border-0 border-b-[1.5px] border-light-faded px-1 py-0 text-ink shadow-none rounded-none focus:ring-0 focus:border-red items-center translate-y-[4px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="greetings">Greetings</SelectItem>
                      <SelectItem value="workplace">Workplace</SelectItem>
                      <SelectItem value="numbers">Numbers</SelectItem>
                      <SelectItem value="animals">Animals</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="time">Time</SelectItem>
                      <SelectItem value="phrases">Phrases</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-faded">Example Sentence (optional)</label>
                  <textarea
                    value={example}
                    onChange={(e) => setExample(e.target.value)}
                    placeholder="e.g. 你好，我叫 Rich。 — Hello, my name is Rich."
                    className="font-serif text-sm bg-transparent border-b-[1.5px] border-light-faded px-1 py-1.5 text-ink outline-none transition-colors focus:border-red min-h-[60px] resize-y"
                  />
                </div>
              </div>

              {/* Collapsible + More Details */}
              <div className="mb-5">
                <Collapsible open={showMore} onOpenChange={setShowMore}>
                  <CollapsibleTrigger
                    type="button"
                    className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-faded hover:text-ink transition-colors flex items-center gap-1.5 group outline-none"
                  >
                    <span className={`inline-block transition-transform duration-200 ${showMore ? 'rotate-45' : ''}`}>+</span>
                    More details
                    <span className="font-mono text-[0.5rem] text-light-faded">(optional)</span>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                      {/* Register dropdown */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-faded">Register</label>
                        <Select value={register} onValueChange={(v) => v && setRegister(v)}>
                          <SelectTrigger className="w-full h-[36px] font-serif text-base bg-transparent border-0 border-b-[1.5px] border-light-faded px-1 py-0 text-ink shadow-none rounded-none focus:ring-0 focus:border-red items-center translate-y-[3px]">
                            <SelectValue placeholder="— Select —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Select —</SelectItem>
                            {REGISTER_OPTIONS.map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Context multi-select */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-faded">Where you&apos;d see/hear it</label>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {CONTEXT_OPTIONS.map(c => {
                            const selected = context.includes(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  setContext(prev =>
                                    selected ? prev.filter(x => x !== c) : [...prev, c]
                                  );
                                }}
                                className={`font-mono text-[0.55rem] tracking-wider px-2 py-1 border transition-colors ${selected
                                  ? 'bg-ink text-gold border-ink'
                                  : 'bg-transparent text-faded border-light-faded hover:border-faded'
                                  }`}
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
              </div>

              <div className="flex items-center gap-4 mt-6">
                <Tooltip>
                  <TooltipTrigger
                    className="relative"
                    render={
                      <button
                        onClick={handleAdd}
                        disabled={!hanzi.trim() || !pinyin.trim() || !meaning.trim()}
                        className="font-mono text-xs tracking-widest uppercase bg-ink text-gold py-3 px-7 hover:bg-[#2d2416] hover:shadow-[3px_3px_0_var(--color-gold)] transition-all disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed w-full md:w-auto active:not-disabled:translate-y-px"
                      />
                    }
                  >
                    Save to Journal
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Add word to your vocabulary list</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {/* TAB: BROWSE */}
          {activeTab === 'browse' && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search hanzi, pinyin, or meaning..."
                  className="w-full font-mono text-xs px-1 py-2 border-b-[1.5px] border-light-faded bg-transparent tracking-wide focus:border-ink outline-none"
                />
              </div>

              <div className="flex flex-col gap-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs tracking-[0.3em] uppercase text-faded">
                    {filteredWords.length} words
                  </div>
                  <div className="flex gap-2 items-center">
                    <ToggleGroup multiple={false} value={filter ? [filter] : []} onValueChange={(val) => val[0] && setFilter(val[0] as any)}>
                      {(['all', 'learning', 'mastered'] as const).map(f => (
                        <ToggleGroupItem
                          key={f}
                          value={f}
                          className={cn(
                            "font-mono text-[0.55rem] tracking-widest uppercase px-2.5 py-1.5 border transition-colors h-auto rounded-none data-[state=on]:bg-ink data-[state=on]:text-paper data-[state=on]:border-ink",
                            "bg-transparent text-faded border-light-faded hover:bg-ink hover:text-paper"
                          )}
                        >
                          {f}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <Toggle
                      pressed={learningMode}
                      onPressedChange={setLearningMode}
                      className="ml-4 font-mono text-[0.6rem] px-3 py-1 border border-gold text-gold bg-transparent rounded-none hover:bg-gold/10 transition-all"
                      aria-label="Toggle Learning Mode"
                    >
                      Learning Mode
                    </Toggle>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[0.5rem] tracking-[0.2em] uppercase text-light-faded mr-1">Sort</span>
                  <ToggleGroup multiple={false} value={sort ? [sort] : []} onValueChange={(val) => val[0] && setSort(val[0] as any)}>
                    {([['newest', 'Newest'], ['oldest', 'Oldest'], ['pinyin', 'A-Z Pinyin']] as const).map(([val, label]) => (
                      <ToggleGroupItem
                        key={val}
                        value={val}
                        className={cn(
                          "font-mono text-[0.5rem] tracking-wider px-2 py-1 border transition-colors h-auto rounded-none data-[state=on]:bg-gold/15 data-[state=on]:text-[#8b6914] data-[state=on]:border-gold/30",
                          "bg-transparent text-light-faded border-light-faded/50 hover:text-faded hover:border-light-faded"
                        )}
                      >
                        {label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>

              {filteredWords.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredWords.map(w => (
                    <VocabCard
                      key={w.id}
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
                <div className="text-center py-16 text-light-faded italic text-sm">
                  <span className="font-serif text-5xl block mb-4 opacity-40">空</span>
                  No words found.
                </div>
              )}
            </div>
          )}

          {/* TAB: STATS */}
          {activeTab === 'stats' && (
            <div className="animate-in fade-in duration-300">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-aged border border-light-faded p-5 text-center">
                  <div className="font-mono text-3xl font-bold text-ink leading-none">{stats.total}</div>
                  <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-faded mt-2">Total Words</div>
                </div>
                <div className="bg-aged border border-light-faded p-5 text-center">
                  <div className="font-mono text-3xl font-bold text-ink leading-none">{stats.mastered}</div>
                  <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-faded mt-2">Mastered</div>
                </div>
                <div className="bg-aged border border-light-faded p-5 text-center">
                  <div className="font-mono text-3xl font-bold text-ink leading-none">{stats.activeDays}</div>
                  <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-faded mt-2">Days Active</div>
                </div>
              </div>

              <div className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-faded mb-4">By Category</div>
              <div className="space-y-2 mb-8">
                {Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-faded w-24 shrink-0 truncate">
                      {cat}
                    </div>
                    <div className="flex-1 h-2 bg-black/5">
                      <div
                        className="h-full bg-ink"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <div className="font-mono text-[0.6rem] text-faded w-5 text-right">
                      {count}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-aged border border-light-faded p-6 mt-6">
                <div className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-faded mb-3">Export / Backup</div>
                <p className="font-sans text-sm text-faded italic mb-4">
                  Download your vocab as JSON (for backup) or plain text (for Anki/printing).
                </p>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `hanzi-journal-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="font-mono text-[0.65rem] tracking-[0.15em] uppercase bg-transparent border-[1.5px] border-ink text-ink px-5 py-2 hover:bg-ink hover:text-paper transition-all"
                  >
                    ↓ JSON Backup
                  </button>
                  <button
                    onClick={() => {
                      const lines = words.map(w => `${w.hanzi}\t${w.pinyin}\t${w.meaning}\t${w.example || ''}\t${w.register || ''}\t${(w.context || []).join(', ')}`);
                      const text = lines.join('\n');
                      const blob = new Blob([text], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `hanzi-journal-${new Date().toISOString().split('T')[0]}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="font-mono text-[0.65rem] tracking-[0.15em] uppercase bg-transparent border-[1.5px] border-ink text-ink px-5 py-2 hover:bg-ink hover:text-paper transition-all"
                  >
                    ↓ Text / Anki
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
