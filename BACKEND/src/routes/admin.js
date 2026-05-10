/**
 * routes/admin.js
 *
 * Rutas de administración para sincronización de datos desde api-basketball.com.
 *
 * Prefijo: /api/admin
 *
 * Todos los endpoints están protegidos por:
 *   1. Autenticación JWT (middleware auth)
 *   2. Verificación de rol admin (middleware isAdmin)
 *
 * El middleware isAdmin se implementa abajo y verifica que el usuario
 * tenga el campo `es_admin = true` en la tabla `usuarios`.
 */

const router = require('express').Router();
const adminController = require('../controllers/AdminController');
const { authenticate } = require('../middleware/auth');

// ─── Middleware de autorización de admin ────────────────────────────────────

/**
 * Verifica que el usuario autenticado tenga rol de administrador.
 * Depende de que authenticate ya haya sido ejecutado y que req.user exista.
 *
 * Para habilitar un usuario admin, ejecutar en PostgreSQL:
 *   UPDATE usuarios SET es_admin = true WHERE email = 'admin@ejemplo.com';
 *
 * También se puede omitir este middleware si solo se usa en entornos
 * de desarrollo con acceso local.
 */
const isAdmin = (req, res, next) => {
  if (!req.user?.es_admin) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.',
    });
  }
  next();
};

// Aplicar autenticación a todas las rutas admin
// Comentar authenticate e isAdmin durante desarrollo local si es necesario
router.use(authenticate, isAdmin);

// ─── Estado de la API ────────────────────────────────────────────────────────

/**
 * GET /api/admin/api-status
 * Verifica conectividad con api-basketball.com y muestra la cuota restante.
 */
router.get('/api-status', (req, res, next) => adminController.getApiStatus(req, res, next));

// ─── Búsqueda de ligas ───────────────────────────────────────────────────────

/**
 * GET /api/admin/leagues/search?name=LNB&country=Argentina
 * Busca ligas en la API para obtener el ID de la LNB.
 */
router.get('/leagues/search', (req, res, next) => adminController.searchLeagues(req, res, next));

// ─── Sincronización individual ───────────────────────────────────────────────

/**
 * POST /api/admin/sync/teams
 * Body: { "leagueId": 116, "season": "2024-2025" }
 * Sincroniza equipos desde la API a la tabla equipos_lnb.
 */
router.post('/sync/teams', (req, res, next) => adminController.syncTeams(req, res, next));

/**
 * POST /api/admin/sync/players
 * Body: { "leagueId": 116, "season": "2024-2025" }
 * Sincroniza jugadores desde la API a la tabla jugadores.
 * Requiere que los equipos ya estén sincronizados.
 */
router.post('/sync/players', (req, res, next) => adminController.syncPlayers(req, res, next));

/**
 * POST /api/admin/sync/games
 * Body: { "leagueId": 116, "season": "2024-2025" }
 * Sincroniza partidos desde la API a la tabla partidos.
 */
router.post('/sync/games', (req, res, next) => adminController.syncGames(req, res, next));

/**
 * POST /api/admin/sync/games/:gameApiId/stats
 * Params: gameApiId = ID del partido en la API externa
 * Sincroniza las estadísticas de jugadores de un partido específico.
 */
router.post('/sync/games/:gameApiId/stats', (req, res, next) => adminController.syncGameStats(req, res, next));

/**
 * POST /api/admin/sync/all-stats
 * Body: { "leagueId": 116, "season": "2024-2025" }
 * Sincroniza stats de TODOS los partidos finalizados. Usar con precaución (consume quota).
 */
router.post('/sync/all-stats', (req, res, next) => adminController.syncAllStats(req, res, next));

// ─── Sincronización completa ─────────────────────────────────────────────────

/**
 * POST /api/admin/sync/all
 * Body: { "leagueId": 116, "season": "2024-2025" }
 * Ejecuta: equipos + jugadores + partidos en secuencia.
 */
router.post('/sync/all', (req, res, next) => adminController.syncAll(req, res, next));

module.exports = router;
