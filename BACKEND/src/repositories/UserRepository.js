const { query, withTransaction } = require('../config/database');

class UserRepository {
  /**
   * Crea un usuario y su equipo fantasy en una sola transacción.
   */
  async createWithFantasyTeam({ nombre, email, passwordHash, nombreEquipo }) {
    return withTransaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO usuarios (nombre, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, nombre, email, activo, creado_en, es_admin`,
        [nombre, email, passwordHash]
      );
      const user = userResult.rows[0];

      const teamResult = await client.query(
        `INSERT INTO equipos_fantasy (nombre, usuario_id)
         VALUES ($1, $2)
         RETURNING id, nombre, presupuesto_restante, presupuesto_inicial`,
        [nombreEquipo, user.id]
      );

      return { user, team: teamResult.rows[0] };
    });
  }

  async findByEmail(email) {
    const result = await query(
      'SELECT id, nombre, email, password_hash, activo, ultimo_login, es_admin FROM usuarios WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await query(
      'SELECT id, nombre, email, activo, creado_en, ultimo_login, es_admin FROM usuarios WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async updateLastLogin(userId) {
    await query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
      [userId]
    );
  }

  async updateProfile(userId, { nombre }) {
    const result = await query(
      `UPDATE usuarios SET nombre = $1, actualizado_en = NOW()
       WHERE id = $2
       RETURNING id, nombre, email, activo, es_admin`,
      [nombre, userId]
    );
    return result.rows[0] || null;
  }

  async deactivate(userId) {
    await query('UPDATE usuarios SET activo = false WHERE id = $1', [userId]);
  }
}

module.exports = new UserRepository();
