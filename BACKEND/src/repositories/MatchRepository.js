const { query } = require('../config/database');

class MatchRepository {
  async findAll({ jornadaId, estado, page = 1, limit = 20 } = {}) {
    const conditions = [];
    const params = [];

    if (jornadaId) {
      params.push(jornadaId);
      conditions.push(`p.jornada_id = $${params.length}`);
    }
    if (estado) {
      params.push(estado);
      conditions.push(`p.estado = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    params.push(limit);
    params.push(offset);

    const result = await query(
      `SELECT p.id, p.jornada_id, p.api_basketball_id, p.fecha, p.estado,
              p.puntos_local, p.puntos_visitante,
              el.nombre AS equipo_local, el.ciudad AS ciudad_local,
              ev.nombre AS equipo_visitante, ev.ciudad AS ciudad_visitante,
              j.numero AS jornada_numero
       FROM partidos p
       JOIN equipos_lnb el ON el.id = p.equipo_local_id
       JOIN equipos_lnb ev ON ev.id = p.equipo_visitante_id
       JOIN jornadas j ON j.id = p.jornada_id
       ${where}
       ORDER BY p.fecha DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return result.rows;
  }

  async findById(id) {
    const result = await query(
      `SELECT p.id, p.jornada_id, p.fecha, p.estado,
              p.puntos_local, p.puntos_visitante,
              p.equipo_local_id, p.equipo_visitante_id,
              el.nombre AS equipo_local, ev.nombre AS equipo_visitante
       FROM partidos p
       JOIN equipos_lnb el ON el.id = p.equipo_local_id
       JOIN equipos_lnb ev ON ev.id = p.equipo_visitante_id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create({ jornadaId, equipoLocalId, equipoVisitanteId, fecha, quienRegistro }) {
    const result = await query(
      `INSERT INTO partidos (jornada_id, equipo_local_id, equipo_visitante_id, fecha, quien_registro)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [jornadaId, equipoLocalId, equipoVisitanteId, fecha, quienRegistro]
    );
    return result.rows[0];
  }

  async update(id, { estado, puntosLocal, puntosVisitante }) {
    const result = await query(
      `UPDATE partidos
       SET estado = COALESCE($1, estado),
           puntos_local = COALESCE($2, puntos_local),
           puntos_visitante = COALESCE($3, puntos_visitante),
           actualizado_en = NOW()
       WHERE id = $4
       RETURNING *`,
      [estado, puntosLocal, puntosVisitante, id]
    );
    return result.rows[0] || null;
  }
}

module.exports = new MatchRepository();
