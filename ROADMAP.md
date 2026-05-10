# Roadmap — Fantasy LNB

**Estado actual (2026-05-10):** Backend MVP **completo**. Frontend MVP **completo y jugable**. Auditoría completa con 11 bugs corregidos. **102 tests automatizados passing**.
**Próximo objetivo:** Datos reales (posiciones/precios) + tests de ScoringService + E2E frontend.

---

## Tabla de contenidos

1. [Resumen ejecutivo](#resumen-ejecutivo)
2. [Fase 1 — Backend MVP ✅ COMPLETADA](#fase-1--backend-mvp--completada)
3. [Fase 2.1 — Frontend MVP ✅ COMPLETADA](#fase-21--frontend-mvp--completada)
4. [Fase 2.2 — Auditoría completa ✅ COMPLETADA](#fase-22--auditoría-completa--completada)
5. [Fase 2.3 — Tests + Datos reales](#fase-23--tests--datos-reales)
6. [Fase 3 — Pulido + Producción](#fase-3--pulido--producción)
7. [Problemas conocidos](#problemas-conocidos)
8. [Timeline estimado](#timeline-estimado)
9. [Criterios de éxito](#criterios-de-éxito-mvp-jugable)

---

## Resumen ejecutivo

El **backend** y el **frontend** ya tienen todo lo necesario para que el juego sea jugable de punta a punta:

✅ Autenticación JWT con expiración detectada cliente-side.
✅ Mercado con compra/venta/transferencia, validaciones de presupuesto, jornada y penalización correcta.
✅ Alineaciones con validación de capitán único + titular obligatorio.
✅ Scoring automático por vistas SQL (capitán ×2, titular ×1, suplente ×0.5, −20 por transferencia extra).
✅ Rankings global y por jornada.
✅ Sincronización con api-basketball (rate-limited, plan free).
✅ Panel admin (sync, advance-week) con permisos `es_admin` correctamente verificados en backend y frontend.

**Lo que falta para "production-ready":**

1. **Tests automatizados** — solo `auth.test.js` cubierto (deuda principal).
2. **Datos reales** — los jugadores sincronizados quedan con `posicion='base'` y precio fijo.
3. **Documentación API (Swagger)** — útil para integradores.

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
- [x] **Mi equipo** — roster, toggle titular/suplente, asignar capitán, validaciones.
- [x] **Ranking** — tabla paginada con highlight al usuario logueado, medallas top-3.
- [x] **PlayerDetail** — stats recientes y puntos fantasy del jugador.
- [x] **Admin** — sync con api-basketball, advance-week.

### Flujo de usuario validado

```
register → dashboard → mercado (comprar 10) → lineup (5 titulares + capitán)
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

### 2.3.1 Tests ✅ PARCIALMENTE COMPLETADO

**102 tests passing — 5 suites** (ver [DOCUMENTACION_TESTS.md](../DOCUMENTACION_TESTS.md)).

- [x] `BACKEND/tests/auth.test.js` — registro, login, health (8 tests).
- [x] `BACKEND/tests/market.test.js` — buy, sell, transfer, penalizaciones (34 tests).
- [x] `BACKEND/tests/lineup.test.js` — capitán, alineación mínima, validaciones HTTP (20 tests).
- [x] `BACKEND/tests/gameweeks.test.js` — isAdmin en 8 rutas de jornadas (24 tests).
- [x] `BACKEND/tests/errorHandler.test.js` — mapeo PG→HTTP, createError (17 tests).
- [ ] `BACKEND/tests/scoring.test.js` — multiplicadores (×2 capitán, ×1 titular, ×0.5 suplente), penalizaciones, ranking. Requiere mocks más complejos de vistas SQL.
- [ ] `BACKEND/tests/integration.test.js` — flujo end-to-end con DB de testing real.
- [ ] Frontend E2E — Playwright o Cypress (requiere DB con datos sembrados).
- [ ] `FRONTEND` — Vitest + React Testing Library para componentes críticos (PlayerCard, LineupGrid, useAuth).
- [ ] E2E con Playwright (registro → comprar → lineup → ranking).

### 2.3.2 Asignar posiciones reales y precios 🔴 PENDIENTE

Hoy todos los jugadores sincronizados quedan como `posicion='base'` con precio fijo.

Estrategias posibles (a evaluar):

- [ ] Tabla manual `jugadores_overrides` con posición y precio editables vía admin.
- [ ] Endpoint `PATCH /api/admin/players/:id`.
- [ ] Reglas heurísticas: precio basado en stats acumuladas (puntos × peso, etc.).
- [ ] UI admin para edición masiva.

### 2.3.3 Documentación API (Swagger) 🟡 OPCIONAL

```bash
npm install swagger-ui-express swagger-jsdoc
```

- [ ] Spec OpenAPI 3.0 en `BACKEND/src/swagger/openapi.yaml`.
- [ ] Endpoint `GET /api-docs` con UI interactiva.

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

### Posiciones genéricas en jugadores sincronizados

api-basketball.com no expone posiciones detalladas para la LNB; todos los jugadores entran como `base`. Bloqueante para que el filtro por posición sea útil. **Solución sugerida:** mantenimiento manual desde un endpoint admin (ver §2.3.2).

### Precios fijos

Hoy hay un precio default por posición (~$9M para Base). Sin variación, no hay decisión estratégica real al armar plantilla. **Solución sugerida:** asignación manual o cálculo basado en stats agregadas.

### Cobertura de tests — ScoringService y E2E pendientes

`MarketService`, `LineupService` y rutas admin ya están cubiertos (102 tests). Faltan `ScoringService` (vistas SQL) y tests E2E frontend. Riesgo medio de regresiones al tocar las vistas de puntuación.

### Cuota de api-basketball

Plan free: 100 req/día y 10 req/min. Una sincronización completa de stats (38 jornadas × ~4 partidos × 1 req) puede agotar la cuota. Mitigación actual: `ProgressiveStatsLoaderService` con rate-limit interno + cron espaciado.

---

## Timeline estimado

| Fase | Tareas | Duración | Estado |
|------|--------|----------|--------|
| **1** | Backend MVP, sync, admin, jornadas, stats | ~3 semanas | ✅ Completada |
| **2.1** | Frontend MVP (auth + dashboard + mercado + ranking) | 2-3 semanas | ✅ Completada |
| **2.2** | Auditoría completa + fix de bugs | 1 semana | ✅ Completada (2026-05-10) |
| **2.3.1** | Tests backend (102 passing, falta scoring+E2E) | 1 semana | 🟡 Parcial (2026-05-10) |
| **2.3.2** | Posiciones/precios | 2-3 días | 🔴 Pendiente |
| **2.3.3** | Swagger | 1 día | 🟡 Opcional |
| **3** | Notificaciones, ligas, UI mejorada, deploy | 2-3 semanas | 🔴 Futuro |

---

## Criterios de éxito (MVP jugable)

✅ **Backend:**
1. Usuario puede registrarse y obtener equipo con $100M.
2. Sistema valida todas las transacciones por trigger + servicio (presupuesto, límites, jornada cerrada, penalizaciones).
3. Stats cargadas → puntos calculados automáticamente por las vistas SQL.
4. Capitán ×2, titular ×1, suplente ×0.5, penalización −20 por transferencia extra (con `>`, no `>=`).
5. Admin puede sincronizar datos y avanzar jornadas. Endpoints admin rechazan no-admin.

✅ **Frontend:**
1. Usuario registra, navega galería, compra 10 jugadores, arma lineup, ve ranking.
2. Datos se actualizan al cerrar jornada.
3. Validaciones replicadas en cliente con feedback visual claro.
4. Manejo de token expirado pre-request.
5. Mensajes diferenciados (mercado cerrado vs sin fondos).

🔴 **Pendiente para "production-ready":**
1. Tests automatizados con coverage ≥ 80%.
2. Posiciones y precios realistas para los jugadores.
3. Deploy + monitorización.

---

## Notas

- Las **triggers** de la BD hacen mucho del trabajo. El backend ahora valida de forma **redundante** las reglas críticas (presupuesto, jornada activa) para mejorar la UX con mensajes descriptivos.
- Las **vistas SQL** calculan puntos. El backend solo consulta.
- `TESTING_CRON=true` es para desarrollo. En producción, usar un cron real (1 run/día).
- Todos los cambios de la auditoría 2026-05-10 son **retro-compatibles** con clientes existentes.
