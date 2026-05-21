# Roadmap — Fantasy LNB

**Estado actual (2026-05-21):** Backend MVP **completo**. Frontend MVP **completo y jugable** con **vista táctica de cancha + drag-and-drop**. **Smart-buy backend** (asignación automática titular/banco). **Sistema de emails** (bienvenida, mercado, lineup, apertura/cierre de ventana, ranking semanal). **Reglamento oficial aplicado** (Art. II posiciones, Art. V transferencias). **112 tests automatizados passing**. **365 jugadores con posiciones reales** y precios calculados por valoración real (FIBA EFF).
**Próximo objetivo:** Configurar SMTP en producción + tests E2E + ScoringService tests + deploy.

---

## Tabla de contenidos

1. [Resumen ejecutivo](#resumen-ejecutivo)
2. [Fase 1 — Backend MVP ✅ COMPLETADA](#fase-1--backend-mvp--completada)
3. [Fase 2.1 — Frontend MVP ✅ COMPLETADA](#fase-21--frontend-mvp--completada)
4. [Fase 2.2 — Auditoría completa ✅ COMPLETADA](#fase-22--auditoría-completa--completada)
5. [Fase 2.3 — Tests + Datos reales](#fase-23--tests--datos-reales)
6. [Fase 2.4 — Reglamento oficial v1.3 ✅ COMPLETADA](#fase-24--reglamento-oficial-v13--completada)
7. [Fase 2.5 — UX táctica + Smart-buy + Emails v1.4 ✅ COMPLETADA](#fase-25--ux-táctica--smart-buy--emails-v14--completada)
8. [Fase 3 — Pulido + Producción](#fase-3--pulido--producción)
9. [Problemas conocidos](#problemas-conocidos)
10. [Timeline estimado](#timeline-estimado)
11. [Criterios de éxito](#criterios-de-éxito-mvp-jugable)
12. [Camino al lanzamiento](#camino-al-lanzamiento)

---

## Resumen ejecutivo

El **backend** y el **frontend** ya tienen todo lo necesario para que el juego sea jugable de punta a punta:

✅ Autenticación JWT con expiración detectada cliente-side.
✅ Mercado con compra/venta/transferencia, validaciones de presupuesto, jornada y penalización correcta (Art. V: 2 transferencias gratis por jornada).
✅ Alineaciones con validación estricta de posiciones (Art. II: 1 B + 1 E + 1 A + 1 AP + 1 P como titulares; banco con ≥2 perimetrales + ≥2 internos + 1 comodín).
✅ Configuración inicial detectada (sin snapshots = sin penalizaciones), evita penalizar las primeras compras del usuario.
✅ Scoring automático por vistas SQL (capitán ×2, titular ×1, suplente ×0.5, −20 por transferencia extra).
✅ Rankings global y por jornada con campos correctos en frontend.
✅ **Posiciones reales** asignadas a 365 jugadores LNB 2024-25 (base/escolta/alero/ala-pivot/pivot).
✅ **Precios basados en valoración FIBA real** (datos de la tabla `estadisticas` poblada desde api-basketball).
✅ Sincronización con api-basketball (rate-limited, plan free).
✅ Panel admin (sync, advance-week) con permisos `es_admin` correctamente verificados.
✅ **Smart-buy backend (v1.4)**: cada compra entra como titular si hay cupo y la posición está libre; si no, va al banco automáticamente. El frontend informa la ubicación en el toast.
✅ **Vista táctica de cancha (v1.4)**: media-cancha con slots por posición, drag-and-drop con `@dnd-kit` para mover jugadores entre titular ↔ banco, validación de posición al soltar, swap atómico cuando el slot destino está ocupado.
✅ **Notificaciones email (v1.4, nodemailer)**: bienvenida, cambios de mercado (compra/venta/transferencia), actualización de lineup, apertura/cierre de ventana de transferencias, y resumen semanal de ranking (cron Lunes 00:00 UTC). Activado por flag `EMAILS_ENABLED`.
✅ **Normalización defensiva en frontend**: equipos rotos con >5 titulares o duplicados de posición se auto-arreglan al cargar Mi Equipo (excedentes pasan al banco + toast pidiendo guardar).
✅ **Slots vacíos accionables**: cada slot sin jugador es un botón que lleva a `/market?posicion=<pos>` con el filtro pre-aplicado.

**Lo que falta para "production-ready":**

1. **SMTP de producción** — definir proveedor (SES/SendGrid/Mailgun/Postmark) y setear credenciales.
2. **Tests de ScoringService** — falta cubrir las vistas SQL (×2, ×1, ×0.5, penalizaciones acumuladas).
3. **Tests E2E frontend** — Playwright/Cypress con DB sembrada.
4. **Documentación API (Swagger)** — útil para integradores.
5. **Deploy + monitorización** — Render/Vercel + Sentry/Better Stack.
6. **Cron real de stats** — reemplazar `TESTING_CRON` por un cron diario en producción.
7. **Migración de datos** para equipos existentes (auto-normalize ya cubre la mayoría de los casos al cargar).

---

## Fase 1 — Backend MVP ✅ COMPLETADA

### 1.1 Endpoints admin ✅

Implementado en [BACKEND/src/controllers/AdminController.js](BACKEND/src/controllers/AdminController.js) y [BACKEND/src/routes/admin.js](BACKEND/src/routes/admin.js). Protegido por JWT + middleware `isAdmin`.

- [x] `GET /api/admin/api-status`
- [x] `GET /api/admin/leagues/search`
- [x] `POST /api/admin/sync/teams`
- [x] `POST /api/admin/sync/players`
- [x] `POST /api/admin/sync/games`
- [x] `POST /api/admin/sync/games/:gameApiId/stats`
- [x] `POST /api/admin/sync/all-stats`
- [x] `POST /api/admin/sync/all`
- [x] `POST /api/gameweeks/admin/advance-week`

### 1.2 Datos iniciales (seed) ✅

- [x] **38 jornadas creadas** vía [BACKEND/migrations/create_38_jornadas.sql](BACKEND/migrations/create_38_jornadas.sql).
- [x] **Equipos y jugadores sincronizables** desde api-basketball (`POST /api/admin/sync/all`).
- [x] **Stats sintéticas** vía [BACKEND/scripts/generateRealisticStats.js](BACKEND/scripts/generateRealisticStats.js).
- [x] **Stats reales 2024-25 sincronizadas** — 8.620 registros, 431 partidos, 200 jugadores con datos completos.

### 1.3 Carga progresiva de stats ✅

Implementado en `ProgressiveStatsLoaderService` con cron opcional (`TESTING_CRON=true`).

### 1.4 Sistema de simulación de jornadas ✅

`POST /api/gameweeks/admin/advance-week` cierra la actual y activa la siguiente.

### 1.5 Auth de admin ✅

- [x] Columna `es_admin BOOLEAN` en `usuarios`.
- [x] Token JWT incluye `es_admin`.
- [x] Middleware `isAdmin` aplicado a **todas** las rutas admin (incluyendo POST/PATCH de gameweeks, corregido en auditoría 2026-05-10).

### 1.6 Bugs críticos resueltos ✅

7 bugs originales (rankings, penalización, race en `changePassword`, ON CONFLICT con índices parciales, rate-limit api-basketball, alineación mínima, transacciones).

---

## Fase 2.1 — Frontend MVP ✅ COMPLETADA

**Stack final:** React 18 + Vite 5 + TailwindCSS 3 + React Router 6 + TanStack Query v5 + Zustand 4 + Axios + React Hook Form 7.

### Páginas implementadas

- [x] **Landing** — home pública.
- [x] **Login / Register** — JWT en localStorage, validación de form.
- [x] **Dashboard** — nombre de equipo, presupuesto, ranking actual, jornada vigente, últimos puntajes.
- [x] **Mercado** — tabla paginada con filtros (posición, equipo LNB, búsqueda); botones Comprar/Vender; bloqueo si mercado cerrado.
- [x] **Mi equipo** — roster con slots por posición (Art. II), toggle titular/suplente con validación de duplicados, asignar capitán, validaciones de banco.
- [x] **Ranking** — tabla paginada con highlight al usuario logueado, medallas top-3.
- [x] **PlayerDetail** — stats recientes y puntos fantasy del jugador.
- [x] **Admin** — sync con api-basketball, advance-week.

### Flujo de usuario validado

```
register → dashboard → mercado (comprar 10) → lineup (5 titulares por posición + capitán)
       → admin avanza jornada → puntos calculados → ranking actualizado
```

---

## Fase 2.2 — Auditoría completa ✅ COMPLETADA

Realizada el **2026-05-10**. Resultado: **11 bugs detectados, 11 resueltos**.

Ver detalle en:
- [ANALISIS_ERRORES.md](ANALISIS_ERRORES.md) — descripción de cada bug.
- [RESUMEN_EJECUTIVO.md](RESUMEN_EJECUTIVO.md) — resumen visual.

Bugs resueltos por capa:
- **Backend / lógica:** 7 (de los originales).
- **Backend / seguridad:** 1 nuevo (rutas gameweeks sin `isAdmin`).
- **Frontend / UX:** 3 nuevos (token expirado, PlayerCard, Register payload).

---

## Fase 2.3 — Tests + Datos reales

### 2.3.1 Tests ✅ AMPLIADO

**112 tests passing — 5 suites** (ver [DOCUMENTACION_TESTS.md](DOCUMENTACION_TESTS.md)).

- [x] `BACKEND/tests/auth.test.js` — registro, login, health (8 tests).
- [x] `BACKEND/tests/market.test.js` — buy, sell, transfer, penalizaciones, **configuración inicial** (38 tests, +4 nuevos).
- [x] `BACKEND/tests/lineup.test.js` — capitán, alineación mínima, validaciones HTTP, **validación de posiciones** (26 tests, +6 nuevos).
- [x] `BACKEND/tests/gameweeks.test.js` — isAdmin en 8 rutas de jornadas (24 tests).
- [x] `BACKEND/tests/errorHandler.test.js` — mapeo PG→HTTP, createError (17 tests).
- [ ] `BACKEND/tests/scoring.test.js` — multiplicadores (×2 capitán, ×1 titular, ×0.5 suplente), penalizaciones, ranking. Requiere mocks más complejos de vistas SQL.
- [ ] `BACKEND/tests/integration.test.js` — flujo end-to-end con DB de testing real.
- [ ] Frontend E2E — Playwright o Cypress (requiere DB con datos sembrados).
- [ ] `FRONTEND` — Vitest + React Testing Library para componentes críticos (LineupGrid, useAuth).

### 2.3.2 Posiciones reales y precios ✅ COMPLETADO

- [x] **Posiciones reales asignadas a 365 jugadores** vía [BACKEND/src/scripts/updatePlayerPositions.js](BACKEND/src/scripts/updatePlayerPositions.js). Investigación en latinbasket.com + conocimiento de la liga. Distribución final realista: 101 aleros / 92 bases / 82 escoltas / 49 ala-pivots / 41 pivots.
- [x] **Precios basados en valoración real (FIBA EFF)** vía [BACKEND/src/scripts/updatePricesFromDB.js](BACKEND/src/scripts/updatePricesFromDB.js). Usa la tabla `estadisticas` ya poblada con la temporada 2024-25 (431 partidos, 200 jugadores con datos). Fórmula: `precio = CLAMP(1_000_000 + valoracion * 800_000, 6_500_000, 18_000_000)`. Precio común para jugadores sin stats: $6.5M.
- [x] **Script de respaldo** [BACKEND/src/scripts/updatePlayerPrices.js](BACKEND/src/scripts/updatePlayerPrices.js) con datos estimados de 2023-24 (legacy, no se usa cuando los stats están sincronizados).

### 2.3.3 Documentación API (Swagger) 🟡 OPCIONAL

```bash
npm install swagger-ui-express swagger-jsdoc
```

- [ ] Spec OpenAPI 3.0 en `BACKEND/src/swagger/openapi.yaml`.
- [ ] Endpoint `GET /api-docs` con UI interactiva.

---

## Fase 2.4 — Reglamento oficial v1.3 ✅ COMPLETADA

Realizada el **2026-05-15** tras la publicación del [Reglamento Oficial](Reglamento%20Oficial-%20GranCoachLNB.txt).

### Cambios aplicados según reglamento

**Art. II — Despliegue Táctico:**
- [x] Validación estricta: titulares deben tener exactamente 1 jugador por posición (Base, Escolta, Alero, Ala-Pivot, Pivot).
- [x] Banco: ≥2 perimetrales (B/E/A) + ≥2 internos (AP/P) + 1 comodín.
- [x] Implementado en [LineupService.updateLineup](BACKEND/src/services/LineupService.js) — solo se valida cuando el plantel tiene 10 jugadores.
- [x] Frontend ([LineupGrid.jsx](FRONTEND/src/components/team/LineupGrid.jsx)) muestra slots por posición con colores distintivos. Bloquea poner dos titulares de la misma posición.

**Art. V — Operaciones de Mercado:**
- [x] **2 transferencias gratis por jornada** (antes había 1, ahora alineado con reglamento). Constante en [MarketService.js](BACKEND/src/services/MarketService.js).
- [x] Penalización −20 puntos por transferencia extra (sin cambios, ya funcionaba).

### Bugs adicionales resueltos en v1.3

1. **Ranking no mostraba puntajes** — campos del backend (`equipo_nombre`, `usuario`, `puntos_totales`) no coincidían con los del frontend (`nombre_equipo`, `nombre_usuario`, `total_puntos`). Corregido en [RankingTable.jsx](FRONTEND/src/components/rankings/RankingTable.jsx) y [Rankings.jsx](FRONTEND/src/pages/Rankings.jsx).
2. **Penalización incorrecta al armar plantilla inicial** — al registrar un usuario nuevo, sus primeras 10 compras se contaban como transferencias normales y penalizaban a partir de la tercera. Corregido: detecta "configuración inicial" mirando `lineup_snapshots` (si no hay snapshots = primera vez = sin penalizaciones). Aplicado consistentemente en `buyPlayer`, `sellPlayer` y `transferPlayer` vía helper `debePenalizar()`.
3. **Snapshots de lineup no se capturaban para todos los equipos** — el SQL ya estaba bien, pero los equipos creados después del lineup-lock no tenían snapshot. Corregido al re-ejecutar `guardar_lineup` con `ON CONFLICT DO NOTHING`.
4. **Posiciones todas como "base"** — la API solo devuelve 3 categorías (G/F/C), así que casi todos quedaban como base. Resuelto con investigación manual + script de actualización.

---

## Fase 2.5 — UX táctica + Smart-buy + Emails v1.4 ✅ COMPLETADA

Realizada el **2026-05-21**. Iteración de jugabilidad guiada por feedback de usuario.

### Cambios principales

**Vista táctica de cancha** (reemplaza `LineupGrid` por `CourtView`):
- [x] Media-cancha SVG stylized (paint + aro + tablero + arco de 3pt). Diseño simplificado tras varias iteraciones para priorizar claridad sobre realismo FIBA.
- [x] 5 slots posicionales sobre la cancha (Base abajo, Pivot arriba, Alero izq, Escolta der, Ala-Pivot zona alta).
- [x] Banco como columna izquierda fija (no más scroll vertical).
- [x] Chip de jugador compacto: apellido + posición + acciones (capitán, vender). Nombre completo, equipo, precio y puntos en el tooltip on-hover.
- [x] Capitán con corona dorada visible + ring amarillo en el chip.
- [x] **Drag-and-drop con `@dnd-kit`**: arrastrar entre banco y cancha. Valida posición al soltar. Si el slot destino está ocupado, hace **swap atómico** entre los dos jugadores (mismo posición). `PointerSensor` con `activationConstraint: { distance: 6 }` evita conflictos con clicks en botones.
- [x] Botón de venta en cada chip (confirma antes de ejecutar).
- [x] **Slots vacíos = botón "Comprar"** con icono de carrito → `navigate('/market?posicion=<pos>')`. El Market lee `?posicion=` de URL al inicializar filtros.

**Smart-buy en backend** (`MarketService.buyPlayer`):
- [x] Antes del INSERT consulta el roster actual y decide `es_titular`:
  - Hay 5 titulares → suplente
  - Ya hay un titular de la misma posición → suplente
  - Caso contrario → titular
- [x] Devuelve `esTitular` en el response; el hook `useBuyPlayer` muestra "agregado como titular ⭐" o "suplente 🪑".
- [x] Eliminado el workaround anterior en `useBuyPlayer` (que hacía `updateLineup` después de cada compra).
- [x] Tests de market actualizados (`setupBuy` ahora mockea la query del roster). **112 tests siguen passing.**

**Normalización defensiva al cargar Mi Equipo** (`MyTeam.jsx` → `normalizeLineup`):
- [x] Garantiza máx 1 titular por posición y máx 5 titulares.
- [x] Si la DB tiene un equipo en estado inválido (por bugs previos), los excedentes pasan al banco y se muestra un toast pidiendo guardar.
- [x] Resuelve casos como "6/5 titulares con 4 chips visibles" donde antes había jugadores fantasma.

**Sistema de notificaciones email** (`EmailService` + `nodemailer`):
- [x] `BACKEND/src/services/EmailService.js`: transporter SMTP + 6 plantillas HTML.
  - `sendWelcome(user, teamName)` — al registrar.
  - `sendMarketChange(user, tipo, player, penalizada, presupuesto)` — buy/sell/transfer.
  - `sendLineupUpdate(user)` — al guardar alineación.
  - `sendWindowOpen(users)` / `sendWindowClose(users)` — al abrir/cerrar jornada.
  - `sendWeekendRanking(users, generalRanking, weeklyRanking)` — Lunes 00:00 UTC.
- [x] `BACKEND/src/cron/emailScheduler.js` — cron Lunes 00:00 UTC (Sunday 21:00 ARG).
- [x] Fire-and-forget en todos los puntos de invocación (no bloquea respuestas HTTP).
- [x] Activado por flag `EMAILS_ENABLED=true` (en `.env`). Variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FRONTEND_URL.

### Bugs resueltos en v1.4

1. **Cada compra entraba como titular** → smart-buy.
2. **Aleros (y otros duplicados) invisibles en el court** — el render por posición solo mostraba el primero. Resuelto con smart-buy + normalización defensiva.
3. **Counter 6/5 con 4 chips visibles** — consecuencia del bug anterior; resuelto.
4. **Botón de capitán no funcionaba** — los listeners de drag interceptaban los clicks. Resuelto con `activationConstraint` + `stopPropagation` en el contenedor de botones.
5. **Icono de corona no cambiaba color al ser capitán** — se aplicaba clase de `bg-*` a un SVG; cambiado a `text-yellow-400` + `fill="currentColor"`.
6. **Chip del Base se recortaba** — `overflow-hidden` + `top: 85%` lo empujaba fuera. Resuelto con `top: 78%` y removiendo `overflow-hidden`.
7. **Línea de 3 puntos no concéntrica con el aro** — radio y straight-segments recalculados para que `(200-44)² + (62-26)² = 160²`.
8. **Filtro de posiciones en Market no funcionaba** — el hook `usePositions` traía valores con casing diferente al de la DB. Hardcodeado.
9. **Tooltip no mostraba el equipo LNB** — buscaba `nombre_equipo`/`equipo` pero la API devuelve `equipo_nombre`. Añadido al fallback.

### Archivos clave nuevos / modificados

| Archivo | Tipo |
|---|---|
| `BACKEND/src/services/EmailService.js` | NUEVO |
| `BACKEND/src/cron/emailScheduler.js` | NUEVO |
| `BACKEND/src/services/MarketService.js` | Smart-buy |
| `BACKEND/src/services/AuthService.js` | Hook de email de bienvenida |
| `BACKEND/src/services/LineupService.js` | Hook de email de lineup |
| `BACKEND/src/controllers/GameweekController.js` | Hooks de email window open/close |
| `BACKEND/src/repositories/UserRepository.js` | `findAllActive()` para emails masivos |
| `BACKEND/src/repositories/RankingRepository.js` | `getLastClosedWeekRanking()` para email semanal |
| `BACKEND/.env.example` | SMTP + EMAILS_ENABLED + FRONTEND_URL |
| `BACKEND/tests/market.test.js` | `setupBuy` mockea query de roster |
| `FRONTEND/src/components/team/CourtView.jsx` | NUEVO (reemplaza LineupGrid) |
| `FRONTEND/src/components/team/PlayerChip.jsx` | NUEVO |
| `FRONTEND/src/pages/MyTeam.jsx` | `normalizeLineup` + handlers swap/sell |
| `FRONTEND/src/pages/Market.jsx` | Lee `?posicion=` de URL |
| `FRONTEND/src/hooks/useMarket.js` | `useBuyPlayer` simplificado |
| `FRONTEND/src/components/market/PlayerFilters.jsx` | Posiciones hardcodeadas |
| `FRONTEND/package.json` | `@dnd-kit/core`, `@dnd-kit/utilities` |

---

## Fase 3 — Pulido + Producción

### 3.1 Notificaciones ✅ COMPLETADO (v1.4)

- [x] `nodemailer` para email de bienvenida, confirmación de mercado, lineup actualizado, apertura/cierre de ventana, resumen semanal de ranking. Activado por `EMAILS_ENABLED=true`.
- [ ] **Para producción**: definir proveedor SMTP (SES / SendGrid / Mailgun / Postmark) y configurar credenciales reales.
- [ ] Plantillas HTML responsive más pulidas (las actuales son funcionales pero básicas).
- [ ] Permitir al usuario opt-out de cada tipo de email desde `/profile`.

### 3.2 Historial detallado

- [ ] `GET /api/fantasy-team/history/scores`.
- [ ] `GET /api/players/:id/history` — stats históricas del jugador.
- [ ] Frontend: gráficos de evolución de puntos por jornada.

### 3.3 UI mejorada

- [x] **Drag-and-drop en Mi Equipo** ✅ (v1.4, `@dnd-kit`).
- [x] **Vista táctica de cancha** ✅ (v1.4).
- [x] **Slots vacíos accionables** ✅ (v1.4, llevan a Market con filtro).
- [ ] Mobile-first refinement de la cancha (en viewports < 480px el banco lateral compite con la cancha).
- [ ] Comparativa head-to-head entre usuarios.
- [ ] Dark mode polishing.
- [ ] Drag-and-drop también dentro del banco (reordenar suplentes).

### 3.4 Ligas privadas

- [ ] Tabla `ligas`, invitaciones, rankings por liga, panel de admin de liga.

### 3.5 Deploy + monitorización

- [ ] Render / Railway / Fly.io para backend.
- [ ] Vercel / Netlify para frontend.
- [ ] Cron diario de sync (no `TESTING_CRON`).
- [ ] Sentry / Better Stack para errores y métricas.
- [ ] CI/CD con GitHub Actions (tests + deploy).

---

## Problemas conocidos

### Posiciones genéricas en sync futuro

api-basketball.com no expone posiciones detalladas para la LNB; al sincronizar jugadores nuevos siguen entrando como `base`. Mitigación actual: ejecutar `updatePlayerPositions.js` después de cada sync. Mejora futura: panel admin para editar masivamente.

### Stats sólo disponibles para 200 de 365 jugadores

Los 165 jugadores sin stats reciben "precio común" (~$6.5M). Esto es esperado para jugadores que no jugaron mucho o no figuran en `estadisticas`. No es un bug, es una consecuencia de los datos reales.

### Cobertura de tests — ScoringService y E2E pendientes

`MarketService`, `LineupService` y rutas admin ya están cubiertos (112 tests). Faltan `ScoringService` (vistas SQL) y tests E2E frontend. Riesgo medio de regresiones al tocar las vistas de puntuación.

### Cuota de api-basketball

Plan free: 100 req/día y 10 req/min. Una sincronización completa de stats (38 jornadas × ~4 partidos × 1 req) puede agotar la cuota. Mitigación actual: `ProgressiveStatsLoaderService` con rate-limit interno + cron espaciado.

---

## Timeline estimado

| Fase | Tareas | Duración | Estado |
|------|--------|----------|--------|
| **1** | Backend MVP, sync, admin, jornadas, stats | ~3 semanas | ✅ Completada |
| **2.1** | Frontend MVP (auth + dashboard + mercado + ranking) | 2-3 semanas | ✅ Completada |
| **2.2** | Auditoría completa + fix de bugs | 1 semana | ✅ Completada (2026-05-10) |
| **2.3.1** | Tests backend (112 passing, falta scoring+E2E) | 1 semana | 🟡 Parcial |
| **2.3.2** | Posiciones/precios reales | 2-3 días | ✅ Completada (2026-05-15) |
| **2.4** | Reglamento oficial v1.3 aplicado + bugs ranking | 1 día | ✅ Completada (2026-05-15) |
| **2.5** | UX táctica (cancha + DnD) + Smart-buy + Emails (v1.4) | 1 semana | ✅ Completada (2026-05-21) |
| **2.3.3** | Swagger | 1 día | 🟡 Opcional |
| **3.1** | SMTP de producción + opt-out de emails | 2-3 días | 🟡 Pendiente |
| **3.2** | Historial detallado + gráficos | 1 semana | 🔴 Futuro |
| **3.3** | UI mejorada (mobile, head-to-head, dark mode) | 1 semana | 🔴 Futuro |
| **3.4** | Ligas privadas | 1-2 semanas | 🔴 Futuro |
| **3.5** | Deploy + monitorización + CI/CD | 1 semana | 🔴 Futuro (bloqueante de lanzamiento) |

---

## Criterios de éxito (MVP jugable)

✅ **Backend:**
1. Usuario puede registrarse y obtener equipo con $100M.
2. Sistema valida todas las transacciones por trigger + servicio (presupuesto, límites, jornada cerrada, penalizaciones).
3. Configuración inicial detectada (sin snapshots) → sin penalizaciones espurias.
4. Lineup validado contra el reglamento: 1 jugador por posición en titulares + ≥2 perim y ≥2 int en banco.
5. Stats cargadas → puntos calculados automáticamente por las vistas SQL.
6. Capitán ×2, titular ×1, suplente ×0.5, penalización −20 por transferencia extra (umbral `> 2`).
7. Admin puede sincronizar datos y avanzar jornadas. Endpoints admin rechazan no-admin.

✅ **Frontend:**
1. Usuario registra, navega galería, compra 10 jugadores, arma lineup, ve ranking.
2. Datos se actualizan al cerrar jornada.
3. Validaciones replicadas en cliente con feedback visual claro (slots por posición, advertencias de banco).
4. Manejo de token expirado pre-request.
5. Mensajes diferenciados (mercado cerrado vs sin fondos).
6. Ranking muestra correctamente nombres, usuarios y puntajes.

🔴 **Pendiente para "production-ready":**
1. Tests automatizados con coverage ≥ 80% (faltan ScoringService + E2E).
2. Deploy + monitorización.

---

## Camino al lanzamiento

### 🟢 Mínimo viable para abrir a usuarios reales (~1-2 semanas)

Bloqueantes reales para lanzar:

1. **Proveedor SMTP en producción** — definir uno (SES, SendGrid, Mailgun, Postmark) y configurar SPF/DKIM/DMARC del dominio. Setear `EMAILS_ENABLED=true` con credenciales reales en el host. Probar deliverability (Gmail, Outlook).
2. **Deploy del backend** — Render / Railway / Fly.io. Configurar variables de entorno (DB, JWT_SECRET, SMTP, API_BASKETBALL_KEY, CORS_ORIGIN). Habilitar HTTPS.
3. **Deploy del frontend** — Vercel / Netlify. Setear `VITE_API_URL` apuntando al backend desplegado.
4. **Cron diario de stats en producción** — reemplazar `TESTING_CRON=true` por un cron real (1 ejecución/día) que llame a `ProgressiveStatsLoaderService` respetando la cuota de api-basketball (100 req/día).
5. **Monitorización mínima** — Sentry o Better Stack para errores backend/frontend. Logs estructurados (pino/winston).
6. **Política de privacidad + términos** — texto legal mínimo, link en el footer del Landing y del email de bienvenida.

### 🟡 Mejoras importantes pre-marketing (~2-3 semanas adicionales)

Lo que vale la pena tener antes de hacer campaña/invitar muchos usuarios:

7. **Tests E2E** con Playwright o Cypress (register → buy → lineup → advance-week → ranking) — protege contra regresiones en cada deploy.
8. **Tests de ScoringService** — cubrir las vistas SQL (×2 capitán, ×1 titular, ×0.5 suplente, penalizaciones acumuladas). Riesgo medio sin esto.
9. **Mobile-first refinement** — la cancha con banco lateral funciona en desktop pero se aprieta en pantallas < 480px.
10. **Recuperar contraseña** (`POST /api/auth/forgot-password` + `POST /api/auth/reset-password` con token por email — el sistema de email ya está armado, falta el endpoint).
11. **Opt-out de emails** desde `/profile` (granular por tipo: bienvenida fija, resto opcional).
12. **Onboarding del primer login** — tour interactivo con los pasos de "comprar 10 jugadores → armar lineup → esperar la jornada".

### 🔵 Crecimiento (post-launch)

13. **Ligas privadas** (`ligas` + invitaciones + ranking por liga). Es el feature que más engagement genera.
14. **Comparativa head-to-head** entre dos usuarios (puntajes por jornada lado a lado).
15. **Historial gráfico** del usuario (evolución de puntos, ranking, presupuesto).
16. **Notificaciones push** (PWA) — alternativa/complemento al email.
17. **App mobile nativa** (React Native con el mismo backend) — feature largo plazo.
18. **Mercado de transferencias entre usuarios** — feature avanzado, requiere rediseño del sistema económico.

### 📋 Checklist de "Día 0" (al hacer el deploy)

- [ ] Backup de la DB de desarrollo (por las dudas).
- [ ] DB de producción restaurada desde dump limpio + 8 migraciones + 38 jornadas.
- [ ] Variables de entorno seteadas en el host (no `.env` commiteado).
- [ ] `JWT_SECRET` regenerado (32+ chars aleatorios, distinto al de dev).
- [ ] `CORS_ORIGIN` apuntando al dominio final del frontend.
- [ ] `EMAILS_ENABLED=true` + credenciales SMTP de producción.
- [ ] Cron diario de stats configurado (no `TESTING_CRON`).
- [ ] Al menos 1 usuario admin creado (`UPDATE usuarios SET es_admin = true WHERE email = '...';`).
- [ ] Smoke test manual: register → login → buy → lineup → ver email de bienvenida → admin advance-week → ranking actualizado.
- [ ] Health check público (`GET /health`) verificado desde fuera del host.
- [ ] Sentry / Better Stack capturando errores.

---

## Notas

- Las **triggers** de la BD hacen mucho del trabajo. El backend ahora valida de forma **redundante** las reglas críticas (presupuesto, jornada activa, posiciones en lineup) para mejorar la UX con mensajes descriptivos.
- Las **vistas SQL** calculan puntos. El backend solo consulta.
- `TESTING_CRON=true` es para desarrollo. En producción, usar un cron real (1 run/día).
- Para actualizar precios cuando se sincronicen nuevas stats: `node BACKEND/src/scripts/updatePricesFromDB.js`.
- Para asignar posiciones a jugadores nuevos: agregar al map en `updatePlayerPositions.js` y re-ejecutar.
- Todos los cambios de la auditoría 2026-05-10 y v1.3 son **retro-compatibles** con clientes existentes.
