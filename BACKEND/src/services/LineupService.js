const FantasyTeamRepository = require('../repositories/FantasyTeamRepository');
const GameweekRepository = require('../repositories/GameweekRepository');
const { createError } = require('../middleware/errorHandler');

class LineupService {
  /**
   * Obtiene el equipo con roster completo del usuario.
   */
  async getMyTeam(userId) {
    const team = await FantasyTeamRepository.findWithRoster(userId);
    if (!team) throw createError(404, 'Equipo fantasy no encontrado');
    return team;
  }

  /**
   * Actualiza alineación (titulares/suplentes/capitán).
   * Recibe un array de { jugadorId, esTitular, esCapitan }.
   */
  async updateLineup(userId, lineupChanges) {
    const team = await FantasyTeamRepository.findByUserId(userId);
    if (!team) throw createError(404, 'Equipo fantasy no encontrado');

    // Validar que solo haya un capitán en los cambios
    const capitanes = lineupChanges.filter((c) => c.esCapitan === true);
    if (capitanes.length > 1) {
      throw createError(400, 'Solo puede haber un capitán');
    }

    // Validar que el capitán sea titular
    for (const c of capitanes) {
      if (c.esTitular === false) {
        throw createError(400, 'El capitán debe ser titular');
      }
    }

    // VALIDAR que haya al menos 1 titular o capitán
    const titulares = lineupChanges.filter((c) => c.esTitular === true || c.esCapitan === true);
    if (titulares.length === 0) {
      throw createError(400, 'Debe haber al menos un jugador titular o capitán');
    }

    return FantasyTeamRepository.updateLineup(team.id, lineupChanges);
  }

  /**
   * Cambia el nombre del equipo.
   */
  async renameTeam(userId, nombre) {
    const team = await FantasyTeamRepository.findByUserId(userId);
    if (!team) throw createError(404, 'Equipo fantasy no encontrado');
    return FantasyTeamRepository.updateNombre(team.id, nombre);
  }

  /**
   * Cierra una jornada: congela el snapshot y bloquea el mercado.
   * Solo debería ser ejecutado por un admin/cron job.
   */
  async closeGameweek(jornadaId) {
    const jornada = await GameweekRepository.findById(jornadaId);
    if (!jornada) throw createError(404, 'Jornada no encontrada');
    if (jornada.cerrada) throw createError(400, 'La jornada ya está cerrada');

    await GameweekRepository.capturarLineupSnapshot(jornadaId);

    return { message: `Jornada ${jornada.numero} cerrada exitosamente` };
  }
}

module.exports = new LineupService();
