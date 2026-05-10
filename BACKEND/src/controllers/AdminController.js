/**
 * AdminController.js
 *
 * Controlador HTTP para los endpoints de administración de datos.
 * Expone las operaciones de sincronización desde la API externa.
 *
 * IMPORTANTE: Todos los endpoints de este controlador deben protegerse
 * con autenticación JWT y verificación de rol admin (ver middleware/auth.js).
 */

const syncService = require('../services/SyncService');
const apiBasketball = require('../services/ApiBasketballService');

class AdminController {

  // ─── GET /api/admin/api-status ──────────────────────────────────────────────

  /**
   * Verifica la conexión con la API externa y muestra la cuota disponible.
   *
   * Respuesta exitosa:
   * {
   *   "success": true,
   *   "data": {
   *     "account": { ... },
   *     "subscription": { "plan": "Free", ... },
   *     "requests": { "current": 5, "limit_day": 100 }
   *   }
   * }
   */
  async getApiStatus(req, res, next) {
    try {
      const status = await apiBasketball.getStatus();
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  // ─── GET /api/admin/leagues/search ─────────────────────────────────────────

  /**
   * Busca ligas en la API para encontrar el ID de la LNB.
   * Query params: ?name=LNB&country=Argentina
   *
   * Respuesta:
   * {
   *   "success": true,
   *   "data": [{ "id": 116, "nombre": "Liga Nacional", "pais": "Argentina", "temporadas": ["2024-2025", ...] }]
   * }
   */
  async searchLeagues(req, res, next) {
    try {
      const { name = 'LNB', country = 'Argentina' } = req.query;
      const leagues = await syncService.searchLeague(name, country);
      res.json({ success: true, data: leagues });
    } catch (err) {
      next(err);
    }
  }

  // ─── POST /api/admin/sync/teams ─────────────────────────────────────────────

  /**
   * Sincroniza los equipos de la LNB desde la API.
   * Body: { "leagueId": 116, "season": "2024-2025" }
   *
   * También acepta las variables de entorno por defecto:
   * API_BASKETBALL_LEAGUE_ID y API_BASKETBALL_SEASON
   */
  async syncTeams(req, res, next) {
    try {
      const leagueId = req.body.leagueId || process.env.API_BASKETBALL_LEAGUE_ID;
      const season   = req.body.season   || process.env.API_BASKETBALL_SEASON;

      if (!leagueId || !season) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren leagueId y season. Configúralos en el body o en el .env (API_BASKETBALL_LEAGUE_ID, API_BASKETBALL_SEASON).',
        });
      }

      const result = await syncService.syncTeams(Number(leagueId), season);

      res.json({
        success: true,
        message: `Equipos sincronizados: ${result.insertados} procesados, ${result.errores.length} errores`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── POST /api/admin/sync/players ───────────────────────────────────────────

  /**
   * Sincroniza los jugadores de la LNB desde la API.
   * Requiere que los equipos ya estén sincronizados.
   * Body: { "leagueId": 116, "season": "2024-2025" }
   */
  async syncPlayers(req, res, next) {
    try {
      const leagueId = req.body.leagueId || process.env.API_BASKETBALL_LEAGUE_ID;
      const season   = req.body.season   || process.env.API_BASKETBALL_SEASON;

      if (!leagueId || !season) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren leagueId y season.',
        });
      }

      const result = await syncService.syncPlayers(Number(leagueId), season);

      res.json({
        success: true,
        message: `Jugadores sincronizados: ${result.guardados} guardados, ${result.saltados} saltados, ${result.errores.length} errores`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── POST /api/admin/sync/games ─────────────────────────────────────────────

  /**
   * Sincroniza los partidos de la temporada desde la API.
   * Body: { "leagueId": 116, "season": "2024-2025" }
   */
  async syncGames(req, res, next) {
    try {
      const leagueId = req.body.leagueId || process.env.API_BASKETBALL_LEAGUE_ID;
      const season   = req.body.season   || process.env.API_BASKETBALL_SEASON;

      if (!leagueId || !season) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren leagueId y season.',
        });
      }

      const result = await syncService.syncGames(Number(leagueId), season);

      res.json({
        success: true,
        message: `Partidos sincronizados: ${result.guardados} guardados, ${result.saltados} saltados, ${result.errores.length} errores`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── POST /api/admin/sync/games/:gameApiId/stats ────────────────────────────

  /**
   * Sincroniza las estadísticas de un partido específico.
   * Params: gameApiId = ID del partido en la API externa (NO el id interno de la DB)
   */
  async syncGameStats(req, res, next) {
    try {
      const gameApiId = parseInt(req.params.gameApiId, 10);

      if (isNaN(gameApiId)) {
        return res.status(400).json({ success: false, message: 'gameApiId debe ser un número entero.' });
      }

      const result = await syncService.syncGameStats(gameApiId);

      res.json({
        success: true,
        message: `Stats del partido ${gameApiId}: ${result.guardadas} guardadas, ${result.saltadas} saltadas`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── POST /api/admin/sync/all-stats ────────────────────────────────────────

  /**
   * Sincroniza estadísticas de todos los partidos finalizados de la temporada.
   * ⚠️ USO CUIDADOSO: consume muchos requests de la API (1 por partido).
   * Body: { "leagueId": 116, "season": "2024-2025" }
   */
  async syncAllStats(req, res, next) {
    try {
      const leagueId = req.body.leagueId || process.env.API_BASKETBALL_LEAGUE_ID;
      const season   = req.body.season   || process.env.API_BASKETBALL_SEASON;

      if (!leagueId || !season) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren leagueId y season.',
        });
      }

      const result = await syncService.syncAllFinishedGameStats(Number(leagueId), season);

      res.json({
        success: true,
        message: `Sync masivo completado: ${result.stats_guardadas} stats en ${result.partidos_procesados} partidos`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── POST /api/admin/sync/all ───────────────────────────────────────────────

  /**
   * Sincronización completa: equipos + jugadores + partidos.
   * No incluye estadísticas.
   * Body: { "leagueId": 116, "season": "2024-2025" }
   */
  async syncAll(req, res, next) {
    try {
      const leagueId = req.body.leagueId || process.env.API_BASKETBALL_LEAGUE_ID;
      const season   = req.body.season   || process.env.API_BASKETBALL_SEASON;

      if (!leagueId || !season) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren leagueId y season.',
        });
      }

      const result = await syncService.syncAll(Number(leagueId), season);

      res.json({
        success: true,
        message: 'Sincronización completa finalizada',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
