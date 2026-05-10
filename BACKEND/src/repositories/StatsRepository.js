const { query } = require('../config/database');

class StatsRepository {
  async findByPartido(partidoId) {
    const result = await query(
      `SELECT e.*, j.nombre AS jugador_nombre, j.posicion
       FROM estadisticas e
       JOIN jugadores j ON j.id = e.jugador_id
       WHERE e.partido_id = $1
       ORDER BY e.puntos DESC`,
      [partidoId]
    );
    return result.rows;
  }

  async findByJugadorAndPartido(jugadorId, partidoId) {
    const result = await query(
      'SELECT * FROM estadisticas WHERE jugador_id = $1 AND partido_id = $2',
      [jugadorId, partidoId]
    );
    return result.rows[0] || null;
  }

  async findByJugador(jugadorId, { limit = 10 } = {}) {
    const result = await query(
      `SELECT e.*, p.fecha, p.estado,
              el.nombre AS equipo_local, ev.nombre AS equipo_visitante
       FROM estadisticas e
       JOIN partidos p ON p.id = e.partido_id
       JOIN equipos_lnb el ON el.id = p.equipo_local_id
       JOIN equipos_lnb ev ON ev.id = p.equipo_visitante_id
       WHERE e.jugador_id = $1
       ORDER BY p.fecha DESC
       LIMIT $2`,
      [jugadorId, limit]
    );
    return result.rows;
  }

  async upsert(jugadorId, partidoId, stats) {
    const {
      puntos = 0, rebotes = 0, asistencias = 0, robos = 0, tapas = 0,
      perdidas = 0, faltas = 0,
      tirosCampoIntentados = 0, tirosCampoConvertidos = 0,
      triplesIntentados = 0, triplesConvertidos = 0,
      libresIntentados = 0, libresConvertidos = 0,
    } = stats;

    const result = await query(
      `INSERT INTO estadisticas (
         jugador_id, partido_id, puntos, rebotes, asistencias, robos, tapas, perdidas, faltas,
         tiros_campo_intentados, tiros_campo_convertidos,
         triples_intentados, triples_convertidos,
         libres_intentados, libres_convertidos
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (jugador_id, partido_id)
       DO UPDATE SET
         puntos = EXCLUDED.puntos,
         rebotes = EXCLUDED.rebotes,
         asistencias = EXCLUDED.asistencias,
         robos = EXCLUDED.robos,
         tapas = EXCLUDED.tapas,
         perdidas = EXCLUDED.perdidas,
         faltas = EXCLUDED.faltas,
         tiros_campo_intentados = EXCLUDED.tiros_campo_intentados,
         tiros_campo_convertidos = EXCLUDED.tiros_campo_convertidos,
         triples_intentados = EXCLUDED.triples_intentados,
         triples_convertidos = EXCLUDED.triples_convertidos,
         libres_intentados = EXCLUDED.libres_intentados,
         libres_convertidos = EXCLUDED.libres_convertidos,
         actualizado_en = NOW()
       RETURNING *`,
      [
        jugadorId, partidoId, puntos, rebotes, asistencias, robos, tapas, perdidas, faltas,
        tirosCampoIntentados, tirosCampoConvertidos,
        triplesIntentados, triplesConvertidos,
        libresIntentados, libresConvertidos,
      ]
    );
    return result.rows[0];
  }

  // --- Vistas de scoring ---

  async getPuntosFantasyPorPartido(jugadorId) {
    const result = await query(
      `SELECT * FROM puntos_fantasy_por_partido WHERE jugador_id = $1 ORDER BY partido_id DESC`,
      [jugadorId]
    );
    return result.rows;
  }

  async getPuntosJugadorPorJornada(jornadaId, jugadorId) {
    const params = [jornadaId];
    let extra = '';
    if (jugadorId) {
      params.push(jugadorId);
      extra = `AND jugador_id = $${params.length}`;
    }
    const result = await query(
      `SELECT * FROM puntos_jugador_por_jornada WHERE jornada_id = $1 ${extra}`,
      params
    );
    return result.rows;
  }
}

module.exports = new StatsRepository();
