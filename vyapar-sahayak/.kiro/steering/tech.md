# Tech Stack & Conventions

## Stack

- **Runtime**: Node.js (Next.js 16 with Turbopack)
- **Framework**: Next.js 16 App Router (server components + client components)
- **Language**: TypeScript 5 (strict)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Database**: SQLite via Prisma 7 (libsql adapter)
- **AI/ML**:
  - AWS Bedrock -- Nova Lite (text), Nova Canvas (images)
  - Google Gemini Pro (alternative image generation)
  - Bedrock Converse API (agentic chatbot with tool-use)
  - simple-statistics, ml-kmeans, danfojs-node (client-side ML)
- **Animations**: Framer Motion, GSAP, Lenis (landing page)
- **Charts**: Recharts

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema to SQLite
```

## Coding Conventions

- ASCII only in terminal output -- no unicode symbols
- `// comments`, not block comments
- Two blank lines between top-level functions
- Use `cn()` from `@/lib/utils` for conditional class merging
- Prefer `unstable_cache` with `revalidateTag` for data fetching
- Indian Rupee formatting: `Rs.${value.toLocaleString("en-IN")}` or `Rs.${(value / 100000).toFixed(1)}L`
- Demo mode: when `AWS_ACCESS_KEY_ID` is unset, `bedrock.ts` returns mock responses

## Environment Variables

```
AWS_ACCESS_KEY_ID      # Bedrock credentials
AWS_SECRET_ACCESS_KEY
AWS_REGION             # Default: us-east-1
BEDROCK_TEXT_MODEL     # Default: amazon.nova-lite-v1:0
GOOGLE_CLOUD_API_KEY   # For Gemini image generation
DATABASE_URL           # SQLite path (default: file:./dev.db)
```

## File Naming

- Components: PascalCase (`HeroCards.tsx` -> exports `HeroCards`)
- Lib modules: kebab-case (`agent-tools.ts`)
- Route files: `page.tsx`, `route.ts`, `layout.tsx` (Next.js convention)

## Responsive Layout

- Mobile-first design: 375px base, scales to 768px (tablet) and 1280px+ (desktop)
- No max-width cap on demo pages (removed old max-w-md / 448px constraint)
- Desktop (>= 768px): collapsible sidebar navigation (240px expanded, 64px collapsed)
- Mobile (< 768px): bottom navigation bar
- Sidebar state persisted in localStorage (try/catch wrapped for SSR safety)
- Main content area uses responsive left margin matching sidebar width
- Floating chat widget remains (bottom-right, z-40)

## Collapsible Sidebar Pattern

- Sidebar component: `src/components/dashboard/sidebar.tsx`
- 5 nav items with lucide-react icons, active route via `usePathname()`
- Active item: saffron left border + bg-orange-50
- Width transition: `transition-all duration-200`
- Hidden below md breakpoint: `hidden md:flex`
- Collapse state managed in DemoLayout, passed down as prop
