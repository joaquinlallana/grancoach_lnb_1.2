# Roadmap — Fantasy LNB

**Estado actual (2026-05-15):** Backend MVP **completo**. Frontend MVP **completo y jugable**. Auditoría completa con 11 bugs corregidos en la auditoría original + 4 bugs adicionales corregidos en la v1.3. **Reglamento oficial aplicado** (Art. II posiciones, Art. V transferencias). **112 tests automatizados passing**. **365 jugadores con posiciones reales** y precios calculados por valoración real (FIBA EFF) de la temporada 2024-25 (sincronizada vía api-basketball).
**Próximo objetivo:** ScoringService tests + E2E frontend + deploy.

---

## Tabla de contenidos

1. [Resumen ejecutivo](#resumen-ejecutivo)
2. [Fase 1 — Backend MVP ✅ COMPLETADA](#fase-1--backend-mvp--completada)
3. [Fase 2.1 — Frontend MVP ✅ COMPLETADA](#fase-21--frontend-mvp--completada)
4. [Fase 2.2 — Auditoría completa ✅ COMPLETADA](#fase-22--auditoría-completa--completada)
5. [Fase 2.3 — Tests + Datos reales](#fase-23--tests--datos-reales)
6. [Fase 2.4 — Reglamento oficial v1.3 ✅ COMPLETADA](#fase-24--reglamento-oficial-v13--completada)
7. [Fase 3 — Pulido + Producción](#fase-3--pulido--producción)
8. [Problemas conocidos](#problemas-conocidos)
9. [Timeline estimado](#timeline-estimado)
10. [Criterios de éxito](#criterios-de-éxito-mvp-jugable)

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

**Lo que falta para "production-ready":**

1. **Tests de ScoringService** — falta cubrir las vistas SQL (×2, ×1, ×0.5, penalizaciones acumuladas).
2. **Tests E2E frontend** — Playwright/Cypress con DB sembrada.
3. **Documentación API (Swagger)** — útil para integradores.
4. **Deploy + monitorización** — Render/Vercel + Sentry.

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

## Fase 3 — Pulido + Producción

### 3.1 Notificaciones

- [ ] `nodemailer` para email de bienvenida, confirmación de transferencia, resumen de jornada.

### 3.2 Historial detallado

- [ ] `GET /api/fantasy-team/history/scores`.
- [ ] `GET /api/players/:id/history` — stats históricas del jugador.
- [ ] Frontend: gráficos de evolución de puntos por jornada.

### 3.3 UI mejorada

- [ ] Mobile-first refinement, breakpoints (480/768/1024).
- [ ] Comparativa head-to-head entre usuarios.
- [ ] Dark mode polishing.
- [ ] Drag-and-drop en LineupGrid para asignar slots.

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
| **2.3.3** | Swagger | 1 día | 🟡 Opcional |
| **3** | Notificaciones, ligas, UI mejorada, deploy | 2-3 semanas | 🔴 Futuro |

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

## Notas

- Las **triggers** de la BD hacen mucho del trabajo. El backend ahora valida de forma **redundante** las reglas críticas (presupuesto, jornada activa, posiciones en lineup) para mejorar la UX con mensajes descriptivos.
- Las **vistas SQL** calculan puntos. El backend solo consulta.
- `TESTING_CRON=true` es para desarrollo. En producción, usar un cron real (1 run/día).
- Para actualizar precios cuando se sincronicen nuevas stats: `node BACKEND/src/scripts/updatePricesFromDB.js`.
- Para asignar posiciones a jugadores nuevos: agregar al map en `updatePlayerPositions.js` y re-ejecutar.
- Todos los cambios de la auditoría 2026-05-10 y v1.3 son **retro-compatibles** con clientes existentes.
