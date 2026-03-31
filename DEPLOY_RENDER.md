# Deploy rápido en Render

## Qué ya quedó listo en el repo

- El frontend puede consumir una API configurable con `VITE_API_BASE_URL`.
- La API puede servir también el frontend compilado desde el mismo dominio.
- Hay un `render.yaml` para desplegar un solo servicio.

## Resultado esperado

Una sola URL pública, por ejemplo:

`https://don-sosa.onrender.com`

Con:

- frontend en `/`
- API en `/api`

## Paso a paso

1. Subí este repo a GitHub.
2. Entrá a Render.
3. Elegí `New +` → `Blueprint`.
4. Conectá el repo.
5. Render va a detectar `render.yaml`.
6. Creá el servicio `don-sosa`.

## Variables que tenés que cargar

- `RIOT_API_KEY`
- `RIOT_PLATFORM=la2`
- `RIOT_REGION=americas`
- `MATCH_COUNT=100`
- `RIOT_REQUEST_DELAY_MS=700`
- `RIOT_MAX_RETRIES=4`
- `DATABASE_URL` (opcional al principio, recomendado para persistencia real)

## Variables de URL

Si tu dominio final fuera otro, actualizá:

- `CORS_ORIGIN=https://tu-dominio.onrender.com`
- `VITE_API_BASE_URL=https://tu-dominio.onrender.com/api`

## Importante con la key

- La Riot key va solo en Render, nunca en el frontend.
- La development key vence rápido, así que esta beta pública te va a durar mientras esa key siga viva.
- Para algo estable, después hay que pasar a una personal key o production key aprobada por Riot.

## Persistencia real con Postgres

Si querés que los análisis queden guardados aunque cambie el navegador o Render reinicie el servicio:

1. En Render creá un `Postgres` database.
2. Copiá su `External Database URL`.
3. Pegala como `DATABASE_URL` en el servicio `don-sosa`.

Cuando `DATABASE_URL` existe, la app guarda snapshots de perfiles en Postgres. Si no existe, cae a almacenamiento por archivo, que sirve como fallback pero no es tan durable.

## Si falla al abrir la web

1. Revisá que el build haya terminado bien.
2. Revisá que `VITE_API_BASE_URL` apunte a `/api`.
3. Revisá que `CORS_ORIGIN` coincida exactamente con el dominio.
4. Revisá si la key expiró.
