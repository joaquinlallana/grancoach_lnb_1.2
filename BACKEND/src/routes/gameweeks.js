const { Router } = require('express');
const { body } = require('express-validator');
const GameweekController = require('../controllers/GameweekController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

// Middleware de admin
const isAdmin = (req, res, next) => {
  if (!req.user?.es_admin) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.',
    });
  }
  next();
};

// Rutas públicas de consulta
router.get('/', GameweekController.getAll.bind(GameweekController));
router.get('/current', GameweekController.getCurrent.bind(GameweekController));
router.get('/:id', GameweekController.getById.bind(GameweekController));
router.get('/:id/matches', GameweekController.getMatches.bind(GameweekController));
router.get('/:id/snapshot', GameweekController.getSnapshot.bind(GameweekController));
router.get('/:id/ranking', GameweekController.getRankingPorJornada.bind(GameweekController));

// Stats de un partido
router.get(
  '/:id/matches/:partidoId/stats',
  GameweekController.getMatchStats.bind(GameweekController)
);

// --- Rutas de admin (requieren autenticación) ---

// POST /gameweeks/admin/advance-week  — cierra jornada actual y activa la siguiente (testing)
router.post(
  '/admin/advance-week',
  authenticate,
  isAdmin,
  GameweekController.advanceGameweek.bind(GameweekController)
);

// POST /gameweeks  — crear jornada (solo admin)
router.post(
  '/',
  authenticate,
  isAdmin,
  [
    body('numero').isInt({ min: 1 }),
    body('fechaInicio').optional().isISO8601(),
    body('fechaFin').optional().isISO8601(),
    body('lineupLock').optional().isISO8601(),
  ],
  validate,
  GameweekController.create.bind(GameweekController)
);

// PATCH /gameweeks/:id  — editar fechas de jornada (solo admin)
router.patch(
  '/:id',
  authenticate,
  isAdmin,
  [
    body('fechaInicio').optional().isISO8601(),
    body('fechaFin').optional().isISO8601(),
    body('lineupLock').optional().isISO8601(),
  ],
  validate,
  GameweekController.update.bind(GameweekController)
);

// POST /gameweeks/:id/lock  — cerrar jornada y capturar snapshot (solo admin)
router.post('/:id/lock', authenticate, isAdmin, GameweekController.lock.bind(GameweekController));

// Partidos admin
router.post(
  '/:id/matches',
  authenticate,
  isAdmin,
  [
    body('equipoLocalId').isInt({ min: 1 }),
    body('equipoVisitanteId').isInt({ min: 1 }),
    body('fecha').optional().isISO8601(),
  ],
  validate,
  GameweekController.createMatch.bind(GameweekController)
);

router.patch(
  '/:id/matches/:partidoId',
  authenticate,
  isAdmin,
  [
    body('estado').optional().isIn(['PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO']),
    body('puntosLocal').optional().isInt({ min: 0 }),
    body('puntosVisitante').optional().isInt({ min: 0 }),
  ],
  validate,
  GameweekController.updateMatch.bind(GameweekController)
);

// Cargar stats de jugador en un partido (solo admin)
router.post(
  '/:id/matches/:partidoId/stats',
  authenticate,
  isAdmin,
  [
    body('jugadorId').isInt({ min: 1 }),
    body('puntos').optional().isInt({ min: 0 }),
    body('rebotes').optional().isInt({ min: 0 }),
    body('asistencias').optional().isInt({ min: 0 }),
    body('robos').optional().isInt({ min: 0 }),
    body('tapas').optional().isInt({ min: 0 }),
    body('perdidas').optional().isInt({ min: 0 }),
    body('faltas').optional().isInt({ min: 0, max: 6 }),
  ],
  validate,
  GameweekController.loadPlayerStats.bind(GameweekController)
);

module.exports = router;
