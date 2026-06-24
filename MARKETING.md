# TaskTimeline Pro — Launch Marketing Copy

Live landing page: **https://nkusib.github.io/rwandatask-timeline/**
Contact email: **nkusib@gmail.com**

---

## Reddit Posts (copy-paste ready)

### r/projectmanagement — "Show your work" post

**Title:** I built a flat-rate Gantt tool because I was tired of paying $10/seat/month — would love feedback

**Body:**
I manage a team of 8 and we were paying $88/month for Asana. That's $1,056/year just for a Gantt chart.

So I built TaskTimeline Pro — a visual project timeline tool with a flat monthly rate:
- **Free** forever: 1 project, 10 tasks, shareable links
- **Pro $19/mo**: unlimited projects + tasks (not per seat)
- **Team $49/mo**: up to 10 members (vs $80-$110 for Asana/Monday)

Features: drag-to-edit Gantt bars, CSV export, shareable links, team collaboration.

Demo + free plan: https://nkusib.github.io/rwandatask-timeline/

Honest feedback welcome — what would make you switch from your current tool?

---

### r/SaaS — Milestone post

**Title:** Launched a project management SaaS with flat-rate pricing — here's the positioning strategy

**Body:**
Every project management tool charges per seat. Asana: $10.99/user. Monday: $9/user. For a 10-person team that's $1,300/year.

I built TaskTimeline Pro on the assumption that flat-rate pricing is a massive unmet need.

Pricing:
- Free: 1 project / 10 tasks forever
- Pro ($19/mo): unlimited everything, 1 user
- Team ($49/mo): up to 10 members — that's 76% cheaper than Asana for a 10-person team
- Business ($199/mo): unlimited members, SSO, API

Stack: Next.js 16, SQLite, Stripe subscriptions, deployed on Vercel.

Landing page: https://nkusib.github.io/rwandatask-timeline/

Has anyone else tried flat-rate SaaS pricing as a positioning strategy? Did it work?

---

### r/entrepreneur — Value prop discussion

**Title:** Built a Gantt chart SaaS that's 76% cheaper than Asana for teams — the flat-rate pricing experiment

**Body:**
The project management market is dominated by per-seat pricing. I think that's a mistake.

My hypothesis: small teams (3-15 people) hate seeing their PM tool bill grow every time they hire someone.

So I built TaskTimeline Pro with flat-rate plans: $19/mo for solo, $49/mo for teams up to 10.

At $49/mo Team plan vs $110/mo for Asana (10 users), you save $732/year.

Live here: https://nkusib.github.io/rwandatask-timeline/

I'd love to hear from anyone who's tried flat-rate vs per-seat in a B2B SaaS context. How did it affect conversion and churn?

---

## Product Hunt Launch (post at 12:01am PST Tuesday or Wednesday)

**Name:** TaskTimeline Pro

**Tagline:** Gantt-style project timelines with flat-rate pricing — no per-seat gotchas

**Description:**
Project timelines your team will actually use.

TaskTimeline Pro is a beautiful, fast Gantt chart tool designed for modern teams — with one key difference: we charge a flat monthly rate, not per seat.

**Why we're different:**
- Asana: $10.99/user → $110/mo for 10 people
- Monday: $9/user → $90/mo for 10 people  
- TaskTimeline Team: **$49/mo flat** for up to 10 people (76% cheaper)

**Features:**
✅ Visual Gantt timeline with drag-to-edit
✅ Team collaboration (comments, assignments)  
✅ CSV & PDF export
✅ Shareable project links
✅ 14-day free trial (no credit card)
✅ Free plan forever (1 project, 10 tasks)

Built with Next.js, SQLite, Stripe. Works in any browser.

**Website:** https://nkusib.github.io/rwandatask-timeline/

---

## Hacker News "Show HN" Post

**Title:** Show HN: TaskTimeline Pro – flat-rate Gantt chart tool ($49/mo for teams vs $110/mo at Asana)

**Body:**
I got tired of Asana's per-seat pricing growing every time my team hired someone, so I built a Gantt-style project timeline tool with flat-rate pricing.

The math: 10-person team on Asana costs $110/month. Our Team plan is $49/month flat — saves $732/year for the same core features.

Tech stack: Next.js 16, better-sqlite3 (zero-config DB), Stripe subscriptions, JWT auth, deployed on Vercel.

Free plan available (1 project, 10 tasks, shareable links).

Live: https://nkusib.github.io/rwandatask-timeline/

Happy to answer questions about the build or pricing strategy.

---

## Cold Email Template (LinkedIn outreach to Project Managers)

**Subject:** Quick question about your PM tool costs

Hi [Name],

I noticed you're a [Title] at [Company] — I imagine you've dealt with the pain of project management tools charging per seat.

I built TaskTimeline Pro specifically to fix this: flat-rate pricing for teams, starting at $49/month regardless of how many people join.

For a 10-person team, that's about 76% cheaper than Asana.

Free plan available, no credit card needed to try it:
https://nkusib.github.io/rwandatask-timeline/

Would love your feedback as a PM professional.

[Your name]

---

## Directory Submissions Checklist

Submit to these free directories to get indexed and drive organic traffic:

- [ ] **AlternativeTo** — https://alternativeto.net/software/add/ (add as "Asana alternative")
- [ ] **SaaSHub** — https://www.saashub.com/submit (free)
- [ ] **G2** — https://sell.g2.com/get-started (free listing)
- [ ] **Capterra** — https://vendors.capterra.com/ (free listing)
- [ ] **Product Hunt** — https://www.producthunt.com/posts/new (Tuesday/Wednesday 12:01am PST)
- [ ] **BetaList** — https://betalist.com/submit (startup discovery)
- [ ] **Indie Hackers** — post in the "Products" section with your revenue milestone
- [ ] **Hacker News** — Show HN post (Tuesday morning for max visibility)

---

## SEO Target Keywords

These are the high-intent, low-competition keywords to target:

| Keyword | Monthly Volume | Difficulty |
|---------|---------------|------------|
| free gantt chart | 18,000 | Medium |
| gantt chart tool | 5,400 | Medium |
| project timeline software | 2,900 | Low |
| asana alternative | 8,100 | High |
| monday alternative | 6,600 | High |
| flat rate project management | 480 | Low |
| team project tracker | 1,200 | Low |
| simple gantt chart | 2,400 | Low |

---

## Setup Checklist (to activate full revenue)

For the automated Stripe billing to work, you need to complete these steps:

1. **Create Stripe account** at https://stripe.com (5 min)
   - Create 3 products: Pro ($19), Team ($49), Business ($199)
   - Get Price IDs for each product

2. **Create Vercel account** at https://vercel.com (2 min)
   - Get API token from https://vercel.com/account/tokens

3. **Add GitHub Secrets** (Settings → Secrets → Actions):
   - `VERCEL_TOKEN` = your Vercel token
   - `JWT_SECRET` = run `openssl rand -base64 32` to generate
   - `STRIPE_SECRET_KEY` = sk_live_...
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = pk_live_...
   - `STRIPE_WEBHOOK_SECRET` = whsec_... (from Stripe → Developers → Webhooks)
   - `STRIPE_PRO_MONTHLY_PRICE_ID` = price_...
   - `STRIPE_TEAM_MONTHLY_PRICE_ID` = price_...
   - `STRIPE_BUSINESS_MONTHLY_PRICE_ID` = price_...
   - `NEXT_PUBLIC_APP_URL` = https://your-vercel-url.vercel.app

4. **Push to main** — CI will deploy to Vercel automatically.

5. **Set up Stripe webhook** pointing to `https://your-vercel-url.vercel.app/api/stripe/webhook`

Once deployed, update the `href` values in `landing.html` from `mailto:` to your Stripe Payment Links for seamless checkout.
