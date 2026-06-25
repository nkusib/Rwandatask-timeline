# TaskTimeline Pro — SaaS Project Management Tool

> Visual Gantt-style project timelines with Stripe subscriptions, team collaboration, and auth. Built to generate $10,000+/month in recurring revenue.

**Landing page (live NOW):** https://nkusib.github.io/TasktimelineSaaS/
**Free demo app (live NOW):** https://nkusib.github.io/TasktimelineSaaS/app.html

---

## ⚡ Get Your First Payment in 10 Minutes

The landing page is **live right now.** To turn the "email us" CTAs into real one-click payments:

```bash
# Clone and run the setup script
git clone https://github.com/nkusib/TasktimelineSaaS
cd TasktimelineSaaS
bash setup.sh
```

The script walks you through either:
- **PayPal.me** (2 min — just need a PayPal account)
- **Stripe Payment Links** (10 min — full recurring subscriptions)

After running `setup.sh`, visitors can pay immediately. No server deployment needed.

---

## 5-Step Revenue Activation Checklist

### Step 1: Enable GitHub Pages (2 min — makes landing page live NOW)
1. Go to this repo → **Settings → Pages**
2. Source: **GitHub Actions**
3. Click Save → your landing page deploys automatically to `https://nkusib.github.io/TasktimelineSaaS/`

### Step 2: Set up Stripe (10 min)
1. Sign up at https://stripe.com (free)
2. **Products → Create product** three times:
   - **TaskTimeline Pro** — $19/month recurring
   - **TaskTimeline Team** — $49/month recurring  
   - **TaskTimeline Business** — $199/month recurring
3. For each product, create a **Payment Link** (Stripe Dashboard → Payment Links)
4. Copy the 3 Payment Link URLs

### Step 3: Update landing.html with Payment Links (2 min)
Replace these placeholders in `landing.html`:
```
REPLACE_WITH_STRIPE_PAYMENT_LINK_PRO    → your $19 payment link
REPLACE_WITH_STRIPE_PAYMENT_LINK_TEAM   → your $49 payment link
REPLACE_WITH_STRIPE_PAYMENT_LINK_BUSINESS → your $199 payment link
```
Push to main → GitHub Actions redeploys automatically.

### Step 4: Deploy the full SaaS backend (20 min)
**Option A — Vercel (recommended, free tier)**
```bash
# Add these secrets to GitHub: Settings → Secrets → Actions
VERCEL_TOKEN        = (from vercel.com/account/tokens)
JWT_SECRET          = (run: openssl rand -base64 32)
STRIPE_SECRET_KEY   = sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
STRIPE_WEBHOOK_SECRET = whsec_... (from Stripe → Developers → Webhooks)
STRIPE_PRO_MONTHLY_PRICE_ID = price_...
STRIPE_TEAM_MONTHLY_PRICE_ID = price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID = price_...
NEXT_PUBLIC_APP_URL = https://your-vercel-url.vercel.app
```
Then push to main — GitHub Actions deploys automatically via `.github/workflows/deploy.yml`.

**Option B — VPS ($6/mo DigitalOcean)**
```bash
git clone https://github.com/nkusib/TasktimelineSaaS
cd TasktimelineSaaS
cp .env.example .env   # fill in your values
npm install && npm run build
npx pm2 start npm --name tasktimeline -- start
# Install nginx, point to port 3000, add SSL via certbot
```

**Option C — Docker**
```bash
cp .env.example .env   # fill in values
docker-compose up -d
```

### Step 5: Drive traffic (day 1)
1. **Product Hunt** — post at 12:01am PST Tuesday/Wednesday
2. **Reddit** — post in r/projectmanagement, r/entrepreneur, r/SaaS
3. **Cold email** — search LinkedIn for "project manager" + message 50 people with free trial offer
4. **Directories** — submit to AlternativeTo, SaaSHub, Capterra (free listings)

---

## Revenue Math

| Plan | Price | Subscribers for $10K |
|------|-------|----------------------|
| Pro  | $19/mo | 527 |
| Team | $49/mo | 205 |
| Business | $199/mo | 51 |

**Realistic Month 6 mix:** 250 Pro + 60 Team + 25 Business = **$12,665 MRR**

---

## Tech Stack
- **Next.js 16** — React framework with App Router
- **SQLite** via better-sqlite3 — zero-config database, runs anywhere
- **Stripe** — subscriptions, webhooks, customer portal
- **JWT** — auth with 30-day sessions
- **Tailwind CSS** — utility-first styling
- **TypeScript** — type safety throughout

## Features
- Landing page with pricing, testimonials, demo
- User registration + login + JWT sessions
- Dashboard with project stats and progress
- Gantt timeline board with drag-to-edit tasks
- Task CRUD with status tracking
- CSV export, shareable links
- Plan enforcement (free: 1 project / 10 tasks)
- Upgrade prompts + Stripe checkout
- Customer billing portal
- Stripe webhook handler for subscription lifecycle

## Local Development
```bash
npm install
cp .env.example .env.local  # fill in JWT_SECRET at minimum
npm run dev                  # http://localhost:3000
```
