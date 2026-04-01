# Don Sosa Coach · Memberships

## Modelo actual

Mientras el producto todavía no tiene login real, la membresía se resuelve por `viewerId`.

- El frontend crea un `client id` persistente en `localStorage`.
- Ese id se manda al backend en `x-don-sosa-client-id`.
- El backend resuelve plan, entitlements, perfiles vinculados y uso mensual de IA contra ese `viewerId`.

Cuando exista auth real, el reemplazo natural es:

- `viewerId` temporal en beta/dev
- `userId` real para cuentas autenticadas

La arquitectura ya separa:

- `plan`
- `status`
- `source`
- `billingProvider`
- ids de Stripe

## Planes

### Free

- hasta 2 perfiles guardados
- hasta 30 partidas por perfil
- hasta 1 rol por bloque de coaching
- hasta 6 corridas mensuales de coaching IA

### Pro Player

- US$5/mes
- hasta 8 perfiles guardados
- hasta 1000 partidas por perfil
- hasta 2 roles por bloque de coaching
- hasta 60 corridas mensuales de coaching IA
- hasta 16 corridas premium

### Pro Coach

- US$20/mes
- hasta 40 perfiles guardados
- hasta 1000 partidas por perfil
- hasta 30 jugadores gestionables
- workspace de coach habilitado
- hasta 240 corridas mensuales de coaching IA
- hasta 80 corridas premium

## Enforcements actuales

Backend:

- límite de perfiles vinculados por viewer
- límite de partidas por perfil
- límite de roles por bloque de coaching
- límite mensual de coaching IA por viewer
- datasets capados según plan al leer snapshots existentes

Frontend:

- selects y quick actions adaptados al plan
- plan actual visible
- upgrades visibles
- tool de cambio de plan en dev

## Activación en dev

Variables:

- `MEMBERSHIP_DEV_TOOLS=true`
- `STRIPE_SECRET_KEY=` opcional por ahora
- `STRIPE_WEBHOOK_SECRET=` opcional por ahora

Endpoint para cambiar plan en dev:

- `POST /api/membership/dev/plan`

Body:

```json
{
  "planId": "free"
}
```

o

```json
{
  "planId": "pro_player"
}
```

o

```json
{
  "planId": "pro_coach"
}
```

La web ya lo usa automáticamente cuando `MEMBERSHIP_DEV_TOOLS` está activo.

## Base para Stripe

Ya existe:

- catálogo de planes con `stripeProductKey` y `stripePriceLookupKey`
- account store con campos de Stripe
- endpoint placeholder:
  - `POST /api/membership/billing/checkout-session`

Falta para cerrar Stripe real:

- crear checkout session
- webhook para sincronizar subscription status
- migrar de `viewerId` a `userId` autenticado cuando exista login
