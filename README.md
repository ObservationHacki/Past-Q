# PastQ

Ghana's exam past questions platform — BECE, WASSCE, university & professional certifications.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Auth**: Supabase Auth (Google OAuth)

## Data Hierarchy

```
levels → institutions → courses → subjects → papers → questions
```

## Getting Started

```bash
cp .env.example .env.local
# Fill in your keys in .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (auth)/           # Auth routes (login, callback)
│   ├── (browse)/         # Browse & search
│   ├── admin/            # Admin panel
│   └── api/              # API routes
├── components/           # Reusable UI components
│   ├── ui/               # Base components
│   ├── browse/           # Browse panel components
│   └── questions/        # Question display components
├── lib/                  # Utilities & clients
│   ├── supabase/         # Supabase client helpers
│   └── gemini/           # Gemini AI helpers
└── types/                # TypeScript types
```

## Supabase Project

Project ID: `hukwgvbqtxvakncdjwwy`
