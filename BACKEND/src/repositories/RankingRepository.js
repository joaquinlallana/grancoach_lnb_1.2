const { query } = require('../config/database');

class RankingRepository {
  async getRankingGeneral({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT * FROM ranking_general_completo ORDER BY posicion LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countResult = await query(`SELECT COUNT(*) FROM ranking_general_completo`);
    return {
      ranking: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  async getRankingPorJornada(jornadaId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT rj.*, ef.nombre AS equipo_nombre, u.nombre AS usuario_nombre
       FROM ranking_por_jornada rj
       JOIN equipos_fantasy ef ON ef.id = rj.equipo_fantasy_id
       JOIN usuarios u ON u.id = ef.usuario_id
       WHERE rj.jornada_id = $1
       ORDER BY rj.puntos_totales DESC
       LIMIT $2 OFFSET $3`,
      [jornadaId, limit, offset]
    );
    const countResult = await query(
      `SELECT COUNT(*) FROM ranking_por_jornada WHERE jornada_id = $1`,
      [jornadaId]
    );
    return {
      ranking: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  async getPuntosEquipoPorJornada(equipoFantasyId, jornadaId) {
    const params = [equipoFantasyId];
    let extra = '';
    if (jornadaId) {
      params.push(jornadaId);
      extra = `AND jornada_id = $${params.length}`;
    }
    const result = await query(
      `SELECT * FROM puntos_equipo_por_jornada WHERE equipo_fantasy_id = $1 ${extra}`,
      params
    );
    return result.rows;
  }

  async getTotalEquipoPorJornada(equipoFantasyId) {
    const result = await query(
      `SELECT * FROM total_equipo_por_jornada WHERE equipo_fantasy_id = $1 ORDER BY jornada_id DESC`,
      [equipoFantasyId]
    );
    return result.rows;
  }

  async getTotalGeneralAcumulado() {
    const result = await query(`SELECT * FROM total_general_acumulado ORDER BY puntos_totales DESC`);
    return result.rows;
  }
}

module.exports = new RankingRepository();
