# Minnekart — Business Plan

_Companion to `PRD.md`. Version 1.0 — drafted 2026-07-10._

> **Business shape:** Pure indie / bootstrapped SaaS. Solo-run, profitable
> from margin one, no outside capital, no venture ambition. Growth is
> slow-and-steady and community-led, not growth-at-all-costs. Every decision
> in this document inherits from that choice.

---

## 1. Executive Summary

Minnekart is a private, spatial home for a person's entire travel history — an
interactive globe where every pin is a place you've stood, opening into the
story, dates, and photos of that visit. It began as the owner's personal
project and now has a working demo (`minnekart.vercel.app`) through Phase 7 of
the PRD.

This plan converts that personal project into a bootstrapped subscription
business without changing its scope or spirit. The strategy is deliberately
narrow: one beachhead customer, one positioning wedge, one paid tier, one
launch channel done credibly. The product's near-zero marginal cost (photos on
Cloudflare R2's free tier, metadata on Neon) means margin is never the
constraint — **distribution and perceived value are**, and this plan is built
around those two levers.

---

## 2. Market & Positioning

### 2.1 Beachhead customer

**Frequent travelers, expats, and long-term digital nomads** — people whose
travel history has outgrown their camera roll.

Chosen because:

- The core pain in the PRD's problem statement ("scatter across camera rolls,
  chat threads, fading recollection") is most acute for people who've lived in
  or visited many places. A casual traveler with three trips a year doesn't
  feel this badly enough to pay; someone who's lived in six countries does.
- This segment already pays for travel-adjacent subscriptions (NomadList,
  Polarsteps Premium, Notion travel setups, Wise). We redirect existing
  spending rather than teaching a new payment behavior.
- It's reachable through existing online communities without paid ads —
  essential for a $0-budget solo GTM.

Segments explicitly **not** targeted first: couples/gift-buyers (skew to
one-time purchases, fights recurring revenue), family legacy-builders (slow
adoption, hard to reach cheaply), and content creators (want tools that make
them money, not cost them a subscription).

### 2.2 Positioning wedge

> **"For people who've traveled enough that their memories don't fit in a
> camera roll anymore — Minnekart is the private, spatial home for everywhere
> you've been, not another app trying to track where you're going next."**

This is a genuine category gap, not marketing spin — it falls out of the actual
product mechanics.

### 2.3 Competitive landscape

|                  | **Polarsteps**                                | **Day One**             | **Minnekart**                              |
| ---------------- | --------------------------------------------- | ----------------------- | ------------------------------------------ |
| Core mechanic    | Real-time GPS trip tracking                   | Daily text journal      | Retrospective place-visit archive          |
| Time orientation | The trip you're on _now_                      | Today's entry           | Everywhere you've _already been_           |
| Spatial model    | Route lines on a map                          | None                    | Orthographic globe, pin-per-place          |
| Privacy posture  | Social by default                             | Private, encrypted      | Private by default, deliberate share links |
| Monetization     | Free app + printed books (€36–150) + Plus sub | Annual sub (~$50–75/yr) | Freemium sub (this plan)                   |

**Strategic consequence — locked:** **Never build live GPS tracking.** It's
tempting (Polarsteps proves demand) but drags Minnekart onto their turf, where
they have a multi-million-user head start, and it adds engineering the product
doesn't need. Staying retrospective/manual-entry is both the differentiator and
the _lighter_ build.

Privacy is a **marketed feature**, not just an architecture note — the
signed-URL, revocable-sharing work (PRD F3/F8) is a real differentiator against
Polarsteps' social-by-default model. It earns a line on the marketing page.

---

## 3. Business Model

### 3.1 Freemium structure

**Free tier — 15 pins / 6 photos per pin** (dual cap; 90 photos max per free
account).

- Sized to feel generous to a _casual_ traveler and immediately tight to the
  _actual ICP_. A serious traveler backfilling old trips blows past 15 pins in
  one sitting — that's the point. A cap sized for casual users would let the
  real target live free forever and never convert.
- 6 photos/pin is enough to make a trip page feel like a real memory, but not
  a full archive of a real trip — creating natural upgrade pressure _within_ a
  pin, not just across pins.
- Clean, guilt-free upgrade message: "15 free memories, 6 photos each."

**Paid tier — single tier, removes the cap.** Functionally unlimited pins and
photos, with a high _unadvertised_ soft ceiling (~5,000 photos) purely as an
abuse valve.

Rationale for a single tier: multi-tier segmentation is a problem you can't
solve without usage data. Adding a second, richer tier later (e.g. printed
books, shared/family globes) is a data-driven decision for _after_ PMF — not a
pre-launch guess.

### 3.2 Pricing

| Plan              | Price                    | Notes                                                           |
| ----------------- | ------------------------ | --------------------------------------------------------------- |
| Free              | $0                       | 15 pins / 6 photos per pin                                      |
| **Paid (annual)** | **$39/year**             | Primary offer; ~$3.25/mo equivalent                             |
| Paid (monthly)    | ~$5/month                | Deliberate premium (~$60/yr equiv.) so the gap nudges to annual |
| Founding member   | ~$99 one-time (lifetime) | **Launch tactic only — has an expiry.** First cohort only.      |

- **$39/year** sits inside the proven $25–75/year range that Day One has already
  validated for private memory-keeping subscriptions. Pricing above Day One's
  floor is a hard sell without more feature depth (no AI/encryption story yet);
  pricing far below undercuts the "serious tool for serious travelers"
  positioning.
- **Annual-first** matches how people think about a memory-keeping purchase (a
  yearly ritual, not a monthly utility), reduces payment-processing overhead,
  and cuts failed-card churn. Monthly is offered but deliberately unattractive.
- **Don't underprice out of guilt about low hosting costs.** Marginal cost per
  user is pennies, but price is anchored to the _value_ of "your entire travel
  history, safely kept" — not to the R2 bill. Underpricing here is the classic
  first-time indie-hacker mistake.
- **Founding-member lifetime deal** gets real cash and committed early users
  before a functioning GTM engine exists, and rewards the friends-and-family
  cohort who were there when it was just a personal project. It is a
  time-boxed launch tactic, not a permanent tier.

### 3.3 Unit economics & cost floor

| Item                                         | Figure                                               |
| -------------------------------------------- | ---------------------------------------------------- |
| Photo size (display WebP + thumbnail)        | ~350–400 KB                                          |
| R2 free tier                                 | 10 GB ≈ ~26,000 photos, pooled across all free users |
| Fully-maxed free accounts before any R2 bill | ~277 (at 90 photos each)                             |
| R2 overage beyond free tier                  | ~$0.015/GB/month (pennies at real scale)             |
| Neon free tier                               | Metadata only — effectively never the bottleneck     |
| Marginal cost per paying user                | Effectively $0 (fractions of a cent of storage)      |

**Implication:** infra cost is no longer purely a function of the owner's own
usage — it scales with free signups. But even the worst case is trivial: there
is no realistic scenario where free-tier growth produces a meaningful bill. The
real free-tier risk is _abuse_ (someone using it as a free photo CDN), handled
by the unadvertised soft ceiling, not cost.

### 3.4 Payment infrastructure

**Paddle, as Merchant of Record.**

- A Merchant of Record becomes the legal seller and collects/remits VAT/GST on
  the owner's behalf. This matters _specifically_ because the ICP (expats,
  nomads) is scattered across dozens of tax jurisdictions — raw Stripe would
  create multi-country registration and filing obligations that are unsafe for
  a solo, non-lawyer operator.
- Tax compliance is a legal problem, not an engineering one — this is the one
  part of the stack to _buy_, not hand-roll, despite the PRD's
  control-the-stack posture everywhere else.
- Paddle chosen for being boring and proven (fully-handled sales tax, no
  roadmap uncertainty). Polar is a defensible open-source alternative if that
  alignment matters more than maturity; Lemon Squeezy is avoided given its
  2026 pivot toward Stripe Managed Payments; Creem is cheapest early but least
  proven.
- The few percent Paddle takes is a rounding error at $39 ARPU and removes a
  real liability.

---

## 4. Go-To-Market

### 4.1 Constraints (owner-specific — the plan is fitted to these)

- **Low-profile founder.** Not willing to be a sustained public
  personality/build-in-public voice. This rules out the highest-theoretical-ROI
  solo motion and shifts the plan toward channels that work while the owner is
  silent.
- **Redditor, but not embedded in travel communities.** A warm-up period is
  required before any travel-community launch post.
- **$0 ad budget** and a $39 ARPU that can't absorb paid CAC.

**Honest tradeoff, on the record:** this is a _slower_ cold start than a
build-in-public founder would get. That's an acceptable trade for "pure B."
Judge success on month-6 and month-12 curves, not week-1. The channel matches
the ambition; keep them matched.

### 4.2 Three-pillar strategy

**Pillar 1 — The product is the marketing (primary).**
The public `/u/username` globe (PRD F8) is a self-contained, shareable artifact
that sells the product _without the owner having to talk_. Every share is
marketing the owner didn't perform. Consequence: the Open Graph / link-preview
work in F8 is **distribution infrastructure, not a nice-to-have** — prioritize
making the public globe page maximally share- and screenshot-worthy.

**Pillar 2 — A few one-time, artifact-led posts (not a sustained presence).**
A launch post is a one-time act, not a lifestyle. See the sequence in §4.4.

**Pillar 3 — SEO as the silent, compounding base layer.**
The only channel that works while the owner stays silent. A small number of
genuinely useful evergreen pages (e.g. "how to keep a private record of every
place you've travelled," "Polarsteps alternatives that don't track your live
location"), written once, earn traffic for years. Slow (6–12 months) — so start
early.

### 4.3 Reddit playbook

| Subreddit                         | Role                                        | Climate                                           |
| --------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| r/SideProject                     | Primary launch surface                      | Welcomes "I built this" — natural home            |
| r/indiehackers                    | Launch surface + business feedback          | Same; also free pricing pressure-test             |
| r/solotravel (~1.9M)              | Beachhead travel community (warm-up target) | Bans ads; rewards authentic answers               |
| r/digitalnomad (~850k–1.5M)       | Beachhead alt                               | Self-promo only in context; product posts removed |
| r/onebag, r/backpacking, r/expats | Niche / listen-only                         | High relevance, low pitch tolerance               |

**Non-negotiable rules** (travel subs enforce hard; bans are rarely reversed):

- **90/10 minimum** — ≥90% genuine participation, ≤10% self-promo. Some subs
  enforce closer to 99/1. Mods check profiles before removing comments.
- **Warm up 3–4 weeks** in _one_ chosen travel sub before ever mentioning the
  product. Concentrate participation in one, don't spread thin.
- **Read every sidebar** before posting — karma/account-age minimums,
  megathread-only promo, flair/disclosure requirements vary per sub.
- **Never sockpuppet** — separate upvote/rec accounts get everything
  permanently suspended.
- **Kill marketing language** — no "revolutionary," "game-changing," "best."
  Write like a friend giving honest advice (the PRD's own plain tone is right).

**Action sequence:**

1. **Weeks 1–4 — warm-up, silent on Minnekart.** In the chosen travel sub,
   give practical answers with real costs/logistics. Answer "how do you track
   places you've been" questions helpfully _without_ pitching. Build a comment
   history a mod would read as a real member.
2. **The single travel-community post (after warm-up).** Artifact-led,
   origin-story framed: "I got tired of my travel photos scattered across dead
   cloud accounts, so I built a private globe of everywhere I've been." Show
   your own filled-in globe, disclose you made it, let people ask for the link.
3. **Maker-community posts (parallel, less warm-up).** Fuller "here's what I
   built + the stack + founding-member offer" version in r/SideProject and
   r/indiehackers. Doubles as a free pricing/feedback loop.
4. **Ongoing (low-effort, sustainable).** Once established, a genuine one-line
   mention with disclosure when someone organically asks about travel-logging
   tools. Reactive and helpful — the one sustainable low-profile action.

**The make-or-break discipline:** the warm-up is not optional. It's the entire
difference between "welcomed member sharing a tool" and "banned drive-by
marketer." Skip it and the travel channel is dead permanently.

### 4.4 Launch sequence

The founding-member offer, custom domain, and billing are one milestone, not
three — a checkout page under `vercel.app` costs trust at the worst possible
moment.

1. **Pre-launch build (Phase 8 — see §5).** Billing schema + Paddle webhooks +
   free-tier enforcement + custom domain purchase + DKIM email.
2. **Warm-up** in the chosen travel sub (runs during/overlapping Phase 8).
3. **Founding-member launch** to the friends-and-family cohort + maker
   communities. Lifetime offer live, capped and time-boxed.
4. **The single travel-community post** once warmed up.
5. **SEO pages** published early and left to compound.
6. **Steady state:** product-share virality (Pillar 1) + reactive community
   mentions + SEO, all low-profile-compatible.

---

## 5. Product & Roadmap Gaps

The business layer surfaced gaps not yet in the schema or build. These are
**Phase 8** — the "make it a business" phase — and are prerequisites to
charging money.

**Billing & subscription (new):**

- `users` table needs `plan`, `subscription_status`, and `paddle_customer_id`
  fields.
- A Paddle webhook handler for the subscription lifecycle:
  created / renewed / canceled / payment-failed.
- Free-tier **enforcement** — block pin/photo creation past 15/6 on the free
  plan (not currently in the build).

**Trust & deliverability:**

- Custom domain purchased and wired (all URLs already come from env config per
  the PRD, so this is a drop-in — but it's now launch-blocking, not deferred).
- DKIM-signed email via the domain (improves OTP/reset deliverability, which
  the PRD flagged as a risk without a domain).

**Distribution infrastructure (reframed, not new):**

- Public `/u/username` globe + Open Graph tags (PRD F8) is now a **primary
  marketing asset** — prioritize its polish and shareability accordingly.

Carried over from the PRD as still-deferred: photo reorder, journey grouping,
originals opt-in, EXIF-GPS pin suggestions, R2→box photo backup.

---

## 6. Risks & Mitigations

| Risk                                                                        | Mitigation                                                                                                                                                        |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Slow cold start** (low-profile founder, no travel-community standing yet) | Accepted tradeoff for "pure B." SEO + product-share virality compound silently; judge on 6–12 month curves.                                                       |
| **Reddit ban** (drive-by-marketer perception)                               | Mandatory 3–4 week warm-up; 90/10 discipline; read every sidebar; no sockpuppets.                                                                                 |
| **Positioning doesn't convert**                                             | Single-channel-first launch tests the _wedge_ before scaling the _motion_. If it fails in the most-aligned community, fix the wedge — learn from 3 posts, not 30. |
| **Free-tier abuse** (free photo CDN)                                        | Unadvertised ~5,000-photo soft ceiling; free cap already tight (90 photos).                                                                                       |
| **Tax/compliance exposure**                                                 | Paddle (Merchant of Record) removes it entirely.                                                                                                                  |
| **Underpricing from low-COGS guilt**                                        | Price anchored to value ($39/yr, inside Day One's proven band), not to hosting cost.                                                                              |
| **Email deliverability without domain**                                     | Resolved by pulling domain + DKIM into the launch milestone.                                                                                                      |
| **Neon/R2 free-tier limits**                                                | Metadata-only DB; storage overage is pennies; owner-operated backups already exist.                                                                               |

---

## 7. What Success Looks Like (Pure B)

Not hockey-stick. A trickle that compounds:

- **Near-term:** founding-member cohort converts; billing + domain + free-tier
  enforcement shipped; warm-up completed in one travel sub.
- **6 months:** first non-network paying users from community posts + early SEO;
  the wedge is validated or corrected based on real conversion.
- **12 months:** SEO pages ranking and compounding; a steady low-effort inflow
  from product-share virality + reactive community mentions; sustainable side
  income with near-zero marginal cost and near-zero ongoing time cost.

The whole plan is built to be run by one low-profile person, indefinitely, at
$0-ish infrastructure cost — which is exactly what "pure B" asked for.
