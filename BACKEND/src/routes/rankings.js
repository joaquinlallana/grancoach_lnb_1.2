const { Router } = require('express');
const RankingController = require('../controllers/RankingController');
const { authenticate } = require('../middleware/auth');

const router = Router();

// GET /rankings/global
router.get('/global', RankingController.getGlobal.bind(RankingController));

// GET /rankings/my-score  — puntaje histórico del equipo del usuario autenticado
router.get('/my-score', authenticate, RankingController.getMyScore.bind(RankingController));

// GET /rankings/players/:jugadorId/stats
router.get('/players/:jugadorId/stats', RankingController.getPlayerStats.bind(RankingController));

// GET /rankings/players/:jugadorId/fantasy-points
router.get(
  '/players/:jugadorId/fantasy-points',
  RankingController.getPlayerFantasyPoints.bind(RankingController)
);

module.exports = router;
