# Coach Intelligence Architecture

## Objetivo

Pasar de un sistema que lista metricas e insights a un sistema de coaching contextual, adaptativo y mantenible. La idea no es prometer una "IA mágica", sino separar con honestidad:

- conocimiento evergreen
- conocimiento dependiente de parche
- conocimiento dependiente de campeón
- conocimiento dependiente de rol
- conocimiento dependiente de elo
- conocimiento dependiente de la muestra actual del jugador

## Auditoria de la capa actual

Hoy el conocimiento del juego ya existe, pero repartido en varias capas:

- `packages/core/src/index.ts`
  - Vive el motor deterministic de señales, thresholds, review agenda, scoring de evidencia y `referenceAudit`.
  - Ya existían `evidenceStrength`, `evidenceScore`, `interpretation` y una primera capa de references internas.
- `apps/api/src/services/coachKnowledgeService.ts`
  - Fusiona contexto de rol, campeón, elo y meta.
  - Reordena problemas y construye un `diagnosis` para priorizar.
- `apps/api/data/coach-kb/identities/roles.json`
  - Define targets y sesgos por rol.
- `apps/api/data/coach-kb/identities/elos.json`
  - Define estilo de coaching y pesos por bracket.
- `apps/api/data/coach-kb/identities/champions/*.json`
  - Ya había una base de champion identity con heurísticas activas y bloqueadas por falta de telemetría.
- `apps/api/data/coach-kb/meta/patches/*.json`
  - Ya había un scaffold de meta por parche para tier/build/runes.
- `apps/api/src/services/aiCoachService.ts`
  - Convierte el contexto estructurado en coaching draft o lo envía al modelo.

## Problemas detectados en la auditoria

- No había una taxonomía explícita de errores del jugador.
- No existía una capa formal para diferenciar señal estable vs anomalía reciente.
- La adaptación de lenguaje existía, pero no como plan declarativo de lenguaje.
- La priorización de intervención estaba implícita en diagnosis, no separada como capa reusable.
- La agenda de review existía, pero no separada en `quick review`, `coach review` y `deep VOD review`.
- La capa de references no estaba versionada como registro explícito de marcos de referencia.
- La capa de meta estaba preparada, pero no expuesta como `readiness` ni como frontera honesta entre lo disponible y lo faltante.

## Arquitectura propuesta

La nueva arquitectura agrega una capa intermedia/final llamada `coach intelligence` encima de `knowledge`.

Flujo:

1. `core` produce señales, evidence meta, trends, review agenda y reference audit.
2. `coachKnowledgeService` agrega conocimiento curado de rol, campeón, elo y meta.
3. `coachIntelligenceService` transforma eso en:
   - taxonomía del problema real
   - prioridad de intervención
   - adaptación del lenguaje
   - estabilidad de señal
   - review plan en 3 capas
   - reference frames versionados
   - meta readiness
4. `aiCoachService` usa ese contexto final para draft/OpenAI.

## Piezas implementadas

### 1. Problem Taxonomy

Archivo:

- `apps/api/data/coach-kb/intelligence/problem-taxonomy.json`

Incluye una primera taxonomía viable:

- `mechanics_execution`
- `spacing_and_trading`
- `tempo_and_route_integrity`
- `reset_timing`
- `objective_setup`
- `target_selection`
- `champion_identity_execution`
- `map_rotation_connection`
- `side_lane_macro`
- `summoner_usage`
- `itemization`
- `rune_setup`
- `resource_discipline`
- `review_process`

Cada entry define:

- label/summary localizados
- banda de prioridad (`foundational`, `structural`, `advanced`)
- métricas foco
- bias por rol
- bias por arquetipo de campeón
- brackets donde aplica mejor
- señales requeridas
- prompts por profundidad de review

### 2. Reference Registry

Archivo:

- `apps/api/data/coach-kb/intelligence/reference-registry.json`

Modela referencias versionadas por scope:

- evergreen
- role
- elo
- champion
- patch
- sample

La idea es que el producto pueda explicar desde qué marco está leyendo un insight y qué upgrade necesita.

### 3. Coach Intelligence Service

Archivo:

- `apps/api/src/services/coachIntelligenceService.ts`

Responsabilidades:

- construir `languagePlan`
- mapear `topProblems` a taxonomía real/candidata/bloqueada
- clasificar estabilidad de señal
- construir cola de intervención
- generar review plan en 3 capas
- exponer reference frames
- exponer `metaReadiness`

### 4. Integración real al pipeline

Archivo:

- `apps/api/src/services/aiCoachService.ts`

Cambios:

- el contexto ahora incluye `referenceAudit`
- `buildCoachContext` ya no termina en knowledge; ahora cierra con intelligence
- el draft coach usa:
  - `interventionPlan`
  - `taxonomy`
  - `signalStability`
  - `reviewPlan`
  - `referenceFrames`
  - `metaReadiness`
- el prompt del modelo también recibió instrucciones explícitas para usar esta capa

### 5. Tipos expuestos

Archivos:

- `apps/api/src/services/coachIntelligenceSchemas.ts`
- `apps/api/src/services/aiCoachSchemas.ts`
- `apps/web/src/types.ts`

Esto deja el contrato listo para que web pueda mostrar:

- confidence real
- problema detectado vs candidato
- prioridad de intervención
- lectura estable vs anomalía
- nivel de readiness del meta

## Separación por scope

### Evergreen

- `packages/core/src/index.ts`
- `apps/api/data/coach-kb/intelligence/problem-taxonomy.json`
- partes generales de `roles.json` y `elos.json`

Ejemplos:

- tempo
- reset timing
- resource discipline
- estructura de la review

### Dependiente del parche

- `apps/api/data/coach-kb/meta/patches/*.json`
- `metaReadiness`
- `referenceFrames` con scope `patch`

Ejemplos:

- picks fuertes por parche
- builds fuertes
- runas fuertes
- systems changes

### Dependiente del campeón

- `apps/api/data/coach-kb/identities/champions/*.json`
- `referenceFrames` con scope `champion`

Ejemplos:

- win condition real
- economy profile
- map profile
- heurísticas activas y bloqueadas

### Dependiente del rol

- `apps/api/data/coach-kb/identities/roles.json`
- `referenceFrames` con scope `role`

Ejemplos:

- targets por rol
- fundamentals
- blind spots

### Dependiente del elo

- `apps/api/data/coach-kb/identities/elos.json`
- `languagePlan`
- `referenceFrames` con scope `elo`

Ejemplos:

- foco pedagógico
- tono
- complejidad permitida
- qué despriorizar cuando hay fugas fundacionales

### Dependiente de la muestra

- trends del `core`
- `referenceAudit`
- `signalStability`
- `referenceFrames` con scope `sample`

Ejemplos:

- muestra corta
- regresión reciente
- leak estable
- anomalía

## Qué ya resuelve esta versión

- Cada insight/coaching block puede vivir sobre una lógica interna de confidence y estabilidad.
- El sistema ya puede variar lenguaje según nivel.
- El sistema ya puede leer un mismo leak desde identidad de campeón distinta.
- El sistema ya puede separar detecciones medidas, proxy y bloqueadas.
- El sistema ya puede priorizar qué intervenir primero.
- El sistema ya puede proponer agenda automática de review en 3 capas.
- El sistema ya puede exponer qué referencias está usando y cuáles siguen débiles.

## Qué queda explícitamente bloqueado hoy

Sin Riot API extendida o telemetría externa más rica todavía no podemos cerrar lecturas directas de:

- ejecución mecánica fina
- spacing real frame a frame
- target selection real
- uso exacto de summoners
- itemización y runas por partida
- warding/vision timing
- position-based side lane reads

Eso ya quedó separado mediante:

- `detectionMode = blocked`
- `blockedTypes`
- champion heuristics bloqueadas
- `metaReadiness`

## Fuentes futuras recomendadas

### Para meta

- patch notes normalizadas por parche
- feed por rol con picks fuertes
- feed por campeón con builds y runas fuertes
- tendencias por parche y línea

### Para champion identity

- base curada manual por campeón
- evaluación por arquetipo reusable
- heurísticas observables por patrón de valor

### Para señal de jugador

- items/runes desde payload de match
- eventos de spell cast
- frames de posición
- eventos de wards
- objective timeline más fino

### Para premium features

- comparador de bloques
- comparación contra referencias
- evolución por parche
- alertas de regresión
- insights post-patch
- gap entre jugador y referencia por campeón/rol
- checklist VOD dinámico según tipo de leak

## Próximos pasos priorizados

1. Conectar `items_runes` al ingestion real del match para destrabar itemización y runas.
2. Ingerir position/spell telemetry para destrabar spacing, target selection y summoners.
3. Expandir champion identity coverage por pool prioritario.
4. Poblar feed de meta por parche de forma sistemática.
5. Exponer esta capa en UI con badges de confianza, estabilidad y scope de referencia.
6. Incorporar comparación de bloques y alertas de regresión como feature premium.
