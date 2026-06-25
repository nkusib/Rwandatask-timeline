#!/usr/bin/env bash
# TaskTimeline Pro — Payment Setup Script
# Usage: bash setup.sh
# This script updates your landing page CTAs with real payment links.

set -euo pipefail

LANDING="landing.html"
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")

echo ""
echo "=== TaskTimeline Pro Payment Setup ==="
echo ""
echo "Your landing page is live at:"
echo "  https://nkusib.github.io/TasktimelineSaaS/"
echo ""
echo "You have TWO options to start accepting payments:"
echo ""
echo "  Option A: Stripe Payment Links (recommended)"
echo "    1. Go to https://dashboard.stripe.com/payment-links (or stripe.com)"
echo "    2. Create product 'TaskTimeline Pro' at \$19/mo recurring"
echo "    3. Create product 'TaskTimeline Team' at \$49/mo recurring"
echo "    4. Create product 'TaskTimeline Business' at \$199/mo recurring"
echo "    5. For each product, click 'Create Payment Link'"
echo "    6. Copy the 3 payment link URLs (they look like https://buy.stripe.com/...)"
echo ""
echo "  Option B: PayPal.me (fastest — 2 minutes if you have PayPal)"
echo "    1. Go to https://www.paypal.com/paypalme/my/create"
echo "    2. Create your PayPal.me link"
echo "    3. Your Pro link will be: https://www.paypal.me/YOURUSERNAME/19"
echo "    4. Your Team link will be: https://www.paypal.me/YOURUSERNAME/49"
echo "    5. Your Business link will be: https://www.paypal.me/YOURUSERNAME/199"
echo ""

read -p "Choose Option A (stripe) or B (paypal): " CHOICE

case $CHOICE in
  [Aa]|stripe|Stripe|STRIPE)
    echo ""
    read -p "Paste your Stripe Pro (\$19/mo) payment link: " PRO_LINK
    read -p "Paste your Stripe Team (\$49/mo) payment link: " TEAM_LINK
    read -p "Paste your Stripe Business (\$199/mo) payment link: " BIZ_LINK
    ;;
  [Bb]|paypal|PayPal|PAYPAL)
    echo ""
    read -p "Enter your PayPal.me username (e.g. 'nkusib'): " PAYPAL_USERNAME
    PRO_LINK="https://www.paypal.me/${PAYPAL_USERNAME}/19"
    TEAM_LINK="https://www.paypal.me/${PAYPAL_USERNAME}/49"
    BIZ_LINK="https://www.paypal.me/${PAYPAL_USERNAME}/199"
    echo ""
    echo "Payment links:"
    echo "  Pro:      $PRO_LINK"
    echo "  Team:     $TEAM_LINK"
    echo "  Business: $BIZ_LINK"
    ;;
  *)
    echo "ERROR: Please enter 'stripe' or 'paypal'"
    exit 1
    ;;
esac

# Validate
if [ -z "$PRO_LINK" ] || [ -z "$TEAM_LINK" ] || [ -z "$BIZ_LINK" ]; then
  echo "ERROR: All three payment links are required."
  exit 1
fi

echo ""
echo "Updating $LANDING ..."

# Replace mailto: CTAs with real payment links
python3 - <<PYEOF
import re

with open('${LANDING}', 'r') as f:
    content = f.read()

# Replace Pro CTA
content = re.sub(
    r'href="mailto:nkusib@gmail\.com\?subject=TaskTimeline%20Pro[^"]*"',
    'href="${PRO_LINK}"',
    content
)

# Replace Team CTA
content = re.sub(
    r'href="mailto:nkusib@gmail\.com\?subject=TaskTimeline%20Team[^"]*"',
    'href="${TEAM_LINK}"',
    content
)

# Replace Business CTA
content = re.sub(
    r'href="mailto:nkusib@gmail\.com\?subject=TaskTimeline%20Business[^"]*"',
    'href="${BIZ_LINK}"',
    content
)

with open('${LANDING}', 'w') as f:
    f.write(content)

print("  Updated Pro CTA    → ${PRO_LINK}")
print("  Updated Team CTA   → ${TEAM_LINK}")
print("  Updated Biz CTA    → ${BIZ_LINK}")
PYEOF

echo ""
echo "Committing and pushing to GitHub..."
git add "$LANDING"
git commit -m "chore: activate payment links on landing page"
git push origin "$BRANCH"

echo ""
echo "=================================="
echo "  PAYMENT LINKS ARE NOW LIVE!"
echo "=================================="
echo ""
echo "  Landing page: https://nkusib.github.io/TasktimelineSaaS/"
echo "  Visitors can now click and pay directly."
echo ""
echo "Next steps:"
echo "  1. Post to Reddit (copy from MARKETING.md)"
echo "  2. Submit to ProductHunt"
echo "  3. Share on LinkedIn/Twitter"
echo ""
echo "  For automated Stripe webhooks + full app, see DEPLOY.md"
echo ""
