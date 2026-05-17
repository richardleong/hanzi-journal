# Changelog

All notable changes to **Hanzi Journal (汉字本)** will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.2.0] — 2026-05-17

### Added

#### Vocabulary Metadata — Register & Context
- **Register field** — dropdown to tag words as Neutral / Formal / Informal / Slang / Vulgar.
- **Context field** — multi-select chips to tag where you'd see or hear a word: Spoken everyday · Texting · Workplace · News / Media · Textbook · Storybook · Singlish mix.
- Collapsible **"+ More details"** section on the Add form — animates open with a CSS Grid `0fr → 1fr` height transition. Keeps the main flow fast; optional metadata lives behind one click.
- Register badge rendered on vocab cards next to the category tag.
- Context tags displayed as gold-tinted labels on vocab cards.
- Register and context fields included in **Text / Anki export**.

#### Browse — Sorting Engine
- **Three-way sort** on the Browse tab: Newest first · Oldest first · A-Z by Pinyin.
- **Tone-aware pinyin sort** — a custom `pinyinSortKey()` comparator that maps diacritic-marked characters (e.g. `ǐ`, `ù`, `ā`) back to their base vowel + tone number using a reverse lookup table built from the pinyin tone map at module load time. Words with the same base syllable sort in Mandarin tone order: 1st → 2nd → 3rd → 4th → neutral (e.g. `shū` < `shú` < `shǔ` < `shù`).
- Sort state tracked via React `useState` with filtered + sorted results memoized in a single `useMemo` pass for O(n log n) performance.

#### Resilience & DX
- **Graceful Supabase fallback** — `addWord()` retries inserts without `register`/`context` columns if the initial insert fails due to a schema mismatch, so the app keeps working before the database is migrated.
- `.vscode/settings.json` — disables the built-in CSS validator (defers to Tailwind CSS IntelliSense) and registers `cn()` as a class utility for autocomplete.
- Tailwind v4 class migration: `bg-gradient-to-r` → `bg-linear-to-r`, `-mb-[…]` → `mb-[-…]`.

### Changed
- `Word` interface now includes optional `register: string` and `context: string[]`.
- `filteredWords` memo depends on `sort` state and applies sorting after filtering.

### Migration
If using Supabase, run the following in **SQL Editor** to add the new columns:

```sql
ALTER TABLE words
  ADD COLUMN register text,
  ADD COLUMN context text[];
```

---

## [0.1.0] — 2026-05-17

Initial release.

### Added

#### Core Features
- **Add tab** — form with Chinese characters, pinyin, meaning, category, and example sentence fields, with a real-time live preview card.
- **Browse tab** — full-text search across hanzi, pinyin, and English meaning; filter by learning / mastered status.
- **Stats tab** — total words, mastered count, active days, category breakdown (horizontal bar chart), and daily goal progress.
- **Daily goal tracker** — animated progress bar for a configurable 5-words-per-day target, displayed in the header alongside a streak counter.

#### Pinyin Input Engine
- **Numeric-to-diacritic conversion** — type `ni3 hao3` and get `nǐ hǎo` in real time. Uses a syllable regex parser with standard Hanyu Pinyin tone placement rules (vowel priority: `a`/`e` first, then `ou`, then last vowel).
- Tone map data structure supporting all vowel variants (`a`, `e`, `i`, `o`, `u`, `ü`) across 5 tones.

#### Data Layer
- **Dual storage architecture** — Supabase (PostgreSQL) when configured via environment variables, with automatic localStorage fallback for offline / local-only usage. Transparent to the UI layer via a unified `storage` API.
- **Export** — JSON backup (structured, re-importable) and tab-separated plain text export (Anki-compatible).

#### Vocab Cards
- Category badge, mastered/learning toggle, delete-on-hover, and a gold box-shadow hover effect.
- Date-stamped with `date-fns` formatting.

#### Design System
- Journal-inspired skeuomorphic design: leather spine gradient, red margin line, aged paper texture, and ink/gold colour palette.
- Custom CSS theme tokens via Tailwind v4 `@theme inline` — 8 semantic colours, 3 font stacks.
- Typography: Noto Serif SC (汉字), Space Mono (UI labels), Lora (body text).
- Fully responsive grid layout (mobile single-column → desktop two-column cards).
- Subtle background grid pattern using layered `repeating-linear-gradient`.
