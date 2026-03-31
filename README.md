# Don Sosa Analytics

Don Sosa Analytics es un starter product serio para evolucionar hacia un SaaS de analytics + coaching de League of Legends usando la Riot API.

Incluye:

- **Backend Node + TypeScript + Express**
- **Collector Riot API** con:
  - account-v1 → Riot ID a PUUID
  - match-v5 + timeline
  - champion-mastery-v4 (hook listo para extender)
  - Data Dragon para runas
- **Exports automáticos**:
  - `data.json`
  - `summary.json`
  - `matches.csv`
- **Dashboard web React** estilo SaaS con secciones:
  - Overview
  - Early Game
  - Macro
  - Consistency
  - Champion Pool
  - Coach
  - Matches
- **Motor de score** por partida:
  - lane
  - economy
  - fighting
  - macro
  - consistency
- **Motor de insights accionables**
- **Enriquecimiento de runas**:
  - nombre de runas
  - keystone
  - valores `var1`, `var2`, `var3`
  - agregado estimado de daño, curación y shielding producido por las runas seleccionadas

---

## 1. Estructura del proyecto

```bash
apps/
  api/
    src/
      analysis/
      config/
      routes/
      services/
      types/
      utils/
  web/
    src/
      app/
      components/
      features/
packages/
  core/
```

---

## 2. Requisitos

- **Node.js 20+** recomendado
- npm 10+
- Riot API Key activa en `.env`

---

## 3. Configuración

### Copiá el archivo de entorno

En la raíz:

```bash
cp .env.example .env
```

O en Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### Variables importantes

```env
RIOT_API_KEY=tu_api_key
RIOT_PLATFORM=la2
RIOT_REGION=americas
PORT=8787
CORS_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8787/api
DEFAULT_GAME_NAME=
DEFAULT_TAG_LINE=
MATCH_COUNT=30
```

> Las credenciales siguen manejándose por **env**, no quedan hardcodeadas en el código.

---

## 4. Instalación

Desde la raíz:

```bash
npm install
```

---

## 5. Levantar el proyecto

### Opción A — correr API y web por separado

Terminal 1:

```bash
npm run dev:api
```

Terminal 2:

```bash
npm run dev:web
```

- API: `http://localhost:8787`
- Web: `http://localhost:5173`

### Opción B — usar el script combinado

```bash
npm run dev
```

---

## 6. Cómo usarlo

### Desde la UI

1. Abrí `http://localhost:5173`
2. Ingresá:
   - `Riot Game Name`
   - `Tag Line`
3. Presioná **Analizar cuenta**
4. El backend:
   - resuelve PUUID
   - baja matches + timelines
   - analiza early game
   - calcula score
   - agrega insights
   - exporta JSON/CSV
5. El frontend renderiza el dashboard SaaS.

### Desde la CLI collector

Si definiste en `.env`:

- `DEFAULT_GAME_NAME`
- `DEFAULT_TAG_LINE`

Podés ejecutar:

```bash
npm run collect
```

Eso te genera archivos dentro de:

```bash
apps/api/data/output/
```

Archivos:

- `data.json`
- `summary.json`
- `matches.csv`

---

## 7. Qué hace el sistema hoy

### Overview

- WR
- score promedio
- KDA
- CS@10
- Gold@15
- tendencia de performance
- scatter de early economy

### Early Game

- CS@10
- Gold@15
- deaths pre-14
- participación temprana
- comparativa por campeón

### Macro

- macro score
- muertes cerca de objetivos
- visión como soporte de setup

### Consistency

- curva de score por partida
- foco en subir el piso de performance

### Champion Pool

Clasificación automática:

- `CORE_PICK`
- `COMFORT_TRAP`
- `POCKET_PICK`
- `UNSTABLE`

### Coach

Cada insight trae:

- hallazgo
- evidencia
- impacto
- acción concreta
- severidad

### Match Review

- score por partida
- runes damage/healing
- KDA
- CS@10
- Gold@15
- muertes tempranas

---

## 8. Qué agregué sobre runas

La capa de runas ahora hace esto:

- resuelve la runa desde Data Dragon
- guarda el nombre e icono
- conserva `var1`, `var2`, `var3`
- agrega un bloque `runeStats` por partida:

```json
{
  "totalDamageFromRunes": 0,
  "totalHealingFromRunes": 0,
  "totalShieldingFromRunes": 0,
  "keystoneValue": 0
}
```

Eso te permite evolucionar luego a:

- dashboard específico de runas
- eficiencia por keystone
- runa principal por matchup
- runa comfort vs runa óptima

---

## 9. Próximas mejoras recomendadas

### Datos y producto

- benchmark por elo / rol / champion
- separación SoloQ / Flex / normals
- filtros por patch
- comparación wins vs losses automática
- sesiones / tilt scoring más fino
- macro conversion funnel real
- objective timeline por partida
- match review con narrativa automática

### Arquitectura SaaS

- PostgreSQL para persistencia histórica
- auth multiusuario
- perfiles guardados
- refresh jobs por cuenta
- onboarding
- planes / billing
- dashboards comparativos por jugador

### Frontend

- Tailwind + sistema visual completo
- cards más premium
- filtros persistentes
- dark SaaS polished
- tabs con deep links

### Backend

- rate-limit queue
- caché por PUUID/match
- retries con backoff
- persistencia de datasets
- cron de actualización

---

## 10. Notas importantes

- La API key de Riot **no debe** estar en frontend.
- Este starter ya la deja encapsulada en backend usando `.env`.
- Si querés publicar producto real, necesitás revisar y cumplir la política del Developer Portal de Riot.

---

## 11. Build de producción

```bash
npm run build
```

---

## 12. Publicarlo para amigos

Sí: ya podés dejarlo accesible con una URL pública y sin que cada persona cargue su propia API key.

### Cómo funciona

- La Riot API key debe vivir solo en el backend.
- Tus amigos usan la web.
- La web llama a tu API desplegada.
- Nadie fuera del servidor ve ni toca la key.

### Opción más simple hoy

Usar un solo servicio Node en Render:

- `https://tu-app.onrender.com`

El repo ya trae un [`render.yaml`](./render.yaml) para desplegar una sola app:

- `don-sosa`

Ese servicio:

- sirve la API en `/api`
- sirve el frontend desde el mismo dominio
- evita problemas de CORS entre frontend y backend

### Variables a configurar en Render

En `don-sosa`:

- `RIOT_API_KEY`
- `RIOT_PLATFORM`
- `RIOT_REGION`
- `CORS_ORIGIN`
- `VITE_API_BASE_URL`
- `BETA_ACCESS_CODE` (opcional)

### CORS

`CORS_ORIGIN` acepta uno o varios orígenes separados por coma. Ejemplo:

```env
CORS_ORIGIN=https://don-sosa.onrender.com,https://tudominio.duckdns.org
```

### Dominio gratuito

La forma más fácil es usar el subdominio gratis del proveedor.

Si querés un dominio gratis propio, podés más adelante apuntar algo tipo DuckDNS al frontend, pero para una beta cerrada suele convenir mucho más arrancar con el subdominio de Render o Vercel.

### Riot y la beta con amigos

- Para una beta chica entre amigos, podés centralizar tu development key en el backend.
- No corresponde pedirles a ellos que peguen su key en la web.
- Para un producto realmente público, abierto a cualquiera, vas a necesitar una production key aprobada por Riot.
- Si querés dejarlo como beta privada mientras esperás una key mejor, definí `BETA_ACCESS_CODE` y la app va a pedir un código antes de entrar.

---

## 13. Idea de evolución a SaaS

Ruta recomendada:

1. estabilizar collector
2. guardar snapshots históricos en DB
3. agregar cuentas y login
4. agregar compare mode por período
5. introducir benchmark por elo/rol/champ
6. monetizar como coaching analytics product

---

## 14. Solución rápida de problemas

### `403 Forbidden`

- revisá la Riot API key
- verificá que no haya expirado si es development key

### `429 Rate limit`

- bajá `MATCH_COUNT`
- agregá cola con retry/backoff

### `CORS error`

- verificá `CORS_ORIGIN` en `.env`

### `Cannot analyze account`

- revisá Game Name y Tag Line exactos
- verificá región/plataforma correcta

---

## 15. Comandos útiles

```bash
npm install
npm run dev:api
npm run dev:web
npm run collect
npm run build
```
