/**
 * Tests para errorHandler middleware y createError.
 * Cubre: mapeo de códigos PostgreSQL → HTTP, errores de negocio, errores genéricos.
 */

process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.NODE_ENV = 'test';

const { createError, errorHandler } = require('../src/middleware/errorHandler');

// Mock de res y next para pruebas unitarias
function makeRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body)   { this._body = body; return this; },
  };
  return res;
}

const makeReq = () => ({});
const makeNext = () => jest.fn();

describe('createError', () => {
  it('crea un Error con statusCode y message', () => {
    const err = createError(404, 'No encontrado');
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('No encontrado');
  });

  it('crea un error 400', () => {
    const err = createError(400, 'Datos inválidos');
    expect(err.statusCode).toBe(400);
  });

  it('crea un error 422', () => {
    const err = createError(422, 'Presupuesto insuficiente');
    expect(err.statusCode).toBe(422);
    expect(err.message).toContain('Presupuesto insuficiente');
  });

  it('el error tiene stack trace', () => {
    const err = createError(500, 'Error interno');
    expect(err.stack).toBeDefined();
  });
});

describe('errorHandler — errores PostgreSQL', () => {
  it('código 23505 (unique violation) → 409', () => {
    const res = makeRes();
    const err = Object.assign(new Error('duplicate key'), { code: '23505' });
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(409);
    expect(res._body.success).toBe(false);
    expect(res._body.message).toMatch(/ya existe/i);
  });

  it('código 23503 (foreign key violation) → 400', () => {
    const res = makeRes();
    const err = Object.assign(new Error('foreign key'), { code: '23503' });
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(400);
    expect(res._body.message).toMatch(/referencia/i);
  });

  it('código 23514 (check constraint) → 400', () => {
    const res = makeRes();
    const err = Object.assign(new Error('check constraint'), { code: '23514' });
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(400);
    expect(res._body.message).toMatch(/regla de negocio/i);
  });

  it('código 23502 (not null violation) → 400', () => {
    const res = makeRes();
    const err = Object.assign(new Error('not null'), { code: '23502' });
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(400);
    expect(res._body.message).toMatch(/campo obligatorio/i);
  });

  it('código P0001 (RAISE EXCEPTION) → 422 con mensaje del error', () => {
    const res = makeRes();
    const err = Object.assign(new Error('Presupuesto insuficiente para fichar'), { code: 'P0001' });
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(422);
    expect(res._body.message).toContain('Presupuesto insuficiente');
  });
});

describe('errorHandler — errores de negocio (statusCode)', () => {
  it('error 404 → status 404', () => {
    const res = makeRes();
    const err = createError(404, 'No encontrado');
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(404);
    expect(res._body.success).toBe(false);
    expect(res._body.message).toBe('No encontrado');
  });

  it('error 400 → status 400', () => {
    const res = makeRes();
    const err = createError(400, 'Datos inválidos');
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(400);
  });

  it('error 401 → status 401', () => {
    const res = makeRes();
    const err = createError(401, 'No autorizado');
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(401);
  });

  it('error 409 → status 409', () => {
    const res = makeRes();
    const err = createError(409, 'Conflicto');
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(409);
  });

  it('error 422 → status 422 con mensaje completo', () => {
    const res = makeRes();
    const err = createError(422, 'Presupuesto insuficiente. Necesitas 5000000, tienes 100');
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(422);
    expect(res._body.message).toContain('5000000');
  });
});

describe('errorHandler — error genérico (500)', () => {
  it('error sin statusCode ni code → 500', () => {
    const res = makeRes();
    const err = new Error('algo salió mal');
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(500);
    expect(res._body.success).toBe(false);
    expect(res._body.message).toBe('Error interno del servidor');
  });

  it('error ReferenceError → 500', () => {
    const res = makeRes();
    const err = new ReferenceError('foo is not defined');
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(500);
  });
});

describe('errorHandler — errores de validación', () => {
  it('error tipo validation → 400 con errores', () => {
    const res = makeRes();
    const err = Object.assign(new Error('Error de validación'), {
      type: 'validation',
      errors: [{ field: 'email', message: 'Email inválido' }],
    });
    errorHandler(err, makeReq(), res, makeNext());
    expect(res._status).toBe(400);
    expect(res._body.errors).toBeDefined();
    expect(res._body.errors[0].field).toBe('email');
  });
});
