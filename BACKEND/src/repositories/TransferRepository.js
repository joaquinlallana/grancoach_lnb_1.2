const { query } = require('../config/database');

class TransferRepository {
  async findByEquipo(equipoFantasyId, { limit = 20 } = {}) {
    const result = await query(
      `SELECT t.id, t.equipo_fantasy_id, t.jornada_id, t.es_penalizada,
              t.penalizacion_puntos, t.creado_en,
              js.nombre AS jugador_sale, js.posicion AS posicion_sale,
              je.nombre AS jugador_entra, je.posicion AS posicion_entra,
              j.numero AS jornada_numero
       FROM transferencias t
       LEFT JOIN jugadores js ON js.id = t.jugador_sale_id
       LEFT JOIN jugadores je ON je.id = t.jugador_entra_id
       JOIN jornadas j ON j.id = t.jornada_id
       WHERE t.equipo_fantasy_id = $1
       ORDER BY t.creado_en DESC
       LIMIT $2`,
      [equipoFantasyId, limit]
    );
    return result.rows;
  }

  async countByEquipoAndJornada(equipoFantasyId, jornadaId) {
    const result = await query(
      `SELECT COUNT(*) FROM transferencias WHERE equipo_fantasy_id = $1 AND jornada_id = $2`,
      [equipoFantasyId, jornadaId]
    );
    return parseInt(result.rows[0].count);
  }

  async create({ equipoFantasyId, jugadorSaleId, jugadorEntraId, jornadaId, esPenalizada, penalizacionPuntos }) {
    const result = await query(
      `INSERT INTO transferencias (equipo_fantasy_id, jugador_sale_id, jugador_entra_id, jornada_id, es_penalizada, penalizacion_puntos)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [equipoFantasyId, jugadorSaleId, jugadorEntraId, jornadaId, esPenalizada, penalizacionPuntos || 0]
    );
    return result.rows[0];
  }

  async getPenalizacionesByEquipoAndJornada(equipoFantasyId, jornadaId) {
    const result = await query(
      `SELECT COALESCE(SUM(penalizacion_puntos), 0) AS total_penalizacion
       FROM transferencias
       WHERE equipo_fantasy_id = $1 AND jornada_id = $2 AND es_penalizada = true`,
      [equipoFantasyId, jornadaId]
    );
    return parseInt(result.rows[0].total_penalizacion);
  }
}

module.exports = new TransferRepository();
