# 🔴 ANÁLISIS DE ERRORES — AUDITORÍA COMPLETA

> **Última actualización:** 2026-05-10
> **Versión:** 1.2 (post-auditoría completa backend + frontend)
> **Resultado global:** ✅ **9/9 bugs resueltos** — el juego es jugable end-to-end.

---

## Resumen ejecutivo

Se realizaron **dos auditorías**:

1. **Auditoría inicial (v1.0):** identificó 7 bugs críticos en backend (lógica de negocio).
2. **Auditoría 2026-05-10 (v1.2):** verificó la auditoría inicial y descubrió **2 bugs nuevos** (1 backend, 1 seguridad rutas) y **2 mejoras de UX en frontend**.

| Capa | Bugs originales | Bugs nuevos detectados | Estado |
|------|-----------------|------------------------|--------|
| Backend (lógica) | 7 | 1 (changePassword) | ✅ TODOS RESUELTOS |
| Backend (seguridad) | 0 | 1 (rutas gameweeks sin isAdmin) | ✅ RESUELTO |
| Frontend (UX) | 0 | 2 (PlayerCard, token expirado) | ✅ RESUELTOS |

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

## 🧪 TESTS RECOMENDADOS (PENDIENTE)

```javascript
// Backend
describe('MarketService - Transfer Penalties', () => {
  test('1ra y 2da transferencia libres, 3ra penalizada', async () => { /* ... */ });
});

describe('LineupService', () => {
  test('Rechaza si todos suplentes', async () => { /* ... */ });
  test('Rechaza si capitán no es titular', async () => { /* ... */ });
});

describe('Gameweeks routes', () => {
  test('POST / sin es_admin devuelve 403', async () => { /* ... */ });
});

// Frontend
describe('PlayerCard', () => {
  test('Botón muestra "Cerrado" si mercado bloqueado', () => { /* ... */ });
  test('Botón muestra "Sin fondos" si no canAfford', () => { /* ... */ });
});
```

Hoy solo existe `BACKEND/tests/auth.test.js`. La cobertura de tests es la deuda principal para la próxima iteración (ver [ROADMAP.md](./ROADMAP.md) §2.2).

---

## 📝 NOTAS DE COMPATIBILIDAD

✅ **Todos los cambios son retro-compatibles:**
- Misma estructura de respuestas HTTP.
- Mensajes de error más descriptivos (no rompen clientes existentes).
- Las validaciones nuevas devuelven 4xx con mensaje claro (antes devolvían 5xx genéricos).

✅ **No se modificó el schema de la base de datos** en esta auditoría.

✅ **El frontend ya estaba consumiendo los endpoints correctamente** — los cambios de backend no afectan el contrato.
