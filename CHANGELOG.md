# Changelog

All notable changes to Hanzi Journal (汉字本) will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.2.0] — 2026-05-17

### Added
- **Register field** — dropdown to tag words as Neutral / Formal / Informal / Slang / Vulgar.
- **Context field** — multi-select to tag where you'd see or hear a word: Spoken everyday · Texting · Workplace · News / Media · Textbook · Storybook · Singlish mix.
- Collapsible **"+ More details"** section on the Add form — keeps the main flow fast, extra metadata lives behind one click.
- Register badge shown on vocab cards next to the category tag.
- Context tags displayed as gold-tinted labels on vocab cards.
- Register and context included in **Text / Anki export**.
- Resilient Supabase insert — retries without new columns if the database hasn't been migrated yet.

### Changed
- `Word` type now includes optional `register` (string) and `context` (string array).

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
- **Add tab** — input Chinese characters, pinyin (with tone-number conversion), meaning, category, and example sentence, with a live preview card.
- **Browse tab** — search by hanzi, pinyin, or meaning; filter by learning / mastered status.
- **Stats tab** — total words, mastered count, active days, daily streak, category breakdown bar chart.
- **Daily goal tracker** — progress bar for 5 words/day target in the header.
- **Dual storage** — Supabase (when configured) with automatic localStorage fallback.
- **Export** — JSON backup and tab-separated Text / Anki download.
- **Pinyin tone input** — type `ni3 hao3` and get `nǐ hǎo` automatically.
- **Vocab cards** — category badge, mastered toggle, delete on hover, gold shadow hover effect.
- Journal-inspired design with spine, margin line, aged paper texture, and ink/gold colour palette.
- Noto Serif SC, Space Mono, and Lora typography.
- Fully responsive layout (mobile → desktop).
