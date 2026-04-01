# Prompts de Ejecucion para Don Sosa Coach

Este documento deja prompts listos para pegar en Codex y avanzar el proyecto por fases sin perder consistencia tecnica ni de producto.

## Orden recomendado

1. Soporte global de servidores y regiones
2. Cuentas de usuario, perfiles persistentes y ownership de datos
3. Membresias y limites de producto
4. Area profesional para coaches
5. Refinamiento del motor de coaching
6. UX, estetica y pequeños puntos de friccion

## Prompt 1: Soporte global de servidores

```text
Quiero que extiendas Don Sosa Coach para que funcione bien con cualquier servidor soportado por Riot, no solo los que hoy usamos mas. Esto incluye EUW, EUNE, KR, NA, LAS, LAN, BR, JP, OCE, TR, RU y cualquier otro que sea razonable soportar con routing oficial de Riot.

Trabajá directo en el repo actual y resolvelo end-to-end.

Objetivo:
- Permitir que cualquier usuario cargue su cuenta desde cualquier region/plataforma valida de Riot.
- Evitar hardcodes locales o supuestos de Latinoamerica.
- Mantener compatibilidad con el sistema actual de snapshots, caching, coaching, patch context y UI.

Quiero que primero investigues el estado actual del proyecto y detectes:
- donde asumimos regiones o platforms de forma rigida
- donde el backend depende de un platform routing concreto
- donde el frontend limita las regiones disponibles o usa labels pobres
- que parte del conocimiento o del coaching necesita distinguir entre region, platform routing y locale

Luego implementá una solucion completa con estas condiciones:
- separación clara entre locale de UI e infraestructura de region/plataforma de Riot
- validación robusta de inputs para gameName, tagLine y region/platform
- defaults inteligentes pero no ocultos
- mensajes de error claros
- compatibilidad con cuentas nuevas y con perfiles ya guardados

Entregables:
- cambios de backend
- cambios de frontend
- migraciones o ajustes de storage si hacen falta
- documentación corta del nuevo modelo region/platform/locale

Validación:
- build de api y web
- prueba local con al menos dos regiones distintas
- sin romper el flujo actual
```

## Prompt 2: Cuentas de usuario, login y perfiles persistentes

```text
Quiero que conviertas Don Sosa Coach en un producto con cuentas reales de usuario.

Trabajá sobre el repo actual y proponé primero una arquitectura concreta, pero después implementá todo lo posible de punta a punta.

Objetivo:
- que cualquier usuario pueda registrarse, iniciar sesión y cerrar sesión
- que tenga un perfil propio
- que sus cuentas de LoL y sus analíticas queden asociadas a su usuario
- que los datos persistan entre dispositivos

Alcance minimo esperado:
- registro con email y contraseña
- login seguro
- sesión persistente
- logout
- modelo de usuario y perfil
- ownership de snapshots, coaching generations y perfiles guardados
- base para futuros planes de suscripción

Restricciones:
- no rompas la posibilidad de seguir usando el producto localmente en desarrollo
- no metas seguridad a medias: hash de passwords, validaciones y flows limpios
- no dupliques storage si puede evitarse

Quiero que primero revises:
- stack actual del backend y la base
- cómo se guardan hoy profiles, coaching generations y feedback
- cuál es la mejor estrategia para migrar a un modelo user-owned

Después implementá:
- backend auth
- frontend auth
- vistas mínimas de cuenta
- asociación entre usuario y perfiles de LoL

Además dejá preparado:
- seeds o defaults para desarrollo
- documentación corta de env vars nuevas
- pasos de deploy en Render

Validación:
- registro/login/logout funcionando
- un usuario no puede ver datos privados de otro
- build api y web ok
```

## Prompt 3: Membresias, plan gratis y plan pago

```text
Quiero que diseñes e implementes el sistema de membresías completo para Don Sosa Coach.

Planes:
- Free
- Pro Player: 5 USD por mes
- Pro Coach: 20 USD por mes

Necesito que resuelvas producto, backend y frontend de forma coherente.

Objetivo:
- que exista un modelo de plan y entitlement claro
- que el plan gratis tenga límites reales
- que el plan Pro Player desbloquee el producto completo para un jugador
- que el plan Pro Coach prepare el terreno para gestionar jugadores

Quiero que definas una propuesta concreta de límites, por ejemplo:
- cantidad de partidas almacenables
- profundidad histórica
- coaching IA o frecuencia
- features premium

Pero no te quedes en la propuesta: implementá todo lo posible.

Condiciones:
- los límites deben quedar centralizados, no desperdigados por el código
- el sistema tiene que ser extensible
- si todavía no querés integrar cobro real, igual dejá la arquitectura lista para Stripe

Entregables:
- modelo de planes y entitlements
- enforcement backend
- UI de plan actual y upgrades
- documentación de cómo activar/desactivar planes en dev
- base para billing futura

Validación:
- usuario free limitado de verdad
- usuario pro con más capacidad y sin fricción rara
- build api y web ok
```

## Prompt 4: Area profesional para coaches

```text
Quiero crear el area profesional para coaches dentro de Don Sosa Coach. Esto no es solo una vista nueva: tiene que sentirse como una herramienta soñada para coaching profesional.

Trabajá sobre el repo actual y diseñá primero la estructura, pero implementá una primera versión real y usable.

Objetivo:
- que un coach pueda tener su propia cuenta profesional
- que pueda cargar o invitar jugadores
- que vea sus perfiles, historial, coaching, progreso y puntos de atención
- que tenga una vista clara para preparar sesiones y seguimiento

Quiero que pienses este módulo como producto B2B liviano:
- dashboard de jugadores
- estado de cada jugador
- últimos cambios en su muestra
- foco actual del coaching
- alertas por campeones, patch, deterioro o mejora
- acceso rápido a review queue y últimas partidas

No quiero una sección genérica. Quiero una base sólida para:
- llevar varios jugadores
- detectar quién empeoró o mejoró
- preparar una clase rápido
- tener contexto antes de abrir una sesión

Entregables:
- modelo de coach y relación coach-jugador
- backend y permisos
- primera UI usable del coach workspace
- preparación para plan Pro Coach de 20 USD

Validación:
- el coach ve solo sus jugadores
- el jugador común no ve pantallas de coach
- builds ok
```

## Prompt 5: Refinar el motor de coaching

```text
Quiero que refines el motor de coaching de Don Sosa Coach para que sea más profundo, más útil y menos genérico, sin disparar innecesariamente el gasto de tokens.

Objetivo:
- mejorar la lectura fina del juego
- aprender más conocimiento profundo de LoL
- interpretar mejor los datos
- seguir respetando el parche actual
- evitar recomputaciones inútiles

Quiero que primero audites:
- qué datos tenemos hoy y cuáles ya no estamos aprovechando bien
- qué aspectos del análisis todavía son demasiado superficiales
- dónde el coaching sigue siendo demasiado genérico
- cómo podríamos introducir más memoria de progreso del jugador

Después implementá mejoras concretas. Algunas líneas posibles:
- detección más fina de progreso entre bloques
- mejores resúmenes de cambio real
- mayor uso de señales por rol, fase y champion identity
- mejores heurísticas de review
- mejor priorización de leaks
- más conocimiento curado y mejor retrieval

Restricciones:
- no aumentar el uso de OpenAI porque sí
- preferir cálculo estructurado local cuando tenga sentido
- usar OpenAI solo donde realmente agregue valor

Entregables:
- mejoras reales del motor
- explicación breve de qué cambió y por qué
- validación de costo aproximado si aplica
```

## Prompt 6: UX y estetica premium

```text
Quiero una pasada fuerte de UX y estética para que Don Sosa Coach se sienta un producto premium, minimalista y muy cuidado.

No quiero una rediseñada vacía. Quiero mejoras concretas que suban claridad, jerarquía visual y calidad percibida.

Objetivo:
- pulir inputs, filtros, estados vacíos, badges, spacing, tipografía y microdetalles
- mantener el look minimalista
- mejorar el flujo principal
- eliminar cualquier mezcla rara de idioma o textos toscos

Quiero que revises especialmente:
- home principal
- formulario de cuenta de LoL
- placeholder del tag con #
- consistencia de labels
- estados de carga, cache, coaching progresivo y errores
- navegación entre pestañas

Y resolvé también este problema de producto:
- cuando ya hay por ejemplo 94 partidas cargadas y juego una nueva, no quiero que el sistema solo me deje pedir 100
- diseñá la mejor UX para esto
- puede incluir opciones como cargar 1, completar hasta 100, cargar 5, cargar 10, o detectar automáticamente faltantes

No te quedes solo en la UI. Si hace falta tocar backend para que la experiencia sea correcta, hacelo.

Validación:
- build web ok
- experiencia más clara y más elegante
- menos fricción para actualizar muestras parcialmente
```

## Prompt 7: Prompt maestro para una pasada de producto completa

```text
Quiero que hagas una pasada completa de product hardening sobre Don Sosa Coach.

Meta:
- global regions
- auth y cuentas
- membresías
- area de coaches
- refinamiento del motor de coaching
- UX premium y menor fricción

Trabajá por fases, pero no me devuelvas solo un plan. Quiero implementación real y validación continua.

Forma de trabajo esperada:
1. auditá el estado actual del repo y detectá dependencias críticas
2. proponé una secuencia de implementación segura
3. ejecutá la primera fase completa
4. validá build y comportamiento
5. seguí con la siguiente fase

Condiciones no negociables:
- no romper el flujo actual
- mantener soporte para patch-aware coaching
- no gastar tokens innecesarios
- reutilizar snapshots y coaching previo siempre que sea posible
- conservar una sola lengua por sesión según locale

Cada vez que cierres una fase, quiero:
- qué cambiaste
- qué validaste
- qué riesgo queda
- cuál es la siguiente mejor fase
```

## Consejo practico

Para avanzar mejor, usá primero los prompts 1, 2 y 6. Eso te da base global, cuentas reales y una experiencia mucho más sólida antes de entrar fuerte en memberships y coaches.
