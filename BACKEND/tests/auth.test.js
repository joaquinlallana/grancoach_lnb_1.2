process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

// Mock de la DB para tests unitarios
jest.mock('../src/config/database', () => {
  const mockQuery = jest.fn();
  const mockWithTransaction = jest.fn();
  return {
    query: mockQuery,
    withTransaction: mockWithTransaction,
    pool: { end: jest.fn() },
  };
});

const { query, withTransaction } = require('../src/config/database');

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar 400 si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('debe retornar 400 si el email es inválido', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nombre: 'Test',
      email: 'no-es-email',
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });

  it('debe retornar 400 si la contraseña es muy corta', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nombre: 'Test',
      email: 'test@test.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });

  it('debe retornar 409 si el email ya existe', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@test.com' }] });

    const res = await request(app).post('/api/auth/register').send({
      nombre: 'Test',
      email: 'test@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('debe registrar usuario exitosamente', async () => {
    // findByEmail retorna vacío
    query.mockResolvedValueOnce({ rows: [] });
    // withTransaction crea usuario y equipo
    withTransaction.mockResolvedValueOnce({
      user: { id: 1, nombre: 'Test', email: 'test@test.com', activo: true },
      team: { id: 1, nombre: 'Equipo de Test', presupuesto_restante: 100000000 },
    });

    const res = await request(app).post('/api/auth/register').send({
      nombre: 'Test',
      email: 'test@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });
});

describe('POST /api/auth/login', () => {
  it('debe retornar 400 si faltan campos', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('debe retornar 401 si el usuario no existe', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/auth/login').send({
      email: 'noexiste@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('debe retornar status ok', async () => {
    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

afterAll(async () => {
  await pool.end();
});
