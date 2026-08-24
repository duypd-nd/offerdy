# Offerdy

A deals and coupon-code site. Every code published here is meant to carry the date a human
actually entered it at the store's checkout — not a scraped "verified" badge.

**Live:** https://www.offerdy.com · **Test log:** https://www.offerdy.com/how-we-test

> 🇻🇳 The working documentation in this repo is written in Vietnamese, and so are most
> code comments. Public-facing site copy is English. That split is deliberate — see
> `CLAUDE.md`.

## Stack

| | |
|---|---|
| Framework | Next.js **16.2** (App Router) · React **19.2** · TypeScript 5.9 |
| Styling | Tailwind CSS 4 + one global stylesheet (`src/app/globals.css`) |
| CMS | Sanity (`next-sanity` 13) |
| Hosting | Vercel |
| Node | **24.x**, pinned in `engines.node` — this **overrides** the Vercel dashboard setting |
| Errors | Sentry |
| AI | Anthropic SDK (article drafts, captions, video scripts) |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

You need a `.env.local` before anything talks to Sanity — see below. Without it the app
falls back to static demo data locally, but **never** in production.

⚠️ **Do not run `next dev` over a `.next` directory left by `npm run build`.** It serves
routes as 404s that work fine in production. `rm -rf .next` and restart. More Windows and
tooling traps in [`AGENTS.md`](AGENTS.md).

## Checks

```bash
npm test           # 565 assertions — run this before every commit
npx tsc --noEmit
npm run build
npm run lint       # currently 62 pre-existing problems; see TODO.md before blaming yourself
```

Tests live in `tests/*.test.ts` and run against the real code in `src/` through an esbuild
bundling step (`scripts/run-tests.mjs`) — no mocks.

## Scripts

| Command | What it does |
|---|---|
| `npm run video:spec` / `video:render` / `video:analyze` | Build a vertical product video from a deal, then measure the output |
| `npm run vault:backup` / `vault:restore` | Back up and restore the encrypted admin-account store |
| `npm run check:ga4` / `check:gsc` | Pull Google Analytics 4 and Search Console figures |
| `npm run triage:dead` | Find pages Google still ranks that no longer exist |

⚠️ Video rendering runs **locally only** — it does not work on Vercel.

## Environment variables

Names only. Real values live in `.env.local` (git-ignored) and in the Vercel project.

**Required**

| Variable | For |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` | Sanity connection |
| `SANITY_API_TOKEN` | Sanity writes |
| `AUTH_SECRET`, `AUTH_PEPPER` | Admin sessions and account hashing |

⚠️ **Losing `AUTH_PEPPER` loses every admin account.** Run `npm run vault:backup`.

**Optional — features degrade quietly without them**

| Variable | For |
|---|---|
| `ANTHROPIC_API_KEY` | AI drafting |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `FAL_KEY` | Video voice-over and imagery |
| `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` | Analytics reads |
| `GSC_SITE_URL` | Search Console reads |
| `AUTH_BACKUP_KEY` | Encrypting account backups |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Error reporting |

`CRON_SECRET` sits apart from both lists: the site runs fine without it, but every scheduled
job returns **401**. It is set on Vercel and not in `.env.local`. `/admin/cron-check` exists
precisely because this once failed in a way nothing else surfaced.

`ADMIN_USERNAME` and `ADMIN_PASSWORD` are **legacy**. Basic Auth was replaced by real
accounts in August 2026; these names are only still read so the admin health page can warn
that they are set. They authenticate nothing.

## Where the documentation is

| File | Contains |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | How to work in this repo — read this first |
| [`AGENTS.md`](AGENTS.md) | Where this environment bites: Windows, Git Bash, browser testing, Sanity |
| [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) | Architecture, settled decisions, and every trap already paid for. Has a grouped index |
| [`TODO.md`](TODO.md) | What is being worked on right now, and current measurements |
| [`docs/NHAT_KY.md`](docs/NHAT_KY.md) | Closed work log — old measurements, kept for reference |
| [`docs/adr/`](docs/adr/) | Architecture decision records |

`docs/00-governance/` and `docs/04-project-management/` are generic principle documents.
They contain nothing specific to Offerdy and are not required reading.

## Layout

```
src/app/           routes (App Router) — /admin/* is the operator UI
src/components/    shared public components
src/lib/           domain logic, most of it unit-tested
src/sanity/        client, queries, schema wiring
sanity/schemaTypes/ content models
scripts/           operational scripts (see table above)
tests/             *.test.ts, run by npm test
docs/              documentation
```

## A note on the content

Most long-form articles on the site are AI-drafted and reviewed before publishing. The
coupon test log at [`/how-we-test`](https://www.offerdy.com/how-we-test) is the opposite:
every row is a record of a person opening a store's checkout and typing a code in. Nothing
on that page is generated, and the numbers on it are computed from the data rather than
typed by hand.
