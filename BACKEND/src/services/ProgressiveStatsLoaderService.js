const MatchRepository = require('../repositories/MatchRepository');
const GameweekRepository = require('../repositories/GameweekRepository');
const SyncService = require('./SyncService');
const { createError } = require('../middleware/errorHandler');

class ProgressiveStatsLoaderService {
  /**
   * Carga estadísticas de TODOS los partidos de una jornada.
   * Respeta rate limiting: 1 request cada 6 segundos (~10 req/min).
   *
   * @param {number} jornadaId - ID de la jornada en la BD
   * @returns {Object} { jornadaId, numero, procesados, exitosos, errores, details }
   */
  async loadGameweekStats(jornadaId) {
    const jornada = await GameweekRepository.findById(jornadaId);
    if (!jornada) {
      throw createError(404, `Jornada ${jornadaId} no encontrada`);
    }

    // Obtener todos los partidos de esta jornada (limit alto para traer todos)
    const matches = await MatchRepository.findAll({ jornadaId, limit: 100 });

    if (matches.length === 0) {
      return {
        jornadaId,
        numero: jornada.numero,
        procesados: 0,
        exitosos: 0,
        errores: 0,
        message: 'No hay partidos para esta jornada',
        details: [],
      };
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (const match of matches) {
      try {
        // Saltar si no tiene api_basketball_id
        if (!match.api_basketball_id) {
          results.push({
            matchId: match.id,
            estado: 'skipped',
            reason: 'Sin api_basketball_id',
          });
          skipCount++;
        } else {
          // Cargar stats del partido desde API Basketball
          const stats = await SyncService.syncGameStats(match.api_basketball_id);

          results.push({
            matchId: match.id,
            estado: 'success',
            statsCount: stats.length,
            local: match.equipo_local,
            visitante: match.equipo_visitante,
          });
          successCount++;
        }
      } catch (error) {
        console.error(`[ProgressiveLoader] Error partido ${match.id} (API id ${match.api_basketball_id}): ${error.message}`);
        results.push({
          matchId: match.id,
          estado: 'error',
          error: error.message,
          local: match.equipo_local,
          visitante: match.equipo_visitante,
        });
        errorCount++;
      }

      // Respetar rate limit: 1 request cada 6 segundos = 10 req/min
      // (Pausa entre partidos, SOLO si se hizo un request exitoso)
      if (results[results.length - 1].estado === 'success') {
        await new Promise(resolve => setTimeout(resolve, 6000));
      }
    }

    return {
      jornadaId,
      numero: jornada.numero,
      procesados: matches.length,
      exitosos: successCount,
      errores: errorCount,
      saltados: skipCount,
      details: results,
      message: `${successCount}/${matches.length} partidos cargados exitosamente`,
    };
  }

  /**
   * Carga estadísticas de múltiples jornadas en secuencia.
   * Pausa 1 minuto entre jornadas para no saturar la API.
   *
   * Úsalo para cargar todo el histórico:
   * - await service.loadMultipleGameweeks(1, 5) → Jornadas 1-5
   * - await service.loadMultipleGameweeks(1, 38) → Todo el torneo
   *
   * @param {number} startJornada - Número de jornada inicial
   * @param {number} endJornada - Número de jornada final (inclusive)
   * @returns {Object} { totalJornadas, completadas, fallidas, summary }
   */
  async loadMultipleGameweeks(startJornada = 1, endJornada = 38) {
    const summary = {
      totalJornadas: endJornada - startJornada + 1,
      completadas: 0,
      fallidas: [],
      totalStats: 0,
      totalErrores: 0,
      startTime: new Date(),
      endTime: null,
    };

    for (let numero = startJornada; numero <= endJornada; numero++) {
      try {
        // Obtener la jornada por número
        const jornadas = await GameweekRepository.findAll();
        const jornada = jornadas.find(j => j.numero === numero);

        if (!jornada) {
          summary.fallidas.push({ numero, error: 'Jornada no encontrada' });
          continue;
        }

        console.log(`[ProgressiveLoader] Cargando Jornada ${numero}...`);
        const result = await this.loadGameweekStats(jornada.id);

        summary.completadas++;
        summary.totalStats += result.exitosos;
        summary.totalErrores += result.errores;

        console.log(
          `[ProgressiveLoader] Jornada ${numero}: ${result.exitosos}/${result.procesados} ✓`
        );

        // Pausa de 1 minuto entre jornadas (muy conservador, respeta rate limit)
        if (numero < endJornada) {
          console.log(`[ProgressiveLoader] Esperando 1 minuto antes de próxima jornada...`);
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      } catch (error) {
        summary.fallidas.push({ numero, error: error.message });
        console.error(`[ProgressiveLoader] Jornada ${numero} falló: ${error.message}`);
      }
    }

    summary.endTime = new Date();
    summary.durationSeconds = (summary.endTime - summary.startTime) / 1000;

    return summary;
  }

  /**
   * Encuentra la primera jornada sin estadísticas completas.
   * Útil para el cron job: carga jornada por jornada.
   *
   * @returns {Object} Jornada sin stats, o null si todas tienen
   */
  async findFirstGameweekWithoutStats() {
    const { query } = require('../config/database');

    // Busca la primera jornada que tenga partidos pero ninguna estadística cargada
    const result = await query(`
      SELECT j.id, j.numero, j.fecha_inicio, j.fecha_fin, j.cerrada, j.lineup_lock
      FROM jornadas j
      WHERE EXISTS (
        SELECT 1 FROM partidos p WHERE p.jornada_id = j.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM estadisticas sj
        JOIN partidos p ON p.id = sj.partido_id
        WHERE p.jornada_id = j.id
      )
      ORDER BY j.numero ASC
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  /**
   * Obtiene reporte de progreso: cuántas jornadas tienen estadísticas.
   *
   * @returns {Object} { totalJornadas, conStats, porcentaje, detallesPorJornada }
   */
  async getProgressReport() {
    const jornadas = await GameweekRepository.findAll();
    const details = [];
    let conStats = 0;

    for (const jornada of jornadas) {
      const matches = await MatchRepository.findAll({ jornadaId: jornada.id, limit: 100 });

      const { query } = require('../config/database');
      const statsResult = await query(
        `SELECT COUNT(DISTINCT sj.partido_id) AS con_stats
         FROM estadisticas sj
         JOIN partidos p ON p.id = sj.partido_id
         WHERE p.jornada_id = $1`,
        [jornada.id]
      );
      const conApiId = parseInt(statsResult.rows[0].con_stats);
      const porcentaje = matches.length > 0 ? Math.round((conApiId / matches.length) * 100) : 0;

      const completa = porcentaje === 100;
      if (completa) conStats++;

      details.push({
        numero: jornada.numero,
        partidos: matches.length,
        conStats: conApiId,
        porcentaje,
        completa,
      });
    }

    return {
      totalJornadas: jornadas.length,
      jornadasCompletas: conStats,
      porcentajeTotal: Math.round((conStats / jornadas.length) * 100),
      detallesPorJornada: details,
    };
  }
}

module.exports = new ProgressiveStatsLoaderService();
