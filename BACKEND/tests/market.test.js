/**
 * Tests para MarketService + rutas /api/market
 *
 * Cubre:
 *   - Compra, venta, transferencia.
 *   - Penalizaciones según reglamento (Art. V): 2 transferencias gratis por jornada,
 *     -20 puntos por cada transacción extra.
 *   - Configuración inicial: equipos sin snapshots no penalizan.
 *   - Validaciones HTTP y de negocio.
 */

process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { pool } = require('../src/config/database');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
  pool: { end: jest.fn() },
}));

const { query, withTransaction } = require('../src/config/database');

const TOKEN = jwt.sign({ userId: 1 }, 'test-secret-key-for-jest');

const USER       = { id: 1, nombre: 'Test', email: 't@test.com', activo: true, es_admin: false };
const TEAM       = { id: 10, nombre: 'Mi Equipo', presupuesto_restante: 100_000_000, presupuesto_inicial: 100_000_000 };
const PLAYER     = { id: 5, nombre: 'Jugador A', activo: true, precio: 5_000_000, posicion: 'base', equipo_nombre: 'Club A' };
const PLAYER_IN  = { id: 7, nombre: 'Jugador B', activo: true, precio: 4_000_000, posicion: 'alero', equipo_nombre: 'Club B' };
const JORNADA    = { id: 1, numero: 1 };
const PRESUPUESTO = { presupuesto_restante: 95_000_000, presupuesto_inicial: 100_000_000 };

// Snapshot del lineup. Si rows > 0 → equipo ya jugó alguna jornada (puede penalizar).
// Si rows = 0 → configuración inicial (nunca penaliza).
const SNAPSHOT_CON_HISTORIAL = { rows: [{ '?column?': 1 }] };
const SNAPSHOT_INICIAL       = { rows: [] };

beforeEach(() => jest.resetAllMocks());
afterAll(() => pool.end());

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeClient(...responses) {
  const clientQuery = jest.fn();
  responses.forEach((r) => clientQuery.mockResolvedValueOnce(r));
  withTransaction.mockImplementationOnce((fn) => fn({ query: clientQuery }));
  return clientQuery;
}

function queueQueries(...responses) {
  responses.forEach((r) => query.mockResolvedValueOnce(r));
}

/**
 * Escenario de compra. Configura todos los mocks.
 *
 * @param {Object} opts
 * @param {number} opts.count - transferencias previas en la jornada (default 0)
 * @param {boolean} opts.hasSnapshot - si el equipo tiene historial de jornadas (default true)
 */
function setupBuy({ count = 0, hasSnapshot = true, rosterTitulares = [] } = {}) {
  // client.query: SELECT roster (smart-buy), INSERT jugador, SELECT snapshot, INSERT transferencia
  const clientQuery = makeClient(
    { rows: rosterTitulares },
    { rows: [{ id: 1, equipo_fantasy_id: TEAM.id, jugador_id: PLAYER.id, es_titular: true }] },
    hasSnapshot ? SNAPSHOT_CON_HISTORIAL : SNAPSHOT_INICIAL,
    { rowCount: 1 }
  );

  // query: auth, findByUserId, findById, isInTeam, findCurrent, [count if snapshot], getPresupuesto
  const queries = [
    { rows: [USER] },
    { rows: [TEAM] },
    { rows: [PLAYER] },
    { rowCount: 0, rows: [] },
    { rows: [JORNADA] },
  ];
  if (hasSnapshot) queries.push({ rows: [{ count: String(count) }] });
  queries.push({ rows: [PRESUPUESTO] });

  queueQueries(...queries);
  return clientQuery;
}

function setupSell({ count = 0, hasSnapshot = true } = {}) {
  // client.query: DELETE jugador, SELECT snapshot, INSERT transferencia
  const clientQuery = makeClient(
    { rowCount: 1 },
    hasSnapshot ? SNAPSHOT_CON_HISTORIAL : SNAPSHOT_INICIAL,
    { rowCount: 1 }
  );

  const queries = [
    { rows: [USER] },
    { rows: [TEAM] },
    { rowCount: 1, rows: [{}] },  // isInTeam true
    { rows: [JORNADA] },
  ];
  if (hasSnapshot) queries.push({ rows: [{ count: String(count) }] });
  queries.push({ rows: [PRESUPUESTO] });

  queueQueries(...queries);
  return clientQuery;
}

function setupTransfer({ count = 0, hasSnapshot = true } = {}) {
  // client.query: DELETE jugador, INSERT jugador, SELECT snapshot, INSERT transferencia
  const clientQuery = makeClient(
    { rowCount: 1 },
    { rowCount: 1 },
    hasSnapshot ? SNAPSHOT_CON_HISTORIAL : SNAPSHOT_INICIAL,
    { rowCount: 1 }
  );

  const queries = [
    { rows: [USER] },
    { rows: [TEAM] },
    { rows: [PLAYER_IN] },
    { rowCount: 1, rows: [{}] },  // isInTeam(sale) true
    { rowCount: 0, rows: [] },    // isInTeam(entra) false
    { rows: [JORNADA] },
  ];
  if (hasSnapshot) queries.push({ rows: [{ count: String(count) }] });
  queries.push({ rows: [PRESUPUESTO] });

  queueQueries(...queries);
  return clientQuery;
}

/**
 * Extrae los parámetros del INSERT INTO transferencias del client.
 */
function getTransferInsertParams(clientQuery) {
  const call = clientQuery.mock.calls.find(
    ([sql]) => sql && sql.includes('INSERT INTO transferencias')
  );
  return call ? call[1] : null;
}

// ─── buyPlayer ───────────────────────────────────────────────────────────────

describe('POST /api/market/buy/:jugadorId', () => {
  it('401 sin token', async () => {
    const res = await request(app).post('/api/market/buy/5');
    expect(res.status).toBe(401);
  });

  it('401 token inválido', async () => {
    const res = await request(app).post('/api/market/buy/5').set('Authorization', 'Bearer badtoken');
    expect(res.status).toBe(401);
  });

  it('404 equipo no encontrado', async () => {
    makeClient();
    queueQueries({ rows: [USER] }, { rows: [] });
    const res = await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/equipo fantasy no encontrado/i);
  });

  it('404 jugador no encontrado', async () => {
    makeClient();
    queueQueries({ rows: [USER] }, { rows: [TEAM] }, { rows: [] });
    const res = await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/jugador no encontrado/i);
  });

  it('400 jugador no activo', async () => {
    makeClient();
    queueQueries({ rows: [USER] }, { rows: [TEAM] }, { rows: [{ ...PLAYER, activo: false }] });
    const res = await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no está activo/i);
  });

  it('409 jugador ya en equipo', async () => {
    makeClient();
    queueQueries(
      { rows: [USER] },
      { rows: [TEAM] },
      { rows: [PLAYER] },
      { rowCount: 1, rows: [{ '1': 1 }] }
    );
    const res = await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ya está en tu equipo/i);
  });

  it('422 presupuesto insuficiente', async () => {
    makeClient();
    queueQueries(
      { rows: [USER] },
      { rows: [{ ...TEAM, presupuesto_restante: 100 }] },
      { rows: [PLAYER] },
      { rowCount: 0, rows: [] }
    );
    const res = await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/presupuesto insuficiente/i);
  });

  it('400 sin jornada activa', async () => {
    makeClient({ rows: [{ id: 1 }] });
    queueQueries(
      { rows: [USER] },
      { rows: [TEAM] },
      { rows: [PLAYER] },
      { rowCount: 0, rows: [] },
      { rows: [] }
    );
    const res = await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no hay jornada activa/i);
  });

  it('201 compra exitosa', async () => {
    const clientQuery = setupBuy({ count: 0, hasSnapshot: true });
    const res = await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('jugador');
    expect(res.body.data).toHaveProperty('equipo');
  });

  // ─── Penalizaciones (Art. V: 2 gratis, después -20 c/u) ───────────────────

  it('[PENAL] count=0, con historial → 1ra transferencia: NO penalizada', async () => {
    const clientQuery = setupBuy({ count: 0 });
    await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    const params = getTransferInsertParams(clientQuery);
    expect(params[3]).toBe(false);
    expect(params[4]).toBe(0);
  });

  it('[PENAL] count=1, con historial → 2da transferencia: NO penalizada (1 > 2 = false)', async () => {
    const clientQuery = setupBuy({ count: 1 });
    await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    const params = getTransferInsertParams(clientQuery);
    expect(params[3]).toBe(false);
    expect(params[4]).toBe(0);
  });

  it('[PENAL] count=2, con historial → 3ra transferencia: NO penalizada (2 > 2 = false)', async () => {
    const clientQuery = setupBuy({ count: 2 });
    await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    const params = getTransferInsertParams(clientQuery);
    expect(params[3]).toBe(false);
    expect(params[4]).toBe(0);
  });

  it('[PENAL] count=3, con historial → 4ta transferencia: SÍ penalizada (3 > 2 = true)', async () => {
    const clientQuery = setupBuy({ count: 3 });
    await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    const params = getTransferInsertParams(clientQuery);
    expect(params[3]).toBe(true);
    expect(params[4]).toBe(20);
  });

  it('[PENAL] count=10, con historial → SÍ penalizada (10 > 2 = true)', async () => {
    const clientQuery = setupBuy({ count: 10 });
    await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    const params = getTransferInsertParams(clientQuery);
    expect(params[3]).toBe(true);
    expect(params[4]).toBe(20);
  });

  // ─── Configuración inicial (sin snapshots): NUNCA penaliza ────────────────

  it('[CONFIG INICIAL] sin snapshots → NUNCA penaliza aunque haya muchas compras', async () => {
    const clientQuery = setupBuy({ count: 99, hasSnapshot: false });
    await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    const params = getTransferInsertParams(clientQuery);
    expect(params[3]).toBe(false);
    expect(params[4]).toBe(0);
  });

  it('[CONFIG INICIAL] sin snapshots → ni siquiera consulta el contador de transferencias', async () => {
    setupBuy({ hasSnapshot: false });
    await request(app).post('/api/market/buy/5').set('Authorization', `Bearer ${TOKEN}`);
    // countByEquipoAndJornada NO debe haber sido llamado
    const countCalls = query.mock.calls.filter(([sql]) =>
      sql && sql.toUpperCase().includes('COUNT') && sql.includes('transferencias')
    );
    expect(countCalls).toHaveLength(0);
  });
});

// ─── sellPlayer ──────────────────────────────────────────────────────────────

describe('DELETE /api/market/sell/:jugadorId', () => {
  it('401 sin token', async () => {
    const res = await request(app).delete('/api/market/sell/5');
    expect(res.status).toBe(401);
  });

  it('404 jugador no en equipo', async () => {
    makeClient();
    queueQueries({ rows: [USER] }, { rows: [TEAM] }, { rowCount: 0, rows: [] });
    const res = await request(app).delete('/api/market/sell/5').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no está en tu equipo/i);
  });

  it('400 sin jornada activa', async () => {
    makeClient({ rowCount: 1 });
    queueQueries(
      { rows: [USER] },
      { rows: [TEAM] },
      { rowCount: 1, rows: [{}] },
      { rows: [] }
    );
    const res = await request(app).delete('/api/market/sell/5').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no hay jornada activa/i);
  });

  it('200 venta exitosa', async () => {
    setupSell({ count: 0 });
    const res = await request(app).delete('/api/market/sell/5').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/vendido exitosamente/i);
  });

  it('[PENAL] sell con count=2 → NO penalizada (2 > 2 = false)', async () => {
    const clientQuery = setupSell({ count: 2 });
    await request(app).delete('/api/market/sell/5').set('Authorization', `Bearer ${TOKEN}`);
    const params = getTransferInsertParams(clientQuery);
    expect(params[3]).toBe(false);
    expect(params[4]).toBe(0);
  });

  it('[PENAL] sell con count=3 → SÍ penalizada (3 > 2 = true)', async () => {
    const clientQuery = setupSell({ count: 3 });
    await request(app).delete('/api/market/sell/5').set('Authorization', `Bearer ${TOKEN}`);
    const params = getTransferInsertParams(clientQuery);
    expect(params[3]).toBe(true);
    expect(params[4]).toBe(20);
  });

  it('[CONFIG INICIAL] sell sin snapshots → NO penaliza', async () => {
    const clientQuery = setupSell({ count: 50, hasSnapshot: false });
    await request(app).delete('/api/market/sell/5').set('Authorization', `Bearer ${TOKEN}`);
    const params = getTransferInsertParams(clientQuery);
    expect(params[3]).toBe(false);
    expect(params[4]).toBe(0);
  });
});

// ─── transferPlayer ───────────────────────────────────────────────────────────

describe('POST /api/market/transfer', () => {
  it('401 sin token', async () => {
    const res = await request(app).post('/api/market/transfer');
    expect(res.status).toBe(401);
  });

  it('400 faltan campos', async () => {
    query.mockResolvedValueOnce({ rows: [USER] });
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: 5 });
    expect(res.status).toBe(400);
  });

  it('400 jugador_sale_id negativo', async () => {
    query.mockResolvedValueOnce({ rows: [USER] });
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: -1, jugador_entra_id: 7 });
    expect(res.status).toBe(400);
  });

  it('404 jugador a fichar no existe', async () => {
    makeClient();
    queueQueries({ rows: [USER] }, { rows: [TEAM] }, { rows: [] });
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: 5, jugador_entra_id: 7 });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/jugador a fichar no encontrado/i);
  });

  it('400 jugador a fichar inactivo', async () => {
    makeClient();
    queueQueries({ rows: [USER] }, { rows: [TEAM] }, { rows: [{ ...PLAYER_IN, activo: false }] });
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: 5, jugador_entra_id: 7 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no está activo/i);
  });

  it('404 jugador a vender no en el equipo', async () => {
    makeClient();
    queueQueries(
      { rows: [USER] }, { rows: [TEAM] }, { rows: [PLAYER_IN] },
      { rowCount: 0, rows: [] }
    );
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: 5, jugador_entra_id: 7 });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/jugador a vender no está en tu equipo/i);
  });

  it('409 jugador a fichar ya en el equipo', async () => {
    makeClient();
    queueQueries(
      { rows: [USER] }, { rows: [TEAM] }, { rows: [PLAYER_IN] },
      { rowCount: 1, rows: [{}] },
      { rowCount: 1, rows: [{}] }
    );
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: 5, jugador_entra_id: 7 });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ya está en tu equipo/i);
  });

  it('422 sin presupuesto para el fichaje', async () => {
    makeClient();
    queueQueries(
      { rows: [USER] },
      { rows: [{ ...TEAM, presupuesto_restante: 100 }] },
      { rows: [{ ...PLAYER_IN, precio: 10_000_000 }] },
      { rowCount: 1, rows: [{}] },
      { rowCount: 0, rows: [] }
    );
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: 5, jugador_entra_id: 7 });
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/presupuesto insuficiente/i);
  });

  it('200 transferencia exitosa', async () => {
    setupTransfer({ count: 0 });
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: 5, jugador_entra_id: 7 });
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/transferencia realizada/i);
  });

  it('[PENAL] transfer count=2 → NO penalizada en respuesta', async () => {
    setupTransfer({ count: 2 });
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: 5, jugador_entra_id: 7 });
    expect(res.body.data.penalizada).toBe(false);
    expect(res.body.data.penalizacion).toBe(0);
  });

  it('[PENAL] transfer count=3 → SÍ penalizada en respuesta (-20 pts)', async () => {
    setupTransfer({ count: 3 });
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: 5, jugador_entra_id: 7 });
    expect(res.body.data.penalizada).toBe(true);
    expect(res.body.data.penalizacion).toBe(20);
  });

  it('[CONFIG INICIAL] transfer sin snapshots → NO penaliza', async () => {
    setupTransfer({ count: 50, hasSnapshot: false });
    const res = await request(app)
      .post('/api/market/transfer')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ jugador_sale_id: 5, jugador_entra_id: 7 });
    expect(res.body.data.penalizada).toBe(false);
    expect(res.body.data.penalizacion).toBe(0);
  });
});

// ─── rutas públicas ──────────────────────────────────────────────────────────

describe('GET /api/market/players (público)', () => {
  it('200 sin autenticación', async () => {
    queueQueries({ rows: [] }, { rows: [{ count: '0' }] });
    const res = await request(app).get('/api/market/players');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('jugadores');
  });

  it('200 con paginación en respuesta', async () => {
    queueQueries(
      { rows: [PLAYER] },
      { rows: [{ count: '1' }] }
    );
    const res = await request(app).get('/api/market/players');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.jugadores).toHaveLength(1);
  });
});
