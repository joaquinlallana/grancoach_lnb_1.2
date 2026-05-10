const { Router } = require('express');
const { body } = require('express-validator');
const FantasyTeamController = require('../controllers/FantasyTeamController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /fantasy-team  — obtener mi equipo completo
router.get('/', FantasyTeamController.getMyTeam.bind(FantasyTeamController));

// PATCH /fantasy-team/nombre  — renombrar equipo
router.patch(
  '/nombre',
  [body('nombre').trim().notEmpty().isLength({ max: 100 })],
  validate,
  FantasyTeamController.renameTeam.bind(FantasyTeamController)
);

// PATCH /fantasy-team/lineup  — actualizar titulares/capitán
router.patch(
  '/lineup',
  [
    body('jugadores').isArray({ min: 1 }).withMessage('Debe enviar al menos un cambio'),
    body('jugadores.*.jugadorId').isInt({ min: 1 }),
    body('jugadores.*.esTitular').optional().isBoolean(),
    body('jugadores.*.esCapitan').optional().isBoolean(),
  ],
  validate,
  FantasyTeamController.updateLineup.bind(FantasyTeamController)
);

// GET /fantasy-team/transfers  — historial de transferencias
router.get('/transfers', FantasyTeamController.getTransfers.bind(FantasyTeamController));

// GET /fantasy-team/budget-history  — historial de presupuesto
router.get('/budget-history', FantasyTeamController.getBudgetHistory.bind(FantasyTeamController));

module.exports = router;
