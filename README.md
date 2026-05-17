# 汉字本 · Hanzi Journal
Learning Chinese is hard. Especially when it's supposed to be your mother tongue.

I want to make it fun. 5 words a day. That's the whole plan.

A minimalist, study-focused Chinese vocabulary journal built with Next.js, Tailwind CSS, and optional Supabase sync.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-optional-3ECF8E?logo=supabase)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## Features

- **Proper Hanyu Pinyin input** — type `ni3 hao3` and it auto-converts to `nǐ hǎo` with correct tone placement rules
- **Daily learning goals** — track your daily word count with a progress bar
- **Streak tracking** — stay motivated with a visible day streak
- **Vocabulary cards** — browse, search, and filter your saved words
- **Mastery tracking** — mark words as mastered vs. learning
- **Category labels** — organize words by topic (greetings, food, workplace, etc.)
- **Export** — download your journal as JSON (backup) or tab-separated text (Anki-compatible)
- **Cross-device sync** — optional Supabase integration for syncing across devices
- **Works offline** — falls back to localStorage when Supabase is not configured

---

## Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/hanzi-journal.git
cd hanzi-journal
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local-only mode (no Supabase)

The app works immediately with `localStorage` — no setup required. Just run `npm run dev`.

### With Supabase (cross-device sync)

1. Create a [Supabase](https://supabase.com) project
2. Run this SQL in the Supabase SQL Editor:

```sql
create table public.words (
  id uuid primary key default gen_random_uuid(),
  hanzi text not null,
  pinyin text not null,
  meaning text not null,
  category text not null,
  example text,
  mastered boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.words enable row level security;

create policy "Enable all access" on public.words
  for all using (true) with check (true);

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.words TO anon;
```

3. Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Restart the dev server

---

## Project Structure

```
hanzi-journal/
├── app/
│   ├── globals.css          # Tailwind theme (ink/paper/gold palette)
│   ├── layout.tsx           # Root layout with custom fonts
│   └── page.tsx             # Main app — Add / Browse / Stats tabs
├── components/
│   ├── PinyinInput.tsx      # Auto-converts numeric pinyin to tone marks
│   └── VocabCard.tsx        # Vocabulary card component
├── lib/
│   ├── pinyin.ts            # Hanyu Pinyin tone placement engine
│   ├── storage.ts           # Hybrid storage (Supabase or localStorage)
│   └── utils.ts             # cn() utility (clsx + tailwind-merge)
└── .env.local               # Supabase credentials (gitignored)
```

---

## Tech Stack

| Layer     | Technology                       |
|-----------|----------------------------------|
| Framework | Next.js 16 (App Router)          |
| Language  | TypeScript                       |
| Styling   | Tailwind CSS v4                  |
| Fonts     | Noto Serif SC, Space Mono, Lora  |
| Icons     | lucide-react                     |
| Database  | Supabase (PostgreSQL) — optional |
| Fallback  | localStorage                     |

---

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/hanzi-journal)

Add your Supabase environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## License

MIT
