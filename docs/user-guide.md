# SkipTrace User Guide

## Batch search

- Go to **Batch** (or **Batch Search**) in the navigation.
- Paste one input per line (emails, phone numbers, or "First Last" names), or upload a CSV/text file.
- Click **Run batch**. The job is queued; a worker processes it in the background.
- Results appear when the job completes. You can filter by status (success, error, not found) and export to CSV.

**Rate limits**: Batch size and monthly search limits depend on your plan. If you hit a limit, you'll see a message and a link to upgrade.

## Monitoring subscriptions

- Go to **Monitoring** in the navigation.
- Click **New Subscription** and enter the target (email, phone, or name) and check frequency (e.g. weekly).
- When changes are detected, you get an in-app notification and (if configured) an email and/or webhook.

**Workers**: Monitoring checks run in the background. Ensure the monitoring worker is running (`pnpm worker:monitoring`) and Redis is available.

## Rate limits and 429

- Searches are limited per plan (e.g. monthly and daily caps).
- When you exceed a limit, the API returns **429 Too Many Requests** and the UI shows a message with a **View plans** link to the Pricing page.
- Upgrade your plan for higher limits.

## Account and billing

- **Account**: Manage API keys, webhooks, profile, usage, and data export from the Account page.
- **Usage**: The Usage tab shows searches this month and today vs your plan limits.
- **Billing**: Use **Manage Subscription** to open the Stripe Customer Portal (update payment method, cancel, etc.). **Upgrade Plan** links to Pricing/checkout.
- **Data export**: Use **Export my data** to download your account data (JSON) for compliance or backup.
- **Delete account**: In Settings → Danger Zone, **Delete Account** permanently removes your account and all data.

## Environment and API

- For API keys, webhooks, and env vars used by the app, see the in-app API Docs and Account → API Keys / Webhooks.
- Stripe price IDs (`STRIPE_PRICE_*`) and Resend (`RESEND_API_KEY`) are configured by the operator; see README for full env list.
