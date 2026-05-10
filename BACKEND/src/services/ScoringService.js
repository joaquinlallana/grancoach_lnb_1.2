const StatsRepository = require('../repositories/StatsRepository');
const RankingRepository = require('../repositories/RankingRepository');
const MatchRepository = require('../repositories/MatchRepository');
const GameweekRepository = require('../repositories/GameweekRepository');
const { createError } = require('../middleware/errorHandler');

class ScoringService {
  /**
   * Carga o actualiza las estadísticas de un jugador en un partido.
   * La DB valida automáticamente la coherencia de los números.
   */
  async loadStats(jugadorId, partidoId, stats) {
    const match = await MatchRepository.findById(partidoId);
    if (!match) throw createError(404, 'Partido no encontrado');

    return StatsRepository.upsert(jugadorId, partidoId, stats);
  }

  /**
   * Retorna los puntos fantasy de un jugador calculados por la vista de la DB.
   */
  async getPlayerFantasyPoints(jugadorId) {
    return StatsRepository.getPuntosFantasyPorPartido(jugadorId);
  }

  /**
   * Ranking general acumulado (usa la vista ranking_general_completo).
   */
  async getRankingGeneral(options) {
    return RankingRepository.getRankingGeneral(options);
  }

  /**
   * Ranking de una jornada específica.
   */
  async getRankingPorJornada(jornadaId, options) {
    const jornada = await GameweekRepository.findById(jornadaId);
    if (!jornada) throw createError(404, 'Jornada no encontrada');
    return RankingRepository.getRankingPorJornada(jornadaId, options);
  }

  /**
   * Detalle de puntuación del equipo en todas las jornadas.
   */
  async getTeamScoreDetail(equipoFantasyId) {
    return RankingRepository.getTotalEquipoPorJornada(equipoFantasyId);
  }

  /**
   * Detalle de puntos de cada jugador de un equipo en una jornada.
   */
  async getTeamJornada(equipoFantasyId, jornadaId) {
    return RankingRepository.getPuntosEquipoPorJornada(equipoFantasyId, jornadaId);
  }

  /**
   * Estadísticas recientes de un jugador.
   */
  async getPlayerStats(jugadorId, options) {
    return StatsRepository.findByJugador(jugadorId, options);
  }

  /**
   * Estadísticas de todos los jugadores de un partido.
   */
  async getMatchStats(partidoId) {
    return StatsRepository.findByPartido(partidoId);
  }
}

module.exports = new ScoringService();
