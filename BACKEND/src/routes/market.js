const { Router } = require('express');
const { body, param } = require('express-validator');
const MarketController = require('../controllers/MarketController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

// GET /market/players  — listado del mercado (auth opcional para excluir jugadores propios)
router.get('/players', optionalAuth, MarketController.getPlayers.bind(MarketController));

// GET /market/players/:id
router.get('/players/:id', MarketController.getPlayer.bind(MarketController));

// GET /market/status  — estado del mercado
router.get('/status', MarketController.getMarketStatus.bind(MarketController));

// GET /market/equipos-lnb
router.get('/equipos-lnb', MarketController.getEquiposLnb.bind(MarketController));

// GET /market/posiciones
router.get('/posiciones', MarketController.getPosiciones.bind(MarketController));

// POST /market/buy/:jugadorId  — fichar jugador
router.post(
  '/buy/:jugadorId',
  authenticate,
  [param('jugadorId').isInt({ min: 1 })],
  validate,
  MarketController.buyPlayer.bind(MarketController)
);

// DELETE /market/sell/:jugadorId  — vender jugador
router.delete(
  '/sell/:jugadorId',
  authenticate,
  [param('jugadorId').isInt({ min: 1 })],
  validate,
  MarketController.sellPlayer.bind(MarketController)
);

// POST /market/transfer  — transferencia directa (sale + entra)
router.post(
  '/transfer',
  authenticate,
  [
    body('jugador_sale_id').isInt({ min: 1 }).withMessage('jugador_sale_id inválido'),
    body('jugador_entra_id').isInt({ min: 1 }).withMessage('jugador_entra_id inválido'),
  ],
  validate,
  MarketController.transferPlayer.bind(MarketController)
);

module.exports = router;
