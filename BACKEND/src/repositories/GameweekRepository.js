const { query } = require('../config/database');

class GameweekRepository {
  async findAll() {
    const result = await query(
      `SELECT id, numero, fecha_inicio, fecha_fin, cerrada, lineup_lock, actualizado_en
       FROM jornadas ORDER BY numero DESC`
    );
    return result.rows;
  }

  async findById(id) {
    const result = await query(
      `SELECT id, numero, fecha_inicio, fecha_fin, cerrada, lineup_lock
       FROM jornadas WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findCurrent() {
    const result = await query(
      `SELECT id, numero, fecha_inicio, fecha_fin, cerrada, lineup_lock
       FROM jornadas
       WHERE cerrada = false
         AND (fecha_inicio IS NULL OR fecha_inicio <= NOW())
         AND (fecha_fin IS NULL OR fecha_fin >= NOW())
       ORDER BY numero DESC
       LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async findLatest() {
    const result = await query(
      `SELECT id, numero, fecha_inicio, fecha_fin, cerrada, lineup_lock
       FROM jornadas ORDER BY numero DESC LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async findByNumero(numero) {
    const result = await query(
      `SELECT id, numero, fecha_inicio, fecha_fin, cerrada, lineup_lock
       FROM jornadas WHERE numero = $1`,
      [numero]
    );
    return result.rows[0] || null;
  }

  async getEstadoMercado() {
    const result = await query(`SELECT * FROM estado_mercado LIMIT 1`);
    return result.rows[0] || null;
  }

  async create({ numero, fechaInicio, fechaFin, lineupLock }) {
    const result = await query(
      `INSERT INTO jornadas (numero, fecha_inicio, fecha_fin, lineup_lock)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [numero, fechaInicio, fechaFin, lineupLock]
    );
    return result.rows[0];
  }

  async update(id, fields) {
    const sets = [];
    const params = [];
    const columnMap = {
      fechaInicio: 'fecha_inicio',
      fechaFin: 'fecha_fin',
      lineupLock: 'lineup_lock',
      cerrada: 'cerrada',
    };
    for (const [key, val] of Object.entries(fields)) {
      const col = columnMap[key] || key;
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    }
    sets.push(`actualizado_en = NOW()`);
    params.push(id);
    const result = await query(
      `UPDATE jornadas SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  }

  /**
   * Invoca la función de base de datos que congela la alineación oficial.
   */
  async capturarLineupSnapshot(jornadaId) {
    await query('SELECT capturar_lineup_snapshot($1)', [jornadaId]);
  }

  async getSnapshotsByJornada(jornadaId) {
    const result = await query(
      `SELECT ls.equipo_fantasy_id, ls.jugador_id, ls.es_titular, ls.es_capitan,
              ef.nombre AS equipo_nombre,
              j.nombre AS jugador_nombre, j.posicion
       FROM lineup_snapshots ls
       JOIN equipos_fantasy ef ON ef.id = ls.equipo_fantasy_id
       JOIN jugadores j ON j.id = ls.jugador_id
       WHERE ls.jornada_id = $1
       ORDER BY ef.nombre, ls.es_titular DESC`,
      [jornadaId]
    );
    return result.rows;
  }
}

module.exports = new GameweekRepository();
