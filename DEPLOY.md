# TaskTimeline Pro — Deployment & Revenue Guide

## Quick Deploy to Vercel (Recommended)

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial TaskTimeline Pro SaaS"
git push origin main
```

### 2. Deploy on Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Add environment variables (see below)
4. Click Deploy

### 3. Set Up Stripe
1. Create a Stripe account at https://stripe.com
2. In Stripe Dashboard → Products → Create:
   - **Pro Monthly** — $19/month recurring
   - **Team Monthly** — $49/month recurring  
   - **Business Monthly** — $199/month recurring
3. Copy the Price IDs for each product

### 4. Configure Environment Variables in Vercel
```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
JWT_SECRET=<generate with: openssl rand -base64 32>
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_TEAM_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
```

### 5. Set Up Stripe Webhook
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

### 6. Custom Domain
1. Buy domain at Namecheap/Cloudflare (~$10/year)
2. Add in Vercel → Settings → Domains
3. Update `NEXT_PUBLIC_APP_URL`

---

## Revenue Path to $10,000/Month

### Pricing
| Plan | Price | Monthly Subscribers Needed |
|------|-------|---------------------------|
| Pro | $19/mo | ~528 for $10K alone |
| Team | $49/mo | ~204 for $10K alone |
| Business | $199/mo | ~51 for $10K alone |

### Realistic Mix Target (Month 6+)
- 250 Pro subscribers: $4,750
- 60 Team subscribers: $2,940
- 25 Business subscribers: $4,975
- **Total: $12,665/month** ✓

### Growth Strategy (Months 1-6)

**Month 1-2: Foundation**
- Post on Product Hunt (free, massive reach)
- List on AppSumo for lifetime deals (gets you 500+ users fast)
- Post on r/projectmanagement, r/entrepreneur, r/SaaS
- Write 5 SEO articles: "Gantt chart template", "project timeline tool", etc.

**Month 3-4: Distribution**
- Cold email project managers at startups (Find via LinkedIn)
- Create a YouTube tutorial showing the product
- Submit to SaaS directories: AlternativeTo, SaaSHub, G2, Capterra
- Affiliate program: 30% recurring commission

**Month 5-6: Scale**
- Run Google Ads targeting "gantt chart software" ($500/mo budget)
- Partner with freelancers/agencies who need client reporting
- Build integrations (Slack, Jira, GitHub) to increase stickiness

### Key Metrics to Track
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Churn rate (target <5%/month)
- Trial-to-paid conversion (target >15%)

---

## Database Note
The app uses SQLite (`data/tasktimeline.db`). For Vercel:
- Use a persistent database service: PlanetScale, Turso, or Neon
- Or deploy to a VPS (DigitalOcean $6/mo) where SQLite works perfectly

For VPS deployment:
```bash
# On Ubuntu VPS
npm install -g pm2
npm install && npm run build
pm2 start npm --name "tasktimeline" -- start
pm2 save && pm2 startup
# Use nginx as reverse proxy on port 80/443
```
