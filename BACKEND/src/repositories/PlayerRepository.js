const { query } = require('../config/database');

class PlayerRepository {
  /**
   * Lista jugadores del mercado con filtros opcionales.
   */
  async findAll({ posicion, equipoId, soloActivos = true, page = 1, limit = 20, search, excludeUserId } = {}) {
    const conditions = [];
    const params = [];

    if (soloActivos) {
      conditions.push(`j.activo = true`);
    }
    if (posicion) {
      params.push(posicion);
      conditions.push(`j.posicion = $${params.length}`);
    }
    if (equipoId) {
      params.push(equipoId);
      conditions.push(`j.equipo_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`j.nombre ILIKE $${params.length}`);
    }
    if (excludeUserId) {
      params.push(excludeUserId);
      conditions.push(`j.id NOT IN (
        SELECT efj.jugador_id FROM equipo_fantasy_jugadores efj
        JOIN equipos_fantasy ef ON ef.id = efj.equipo_fantasy_id
        WHERE ef.usuario_id = $${params.length}
      )`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    params.push(limit);
    params.push(offset);

    const result = await query(
      `SELECT j.id, j.nombre, j.posicion, j.precio, j.activo, j.altura_cm, j.numero_camiseta,
              el.id AS equipo_id, el.nombre AS equipo_nombre, el.ciudad AS equipo_ciudad,
              p.nombre AS posicion_nombre, p.abreviatura AS posicion_abrev
       FROM jugadores j
       LEFT JOIN equipos_lnb el ON el.id = j.equipo_id
       LEFT JOIN posiciones p ON p.id = j.posicion_id
       ${where}
       ORDER BY j.precio DESC, j.nombre
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Contar total para paginación
    const countParams = params.slice(0, -2);
    const countResult = await query(
      `SELECT COUNT(*) FROM jugadores j ${where}`,
      countParams
    );

    return {
      jugadores: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  async findById(id) {
    const result = await query(
      `SELECT j.id, j.nombre, j.posicion, j.precio, j.activo, j.altura_cm, j.numero_camiseta,
              el.id AS equipo_id, el.nombre AS equipo_nombre, el.ciudad AS equipo_ciudad,
              p.nombre AS posicion_nombre, p.abreviatura AS posicion_abrev
       FROM jugadores j
       LEFT JOIN equipos_lnb el ON el.id = j.equipo_id
       LEFT JOIN posiciones p ON p.id = j.posicion_id
       WHERE j.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Verifica si un jugador ya está en un equipo fantasy.
   */
  async isInTeam(jugadorId, equipoFantasyId) {
    const result = await query(
      `SELECT 1 FROM equipo_fantasy_jugadores
       WHERE jugador_id = $1 AND equipo_fantasy_id = $2`,
      [jugadorId, equipoFantasyId]
    );
    return result.rowCount > 0;
  }

  /**
   * Agrega un jugador al equipo. El trigger controlar_presupuesto() descuenta automáticamente.
   */
  async addToTeam(jugadorId, equipoFantasyId, { esTitular = true, esCapitan = false } = {}) {
    const result = await query(
      `INSERT INTO equipo_fantasy_jugadores (equipo_fantasy_id, jugador_id, es_titular, es_capitan)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [equipoFantasyId, jugadorId, esTitular, esCapitan]
    );
    return result.rows[0];
  }

  /**
   * Elimina un jugador del equipo. El trigger devolver_presupuesto() reintegra automáticamente.
   */
  async removeFromTeam(jugadorId, equipoFantasyId) {
    const result = await query(
      `DELETE FROM equipo_fantasy_jugadores
       WHERE jugador_id = $1 AND equipo_fantasy_id = $2
       RETURNING *`,
      [jugadorId, equipoFantasyId]
    );
    return result.rows[0] || null;
  }

  async findByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(
      `SELECT id, nombre, posicion FROM jugadores WHERE id IN (${placeholders})`,
      ids
    );
    return result.rows;
  }

  async getRosterCount(equipoFantasyId) {
    const result = await query(
      'SELECT COUNT(*) FROM equipo_fantasy_jugadores WHERE equipo_fantasy_id = $1',
      [equipoFantasyId]
    );
    return parseInt(result.rows[0].count);
  }

  async getEquiposLnb() {
    const result = await query(
      'SELECT id, nombre, ciudad FROM equipos_lnb WHERE activo = true ORDER BY nombre'
    );
    return result.rows;
  }

  async getPosiciones() {
    const result = await query('SELECT id, nombre, abreviatura FROM posiciones ORDER BY nombre');
    return result.rows;
  }

  // Admin: CRUD de jugadores
  async create({ nombre, posicion, equipoId, precio, posicionId, alturaCm, numeroCamiseta }) {
    const result = await query(
      `INSERT INTO jugadores (nombre, posicion, equipo_id, precio, posicion_id, altura_cm, numero_camiseta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nombre, posicion, equipoId, precio, posicionId, alturaCm, numeroCamiseta]
    );
    return result.rows[0];
  }

  async update(id, fields) {
    const sets = [];
    const params = [];
    for (const [key, val] of Object.entries(fields)) {
      params.push(val);
      sets.push(`${key} = $${params.length}`);
    }
    sets.push(`actualizado_en = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE jugadores SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  }
}

module.exports = new PlayerRepository();
