# Tutorial rápido para correr Don Sosa Analytics

## Paso 1
Instalá dependencias:

```bash
npm install
```

## Paso 2
Copiá el archivo de entorno:

```bash
cp .env.example .env
```

## Paso 3
Poné tu Riot API key en `.env`.

## Paso 4
Levantá la API:

```bash
npm run dev:api
```

## Paso 5
Levantá el frontend:

```bash
npm run dev:web
```

## Paso 6
Entrá a:

```text
http://localhost:5173
```

## Paso 7
Ingresá tu Riot ID y ejecutá el análisis.

## Paso 8
Revisá los archivos exportados en:

```text
apps/api/data/output/
```

