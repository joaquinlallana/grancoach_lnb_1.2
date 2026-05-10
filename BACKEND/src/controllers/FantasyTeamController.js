const LineupService = require('../services/LineupService');
const FantasyTeamRepository = require('../repositories/FantasyTeamRepository');
const TransferRepository = require('../repositories/TransferRepository');

class FantasyTeamController {
  async getMyTeam(req, res, next) {
    try {
      const team = await LineupService.getMyTeam(req.user.id);
      res.json({ success: true, data: team });
    } catch (err) {
      next(err);
    }
  }

  async updateLineup(req, res, next) {
    try {
      const { jugadores } = req.body;
      const result = await LineupService.updateLineup(req.user.id, jugadores);
      res.json({ success: true, data: result, message: 'Alineación actualizada' });
    } catch (err) {
      next(err);
    }
  }

  async renameTeam(req, res, next) {
    try {
      const { nombre } = req.body;
      const result = await LineupService.renameTeam(req.user.id, nombre);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getTransfers(req, res, next) {
    try {
      const team = await FantasyTeamRepository.findByUserId(req.user.id);
      if (!team) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });

      const transfers = await TransferRepository.findByEquipo(team.id);
      res.json({ success: true, data: transfers });
    } catch (err) {
      next(err);
    }
  }

  async getBudgetHistory(req, res, next) {
    try {
      const team = await FantasyTeamRepository.findByUserId(req.user.id);
      if (!team) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });

      const history = await FantasyTeamRepository.getAuditPresupuesto(team.id);
      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FantasyTeamController();
