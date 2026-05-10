# Estado del Proyecto — Gran Coach LNB Fantasy

> **Fecha de actualización:** 2026-05-05
> **Estado general:** ~80% backend MVP completo. Frontend pendiente.

---

## 1. Tabla de estado por componente

| Componente | Estado | Detalle |
|------------|--------|---------|
| Base de datos PostgreSQL | ✅ 100% | Schema completo, triggers, vistas, FKs. DB: `grancoach_lnb` |
| Autenticación (JWT + admin) | ✅ 100% | Registro, login, perfil, cambio de password, columna `es_admin` |
| API REST | ✅ 95% | 6 grupos de rutas montadas; falta documentación Swagger |
| Endpoints admin (`/api/admin`) | ✅ 100% | `AdminController` + `routes/admin.js` con sync de equipos/jugadores/partidos/stats |
| Sincronización con api-basketball | ✅ 95% | `SyncService` + `ApiBasketballService` con rate-limit y reintentos |
| Carga progresiva de stats | ✅ 100% | `ProgressiveStatsLoaderService` (1 req / 6s) + cron opcional |
| Datos seed (jornadas + equipos + jugadores) | ✅ 80% | 38 jornadas vía migración. Equipos y jugadores sincronizables. Posiciones reales y precios siguen como pendiente manual |
| Mercado (compra/venta/transfer) | ✅ 100% | Validaciones por triggers + lógica de penalización corregida |
| Scoring (puntos fantasy) | ✅ 100% | Vistas de DB calculan puntos automáticamente |
| Rankings | ✅ 100% | General y por jornada funcionando |
| Tests | 🔴 10% | Solo `auth.test.js`. Falta cobertura de market, lineup, scoring, admin |
| Frontend | 🔴 0% | No iniciado |
| Documentación API (Swagger) | 🔴 0% | No iniciado |

---

## 2. Componentes implementados desde la última revisión

- **`src/controllers/AdminController.js`** + **`src/routes/admin.js`** — endpoints protegidos por JWT + `isAdmin`:
  - `GET /api/admin/api-status` — cuota api-basketball.
  - `GET /api/admin/leagues/search` — buscar `leagueId` por nombre.
  - `POST /api/admin/sync/teams|players|games|all` — sincronización por entidad o completa.
  - `POST /api/admin/sync/games/:gameApiId/stats` — stats de un partido.
  - `POST /api/admin/sync/all-stats` — stats de todos los partidos finalizados.
- **`src/services/ProgressiveStatsLoaderService.js`** — carga rate-limited (1 req/6s, ~10 req/min) jornada por jornada. Métodos: `loadGameweekStats`, `loadMultipleGameweeks`, `findFirstGameweekWithoutStats`, `getProgressReport`.
- **`POST /api/gameweeks/admin/advance-week`** — cierra la jornada actual y activa la siguiente (testing). Implementado en `GameweekController.advanceGameweek`.
- **Cron opcional** en [src/app.js](src/app.js) (líneas 95-125) — si `TESTING_CRON=true` carga 1 jornada cada 10 minutos automáticamente.
- **`scripts/generateRealisticStats.js`** — genera stats sintéticas realistas por posición para validar scoring sin consumir cuota de la API.

---

## 3. Migraciones aplicadas (`migrations/`)

Aplicar en orden si se parte desde un dump limpio:

1. `add_api_basketball_ids.sql` — columnas `api_basketball_id` en equipos/jugadores/partidos.
2. `add_codigo_to_equipos_lnb.sql` — código corto de equipo.
3. `add_unique_index_equipos_lnb.sql` — índice único parcial.
4. `fix_unique_indexes_jugadores_partidos.sql` — corrige índices únicos para UPSERT.
5. `remove_redundant_columns.sql` — elimina `updated_at`, `altura`, `fecha_fin` redundantes.
6. `create_38_jornadas.sql` — crea calendario completo 2024-10-01 → 2025-05-27.
7. `create_gameweek_simulation.sql` — soporte para avance manual de jornadas.
8. `fix_bloquear_si_jornada_cerrada.sql` — corrige el trigger de bloqueo.

---

## 4. Bugs corregidos (consolidado)

- `RankingRepository.getTotalGeneralAcumulado` — ORDER BY apuntaba a columna inexistente.
- `RankingRepository.getRankingGeneral` — count usaba vista distinta a la query principal.
- `RankingRepository.getRankingPorJornada` — faltaba `total` y `totalPages` en la respuesta.
- `MarketService` — penalización de transferencias usaba `>` en lugar de `>=` (la 2ª transferencia no se penalizaba).
- `AuthService.changePassword` — triple fetch del usuario con riesgo de race; consolidado en `findById` + 1 query de hash.
- `ON CONFLICT` sin predicado WHERE para índices parciales (3 UPSERT).
- Cliente HTTP api-basketball: orden de status checks, rate limiting (10 req/min), reintentos por ECONNRESET.
- Endpoint `/players` de la API requería `team` (no `league`); estructura plana de respuesta.
- Posiciones en minúsculas y `ala-pivot` sin "e".
- Columna `posicion` (texto) faltante en INSERT de jugadores.

---

## 5. Pasos para arrancar el juego desde cero

Ver [README.md](README.md) sección "Setup" para los comandos exactos. Resumen:

1. Restaurar BD `grancoach_lnb` desde dump.
2. Aplicar las 8 migraciones en orden.
3. Configurar `.env` (DB, JWT_SECRET, API_BASKETBALL_KEY, API_BASKETBALL_LEAGUE_ID=18, API_BASKETBALL_SEASON=2024-2025).
4. `npm install && npm run dev`.
5. Sincronizar datos: `POST /api/admin/sync/all` (≈22 requests, respeta cuota de 100/día).
6. Para datos sintéticos sin consumir cuota: `node scripts/generateRealisticStats.js`.
7. Crear admin: `UPDATE usuarios SET es_admin = true WHERE email = '...';`.
8. Probar flujo completo: register → login → buy → lineup → advance-week → ranking.

---

## 6. Próximos pasos críticos

Detalle completo en [ROADMAP.md](ROADMAP.md). Resumen por prioridad:

1. **Frontend MVP** — login, dashboard, mercado, ranking. Es el bloqueante real para que el juego sea jugable.
2. **Tests** — cobertura de `MarketService`, `LineupService`, `ScoringService`, rutas admin. Target 80%.
3. **Asignar posiciones reales y precios coherentes** a los jugadores sincronizados (hoy todos quedan como `base` con precio fijo).
4. **Documentación Swagger** + deploy + cron de sync diario.

---

## 7. Arquitectura

```
HTTP → Routes (express-validator) → Controllers → Services → Repositories → PostgreSQL
                                                                              ↓ Triggers / Vistas
                                                    ApiBasketballService → api-basketball.com
```

- **Routes** (`src/routes/`, 6 archivos) — validación + middlewares (`authenticate`, `isAdmin`).
- **Controllers** (`src/controllers/`, 6 archivos) — adaptan req/res, sin lógica de negocio.
- **Services** (`src/services/`, 7 archivos) — `Auth`, `Market`, `Lineup`, `Scoring`, `Sync`, `ApiBasketball`, `ProgressiveStatsLoader`.
- **Repositories** (`src/repositories/`, 9 archivos) — SQL parametrizado, una clase por tabla principal.
- **Triggers de BD** — presupuesto, límite de plantilla, jornada cerrada, capitán titular.
- **Vistas de BD** — calculan puntos fantasy y rankings sin código de aplicación.

---

## 8. Endpoints disponibles (resumen por grupo)

Detalle en [README.md](README.md). Grupos montados en [src/app.js](src/app.js):

- `/api/auth` — registro, login, perfil, cambio de password.
- `/api/fantasy-team` — equipo del usuario, lineup, transfers, presupuesto.
- `/api/market` — listado/compra/venta/transferencia de jugadores, estado del mercado, catálogos.
- `/api/gameweeks` — jornadas, partidos, stats, snapshot, ranking por jornada, advance-week (admin).
- `/api/rankings` — ranking general acumulado, mi rendimiento, stats de jugador.
- `/api/admin` — sincronización con api-basketball (protegido por `es_admin`).

---

## 9. Health check

```bash
curl http://localhost:3000/health
# → { "status": "ok", "database": "connected", "timestamp": "..." }
```
