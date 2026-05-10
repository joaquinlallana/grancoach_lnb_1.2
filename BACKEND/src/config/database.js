const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fantasy_lnb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Error inesperado en cliente PostgreSQL inactivo', err);
  process.exit(-1);
});

/**
 * Ejecuta una query con parámetros. Usa el pool directamente.
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtiene un cliente del pool para usar transacciones manuales.
 */
const getClient = () => pool.connect();

/**
 * Helper para ejecutar lógica dentro de una transacción.
 * Si algo falla hace ROLLBACK automático.
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, withTransaction, pool };
