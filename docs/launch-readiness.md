# Don Sosa Coach · Launch Readiness

This checklist is the shortest practical bridge between a strong technical beta and a product that can index, bill and grow with fewer launch mistakes.

## 1. Commercial launch blockers

- Use a real custom domain before pushing SEO work hard.
- Move persistence to PostgreSQL only. Do not rely on JSON fallback for paid users.
- Disable `MEMBERSHIP_DEV_TOOLS` and `DEV_EXPOSE_RESET_TOKEN` in production.
- Configure Stripe live keys, a live webhook secret and a tested customer portal.
- Validate subscription lifecycle handling for `past_due`, failed invoices, cancellations and recoveries.
- Ship real support ownership: support email, billing contact flow and refund policy.
- Apply for and obtain a Riot production key before broad public acquisition.

## 2. Billing and memberships

- Create live Stripe products and recurring prices for `pro_player` and `pro_coach`.
- Verify webhook delivery against the production endpoint and confirm subscription state sync.
- Test the full lifecycle in live mode with a low-price internal plan:
  - checkout
  - successful renewal
  - payment failure
  - cancellation
  - billing portal self-serve changes
- Add internal logging for webhook events and failed reconciliation attempts.
- Decide refund, grace-period and delinquency policy before launch.

## 3. SEO and discoverability

- Set `VITE_SITE_URL` to the final custom domain before every production build.
- Keep `robots.txt`, `sitemap.xml`, `privacy.html`, `terms.html` and `og-card.svg` generated from launch config, not edited by hand.
- Register the domain in Google Search Console and submit the sitemap.
- Add at least 6 to 10 indexable acquisition pages outside the app shell:
  - role pages
  - champion pages
  - matchup pages
  - coaching for rank bracket pages
- Publish consistent titles, descriptions, canonical URLs and internal linking on those pages.

## 4. Legal and ops

- Confirm invoicing model in Argentina with your accountant before first live charges.
- Define who the seller is: person or legal entity.
- Define jurisdiction, refund language and support SLA in the public terms.
- Confirm how exported digital services and subscription revenue should be invoiced in your case.
- Maintain a deletion/support workflow for account-linked gameplay data.

## 5. Growth loops

- Product loop:
  - better insight
  - saved profile
  - return after next match block
  - visible progress
  - upgrade for continuity and higher limits
- Coach loop:
  - coach invites player
  - player syncs account
  - coach reviews trend
  - player improves
  - coach keeps roster inside the product
- Content loop:
  - extract anonymized insights
  - publish role/champion content
  - rank for that intent
  - convert readers into analysis users

## 6. Operating rhythm for first 30 days

- Week 1: launch with a small, warm audience and manual support.
- Week 2: instrument churn, failed payments, activation and first-value time.
- Week 3: publish SEO landing pages and 3 to 5 shareable review posts per week.
- Week 4: tighten onboarding, retention prompts and upgrade triggers based on real drop-offs.
