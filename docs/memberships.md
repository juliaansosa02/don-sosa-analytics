# Don Sosa Coach · Accounts, Memberships and Billing

## Mental model

The product now separates four layers clearly:

- `user`: the real account that signs up and logs in
- `role`: `user`, `coach`, or `admin`
- `membership`: `free`, `pro_player`, or `pro_coach`
- `billing status`: `active`, `trialing`, `past_due`, `canceled`, or `inactive`

Effective access is resolved from role + membership entitlements.

Admins always get full effective access, even if their underlying subscription is lower.

## Plans

### Free

- up to 2 saved Riot profiles
- up to 30 stored matches per profile
- 1 coaching role per AI block
- 6 AI coaching runs per month

### Pro Player

- US$5/month
- up to 8 saved Riot profiles
- up to 1000 stored matches per profile
- 2 coaching roles per AI block
- 60 AI coaching runs per month
- 16 premium AI runs per month

### Pro Coach

- US$20/month
- up to 40 saved Riot profiles
- up to 1000 stored matches per profile
- up to 30 managed players
- coach workspace enabled
- 240 AI coaching runs per month
- 80 premium AI runs per month

## Roles

### user

- normal player account
- can use the app according to membership entitlements

### coach

- same as user, plus coach roster
- can link players by account email
- can inspect/manage assigned players in the coach workspace base

### admin

- full product access
- can inspect users
- can change roles
- can change plans
- can impersonate users
- effective entitlements are treated as `pro_coach`

## Storage model

Auth and coach workspace are persisted in:

- file storage under `apps/api/data/auth/` in local/dev fallback
- PostgreSQL tables when `DATABASE_URL` exists

Main records:

- `auth_users`
- `auth_sessions`
- `auth_password_reset_tokens`
- `coach_player_assignments`

Membership state is persisted separately and linked to the authenticated subject:

- anonymous beta/dev subject: client-based viewer id
- authenticated subject: `user:<userId>`

On signup/login, anonymous viewer state is migrated into the authenticated subject for:

- memberships
- AI coaching usage/cache

## Auth flow

Implemented:

- signup
- login
- logout
- cookie session
- password reset request
- password reset confirm
- password change

Session cookie envs:

- `SESSION_COOKIE_NAME`
- `SESSION_TTL_DAYS`

Password reset envs:

- `PASSWORD_RESET_TTL_MINUTES`
- `DEV_EXPOSE_RESET_TOKEN`

## Admin bootstrap in dev or production

You can seed two initial admin accounts through env:

- `ADMIN_1_EMAIL`
- `ADMIN_1_PASSWORD`
- `ADMIN_1_NAME`
- `ADMIN_2_EMAIL`
- `ADMIN_2_PASSWORD`
- `ADMIN_2_NAME`

At API startup, these accounts are created if missing and forced to:

- role `admin`
- membership `pro_coach`

## Stripe

The architecture is ready for real subscription billing and already includes:

- checkout session creation
- billing portal session creation
- Stripe webhook route
- subscription sync into membership storage

Required envs:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_BASE_URL`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`

Important:

- checkout is only used for paid plans
- Stripe customer and subscription ids are stored on the membership account
- webhook updates membership status and Stripe metadata

## Dev controls

If `MEMBERSHIP_DEV_TOOLS=true`, the UI and API can switch plans without real billing for local testing.

This is useful to validate:

- free limits
- pro player capacity
- pro coach roster flow
- admin override behavior

## Main routes

Auth:

- `GET /api/auth/me`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/password/request-reset`
- `POST /api/auth/password/reset`
- `POST /api/auth/password/change`

Admin:

- `GET /api/admin/users`
- `POST /api/admin/users/:userId/role`
- `POST /api/admin/users/:userId/plan`
- `POST /api/admin/impersonate`
- `POST /api/admin/impersonate/stop`

Coach:

- `GET /api/coach/players`
- `POST /api/coach/players`
- `DELETE /api/coach/players/:playerUserId`

Billing:

- `POST /api/billing/checkout-session`
- `POST /api/billing/portal-session`
- `POST /api/billing/webhook/stripe`

## Local validation checklist

1. Build API and web.
2. Sign up a new user.
3. Log out and log back in.
4. Request a reset token in dev and reset the password.
5. Confirm free limits are enforced.
6. Switch to `pro_player` in dev or Stripe and confirm higher capacity.
7. Switch to `pro_coach` and confirm coach roster works.
8. Sign in as admin and confirm:
   - user list
   - role changes
   - plan changes
   - impersonation
