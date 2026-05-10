const ScoringService = require('../services/ScoringService');
const RankingRepository = require('../repositories/RankingRepository');
const FantasyTeamRepository = require('../repositories/FantasyTeamRepository');

class RankingController {
  async getGlobal(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await ScoringService.getRankingGeneral({
        page: page ? parseInt(page) : 1,
        limit: limit ? Math.min(parseInt(limit), 100) : 20,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getMyScore(req, res, next) {
    try {
      const team = await FantasyTeamRepository.findByUserId(req.user.id);
      if (!team) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });

      const detail = await ScoringService.getTeamScoreDetail(team.id);
      res.json({ success: true, data: detail });
    } catch (err) {
      next(err);
    }
  }

  async getPlayerStats(req, res, next) {
    try {
      const { limit } = req.query;
      const stats = await ScoringService.getPlayerStats(parseInt(req.params.jugadorId), {
        limit: limit ? parseInt(limit) : 10,
      });
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async getPlayerFantasyPoints(req, res, next) {
    try {
      const points = await ScoringService.getPlayerFantasyPoints(parseInt(req.params.jugadorId));
      res.json({ success: true, data: points });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RankingController();
