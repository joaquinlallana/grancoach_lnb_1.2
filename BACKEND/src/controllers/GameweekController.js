const GameweekRepository = require('../repositories/GameweekRepository');
const MatchRepository = require('../repositories/MatchRepository');
const LineupService = require('../services/LineupService');
const ScoringService = require('../services/ScoringService');
const { createError } = require('../middleware/errorHandler');

/**
 * Resuelve un parámetro :id que puede ser:
 *   - El ID real de la jornada (ej: 39)
 *   - El número de jornada (ej: 1)
 * Si el valor coincide con un id válido lo devuelve directamente.
 * Si no, intenta encontrar la jornada por número.
 * @returns {Promise<number|null>} ID resuelto o null si no existe
 */
async function resolveJornadaId(param) {
  const num = parseInt(param);
  if (isNaN(num)) return null;

  // Intentar como ID directo
  const byId = await GameweekRepository.findById(num);
  if (byId) return byId.id;

  // Si no existe como ID, intentar como número de jornada
  const byNumero = await GameweekRepository.findByNumero(num);
  return byNumero ? byNumero.id : null;
}

class GameweekController {
  async getAll(req, res, next) {
    try {
      const jornadas = await GameweekRepository.findAll();
      res.json({ success: true, data: jornadas });
    } catch (err) {
      next(err);
    }
  }

  async getCurrent(req, res, next) {
    try {
      const jornada = await GameweekRepository.findCurrent();
      if (!jornada) return res.status(404).json({ success: false, message: 'No hay jornada activa' });
      res.json({ success: true, data: jornada });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const id = await resolveJornadaId(req.params.id);
      if (!id) return res.status(404).json({ success: false, message: 'Jornada no encontrada' });
      const jornada = await GameweekRepository.findById(id);

      // Incluir partidos de la jornada
      const partidos = await MatchRepository.findAll({ jornadaId: jornada.id });
      res.json({ success: true, data: { ...jornada, partidos } });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { numero, fechaInicio, fechaFin, lineupLock } = req.body;
      const jornada = await GameweekRepository.create({ numero, fechaInicio, fechaFin, lineupLock });
      res.status(201).json({ success: true, data: jornada });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { fechaInicio, fechaFin, lineupLock } = req.body;
      const jornada = await GameweekRepository.update(parseInt(req.params.id), {
        fechaInicio, fechaFin, lineupLock,
      });
      if (!jornada) return res.status(404).json({ success: false, message: 'Jornada no encontrada' });
      res.json({ success: true, data: jornada });
    } catch (err) {
      next(err);
    }
  }

  async lock(req, res, next) {
    try {
      const id = await resolveJornadaId(req.params.id);
      if (!id) return res.status(404).json({ success: false, message: 'Jornada no encontrada' });
      const result = await LineupService.closeGameweek(id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getSnapshot(req, res, next) {
    try {
      const id = await resolveJornadaId(req.params.id);
      if (!id) return res.status(404).json({ success: false, message: 'Jornada no encontrada' });
      const snapshot = await GameweekRepository.getSnapshotsByJornada(id);
      res.json({ success: true, data: snapshot });
    } catch (err) {
      next(err);
    }
  }

  // Partidos
  async getMatches(req, res, next) {
    try {
      const { estado } = req.query;
      const id = await resolveJornadaId(req.params.id);
      if (!id) return res.status(404).json({ success: false, message: 'Jornada no encontrada' });
      const partidos = await MatchRepository.findAll({ jornadaId: id, estado });
      res.json({ success: true, data: partidos });
    } catch (err) {
      next(err);
    }
  }

  async createMatch(req, res, next) {
    try {
      const { equipoLocalId, equipoVisitanteId, fecha } = req.body;
      const partido = await MatchRepository.create({
        jornadaId: parseInt(req.params.id),
        equipoLocalId,
        equipoVisitanteId,
        fecha,
        quienRegistro: req.user.id,
      });
      res.status(201).json({ success: true, data: partido });
    } catch (err) {
      next(err);
    }
  }

  async updateMatch(req, res, next) {
    try {
      const { estado, puntosLocal, puntosVisitante } = req.body;
      const partido = await MatchRepository.update(parseInt(req.params.partidoId), {
        estado, puntosLocal, puntosVisitante,
      });
      if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
      res.json({ success: true, data: partido });
    } catch (err) {
      next(err);
    }
  }

  // Stats de un partido
  async getMatchStats(req, res, next) {
    try {
      const stats = await ScoringService.getMatchStats(parseInt(req.params.partidoId));
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async loadPlayerStats(req, res, next) {
    try {
      const { jugadorId, ...stats } = req.body;
      const result = await ScoringService.loadStats(
        jugadorId,
        parseInt(req.params.partidoId),
        stats
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getRankingPorJornada(req, res, next) {
    try {
      const { page, limit } = req.query;
      const id = await resolveJornadaId(req.params.id);
      if (!id) return res.status(404).json({ success: false, message: 'Jornada no encontrada' });
      const result = await ScoringService.getRankingPorJornada(id, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async advanceGameweek(req, res, next) {
    try {
      // Obtener jornada actual
      const current = await GameweekRepository.findCurrent();
      if (!current) {
        return res.status(404).json({
          success: false,
          message: 'No hay jornada activa para cerrar',
        });
      }

      // Marcar como cerrada
      const updated = await GameweekRepository.update(current.id, { cerrada: true });

      // Obtener la siguiente jornada (automáticamente es la próxima no cerrada)
      const next = await GameweekRepository.findCurrent();

      return res.json({
        success: true,
        message: `Jornada ${current.numero} cerrada. Jornada ${next?.numero || 'ninguna'} ahora actual.`,
        closedGameweek: {
          id: updated.id,
          numero: updated.numero,
          cerrada: true,
        },
        currentGameweek: next ? {
          id: next.id,
          numero: next.numero,
          fechaInicio: next.fecha_inicio,
          fechaFin: next.fecha_fin,
        } : null,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GameweekController();
