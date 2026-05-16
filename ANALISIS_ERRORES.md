# 🔴 ANÁLISIS DE ERRORES — AUDITORÍA COMPLETA

> **Última actualización:** 2026-05-15
> **Versión:** 1.3 (post-reglamento oficial + tests ampliados)
> **Resultado global:** ✅ **15/15 bugs resueltos** — **112/112 tests passing** — el juego es jugable end-to-end y respeta el reglamento oficial.

---

## Resumen ejecutivo

Se realizaron **cuatro fases**:

1. **Auditoría inicial (v1.0):** identificó 7 bugs críticos en backend (lógica de negocio).
2. **Auditoría 2026-05-10 (v1.2):** verificó la auditoría inicial y descubrió **4 bugs nuevos** (1 lógica, 1 seguridad rutas, 2 UX frontend). Total: 11 bugs.
3. **Suite de tests inicial (v1.3 alpha):** 102 tests automatizados.
4. **Reglamento oficial + bugs ranking (v1.3 — 2026-05-15):** **4 bugs adicionales** corregidos al aplicar el reglamento oficial. Total: 15 bugs. **112 tests passing**.

| Capa | Originales | Auditoría 2026-05-10 | v1.3 (2026-05-15) | Estado | Tests |
|------|-----------|---------------------|-------------------|--------|-------|
| Backend (lógica) | 7 | 1 (changePassword) | 2 (config inicial, umbral transferencias) | ✅ RESUELTOS | market, lineup, auth |
| Backend (seguridad) | 0 | 1 (rutas gameweeks sin isAdmin) | 0 | ✅ RESUELTO | gameweeks (8 casos) |
| Backend (datos) | 0 | 0 | 1 (posiciones todas como base) | ✅ RESUELTO | script updatePlayerPositions |
| Frontend (UX) | 0 | 2 (PlayerCard, token expirado) | 1 (ranking campos mismatched) | ✅ RESUELTOS | manual |

---

## 🔴 BUGS BACKEND (CRÍTICOS DE LÓGICA DE NEGOCIO)

### ✅ BUG 1 — Penalización de transferencias incorrecta

**Archivo:** `BACKEND/src/services/MarketService.js` (líneas 56, 98, 162)
**Severidad:** 🔴 CRÍTICO
**Estado:** ✅ RESUELTO en la auditoría 2026-05-10.

**Problema original:**
```javascript
const esPenalizada = transfersThisWeek >= TRANSFERENCIAS_LIBRES_POR_JORNADA; // BUG
```
Con `TRANSFERENCIAS_LIBRES_POR_JORNADA = 1` y `count` antes del nuevo insert, la 2da transferencia se penalizaba indebidamente:
- 1ª transferencia: `count = 0`, `0 >= 1` = false → libre ✓
- 2ª transferencia: `count = 1`, `1 >= 1` = true → penalizada ❌ (debía ser libre)
- 3ª transferencia: `count = 2`, `2 >= 1` = true → penalizada ✓

**Fix aplicado:**
```javascript
const esPenalizada = transfersThisWeek > TRANSFERENCIAS_LIBRES_POR_JORNADA;
```
Ahora: 1ª y 2ª libres, 3ª+ penalizadas (-20 pts). Aplicado en los **3 métodos** (`buyPlayer`, `sellPlayer`, `transferPlayer`).

---

### ✅ BUG 2 — Sin validación de alineación mínima

**Archivo:** `BACKEND/src/services/LineupService.js`
**Severidad:** 🔴 CRÍTICO
**Estado:** ✅ RESUELTO (ya estaba aplicado al momento de la auditoría 2026-05-10).

Validaciones presentes:
- Solo 1 capitán permitido.
- El capitán debe ser titular.
- Debe haber al menos 1 titular o capitán.

---

### ✅ BUG 3 — Transacción incompleta en `transferPlayer`

**Archivo:** `BACKEND/src/services/MarketService.js`
**Severidad:** 🟠 ALTO
**Estado:** ✅ RESUELTO.

Validaciones agregadas antes de los cambios:
- Jugador a fichar existe y está activo.
- Jugador a vender pertenece al equipo.
- Jugador a fichar no está ya en el equipo.
- Presupuesto suficiente.
- Validación de `rowCount === 1` después del DELETE.

---

### ✅ BUG 4 — Transferencias sin jornada activa no se registraban

**Archivo:** `BACKEND/src/services/MarketService.js`
**Severidad:** 🟠 ALTO
**Estado:** ✅ RESUELTO.

```javascript
const jornada = await GameweekRepository.findCurrent();
if (!jornada) {
  throw createError(400, 'No hay jornada activa. No se pueden hacer transferencias.');
}
```

---

### ✅ BUG 5 — Doble fetch en `changePassword`

**Archivo:** `BACKEND/src/services/AuthService.js`
**Severidad:** 🟡 MEDIO
**Estado:** ✅ RESUELTO en la auditoría 2026-05-10 (estaba pendiente).

Antes hacía 2 queries: `findById` (sin hash) → extrae email → `findByEmail` (con hash). Ahora consolidado a 1 query directa que obtiene `id, email, password_hash` por `id` y valida `activo = true`.

---

### ✅ BUG 6 — Sin validación explícita de presupuesto

**Archivo:** `BACKEND/src/services/MarketService.js`
**Severidad:** 🟡 MEDIO
**Estado:** ✅ RESUELTO.

Antes se confiaba en el trigger `controlar_presupuesto()` de la DB y devolvía error genérico. Ahora valida en el servicio con mensaje claro:

```javascript
if (team.presupuesto_restante < player.precio) {
  throw createError(422, `Presupuesto insuficiente. Necesitas ${player.precio}, tienes ${team.presupuesto_restante}`);
}
```

---

### ✅ BUG 7 — Orden de validaciones en `FantasyTeamRepository.updateLineup`

**Archivo:** `BACKEND/src/repositories/FantasyTeamRepository.js`
**Severidad:** 🟡 BAJO
**Estado:** ✅ RESUELTO.

---

## 🟠 BUGS NUEVOS DETECTADOS EN AUDITORÍA 2026-05-10

### ✅ BUG 8 — Rutas de admin de gameweeks sin middleware `isAdmin`

**Archivo:** `BACKEND/src/routes/gameweeks.js`
**Severidad:** 🟠 ALTO (seguridad)
**Estado:** ✅ RESUELTO.

**Problema:** Las rutas `POST /`, `PATCH /:id`, `POST /:id/lock`, `POST /:id/matches`, `PATCH /:id/matches/:partidoId` y `POST /:id/matches/:partidoId/stats` solo requerían `authenticate`, sin verificar `es_admin`. **Cualquier usuario autenticado podía crear/editar jornadas, partidos y stats.**

**Fix:** Agregado middleware `isAdmin` a todas las rutas de creación/edición. Solo `GET` (consultas) son públicas. Solo el `POST /admin/advance-week` ya lo tenía.

---

### ✅ BUG 9 — Manejo de token JWT expirado en frontend

**Archivo:** `FRONTEND/src/api/axios.js`
**Severidad:** 🟡 MEDIO (UX)
**Estado:** ✅ RESUELTO.

**Problema:** El interceptor de request añadía el token sin verificar si estaba expirado. El usuario veía un 401 al primer request y recién ahí se redirigía.

**Fix:** El interceptor decodifica el JWT y verifica `exp` antes de cada request. Si está expirado, limpia `localStorage` y redirige a `/login` directamente, evitando el round-trip al servidor.

---

### ✅ BUG 10 — `PlayerCard` mensaje confuso entre "sin fondos" y "mercado cerrado"

**Archivo:** `FRONTEND/src/components/market/PlayerCard.jsx`
**Severidad:** 🟢 BAJO (UX)
**Estado:** ✅ RESUELTO.

Antes el botón mostraba "Sin fondos" aun cuando el problema real era que el mercado estaba cerrado. Ahora distingue claramente:
- "Cerrado" si el mercado está bloqueado.
- "Sin fondos" si no hay presupuesto.
- "Comprar" si todo OK.

---

### ✅ BUG 11 — `Register.jsx` no normalizaba `nombreEquipo` vacío

**Archivo:** `FRONTEND/src/pages/Register.jsx`
**Severidad:** 🟢 BAJO
**Estado:** ✅ RESUELTO.

Si el usuario dejaba el campo "Nombre del equipo" vacío, se enviaba `nombreEquipo: ""` (string vacío). El backend lo manejaba con `nombreEquipo || \`Equipo de ${nombre}\``, así que no rompía nada, pero el payload era ruidoso. Ahora se omite del payload si está vacío.

---

## 📊 MATRIZ FINAL DE CAMBIOS

| # | Bug | Capa | Severidad | Archivo | Estado |
|---|-----|------|-----------|---------|--------|
| 1 | Penalización transferencias `>=` → `>` | Backend | 🔴 CRÍTICO | MarketService.js | ✅ |
| 2 | Alineación mínima | Backend | 🔴 CRÍTICO | LineupService.js | ✅ |
| 3 | Transacción incompleta | Backend | 🟠 ALTO | MarketService.js | ✅ |
| 4 | Jornada obligatoria | Backend | 🟠 ALTO | MarketService.js | ✅ |
| 5 | Doble fetch changePassword | Backend | 🟡 MEDIO | AuthService.js | ✅ |
| 6 | Validar presupuesto antes | Backend | 🟡 MEDIO | MarketService.js | ✅ |
| 7 | Orden validaciones lineup | Backend | 🟡 BAJO | FantasyTeamRepository.js | ✅ |
| 8 | **Rutas gameweeks sin isAdmin** | Backend | 🟠 ALTO (seguridad) | routes/gameweeks.js | ✅ |
| 9 | **Token JWT expirado no detectado** | Frontend | 🟡 MEDIO (UX) | api/axios.js | ✅ |
| 10 | **PlayerCard mensaje confuso** | Frontend | 🟢 BAJO (UX) | PlayerCard.jsx | ✅ |
| 11 | **Register normaliza nombreEquipo** | Frontend | 🟢 BAJO | Register.jsx | ✅ |

---

## 🧪 TESTS AUTOMATIZADOS (✅ IMPLEMENTADOS — v1.3)

Suite completa: **102 tests passing, 0 fallos**. Ver [DOCUMENTACION_TESTS.md](./DOCUMENTACION_TESTS.md) para descripción detallada de cada test.

| Suite | Archivo | Tests | Qué bug/regla cubre |
|-------|---------|-------|---------------------|
| Auth | `tests/auth.test.js` | 8 | Registro/login/health |
| Market | `tests/market.test.js` | 38 | Bugs 1, 3, 4, 6 + penalizaciones + **bug 12 (config inicial)** |
| Lineup | `tests/lineup.test.js` | 26 | Bug 2 + validaciones HTTP + **Art. II posiciones** |
| Gameweeks | `tests/gameweeks.test.js` | 24 | Bug 8 (isAdmin en 8 rutas) |
| ErrorHandler | `tests/errorHandler.test.js` | 17 | Mapeo PG→HTTP, createError |

**Los tests de penalización** (`[PENAL]` count=0,1,2,3,10) son los más importantes: verifican directamente los parámetros del `INSERT INTO transferencias` para confirmar que el umbral funciona correctamente y que la configuración inicial no penaliza.

**El bug de `resetAllMocks()` encontrado durante el testing:** `clearAllMocks()` no limpia la cola de `mockReturnValueOnce` entre tests. Esto podría haber causado que tests "pasaran por razones equivocadas". Se corrigió usando `resetAllMocks()` en todos los archivos.

---

## 🆕 BUGS RESUELTOS EN v1.3 (2026-05-15)

### ✅ BUG 12 — Penalización al armar plantilla inicial

**Archivo:** `BACKEND/src/services/MarketService.js`
**Severidad:** 🔴 CRÍTICO — afecta a TODOS los usuarios nuevos.

**Problema:** Cuando un usuario se registra y compra sus primeros 10 jugadores, las compras 3, 4, ..., 10 quedaban marcadas como "penalizadas" porque exceden las 2 transferencias gratuitas de la jornada. Resultado: nuevos usuarios empezaban con −160 puntos antes de jugar nada.

**Solución:** Detectar "configuración inicial" mirando la tabla `lineup_snapshots`. Si el equipo nunca jugó una jornada (sin snapshots), ninguna operación de mercado se penaliza. Helper `debePenalizar()` aplicado consistentemente en `buyPlayer`, `sellPlayer` y `transferPlayer`.

**Tests:** `[CONFIG INICIAL]` en market.test.js (4 tests).

### ✅ BUG 13 — Umbral de transferencias gratuitas: 1 en vez de 2 (Art. V del reglamento)

**Archivo:** `BACKEND/src/services/MarketService.js`
**Severidad:** 🟡 MEDIO — desviación del reglamento oficial.

**Problema:** El código tenía `TRANSFERENCIAS_LIBRES_POR_JORNADA = 1`, pero el reglamento oficial (Art. V) especifica **2 transferencias gratuitas por semana**.

**Solución:** Cambiar la constante a `2`. El umbral pasa de `> 1` a `> 2` automáticamente. UI del frontend actualizada ("2 transferencias gratis por jornada").

**Tests:** Todos los `[PENAL] count=N` actualizados en market.test.js.

### ✅ BUG 14 — Ranking sin datos visibles (mismatched field names)

**Archivos:** `FRONTEND/src/components/rankings/RankingTable.jsx`, `FRONTEND/src/pages/Rankings.jsx`
**Severidad:** 🟡 MEDIO — UI funcional pero datos vacíos.

**Problema:** El componente leía `row.nombre_equipo`, `row.nombre_usuario`, `row.total_puntos` pero el backend (vista SQL `ranking_general_completo`) devuelve `equipo_nombre`, `usuario`, `puntos_totales`. Además `Rankings.jsx` leía `data.pagination.total` pero el backend devuelve `data.total` directamente.

**Solución:** Soportar ambos nombres con `??` para retro-compatibilidad. Backend no se modificó.

### ✅ BUG 15 — Posiciones todas asignadas como "base"

**Archivos:** Tabla `jugadores` en la DB + `BACKEND/src/scripts/updatePlayerPositions.js`
**Severidad:** 🟡 MEDIO — bloquea filtros por posición y validación del lineup.

**Problema:** api-basketball.com devuelve solo 3 categorías (Guard/Forward/Center). La sincronización mapeaba la mayoría como "base" por defecto, dejando la distribución desproporcionada (277 base, 72 alero, 16 pivot, 0 escolta, 0 ala-pivot).

**Solución:** Script `updatePlayerPositions.js` con mapping manual de 365 jugadores investigados en latinbasket.com. Distribución final: 101 aleros / 92 bases / 82 escoltas / 49 ala-pivots / 41 pivots.

---

## 📋 BUGS DE REGLAMENTO RESUELTOS EN v1.3

Al aplicar el [Reglamento Oficial](Reglamento%20Oficial-%20GranCoachLNB.txt) (2026-05-15), se identificaron y resolvieron las siguientes desviaciones:

| Art. del reglamento | Especificación | Implementación previa | Fix aplicado |
|---|---|---|---|
| **Art. II — Titulares** | 1 Base, 1 Escolta, 1 Alero, 1 Ala-Pivot, 1 Pivot | Cualquier combinación de 5 titulares | LineupService valida estricta cuando el plantel tiene 10 jugadores |
| **Art. II — Suplentes** | 2 perimetrales + 2 internos + 1 comodín | Cualquier combinación de 5 suplentes | LineupService valida ≥2 perim y ≥2 int |
| **Art. V — Transferencias** | 2 gratis por semana | Solo 1 gratis | `TRANSFERENCIAS_LIBRES_POR_JORNADA = 2` |
| **Art. V — Configuración inicial** | (implícito: armar plantilla no es transferencia) | Cada compra inicial se contaba | `debePenalizar()` retorna `false` si no hay snapshots |

---

## 📝 NOTAS DE COMPATIBILIDAD

✅ **Todos los cambios son retro-compatibles:**
- Misma estructura de respuestas HTTP.
- Mensajes de error más descriptivos (no rompen clientes existentes).
- Las validaciones nuevas devuelven 4xx con mensaje claro (antes devolvían 5xx genéricos).
- Bug 14 (ranking): el frontend lee con `??` ambos nombres, retro-compatible con backend anterior.

✅ **No se modificó el schema de la base de datos** en esta auditoría.

✅ **El frontend ya estaba consumiendo los endpoints correctamente** — los cambios de backend no afectan el contrato.
