# 🧪 DOCUMENTACIÓN DE TESTS — GRAN COACH LNB

> **Última actualización:** 2026-05-10
> **Estado:** ✅ 102/102 tests passing — 5 suites, 0 fallos
> **Comando:** `cd BACKEND && npm test`
> **Estrategia:** Tests unitarios e integración con DB mockeada (`jest.mock`)

---

## Resumen global

| Suite | Archivo | Tests | Descripción |
|-------|---------|-------|-------------|
| Auth | `tests/auth.test.js` | 8 | Registro, login, health check |
| Market | `tests/market.test.js` | 34 | Compra, venta, transferencia, penalizaciones |
| Lineup | `tests/lineup.test.js` | 20 | Alineación, capitán, validaciones |
| Gameweeks | `tests/gameweeks.test.js` | 24 | Control de acceso admin en rutas de jornadas |
| ErrorHandler | `tests/errorHandler.test.js` | 17 | Manejo de errores PostgreSQL y de negocio |
| **TOTAL** | — | **102** | — |

---

## Suite 1 — `tests/auth.test.js`

Tests originales del proyecto. Validan el flujo de autenticación (registro y login) y el endpoint de salud.

### POST /api/auth/register

| Test | Descripción |
|------|-------------|
| `debe retornar 400 si faltan campos obligatorios` | Envía solo el email sin nombre ni contraseña. Verifica que el validador rechace la petición con 400 y `success: false`. |
| `debe retornar 400 si el email es inválido` | Envía un email con formato incorrecto (`no-es-email`). Verifica que express-validator rechace con 400. |
| `debe retornar 400 si la contraseña es muy corta` | Envía una contraseña de 3 caracteres (mínimo es 8). Verifica rechazo con 400. |
| `debe retornar 409 si el email ya existe` | Mockea la DB para simular que el email ya está registrado. Verifica que el sistema responda con 409 (Conflict). |
| `debe registrar usuario exitosamente` | Simula registro completo: DB vacía + inserción exitosa. Verifica 201 con `token` en la respuesta. |

### POST /api/auth/login

| Test | Descripción |
|------|-------------|
| `debe retornar 400 si faltan campos` | Envía solo el email sin contraseña. Verifica rechazo 400 del validador. |
| `debe retornar 401 si el usuario no existe` | Mockea la DB para retornar usuario inexistente. Verifica 401 con credenciales inválidas. |

### GET /health

| Test | Descripción |
|------|-------------|
| `debe retornar status ok` | Mockea la query `SELECT 1` para simular DB conectada. Verifica respuesta `{ status: "ok", database: "connected" }`. |

---

## Suite 2 — `tests/market.test.js`

Tests del mercado de jugadores: compra (`buyPlayer`), venta (`sellPlayer`) y transferencia directa (`transferPlayer`). Enfocados en validaciones de negocio y la **lógica de penalizaciones de transferencias**.

### POST /api/market/buy/:jugadorId

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica que un request sin cabecera `Authorization` sea rechazado con 401. |
| `401 token inválido` | Envía un JWT malformado. Verifica rechazo 401 del middleware `authenticate`. |
| `404 equipo no encontrado` | Simula usuario sin equipo fantasy creado. Verifica que el servicio responda 404 con mensaje "Equipo fantasy no encontrado". |
| `404 jugador no encontrado` | Simula jugador inexistente en la DB. Verifica 404 con mensaje "Jugador no encontrado". |
| `400 jugador no activo` | Simula jugador con `activo: false`. Verifica rechazo 400 (jugador fuera del mercado). |
| `409 jugador ya en equipo` | Simula que el jugador ya está en el equipo del usuario. Verifica 409 (conflicto). |
| `422 presupuesto insuficiente` | Simula equipo con $100 de presupuesto y jugador que cuesta $5.000.000. Verifica 422 con mensaje detallado que incluye ambos montos. |
| `400 sin jornada activa` | Simula ausencia de jornada activa en la DB. Verifica que NO se pueda comprar sin jornada (400). |
| `201 compra exitosa` | Simula escenario completo exitoso. Verifica 201 con `jugador` y `equipo` en la respuesta. |
| `[PENALIZACIÓN] 1ra transferencia: count=0 → NO penalizada` | Verifica que con 0 transferencias previas (count=0), `0 > 1 = false`, el INSERT en `transferencias` tenga `esPenalizada=false` y `penalizacion_puntos=0`. |
| `[PENALIZACIÓN] 2da transferencia: count=1 → NO penalizada (1 > 1 = false)` | Verifica que con 1 transferencia previa (count=1), `1 > 1 = false`, la 2da transferencia sea LIBRE (no penalizada). Este test confirma el fix del bug crítico `>=` → `>`. |
| `[PENALIZACIÓN] 3ra transferencia: count=2 → SÍ penalizada (2 > 1 = true)` | Verifica que con 2 transferencias previas (count=2), `2 > 1 = true`, el INSERT tenga `esPenalizada=true` y `penalizacion_puntos=20`. |
| `[PENALIZACIÓN] 4ta transferencia: count=3 → SÍ penalizada` | Verifica que la 4ta transferencia también sea penalizada (−20 pts). |

### DELETE /api/market/sell/:jugadorId

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica rechazo de venta sin autenticación. |
| `404 jugador no en equipo` | Simula venta de jugador que no está en el equipo del usuario. Verifica 404. |
| `400 sin jornada activa` | Verifica que no se pueda vender sin jornada activa (400). |
| `200 venta exitosa` | Simula escenario completo exitoso. Verifica 200 con mensaje "Jugador vendido exitosamente". |
| `[PENALIZACIÓN] sell: count=1 → NO penalizada (1 > 1 = false)` | Verifica que la 2da venta del período sea libre (count=1 → no penalizada). |
| `[PENALIZACIÓN] sell: count=2 → SÍ penalizada (2 > 1 = true)` | Verifica que la 3ra operación del período sea penalizada (−20 pts en el INSERT). |

### POST /api/market/transfer

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica rechazo de transferencia sin autenticación. |
| `400 faltan campos` | Envía `jugador_sale_id` pero omite `jugador_entra_id`. Verifica validación 400 del validador HTTP. |
| `400 jugador_sale_id negativo` | Envía `jugador_sale_id: -1`. Verifica que el validador rechace IDs negativos con 400. |
| `404 jugador a fichar no existe` | Simula que el jugador a incorporar no existe en la DB. Verifica 404. |
| `400 jugador a fichar inactivo` | Simula jugador a fichar con `activo: false`. Verifica rechazo 400. |
| `404 jugador a vender no en el equipo` | Simula que el jugador a vender no pertenece al equipo. Verifica 404. |
| `409 jugador a fichar ya en el equipo` | Simula que el jugador a incorporar ya está en el equipo. Verifica 409. |
| `422 sin presupuesto para el fichaje` | Simula equipo con $100 intentando fichar un jugador de $10M. Verifica 422 con mensaje detallado. |
| `400 sin jornada activa` | Verifica que la transferencia directa tampoco funcione sin jornada activa. |
| `200 transferencia exitosa` | Simula escenario completo exitoso. Verifica 200 con mensaje "Transferencia realizada exitosamente". |
| `[PENALIZACIÓN] transfer count=1 → NO penalizada en respuesta` | Verifica que la respuesta de `transferPlayer` incluya `penalizada: false` y `penalizacion: 0` cuando count=1. |
| `[PENALIZACIÓN] transfer count=2 → SÍ penalizada en respuesta (-20 pts)` | Verifica que la respuesta incluya `penalizada: true` y `penalizacion: 20` cuando count=2. |

### GET /api/market/players (público)

| Test | Descripción |
|------|-------------|
| `200 sin autenticación` | Verifica que la lista de jugadores sea accesible sin token (endpoint público). Respuesta incluye `jugadores`. |
| `200 con paginación en respuesta` | Verifica que la respuesta incluya `total`, `jugadores` y que el conteo sea correcto. |

---

## Suite 3 — `tests/lineup.test.js`

Tests de gestión de alineación y equipo fantasy. Cubre validaciones HTTP del cuerpo del request, lógica de negocio del `LineupService` y operaciones auxiliares del equipo.

### PATCH /api/fantasy-team/lineup — autenticación

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica que modificar la alineación requiera autenticación. |
| `401 token inválido` | Envía un JWT malformado. Verifica rechazo del middleware `authenticate`. |

### PATCH /api/fantasy-team/lineup — validación HTTP

| Test | Descripción |
|------|-------------|
| `400 si jugadores no es array` | Envía `jugadores: "no-es-array"`. Verifica que express-validator rechace con 400 (debe ser `isArray`). |
| `400 si jugadores está vacío` | Envía `jugadores: []`. Verifica rechazo 400 (`isArray({ min: 1 })`). |
| `400 si jugadorId no es entero positivo` | Envía `jugadorId: -1`. Verifica que el validador rechace IDs negativos. |

### PATCH /api/fantasy-team/lineup — lógica de negocio (LineupService)

| Test | Descripción |
|------|-------------|
| `404 si el equipo del usuario no existe` | Simula usuario sin equipo en la DB. Verifica que LineupService responda 404 antes de intentar actualizar. |
| `400 si hay más de un capitán` | Envía 2 jugadores con `esCapitan: true`. Verifica que LineupService rechace con 400 "Solo puede haber un capitán". |
| `400 si el capitán es suplente` | Envía jugador con `esCapitan: true` y `esTitular: false`. Verifica rechazo 400 "El capitán debe ser titular". |
| `400 si todos son suplentes (sin titulares)` | Envía 3 jugadores con `esTitular: false, esCapitan: false`. Verifica rechazo 400 "Debe haber al menos un jugador titular". |
| `400 si la alineación está completamente vacía de titulares y capitán` | Edge case: 1 jugador sin titular ni capitán. Verifica rechazo 400. |
| `404 si un jugador no pertenece al equipo` | Simula `UPDATE` con `rowCount=0` (jugador no encontrado en DB). Verifica 404 desde `FantasyTeamRepository.updateLineup`. |
| `200 alineación válida: 5 titulares + 1 capitán` | Simula alineación correcta (el capitán es titular). Verifica 200 y que la transacción sea completada. |
| `200 alineación válida: solo 1 titular sin capitán explícito` | Verifica que se pueda guardar una alineación sin capitán (no es obligatorio). |
| `200 alineación donde capitán cuenta como titular (sin esTitular explícito)` | Verifica comportamiento cuando `esCapitan: true` pero `esTitular` no se envía; no debe arrojar 500. |

### PATCH /api/fantasy-team/nombre

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica que renombrar el equipo requiera autenticación. |
| `400 si nombre está vacío` | Envía `nombre: ""`. Verifica rechazo 400 del validador (campo `notEmpty`). |
| `200 renombra correctamente` | Simula renombre exitoso. Verifica 200 con `nombre` actualizado en la respuesta. |

### GET /api/fantasy-team

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica que consultar el equipo requiera autenticación. |
| `200 retorna equipo con roster` | Simula equipo existente con jugadores. Verifica 200 con propiedad `jugadores` en la respuesta. |
| `404 si el equipo no existe` | Simula usuario sin equipo. Verifica 404 desde `LineupService.getMyTeam`. |

---

## Suite 4 — `tests/gameweeks.test.js`

Tests de control de acceso a las rutas de jornadas. Verifica que las operaciones de escritura estén protegidas por `isAdmin` y que las rutas de consulta sean públicas.

### GET (rutas públicas)

| Test | Descripción |
|------|-------------|
| `GET /api/gameweeks → 200 sin autenticación` | Verifica que listar todas las jornadas sea público (no requiere token). |
| `GET /api/gameweeks/current → 404 si no hay jornada activa` | Simula ausencia de jornada activa. Verifica 404 con mensaje "No hay jornada activa". |
| `GET /api/gameweeks/current → 200 con jornada activa` | Simula jornada activa. Verifica 200 con `numero` en la respuesta. |

### POST /api/gameweeks (crear jornada)

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica rechazo sin autenticación. |
| `403 usuario autenticado pero NO admin` | Usuario normal (es_admin: false) intenta crear jornada. Verifica 403 "Se requieren permisos de administrador". |
| `400 admin pero falta campo número` | Admin envía body sin `numero`. Verifica que express-validator rechace con 400. |
| `400 numero no es entero` | Admin envía `numero: "abc"`. Verifica rechazo 400 (debe ser `isInt`). |
| `201 admin puede crear jornada` | Admin envía `numero: 39`. Verifica 201 con la jornada creada en la respuesta. |

### PATCH /api/gameweeks/:id (editar jornada)

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica rechazo sin autenticación. |
| `403 usuario NO admin` | Usuario normal intenta editar una jornada. Verifica 403. |
| `200 admin puede editar jornada` | Admin envía body válido. Verifica que la operación sea procesada (200 o 400 por validación de body). |

### POST /api/gameweeks/:id/lock (cerrar jornada)

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica rechazo sin autenticación. |
| `403 usuario NO admin` | Usuario normal intenta cerrar la jornada. Verifica 403 (bug corregido: antes solo requería `authenticate`). |
| `404 jornada no encontrada (admin)` | Admin intenta cerrar jornada con ID inexistente (999). Verifica 404. |

### POST /api/gameweeks/:id/matches (crear partido)

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica rechazo sin autenticación. |
| `403 usuario NO admin` | Usuario normal intenta crear un partido. Verifica 403. |

### PATCH /api/gameweeks/:id/matches/:partidoId (actualizar partido)

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica rechazo sin autenticación. |
| `403 usuario NO admin` | Usuario normal intenta actualizar un partido. Verifica 403. |
| `400 estado inválido (admin)` | Admin envía `estado: "ESTADO_INVALIDO"`. Verifica que express-validator rechace con 400 (solo acepta PROGRAMADO/EN_CURSO/FINALIZADO/CANCELADO). |

### POST /api/gameweeks/:id/matches/:partidoId/stats (cargar stats)

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica rechazo sin autenticación. |
| `403 usuario NO admin` | Usuario normal intenta cargar estadísticas de un partido. Verifica 403. |
| `400 jugadorId inválido (admin)` | Admin envía body sin `jugadorId`. Verifica rechazo 400 del validador. |

### POST /api/gameweeks/admin/advance-week

| Test | Descripción |
|------|-------------|
| `401 sin token` | Verifica rechazo sin autenticación para avanzar jornada. |
| `403 usuario NO admin` | Usuario normal intenta avanzar la jornada. Verifica 403. |

---

## Suite 5 — `tests/errorHandler.test.js`

Tests unitarios del middleware `errorHandler` y la función `createError`. No usan HTTP ni DB; prueban la lógica pura del manejo de errores.

### createError

| Test | Descripción |
|------|-------------|
| `crea un Error con statusCode y message` | Verifica que `createError(404, "msg")` retorne una instancia de `Error` con `statusCode=404` y `message="msg"`. |
| `crea un error 400` | Verifica creación de error 400. |
| `crea un error 422` | Verifica creación de error 422 con mensaje que contiene "Presupuesto insuficiente". |
| `el error tiene stack trace` | Verifica que el error tenga `stack` definido (útil para debugging en producción). |

### errorHandler — errores PostgreSQL

| Test | Descripción |
|------|-------------|
| `código 23505 (unique violation) → 409` | Simula error PG de clave única duplicada. Verifica mapeo a 409 con mensaje "Ya existe un registro con esos datos". |
| `código 23503 (foreign key violation) → 400` | Simula violación de foreign key. Verifica mapeo a 400 con mensaje "Referencia a un registro inexistente". |
| `código 23514 (check constraint) → 400` | Simula violación de constraint CHECK (ej: trigger de negocio). Verifica mapeo a 400. |
| `código 23502 (not null violation) → 400` | Simula campo NOT NULL enviado como null. Verifica mapeo a 400. |
| `código P0001 (RAISE EXCEPTION) → 422 con mensaje del error` | Simula un `RAISE EXCEPTION` de PostgreSQL (ej: trigger de presupuesto). Verifica que se use el mensaje original del error, no uno genérico. |

### errorHandler — errores de negocio (statusCode)

| Test | Descripción |
|------|-------------|
| `error 404 → status 404` | Error creado con `createError(404, "No encontrado")`. Verifica que la respuesta tenga status 404, `success: false` y el mensaje exacto. |
| `error 400 → status 400` | Verifica manejo de error de validación de negocio (400). |
| `error 401 → status 401` | Verifica manejo de error de autenticación (401). |
| `error 409 → status 409` | Verifica manejo de error de conflicto (409). |
| `error 422 → status 422 con mensaje completo` | Verifica que el mensaje de presupuesto incluya los montos específicos (ej: "5000000"). |

### errorHandler — error genérico (500)

| Test | Descripción |
|------|-------------|
| `error sin statusCode ni code → 500` | Simula un `new Error("algo salió mal")` sin código. Verifica respuesta genérica 500 "Error interno del servidor" (sin exponer detalles al cliente). |
| `error ReferenceError → 500` | Simula un error inesperado de JavaScript. Verifica manejo graceful con 500. |

### errorHandler — errores de validación

| Test | Descripción |
|------|-------------|
| `error tipo validation → 400 con errores` | Simula error de express-validator con `type: "validation"` y array `errors`. Verifica que la respuesta incluya `errors[0].field` correctamente estructurado. |

---

## Decisiones de diseño

### Estrategia de mock

Todos los tests mockean el módulo `src/config/database` con `jest.mock()`. Esto aísla cada test de la base de datos real y permite controlar exactamente qué retorna cada query.

```js
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
  pool: { end: jest.fn() },
}));
```

**Por qué `resetAllMocks()` y no `clearAllMocks()`:**
`clearAllMocks()` solo limpia `mock.calls/results` pero NO la cola de `mockReturnValueOnce`. Usar `resetAllMocks()` garantiza que cada test empiece con la cola vacía, evitando contaminación entre tests.

### Patrón de verificación de penalizaciones

Para los tests de penalización en `buyPlayer` y `sellPlayer`, se inspecciona directamente el array de parámetros del `INSERT INTO transferencias` en el `client.query` mockeado:

```js
const call = clientQuery.mock.calls.find(
  ([sql]) => sql && sql.includes('INSERT INTO transferencias')
);
const params = call[1]; // [team.id, jugadorId, jornada.id, esPenalizada, penalizacion_puntos]
expect(params[3]).toBe(false); // esPenalizada
expect(params[4]).toBe(0);     // penalizacion_puntos
```

Para `transferPlayer`, la respuesta HTTP incluye directamente `{ penalizada, penalizacion }`, por lo que se verifica sobre `res.body.data`.

---

## Cobertura de reglas de negocio

| Regla | Test que la cubre |
|-------|-------------------|
| 1ra y 2da transferencia libre por jornada | `[PENALIZACIÓN] count=0` y `count=1 → NO penalizada` |
| 3ra+ transferencia: −20 pts | `[PENALIZACIÓN] count=2/3 → SÍ penalizada` |
| Capitán único y titular | `400 si hay más de un capitán` / `400 si el capitán es suplente` |
| Alineación mínima (al menos 1 titular) | `400 si todos son suplentes` |
| Presupuesto validado antes del INSERT | `422 presupuesto insuficiente` |
| Jornada activa obligatoria para operar | `400 sin jornada activa` (buy, sell, transfer) |
| Rutas admin protegidas por `isAdmin` | Toda la suite de gameweeks (403 en 8 rutas distintas) |
| JWT expirado/inválido → 401 | `401 token inválido` (market, lineup) |
| Errores PG mapeados a HTTP correcto | 5 tests en errorHandler |
