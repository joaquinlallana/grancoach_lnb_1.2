/**
 * SyncService.js
 *
 * Servicio principal de sincronización de datos desde api-basketball.com.
 * Orquesta el flujo completo de carga: equipos → jugadores → partidos → estadísticas.
 *
 * Cada método es independiente y puede ejecutarse individualmente.
 * El orden recomendado completo es:
 *   1. syncTeams()
 *   2. syncPlayers()
 *   3. syncGames()
 *   4. syncGameStats(gameApiId)  ← por partido o en lote via syncAllGameStats()
 *
 * Liga Nacional de Básquet (LNB) Argentina:
 *   - ID en la API: se obtiene con searchLeague() o se configura directamente en .env
 *   - Temporada: formato "YYYY-YYYY" ej: "2024-2025"
 */

const apiBasketball = require('./ApiBasketballService');
const syncRepo = require('../repositories/SyncRepository');

// ─── Mapeo de posiciones API → DB ─────────────────────────────────────────────
// La API devuelve posiciones en inglés (G, F, C, G-F, F-C).
// Se mapean a los nombres de posición que tenga la DB (tabla `posiciones`).
const POSICION_MAP = {
  // Nombres completos en inglés (formato real de la API)
  Guard: 'Base',
  'Guard-Forward': 'Escolta',
  Forward: 'Alero',
  'Forward-Center': 'Ala-Pivot',
  Center: 'Pivot',
  // Códigos abreviados (por si alguna liga los usa)
  G: 'Base',
  'G-F': 'Escolta',
  F: 'Alero',
  'F-C': 'Ala-Pivot',
  C: 'Pivot',
  DEFAULT: 'Base',
};

// ─── Precio base por posición (en la moneda del juego) ────────────────────────
const PRECIO_BASE = {
  Base: 9000000,
  Escolta: 8500000,
  Alero: 8000000,
  'Ala-Pivot': 8000000,
  Pivot: 9000000,
  DEFAULT: 8000000,
};

class SyncService {

  // ─── Búsqueda de liga ───────────────────────────────────────────────────────

  /**
   * Busca la Liga Nacional de Básquet Argentina en la API y devuelve su ID.
   * Útil para la configuración inicial.
   *
   * @returns {Promise<Array>} Lista de ligas encontradas con id y nombre
   */
  async searchLeague(name = 'LNB', country = 'Argentina') {
    const leagues = await apiBasketball.getLeagues({ name, country });

    if (leagues.length === 0) {
      // Intento más amplio
      const all = await apiBasketball.getLeagues({ country });
      return all.map((l) => ({
        id: l.league?.id,
        nombre: l.league?.name,
        pais: l.country?.name,
        temporadas: l.seasons?.map((s) => s.season),
      }));
    }

    return leagues.map((l) => ({
      id: l.league?.id,
      nombre: l.league?.name,
      pais: l.country?.name,
      temporadas: l.seasons?.map((s) => s.season),
    }));
  }

  // ─── Sync de Equipos ────────────────────────────────────────────────────────

  /**
   * Sincroniza los equipos de la LNB desde la API hacia la tabla `equipos_lnb`.
   *
   * @param {number} leagueId - ID de la liga en la API (ej: 116)
   * @param {string} season   - Temporada (ej: "2024-2025")
   * @returns {Promise<Object>} { insertados, actualizados, errores, equipos }
   */
  async syncTeams(leagueId, season) {
    const logId = await syncRepo.createSyncLog('teams', { leagueId, season });
    const resumen = { insertados: 0, actualizados: 0, errores: [] };

    try {
      console.log(`[SyncService] Sincronizando equipos – liga ${leagueId}, temporada ${season}`);

      const equipos = await apiBasketball.getTeams(leagueId, season);
      console.log(`[SyncService] ${equipos.length} equipos recibidos de la API`);

      for (const equipo of equipos) {
        try {
          await syncRepo.upsertEquipoLnb(equipo);
          resumen.insertados++;
        } catch (err) {
          resumen.errores.push({ equipo: equipo.nombre, error: err.message });
          console.error(`[SyncService] Error al guardar equipo ${equipo.nombre}:`, err.message);
        }
      }

      await syncRepo.updateSyncLog(logId, { estado: 'completado', resumen });
      console.log(`[SyncService] Equipos sincronizados: ${resumen.insertados} OK, ${resumen.errores.length} errores`);
      return { ...resumen, equipos };
    } catch (err) {
      await syncRepo.updateSyncLog(logId, { estado: 'error', resumen, error: err.message });
      throw err;
    }
  }

  // ─── Sync de Jugadores ──────────────────────────────────────────────────────

  /**
   * Sincroniza los jugadores de la LNB desde la API hacia la tabla `jugadores`.
   * Requiere que los equipos ya estén sincronizados.
   *
   * @param {number} leagueId - ID de la liga en la API
   * @param {string} season   - Temporada
   * @returns {Promise<Object>} { procesados, guardados, saltados, errores }
   */
  async syncPlayers(leagueId, season) {
    const logId = await syncRepo.createSyncLog('players', { leagueId, season });
    const resumen = { procesados: 0, guardados: 0, saltados: 0, errores: [] };

    try {
      console.log(`[SyncService] Sincronizando jugadores – liga ${leagueId}, temporada ${season}`);

      // Prerequsito: mapas de equipos y posiciones
      const equiposMap = await syncRepo.getEquiposMap();
      const posicionesMap = await syncRepo.getPosicionesMap();

      console.log(`[SyncService] Mapa de equipos: ${Object.keys(equiposMap).length} registros`);
      console.log(`[SyncService] Posiciones disponibles: ${Object.keys(posicionesMap).join(', ')}`);

      // La API requiere consultar jugadores por equipo (no por liga).
      // Límite: 10 req/min → pausa de 6.5s entre equipos para no superar el rate limit.
      const teamApiIds = Object.keys(equiposMap);
      let jugadores = [];
      for (let i = 0; i < teamApiIds.length; i++) {
        const teamApiId = teamApiIds[i];
        console.log(`[SyncService] Equipo ${i + 1}/${teamApiIds.length} (API id ${teamApiId})...`);
        const jugadoresEquipo = await apiBasketball.getPlayersByTeam(Number(teamApiId), season, leagueId);
        jugadores = jugadores.concat(jugadoresEquipo);
        if (i < teamApiIds.length - 1) {
          await this._sleep(6500);
        }
      }
      console.log(`[SyncService] ${jugadores.length} jugadores recibidos de la API en total`);

      for (const jug of jugadores) {
        resumen.procesados++;

        // Resolver equipo interno
        const equipoId = equiposMap[jug.equipo_api_id];
        if (!equipoId) {
          resumen.saltados++;
          console.warn(`[SyncService] Jugador ${jug.nombre}: equipo API id ${jug.equipo_api_id} no encontrado en DB. Saltando.`);
          continue;
        }

        // Resolver posición
        const posicionEsp = POSICION_MAP[jug.posicion_api] || POSICION_MAP.DEFAULT;
        // Intentar con el nombre mapeado; si no existe en la BD, usar cualquier posición disponible
        const posicionId = posicionesMap[posicionEsp] || Object.values(posicionesMap)[0] || null;

        if (!posicionId) {
          resumen.saltados++;
          console.warn(`[SyncService] Jugador ${jug.nombre}: no hay posiciones en la tabla posiciones. Saltando.`);
          continue;
        }

        if (!posicionesMap[posicionEsp]) {
          console.warn(`[SyncService] Jugador ${jug.nombre}: posicion_api="${jug.posicion_api}" → "${posicionEsp}" no existe en BD. Posiciones disponibles: [${Object.keys(posicionesMap).join(', ')}]. Usando fallback.`);
        }

        const precio = PRECIO_BASE[posicionEsp] || PRECIO_BASE.DEFAULT;

        try {
          await syncRepo.upsertJugador({
            api_id: jug.api_id,
            nombre: jug.nombre,
            equipo_id: equipoId,
            posicion_id: posicionId,
            posicion: posicionEsp.toLowerCase(),
            precio,
            numero_camiseta: jug.numero_camiseta,
            nacionalidad: jug.nacionalidad,
            fecha_nacimiento: jug.fecha_nacimiento,
          });
          resumen.guardados++;
        } catch (err) {
          resumen.errores.push({ jugador: jug.nombre, error: err.message });
          console.error(`[SyncService] Error al guardar jugador ${jug.nombre}:`, err.message);
        }
      }

      await syncRepo.updateSyncLog(logId, { estado: 'completado', resumen });
      console.log(`[SyncService] Jugadores: ${resumen.guardados} guardados, ${resumen.saltados} saltados, ${resumen.errores.length} errores`);
      return resumen;
    } catch (err) {
      await syncRepo.updateSyncLog(logId, { estado: 'error', resumen, error: err.message });
      throw err;
    }
  }

  // ─── Sync de Partidos ───────────────────────────────────────────────────────

  /**
   * Sincroniza los partidos de una temporada hacia la tabla `partidos`.
   * Intenta vincularlos con la jornada correspondiente si ya existe.
   *
   * @param {number} leagueId - ID de la liga en la API
   * @param {string} season   - Temporada
   * @returns {Promise<Object>} { procesados, guardados, saltados, errores }
   */
  async syncGames(leagueId, season) {
    const logId = await syncRepo.createSyncLog('games', { leagueId, season });
    const resumen = { procesados: 0, guardados: 0, saltados: 0, errores: [] };

    try {
      console.log(`[SyncService] Sincronizando partidos – liga ${leagueId}, temporada ${season}`);

      const equiposMap = await syncRepo.getEquiposMap();
      const games = await apiBasketball.getGames(leagueId, season);
      console.log(`[SyncService] ${games.length} partidos recibidos de la API`);

      for (const game of games) {
        resumen.procesados++;

        const equipoLocalId = equiposMap[game.equipo_local_api_id];
        const equipoVisitanteId = equiposMap[game.equipo_visitante_api_id];

        if (!equipoLocalId || !equipoVisitanteId) {
          resumen.saltados++;
          console.warn(
            `[SyncService] Partido API id ${game.api_id}: ` +
            `equipos no encontrados (local: ${game.equipo_local_api_id}, ` +
            `visitante: ${game.equipo_visitante_api_id}). Saltando.`
          );
          continue;
        }

        // Intentar vincular con jornada existente
        const jornadaId = await syncRepo.getJornadaIdByNumero(game.numero_jornada);

        try {
          await syncRepo.upsertPartido({
            api_id: game.api_id,
            jornada_id: jornadaId,
            equipo_local_id: equipoLocalId,
            equipo_visitante_id: equipoVisitanteId,
            fecha: game.fecha,
            estado: game.estado_normalizado,
            puntos_local: game.puntos_local,
            puntos_visitante: game.puntos_visitante,
          });
          resumen.guardados++;
        } catch (err) {
          resumen.errores.push({ game_id: game.api_id, error: err.message });
          console.error(`[SyncService] Error al guardar partido ${game.api_id}:`, err.message);
        }
      }

      await syncRepo.updateSyncLog(logId, { estado: 'completado', resumen });
      console.log(`[SyncService] Partidos: ${resumen.guardados} guardados, ${resumen.saltados} saltados, ${resumen.errores.length} errores`);
      return resumen;
    } catch (err) {
      await syncRepo.updateSyncLog(logId, { estado: 'error', resumen, error: err.message });
      throw err;
    }
  }

  // ─── Sync de Estadísticas (por partido) ────────────────────────────────────

  /**
   * Sincroniza las estadísticas de jugadores de un partido específico.
   *
   * @param {number} gameApiId - ID del partido en la API externa
   * @returns {Promise<Object>} { partido_id, guardadas, saltadas, errores }
   */
  async syncGameStats(gameApiId) {
    const logId = await syncRepo.createSyncLog('game_stats', { gameApiId });
    const resumen = { partido_id: null, guardadas: 0, saltadas: 0, errores: [] };

    try {
      console.log(`[SyncService] Sincronizando estadísticas del partido API id ${gameApiId}`);

      const partidosMap = await syncRepo.getPartidosMap();
      const jugadoresMap = await syncRepo.getJugadoresMap();

      const partidoId = partidosMap[gameApiId];
      if (!partidoId) {
        throw new Error(`Partido con api_basketball_id=${gameApiId} no encontrado en DB. Sincroniza partidos primero.`);
      }
      resumen.partido_id = partidoId;

      const stats = await apiBasketball.getGameStatistics(gameApiId);
      console.log(`[SyncService] ${stats.length} estadísticas recibidas para partido ${gameApiId}`);

      for (const stat of stats) {
        const jugadorId = jugadoresMap[stat.jugador_api_id];

        if (!jugadorId) {
          resumen.saltadas++;
          console.warn(
            `[SyncService] Jugador API id ${stat.jugador_api_id} no encontrado en DB. Saltando estadística.`
          );
          continue;
        }

        try {
          await syncRepo.upsertEstadistica({
            partido_id: partidoId,
            jugador_id: jugadorId,
            puntos: stat.puntos,
            rebotes: stat.rebotes_totales,
            asistencias: stat.asistencias,
            robos: stat.robos,
            tapas: stat.tapas,
            perdidas: stat.perdidas,
            faltas: stat.faltas,
            tiros_campo_intentados: stat.tiros_campo_intentados,
            tiros_campo_convertidos: stat.tiros_campo_convertidos,
            triples_intentados: stat.triples_intentados,
            triples_convertidos: stat.triples_convertidos,
            libres_intentados: stat.libres_intentados,
            libres_convertidos: stat.libres_convertidos,
            minutos: stat.minutos,
          });
          resumen.guardadas++;
        } catch (err) {
          resumen.errores.push({ jugador_api_id: stat.jugador_api_id, error: err.message });
          console.error(`[SyncService] Error al guardar stats jugador ${stat.jugador_api_id}:`, err.message);
        }
      }

      await syncRepo.updateSyncLog(logId, { estado: 'completado', resumen });
      console.log(`[SyncService] Stats partido ${gameApiId}: ${resumen.guardadas} guardadas, ${resumen.saltadas} saltadas`);
      return resumen;
    } catch (err) {
      await syncRepo.updateSyncLog(logId, { estado: 'error', resumen, error: err.message });
      throw err;
    }
  }

  // ─── Sync masivo de estadísticas ────────────────────────────────────────────

  /**
   * Sincroniza las estadísticas de TODOS los partidos finalizados que aún
   * no tienen estadísticas cargadas en la DB.
   * Útil para el cierre de jornada.
   *
   * @param {number} leagueId - ID de la liga
   * @param {string} season   - Temporada
   * @returns {Promise<Object>} Resumen total de la operación
   */
  async syncAllFinishedGameStats(leagueId, season) {
    console.log(`[SyncService] Iniciando sync masivo de estadísticas – liga ${leagueId}, temporada ${season}`);

    // Obtener partidos finalizados de la API
    const games = await apiBasketball.getGames(leagueId, season);
    const finalizados = games.filter((g) => g.estado_normalizado === 'FINALIZADO');

    console.log(`[SyncService] ${finalizados.length} partidos finalizados para procesar`);

    const totalResumen = { partidos_procesados: 0, stats_guardadas: 0, errores: [] };

    for (const game of finalizados) {
      try {
        const result = await this.syncGameStats(game.api_id);
        totalResumen.partidos_procesados++;
        totalResumen.stats_guardadas += result.guardadas;

        // Pausa para respetar límite de la API gratuita (100 req/día)
        await this._sleep(500);
      } catch (err) {
        totalResumen.errores.push({ game_id: game.api_id, error: err.message });
        console.error(`[SyncService] Error en partido ${game.api_id}:`, err.message);
      }
    }

    console.log(`[SyncService] Sync masivo completado: ${totalResumen.stats_guardadas} stats en ${totalResumen.partidos_procesados} partidos`);
    return totalResumen;
  }

  // ─── Sync completo ──────────────────────────────────────────────────────────

  /**
   * Ejecuta la sincronización completa: equipos → jugadores → partidos.
   * NO incluye estadísticas (requieren control manual para no agotar la cuota).
   *
   * @param {number} leagueId - ID de la liga
   * @param {string} season   - Temporada
   */
  async syncAll(leagueId, season) {
    console.log(`[SyncService] === SYNC COMPLETO INICIADO: liga ${leagueId}, temporada ${season} ===`);

    const teamsResult = await this.syncTeams(leagueId, season);
    const playersResult = await this.syncPlayers(leagueId, season);
    const gamesResult = await this.syncGames(leagueId, season);

    return {
      equipos: teamsResult,
      jugadores: playersResult,
      partidos: gamesResult,
    };
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new SyncService();
