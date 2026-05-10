/**
 * SyncRepository.js
 *
 * Capa de acceso a datos exclusiva para la sincronización desde la API externa.
 * Utiliza la estrategia UPSERT (INSERT … ON CONFLICT DO UPDATE) para garantizar
 * idempotencia: correr la sincronización múltiples veces no genera duplicados.
 *
 * Todas las tablas que participan del sync tienen una columna `api_basketball_id`
 * que actúa como clave de reconciliación con la API externa.
 * Ver: migrations/add_api_basketball_ids.sql
 */

const pool = require('../config/database');

class SyncRepository {

  // ─── Equipos LNB ───────────────────────────────────────────────────────────

  async upsertEquipoLnb({ api_id, nombre, codigo, logo_url, ciudad }) {
    const sql = `
      INSERT INTO equipos_lnb (api_basketball_id, nombre, codigo, logo_url, ciudad)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (api_basketball_id) WHERE api_basketball_id IS NOT NULL
        DO UPDATE SET
          nombre       = EXCLUDED.nombre,
          codigo       = EXCLUDED.codigo,
          logo_url     = EXCLUDED.logo_url,
          ciudad       = EXCLUDED.ciudad,
          actualizado_en = NOW()
      RETURNING id
    `;
    const { rows } = await pool.query(sql, [api_id, nombre, codigo, logo_url, ciudad]);
    return rows[0].id;
  }

  /**
   * Retorna un mapa { api_basketball_id → id_interno } de todos los equipos.
   * Usado para resolver FKs al insertar jugadores y partidos.
   */
  async getEquiposMap() {
    const { rows } = await pool.query(
      'SELECT id, api_basketball_id FROM equipos_lnb WHERE api_basketball_id IS NOT NULL'
    );
    return Object.fromEntries(rows.map((r) => [r.api_basketball_id, r.id]));
  }

  // ─── Posiciones ────────────────────────────────────────────────────────────

  /**
   * Retorna un mapa { nombre_posicion → id } de todas las posiciones.
   * Ej: { "Base": 1, "Escolta": 2, "Alero": 3, "Ala-Pivot": 4, "Pivot": 5 }
   */
  async getPosicionesMap() {
    const { rows } = await pool.query('SELECT id, nombre FROM posiciones');
    return Object.fromEntries(rows.map((r) => [r.nombre, r.id]));
  }

  // ─── Jugadores ─────────────────────────────────────────────────────────────

  /**
   * Inserta o actualiza un jugador.
   *
   * @param {Object} jugador
   * @param {number} jugador.api_id
   * @param {string} jugador.nombre
   * @param {number} jugador.equipo_id       - FK a equipos_lnb.id
   * @param {number} jugador.posicion_id     - FK a posiciones.id
   * @param {string} jugador.posicion        - texto en minúsculas ('base', 'alero', etc.)
   * @param {number} [jugador.precio=8000000]
   * @param {number|null} jugador.numero_camiseta
   * @param {string|null} jugador.nacionalidad
   * @param {string|null} jugador.fecha_nacimiento
   * @returns {Promise<number>} id interno del jugador
   */
  async upsertJugador({
    api_id,
    nombre,
    equipo_id,
    posicion_id,
    posicion,
    precio = 8000000,
    numero_camiseta,
    nacionalidad,
    fecha_nacimiento,
  }) {
    const sql = `
      INSERT INTO jugadores (
        api_basketball_id, nombre, equipo_id, posicion_id, posicion,
        precio, numero_camiseta, nacionalidad, fecha_nacimiento, activo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
      ON CONFLICT (api_basketball_id) WHERE api_basketball_id IS NOT NULL
        DO UPDATE SET
          nombre           = EXCLUDED.nombre,
          equipo_id        = EXCLUDED.equipo_id,
          posicion_id      = EXCLUDED.posicion_id,
          posicion         = EXCLUDED.posicion,
          numero_camiseta  = EXCLUDED.numero_camiseta,
          nacionalidad     = EXCLUDED.nacionalidad,
          fecha_nacimiento = EXCLUDED.fecha_nacimiento,
          activo           = TRUE,
          actualizado_en   = NOW()
      RETURNING id
    `;
    const { rows } = await pool.query(sql, [
      api_id, nombre, equipo_id, posicion_id, posicion,
      precio, numero_camiseta, nacionalidad, fecha_nacimiento,
    ]);
    return rows[0].id;
  }

  /**
   * Retorna un mapa { api_basketball_id → id_interno } de todos los jugadores.
   */
  async getJugadoresMap() {
    const { rows } = await pool.query(
      'SELECT id, api_basketball_id FROM jugadores WHERE api_basketball_id IS NOT NULL'
    );
    return Object.fromEntries(rows.map((r) => [r.api_basketball_id, r.id]));
  }

  // ─── Partidos ──────────────────────────────────────────────────────────────

  /**
   * Inserta o actualiza un partido.
   *
   * @param {Object} partido
   * @param {number} partido.api_id
   * @param {number|null} partido.jornada_id
   * @param {number} partido.equipo_local_id
   * @param {number} partido.equipo_visitante_id
   * @param {string} partido.fecha
   * @param {string} partido.estado              - PROGRAMADO | EN_CURSO | FINALIZADO | CANCELADO
   * @param {number|null} partido.puntos_local
   * @param {number|null} partido.puntos_visitante
   * @returns {Promise<number>} id interno del partido
   */
  async upsertPartido({
    api_id,
    jornada_id,
    equipo_local_id,
    equipo_visitante_id,
    fecha,
    estado,
    puntos_local,
    puntos_visitante,
  }) {
    const sql = `
      INSERT INTO partidos (
        api_basketball_id, jornada_id, equipo_local_id, equipo_visitante_id,
        fecha, estado, puntos_local, puntos_visitante
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (api_basketball_id) WHERE api_basketball_id IS NOT NULL
        DO UPDATE SET
          jornada_id          = COALESCE(EXCLUDED.jornada_id, partidos.jornada_id),
          equipo_local_id     = EXCLUDED.equipo_local_id,
          equipo_visitante_id = EXCLUDED.equipo_visitante_id,
          fecha               = EXCLUDED.fecha,
          estado              = EXCLUDED.estado,
          puntos_local        = EXCLUDED.puntos_local,
          puntos_visitante    = EXCLUDED.puntos_visitante,
          actualizado_en      = NOW()
      RETURNING id
    `;
    const { rows } = await pool.query(sql, [
      api_id, jornada_id, equipo_local_id, equipo_visitante_id,
      fecha, estado, puntos_local, puntos_visitante,
    ]);
    return rows[0].id;
  }

  async getPartidosMap() {
    const { rows } = await pool.query(
      'SELECT id, api_basketball_id FROM partidos WHERE api_basketball_id IS NOT NULL'
    );
    return Object.fromEntries(rows.map((r) => [r.api_basketball_id, r.id]));
  }

  async getJornadaIdByNumero(numeroJornada) {
    if (!numeroJornada) return null;
    const { rows } = await pool.query(
      'SELECT id FROM jornadas WHERE numero = $1 LIMIT 1',
      [numeroJornada]
    );
    return rows[0]?.id || null;
  }

  // ─── Estadísticas ──────────────────────────────────────────────────────────

  async upsertEstadistica({
    partido_id,
    jugador_id,
    puntos,
    rebotes,
    asistencias,
    robos,
    tapas,
    perdidas,
    faltas,
    tiros_campo_intentados,
    tiros_campo_convertidos,
    triples_intentados,
    triples_convertidos,
    libres_intentados,
    libres_convertidos,
    minutos,
  }) {
    const sql = `
      INSERT INTO estadisticas (
        partido_id, jugador_id,
        puntos, rebotes, asistencias, robos, tapas,
        perdidas, faltas,
        tiros_campo_intentados, tiros_campo_convertidos,
        triples_intentados, triples_convertidos,
        libres_intentados, libres_convertidos,
        minutos
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (partido_id, jugador_id)
        DO UPDATE SET
          puntos                   = EXCLUDED.puntos,
          rebotes                  = EXCLUDED.rebotes,
          asistencias              = EXCLUDED.asistencias,
          robos                    = EXCLUDED.robos,
          tapas                    = EXCLUDED.tapas,
          perdidas                 = EXCLUDED.perdidas,
          faltas                   = EXCLUDED.faltas,
          tiros_campo_intentados   = EXCLUDED.tiros_campo_intentados,
          tiros_campo_convertidos  = EXCLUDED.tiros_campo_convertidos,
          triples_intentados       = EXCLUDED.triples_intentados,
          triples_convertidos      = EXCLUDED.triples_convertidos,
          libres_intentados        = EXCLUDED.libres_intentados,
          libres_convertidos       = EXCLUDED.libres_convertidos,
          minutos                  = EXCLUDED.minutos,
          actualizado_en           = NOW()
      RETURNING id
    `;
    const { rows } = await pool.query(sql, [
      partido_id, jugador_id,
      puntos, rebotes, asistencias, robos, tapas,
      perdidas, faltas,
      tiros_campo_intentados, tiros_campo_convertidos,
      triples_intentados, triples_convertidos,
      libres_intentados, libres_convertidos,
      minutos,
    ]);
    return rows[0].id;
  }

  // ─── Sync Log ──────────────────────────────────────────────────────────────

  async createSyncLog(tipo, parametros = {}) {
    const sql = `
      INSERT INTO sync_log (tipo, parametros, estado, iniciado_en)
      VALUES ($1, $2, 'en_curso', NOW())
      RETURNING id
    `;
    const { rows } = await pool.query(sql, [tipo, JSON.stringify(parametros)]);
    return rows[0].id;
  }

  async updateSyncLog(logId, { estado, resumen, error }) {
    const sql = `
      UPDATE sync_log
      SET estado = $2, resumen = $3, error = $4, finalizado_en = NOW()
      WHERE id = $1
    `;
    await pool.query(sql, [logId, estado, JSON.stringify(resumen), error || null]);
  }
}

module.exports = new SyncRepository();
