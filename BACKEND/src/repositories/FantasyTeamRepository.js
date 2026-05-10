const { query, withTransaction } = require('../config/database');

class FantasyTeamRepository {
  async findByUserId(userId) {
    const result = await query(
      `SELECT ef.id, ef.nombre, ef.usuario_id, ef.presupuesto_restante, ef.presupuesto_inicial, ef.creado_en
       FROM equipos_fantasy ef
       WHERE ef.usuario_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await query(
      `SELECT id, nombre, usuario_id, presupuesto_restante, presupuesto_inicial, creado_en
       FROM equipos_fantasy WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Retorna el equipo con su roster completo (titulares y suplentes).
   */
  async findWithRoster(userId) {
    const team = await this.findByUserId(userId);
    if (!team) return null;

    const roster = await query(
      `SELECT efj.id AS relacion_id, efj.es_titular, efj.es_capitan,
              j.id, j.nombre, j.posicion, j.precio, j.activo,
              el.nombre AS equipo_nombre, el.ciudad AS equipo_ciudad,
              p.nombre AS posicion_nombre, p.abreviatura AS posicion_abrev
       FROM equipo_fantasy_jugadores efj
       JOIN jugadores j ON j.id = efj.jugador_id
       LEFT JOIN equipos_lnb el ON el.id = j.equipo_id
       LEFT JOIN posiciones p ON p.id = j.posicion_id
       WHERE efj.equipo_fantasy_id = $1
       ORDER BY efj.es_titular DESC, efj.es_capitan DESC, j.nombre`,
      [team.id]
    );

    return { ...team, jugadores: roster.rows };
  }

  async updateNombre(teamId, nombre) {
    const result = await query(
      `UPDATE equipos_fantasy SET nombre = $1, actualizado_en = NOW()
       WHERE id = $2 RETURNING id, nombre`,
      [nombre, teamId]
    );
    return result.rows[0] || null;
  }

  /**
   * Actualiza el rol de un jugador en la alineación (titular/suplente/capitán).
   * La DB ya valida que el capitán sea titular (CHECK constraint).
   */
  async updateLineup(teamId, lineupChanges) {
    return withTransaction(async (client) => {
      const results = [];
      for (const change of lineupChanges) {
        const { jugadorId, esTitular, esCapitan } = change;

        // Si se está asignando capitán, quitar el capitán anterior
        if (esCapitan) {
          await client.query(
            `UPDATE equipo_fantasy_jugadores SET es_capitan = false
             WHERE equipo_fantasy_id = $1 AND jugador_id <> $2`,
            [teamId, jugadorId]
          );
        }

        const r = await client.query(
          `UPDATE equipo_fantasy_jugadores
           SET es_titular = $1, es_capitan = $2
           WHERE equipo_fantasy_id = $3 AND jugador_id = $4
           RETURNING *`,
          [esTitular, esCapitan ?? false, teamId, jugadorId]
        );

        if (r.rowCount === 0) {
          throw Object.assign(new Error(`Jugador ${jugadorId} no pertenece a este equipo`), {
            statusCode: 404,
          });
        }
        results.push(r.rows[0]);
      }
      return results;
    });
  }

  async getPresupuesto(teamId) {
    const result = await query(
      'SELECT presupuesto_restante, presupuesto_inicial FROM equipos_fantasy WHERE id = $1',
      [teamId]
    );
    return result.rows[0] || null;
  }

  async getAuditPresupuesto(teamId, limit = 20) {
    const result = await query(
      `SELECT * FROM audit_presupuesto WHERE equipo_fantasy_id = $1
       ORDER BY realizado_en DESC LIMIT $2`,
      [teamId, limit]
    );
    return result.rows;
  }
}

module.exports = new FantasyTeamRepository();
