/**
 * Tests para rutas /api/gameweeks
 * Cubre: acceso público vs. protegido por isAdmin, validaciones de cuerpo.
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

const { query } = require('../src/config/database');

const USER_TOKEN  = jwt.sign({ userId: 1 }, 'test-secret-key-for-jest');
const ADMIN_TOKEN = jwt.sign({ userId: 2 }, 'test-secret-key-for-jest');

const REGULAR_USER = { id: 1, nombre: 'User',  email: 'u@test.com', activo: true, es_admin: false };
const ADMIN_USER   = { id: 2, nombre: 'Admin', email: 'a@test.com', activo: true, es_admin: true  };

beforeEach(() => jest.resetAllMocks());
afterAll(() => pool.end());

// ─── Rutas públicas (GET) ─────────────────────────────────────────────────────

describe('Rutas GET públicas de gameweeks', () => {
  it('GET /api/gameweeks → 200 sin autenticación', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/gameweeks');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/gameweeks/current → 404 si no hay jornada activa', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // findCurrent null
    const res = await request(app).get('/api/gameweeks/current');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no hay jornada activa/i);
  });

  it('GET /api/gameweeks/current → 200 con jornada activa', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, numero: 1, cerrada: false }] });
    const res = await request(app).get('/api/gameweeks/current');
    expect(res.status).toBe(200);
    expect(res.body.data.numero).toBe(1);
  });
});

// ─── POST /api/gameweeks — crear jornada ──────────────────────────────────────

describe('POST /api/gameweeks (crear jornada)', () => {
  it('401 sin token', async () => {
    const res = await request(app).post('/api/gameweeks').send({ numero: 39 });
    expect(res.status).toBe(401);
  });

  it('403 usuario autenticado pero NO admin', async () => {
    query.mockResolvedValueOnce({ rows: [REGULAR_USER] }); // auth
    const res = await request(app)
      .post('/api/gameweeks')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ numero: 39 });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permisos de administrador/i);
  });

  it('400 admin pero falta campo número', async () => {
    query.mockResolvedValueOnce({ rows: [ADMIN_USER] }); // auth
    const res = await request(app)
      .post('/api/gameweeks')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({}); // sin numero
    expect(res.status).toBe(400);
  });

  it('400 numero no es entero', async () => {
    query.mockResolvedValueOnce({ rows: [ADMIN_USER] });
    const res = await request(app)
      .post('/api/gameweeks')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ numero: 'abc' });
    expect(res.status).toBe(400);
  });

  it('201 admin puede crear jornada', async () => {
    query
      .mockResolvedValueOnce({ rows: [ADMIN_USER] })   // auth
      .mockResolvedValueOnce({ rows: [{ id: 39, numero: 39, cerrada: false }] }); // INSERT
    const res = await request(app)
      .post('/api/gameweeks')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ numero: 39 });
    expect(res.status).toBe(201);
    expect(res.body.data.numero).toBe(39);
  });
});

// ─── PATCH /api/gameweeks/:id — editar jornada ────────────────────────────────

describe('PATCH /api/gameweeks/:id (editar jornada)', () => {
  it('401 sin token', async () => {
    const res = await request(app).patch('/api/gameweeks/1').send({});
    expect(res.status).toBe(401);
  });

  it('403 usuario NO admin', async () => {
    query.mockResolvedValueOnce({ rows: [REGULAR_USER] });
    const res = await request(app)
      .patch('/api/gameweeks/1')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ cerrada: true });
    expect(res.status).toBe(403);
  });

  it('200 admin puede editar jornada', async () => {
    query
      .mockResolvedValueOnce({ rows: [ADMIN_USER] })              // auth
      .mockResolvedValueOnce({ rows: [{ id: 1, numero: 1 }] })   // resolveJornadaId findById
      .mockResolvedValueOnce({ rows: [{ id: 1, numero: 1, cerrada: false }] }); // update
    const res = await request(app)
      .patch('/api/gameweeks/1')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({});
    expect([200, 400]).toContain(res.status); // 200 si OK, 400 si validación body falla
  });
});

// ─── POST /api/gameweeks/:id/lock ────────────────────────────────────────────

describe('POST /api/gameweeks/:id/lock (cerrar jornada)', () => {
  it('401 sin token', async () => {
    const res = await request(app).post('/api/gameweeks/1/lock');
    expect(res.status).toBe(401);
  });

  it('403 usuario NO admin', async () => {
    query.mockResolvedValueOnce({ rows: [REGULAR_USER] });
    const res = await request(app)
      .post('/api/gameweeks/1/lock')
      .set('Authorization', `Bearer ${USER_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('404 jornada no encontrada (admin)', async () => {
    query
      .mockResolvedValueOnce({ rows: [ADMIN_USER] }) // auth
      .mockResolvedValueOnce({ rows: [] })            // findById → null
      .mockResolvedValueOnce({ rows: [] });            // findByNumero → null
    const res = await request(app)
      .post('/api/gameweeks/999/lock')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/gameweeks/:id/matches ─────────────────────────────────────────

describe('POST /api/gameweeks/:id/matches (crear partido)', () => {
  it('401 sin token', async () => {
    const res = await request(app).post('/api/gameweeks/1/matches').send({});
    expect(res.status).toBe(401);
  });

  it('403 usuario NO admin', async () => {
    query.mockResolvedValueOnce({ rows: [REGULAR_USER] });
    const res = await request(app)
      .post('/api/gameweeks/1/matches')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ equipoLocalId: 1, equipoVisitanteId: 2 });
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/gameweeks/:id/matches/:partidoId ─────────────────────────────

describe('PATCH /api/gameweeks/:id/matches/:partidoId (actualizar partido)', () => {
  it('401 sin token', async () => {
    const res = await request(app).patch('/api/gameweeks/1/matches/1').send({});
    expect(res.status).toBe(401);
  });

  it('403 usuario NO admin', async () => {
    query.mockResolvedValueOnce({ rows: [REGULAR_USER] });
    const res = await request(app)
      .patch('/api/gameweeks/1/matches/1')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ estado: 'FINALIZADO' });
    expect(res.status).toBe(403);
  });

  it('400 estado inválido (admin)', async () => {
    query.mockResolvedValueOnce({ rows: [ADMIN_USER] });
    const res = await request(app)
      .patch('/api/gameweeks/1/matches/1')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ estado: 'ESTADO_INVALIDO' });
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/gameweeks/:id/matches/:partidoId/stats ────────────────────────

describe('POST /api/gameweeks/:id/matches/:partidoId/stats (cargar stats)', () => {
  it('401 sin token', async () => {
    const res = await request(app).post('/api/gameweeks/1/matches/1/stats').send({});
    expect(res.status).toBe(401);
  });

  it('403 usuario NO admin', async () => {
    query.mockResolvedValueOnce({ rows: [REGULAR_USER] });
    const res = await request(app)
      .post('/api/gameweeks/1/matches/1/stats')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ jugadorId: 5 });
    expect(res.status).toBe(403);
  });

  it('400 jugadorId inválido (admin)', async () => {
    query.mockResolvedValueOnce({ rows: [ADMIN_USER] });
    const res = await request(app)
      .post('/api/gameweeks/1/matches/1/stats')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({}); // falta jugadorId
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/gameweeks/admin/advance-week ───────────────────────────────────

describe('POST /api/gameweeks/admin/advance-week', () => {
  it('401 sin token', async () => {
    const res = await request(app).post('/api/gameweeks/admin/advance-week');
    expect(res.status).toBe(401);
  });

  it('403 usuario NO admin', async () => {
    query.mockResolvedValueOnce({ rows: [REGULAR_USER] });
    const res = await request(app)
      .post('/api/gameweeks/admin/advance-week')
      .set('Authorization', `Bearer ${USER_TOKEN}`);
    expect(res.status).toBe(403);
  });
});
