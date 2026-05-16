const FantasyTeamRepository = require('../repositories/FantasyTeamRepository');
const GameweekRepository = require('../repositories/GameweekRepository');
const PlayerRepository = require('../repositories/PlayerRepository');
const { createError } = require('../middleware/errorHandler');

// Posiciones válidas por tipo (Art. II del reglamento)
const POSICIONES_TITULAR = ['base', 'escolta', 'alero', 'ala-pivot', 'pivot'];
const PERIMETRALES = ['base', 'escolta', 'alero'];
const INTERNOS = ['ala-pivot', 'pivot'];

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
   *
   * Reglas (Art. II del reglamento):
   *   Titulares (5): 1 base, 1 escolta, 1 alero, 1 ala-pivot, 1 pivot
   *   Suplentes (5): ≥2 perimetrales (B/E/A), ≥2 internos (AP/P), 1 comodín
   */
  async updateLineup(userId, lineupChanges) {
    const team = await FantasyTeamRepository.findByUserId(userId);
    if (!team) throw createError(404, 'Equipo fantasy no encontrado');

    const titulares = lineupChanges.filter((c) => c.esTitular === true);
    const suplentes = lineupChanges.filter((c) => c.esTitular === false);

    // — Capitán —
    const capitanes = lineupChanges.filter((c) => c.esCapitan === true);
    if (capitanes.length > 1) throw createError(400, 'Solo puede haber un capitán');
    if (capitanes.length === 1 && !capitanes[0].esTitular) {
      throw createError(400, 'El capitán debe ser titular');
    }

    // — Validación completa solo cuando el plantel tiene 10 jugadores —
    if (lineupChanges.length === 10) {
      if (titulares.length !== 5) {
        throw createError(400, 'Debe haber exactamente 5 titulares');
      }
      if (suplentes.length !== 5) {
        throw createError(400, 'Debe haber exactamente 5 suplentes');
      }

      // Obtener posiciones de todos los jugadores
      const ids = lineupChanges.map((c) => c.jugadorId);
      const players = await PlayerRepository.findByIds(ids);
      const posicion = (id) => players.find((p) => p.id === id)?.posicion;

      // Titulares: exactamente 1 por posición
      for (const pos of POSICIONES_TITULAR) {
        const count = titulares.filter((t) => posicion(t.jugadorId) === pos).length;
        if (count !== 1) {
          const label = pos.charAt(0).toUpperCase() + pos.slice(1);
          throw createError(
            400,
            `La formación necesita exactamente 1 ${label} titular. Encontrado: ${count}`
          );
        }
      }

      // Suplentes: ≥2 perimetrales y ≥2 internos
      const benchPerimetrales = suplentes.filter((s) => PERIMETRALES.includes(posicion(s.jugadorId))).length;
      const benchInternos     = suplentes.filter((s) => INTERNOS.includes(posicion(s.jugadorId))).length;

      if (benchPerimetrales < 2) {
        throw createError(
          400,
          `El banco necesita al menos 2 perimetrales (Base/Escolta/Alero). Tenés ${benchPerimetrales}.`
        );
      }
      if (benchInternos < 2) {
        throw createError(
          400,
          `El banco necesita al menos 2 internos (Ala-Pivot/Pivot). Tenés ${benchInternos}.`
        );
      }
    } else {
      // Plantel incompleto: solo validaciones básicas
      if (titulares.length === 0 && capitanes.length === 0) {
        throw createError(400, 'Debe haber al menos un jugador titular');
      }
      if (titulares.length > 5) {
        throw createError(400, 'No puede haber más de 5 titulares');
      }
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
