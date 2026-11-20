# Portfolio

A monorepo for my personal portfolio site and the self-contained projects that live inside it. The site presents a minimal, themeable shell (custom cursor, light/dark toggle, a Home "Projects" list) and mounts each project as its own app under `/apps/*`.

Live: [daniel-krouguerski.com](https://www.daniel-krouguerski.com)

This README doubles as a walkthrough of **how the most recent project (Photos) was built with an AI coding agent** — the engineering process, the Claude skills used, the testing, and the full user flow including authentication. The goal is to show that AI-assisted work here follows the same principles I'd hold any codebase to: specs before code, documented decisions, small reviewable increments, deep well-tested modules, and clear seams.

---

## Repository layout

A workspaces monorepo (`npm` workspaces) split into a frontend host and a shared backend:

```
portfolio/
├── client/
│   ├── portfolio/     # The host app (React + Vite): Home page, nav, theme, cursor,
│   │                  #   and the wrappers that mount each project under /apps/*
│   ├── starsync/      # StarSync — a Spotify "musical horoscope" app (JS/React)
│   ├── photos/        # Photos — a photography gallery (TypeScript workspace package)
│   └── _shared/       # Assets and hooks shared across apps (e.g. useMobile)
├── server/
│   ├── index.js       # Express entry: CORS, sessions, static hosting, router mounts
│   └── apps/
│       ├── starsync/  # /api/starsync router
│       └── photos/    # /api/photos router + Cloudinary gateway + auth seam (TS)
├── docs/
│   ├── adr/           # Architecture Decision Records
│   └── agents/        # How AI agents should work in this repo (issue tracker, domain docs)
├── GLOSSARY.md        # The shared domain vocabulary for the Photos context
└── CLAUDE.md          # Entry point for AI agents working in the repo
```

**How apps mount.** The portfolio host owns routing, theme tokens, and the cursor. Each project is a wrapper component (e.g. `PhotosWrapper.jsx`) that imports the app package, resolves the theme, and passes host-owned concerns (theme, cover image, an `onExit` handler) down as props. On the backend, `server/index.js` mounts one router per app under `/api/<app>`. Adding a project is additive — a new workspace, a new wrapper, a new router — without touching the others.

### Tech stack

- **Frontend:** React 19, Vite 6, Tailwind CSS, React Router. Photos is authored in **TypeScript**.
- **Backend:** Node + Express 4, run through **`tsx`** so TypeScript and JavaScript modules coexist during an incremental JS→TS migration (no build step for the server).
- **Photos storage:** **Cloudinary** (images + all metadata) — no database, no server disk writes.
- **Auth:** stateless **JWT in an httpOnly cookie**, `bcrypt` password hashing, `express-rate-limit`.
- **Testing:** Vitest + Supertest (95 tests at time of writing).

---

## Projects

### StarSync *(overview)*

An earlier React/Express app that connects to the **Spotify API** to turn a listener's top tracks into a playful "musical horoscope," with short- and long-term demo data for visitors who don't log in. It established the pattern every later app follows: a standalone workspace with its own `/api/<app>` router, mounted into the portfolio shell at `/apps/starsync`.

Stack: React · Express · Spotify API.

### Photos *(the focus of this README)*

A photography portfolio that lives inside the main site at `/apps/photos/*`. It's a **public, view-only gallery** that the **Owner** (me) can privately curate — upload, tag, reorder, and delete — with no "admin" surface ever visible to visitors.

**What a visitor sees**

- A full-screen cover landing, then a responsive **masonry grid** in a deliberate **Master Order**, each photo keeping its true aspect ratio (ultra-wide panoramas span the full width).
- Filters for **Orientation** (Landscape / Portrait / Square, derived from dimensions, not stored) and for **Tags**. Multiple selections OR within a category; the two categories combine with AND. Filtering is instant and client-side, and never resequences the collection — it only hides non-matching photos.
- A full-screen viewer with chevron/arrow-key paging through the currently-filtered set, closable with X or Escape.

**What the Owner can do (Edit Mode)**

- Reach an **unlisted** login by typing its URL; nothing in the public UI links to it.
- Once authenticated, an Edit toggle appears. Edit Mode is a multi-select surface for batch actions: **upload** (one or many, including HEIC from a phone), **tag/untag**, **delete**, and **drag-to-reorder** the Master Order.

---

## Photos: architecture highlights

A few decisions are worth calling out because they shaped the whole app. Both of the big ones are recorded as ADRs in [`docs/adr/`](docs/adr/).

**Cloudinary is the system of record — no database ([ADR-0001](docs/adr/0001-cloudinary-as-system-of-record.md)).**
The deployment target (Render) has an ephemeral filesystem that wipes local files on every redeploy, so a server-side store wouldn't survive. Cloudinary hosts the images, supplies each image's dimensions on upload (from which Orientation is derived), and stores all per-photo metadata — Tags as native tags; caption, alt text, and Master Order `position` as contextual metadata. The gallery fetches the list once and filters/sorts in the browser. The server holds **no state** and writes nothing to disk.

**Build the multi-user seam now, defer the machinery ([ADR-0002](docs/adr/0002-deferred-multi-user-seam.md)).**
There's one Owner today, but the costly-to-reverse parts of multi-user are the *asset paths* and the *authorization model* — not registration or user management. So assets are namespaced by owner in Cloudinary (`photos/<userId>/…`, a single user `me` for now), the session carries a `userId` rather than an `isAdmin` flag, and authorization is expressed as *"the authenticated user owns this asset"* (`ownsAsset(userId, assetId)`). Adding owners later becomes additive instead of a rewrite — with no speculative machinery built today.

**A single gateway seam to Cloudinary.**
All server code reaches Cloudinary through one interface, `PhotoGateway` (`listPhotos`, `uploadPhoto`, `setPosition`, `setTags`, `deletePhoto`). The rest of the server depends on the interface, not on the Cloudinary SDK, so tests substitute a fake gateway and assert the full HTTP contract with no network and no credentials. The same seam shape is used for auth (`createAuth(config)`), which tests construct with a known password hash.

**Fractional positions for reordering.**
Master Order is a single `position` number per photo. Positions are *fractional*, so dragging a photo (or a contiguous multi-selection) into a gap only rewrites the photos that actually moved — it drops them between their new neighbours' values and leaves everyone else untouched. One drag is one or a few metadata writes, not a renumber of the whole set. The reorder math is a pure, unit-tested module (`lib/reorder.ts`).

**Image processing happens in the browser, before upload.**
Every picked file is brought to a web-friendly, privacy-safe, size-capped form *before it leaves the browser* (`lib/process-image.ts`): HEIC/HEIF is decoded to JPEG, the image is downscaled so its long edge is ≤ 2560px (comfortably under Cloudinary's free-tier 10 MB cap), and re-encoding through a `<canvas>` strips **all EXIF metadata — including GPS** — while baking the camera's orientation into the pixels so phone photos still show upright. The pure resize/detect rules carry unit tests; the canvas work is the thin browser-only shell.

---

## Photos: the user flow, including auth

**Browsing (public, unauthenticated)**

1. `GET /api/photos` returns every photo in Master Order. This route is public — no cookie required.
2. The client holds the full list and derives everything else locally: Orientation from each photo's dimensions, the in-use Tag vocabulary from the photos themselves, and the filtered view. Filtering is pure and instant.

**Owner authentication**

3. The Owner navigates directly to the **unlisted** `/apps/photos/login` (never linked from the UI) and submits a single password.
4. `POST /api/photos/login` verifies the password against a **bcrypt hash** held in an environment variable (the plaintext is never stored). The endpoint is **rate-limited**, and only *failed* attempts count toward the limit, so a correct login is never locked out.
5. On success the server signs a **JWT carrying `{ userId }`** and sets it as an **httpOnly** cookie. Because the session is a stateless signed token (no server-side session store), a login **survives backend restarts and redeploys**. Cookie flags adapt to the environment: `secure` + `sameSite:'none'` in production (the app and API are cross-site over HTTPS), `secure:false` + `sameSite:'lax'` in local dev.
6. The cookie is httpOnly, so client JS can't read it. To restore Owner state after a refresh, the client calls `GET /api/photos/session`, which echoes the `userId` when the cookie is valid. Only then does any Edit affordance render — logged out, there is no hint Edit Mode exists.

**Curating (Owner, write-gated)**

7. Every write route is gated by `requireOwner`, which 401s unless a valid session cookie is present. `requireOwner` runs **before** the upload parser, so an unauthenticated upload is rejected without its body ever being read.
   - `POST /api/photos` — upload (bytes already processed in the browser; the server only relays them to Cloudinary and seeds the new photo's Master-Order position so it lands newest-first).
   - `PATCH /api/photos/:id/position` — set a photo's fractional position.
   - `PUT /api/photos/:id/tags` — replace a photo's whole Tag set (add = union, remove = difference, strip = empty).
   - `DELETE /api/photos/:id` — remove the photo and its underlying Cloudinary asset (idempotent).
8. The grid updates **optimistically** and persists in the background; if a write fails, the client resyncs from the API so the view always ends up matching what the server actually stored.

---

## Photos: how it was built with an AI coding agent

The whole app was built collaboratively with **Claude Code**, deliberately run as a disciplined engineering process rather than ad-hoc prompting. The guardrails below are what keep AI-assisted output reviewable and trustworthy.

### Spec first, then small issues

Work started from a **written spec** — a single GitHub issue (#1) with a problem statement and ~50 numbered user stories across browsing, filtering, auth, curation, and future-proofing. That spec was decomposed into small, independently shippable issues (#2–#10): scaffold, public gallery, owner auth, viewer, filtering, Edit Mode, upload, reorder, tagging. Each issue traces back to specific user stories.

### Branch and PR per issue

Every issue got its **own branch**, its own pull request, and a **code review before merge** into the app branch. The git history reads as a clean sequence of reviewed increments (`#2` → `#3` → … → `#10`), each commit referencing its issue — so any change is small enough to actually review, and the "why" is always one click away.

### Documented domain and decisions

- A **`GLOSSARY.md`** fixes the domain vocabulary (Photo, Owner, Tag, Orientation, Master Order, …) with explicit *avoid* synonyms, so code, issues, and reviews all use the same words.
- **ADRs** record the load-bearing decisions (Cloudinary as system of record; the deferred multi-user seam) with their context, alternatives considered, and consequences — so a future reader understands *why* `userId`-bearing sessions and owner-namespaced folders exist in a single-user app.

### Deep modules and clean seams

The design favours **deep modules behind narrow interfaces**: the `PhotoGateway` seam over Cloudinary, the `createAuth` seam over the session/JWT machinery, and pure logic modules (`reorder`, `filters`, `tags`, `orientation`, `masonry`, `process-image`) separated from their thin React/canvas shells. This is what makes the code both testable and easy for an agent (or a human) to navigate.

### Claude skills and agent conventions used

The repo is set up so an agent works consistently. `CLAUDE.md` and `docs/agents/` encode the conventions, and specific Claude Code skills drove the work:

- **Issue tracker** (`docs/agents/issue-tracker.md`) — all specs and issues live as GitHub issues via the `gh` CLI, with conventions for sub-issues and blocking dependencies.
- **Domain modeling** — produced and maintained `GLOSSARY.md` and the ADRs under `docs/adr/`.
- **Codebase design** — the deep-module / seam vocabulary behind the gateway and auth interfaces.
- **TDD** — test-first construction of the pure logic and the HTTP contract (see below).
- **Code review** — a two-axis review (does it follow the repo's standards? does it match what the issue asked for?) run on each branch before merge.

A memory of project-specific conventions is kept too: branch-per-issue, lazy env reads for the TS-on-`tsx` server (dotenv runs after hoisted ESM imports), and Cloudinary dynamic-folder behaviour (list by `asset_folder`, not `public_id` prefix) — the kind of hard-won details that are easy to regress without a note.

### Testing

**95 tests across 10 files**, run with Vitest and Supertest:

- **HTTP contract tests** exercise the real Express router against a **fake `PhotoGateway`** and a test `Auth` built with a known password hash — asserting the public list endpoint, the login/session/logout flow, rate-limiting, the 401 write-gate on every mutating route, and the error paths (e.g. a 502 when the gateway fails), all with no network and no Cloudinary credentials.
- **Pure-logic unit tests** cover the fiddly rules directly: fractional reorder positions, filter combination (OR within a category, AND across), tag set math, Orientation derivation with the square tolerance, masonry column assignment, paging, and the image-resize rule.

This split — fakes at the seams, pure functions for the logic — is what lets the suite run fast and deterministically while still covering the behaviour that matters.

---

## Running locally

```bash
npm install

# Frontend + backend together (concurrently)
npm run dev

# Or individually
npm run dev:frontend   # client/portfolio (Vite)
npm run dev:backend    # server (Express via tsx watch)
```

The Photos server reads its configuration from environment variables (see `server/.env.example`): Cloudinary credentials, the JWT secret, and the Owner password **hash** (generate one with `npm run hash-password -w server`). Photos tests need no credentials — they run entirely against fakes:

```bash
npm test -w client/photos
```
