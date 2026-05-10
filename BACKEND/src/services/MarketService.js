const { withTransaction } = require('../config/database');
const FantasyTeamRepository = require('../repositories/FantasyTeamRepository');
const PlayerRepository = require('../repositories/PlayerRepository');
const TransferRepository = require('../repositories/TransferRepository');
const GameweekRepository = require('../repositories/GameweekRepository');
const { createError } = require('../middleware/errorHandler');

// Máximo de transferencias por jornada antes de penalización
const TRANSFERENCIAS_LIBRES_POR_JORNADA = 1;
const PENALIZACION_PUNTOS = 20;

class MarketService {
  /**
   * Compra un jugador para el equipo del usuario.
   * La DB (trigger controlar_presupuesto) descuenta el precio automáticamente.
   * La DB (trigger bloquear_si_jornada_cerrada) impide cambios si el mercado está cerrado.
   */
  async buyPlayer(userId, jugadorId) {
    return withTransaction(async (client) => {
      // 1. Obtener equipo del usuario
      const team = await FantasyTeamRepository.findByUserId(userId);
      if (!team) throw createError(404, 'Equipo fantasy no encontrado');

      // 2. Verificar que el jugador existe y está activo
      const player = await PlayerRepository.findById(jugadorId);
      if (!player) throw createError(404, 'Jugador no encontrado');
      if (!player.activo) throw createError(400, 'El jugador no está activo en el mercado');

      // 3. Verificar que no esté ya en el equipo
      const alreadyIn = await PlayerRepository.isInTeam(jugadorId, team.id);
      if (alreadyIn) throw createError(409, 'El jugador ya está en tu equipo');

      // 4. VALIDAR presupuesto ANTES de insertar
      if (team.presupuesto_restante < player.precio) {
        throw createError(422,
          `Presupuesto insuficiente. Necesitas ${player.precio}, tienes ${team.presupuesto_restante}`
        );
      }

      // 4. La DB validará: presupuesto, límite 10 jugadores, máx 3 del mismo equipo LNB,
      //    y si la jornada está bloqueada (via triggers). Si algo falla, la excepción
      //    de PostgreSQL se propagará y el error handler la convertirá en 422.
      const relation = await client.query(
        `INSERT INTO equipo_fantasy_jugadores (equipo_fantasy_id, jugador_id, es_titular)
         VALUES ($1, $2, true) RETURNING *`,
        [team.id, jugadorId]
      );

      // 5. Registrar transferencia (sólo entrada, sin jugador que sale)
      const jornada = await GameweekRepository.findCurrent();
      if (!jornada) {
        throw createError(400, 'No hay jornada activa. No se pueden hacer transferencias.');
      }
      
      const transfersThisWeek = await TransferRepository.countByEquipoAndJornada(team.id, jornada.id);
      const esPenalizada = transfersThisWeek > TRANSFERENCIAS_LIBRES_POR_JORNADA;

      await client.query(
        `INSERT INTO transferencias (equipo_fantasy_id, jugador_sale_id, jugador_entra_id, jornada_id, es_penalizada, penalizacion_puntos)
         VALUES ($1, NULL, $2, $3, $4, $5)`,
        [team.id, jugadorId, jornada.id, esPenalizada, esPenalizada ? PENALIZACION_PUNTOS : 0]
      );

      return {
        relacion: relation.rows[0],
        jugador: player,
        equipo: await FantasyTeamRepository.getPresupuesto(team.id),
      };
    });
  }

  /**
   * Vende (da de baja) un jugador del equipo.
   * El trigger devolver_presupuesto reintegra el valor automáticamente.
   */
  async sellPlayer(userId, jugadorId) {
    return withTransaction(async (client) => {
      const team = await FantasyTeamRepository.findByUserId(userId);
      if (!team) throw createError(404, 'Equipo fantasy no encontrado');

      // Verificar que el jugador está en el equipo
      const inTeam = await PlayerRepository.isInTeam(jugadorId, team.id);
      if (!inTeam) throw createError(404, 'El jugador no está en tu equipo');

      // Eliminar de la plantilla (trigger devuelve presupuesto)
      await client.query(
        `DELETE FROM equipo_fantasy_jugadores WHERE equipo_fantasy_id = $1 AND jugador_id = $2`,
        [team.id, jugadorId]
      );

      // Registrar transferencia (sólo salida)
      const jornada = await GameweekRepository.findCurrent();
      if (!jornada) {
        throw createError(400, 'No hay jornada activa. No se pueden hacer transferencias.');
      }
      
      const transfersThisWeek = await TransferRepository.countByEquipoAndJornada(team.id, jornada.id);
      const esPenalizada = transfersThisWeek > TRANSFERENCIAS_LIBRES_POR_JORNADA;

      await client.query(
        `INSERT INTO transferencias (equipo_fantasy_id, jugador_sale_id, jugador_entra_id, jornada_id, es_penalizada, penalizacion_puntos)
         VALUES ($1, $2, NULL, $3, $4, $5)`,
        [team.id, jugadorId, jornada.id, esPenalizada, esPenalizada ? PENALIZACION_PUNTOS : 0]
      );

      return {
        message: 'Jugador vendido exitosamente',
        presupuesto: await FantasyTeamRepository.getPresupuesto(team.id),
      };
    });
  }

  /**
   * Transferencia directa: vender un jugador y comprar otro en una sola operación.
   */
  async transferPlayer(userId, { jugadorSaleId, jugadorEntraId }) {
    return withTransaction(async (client) => {
      const team = await FantasyTeamRepository.findByUserId(userId);
      if (!team) throw createError(404, 'Equipo fantasy no encontrado');

      const playerIn = await PlayerRepository.findById(jugadorEntraId);
      if (!playerIn) throw createError(404, 'Jugador a fichar no encontrado');
      if (!playerIn.activo) throw createError(400, 'El jugador a fichar no está activo');

      const inTeam = await PlayerRepository.isInTeam(jugadorSaleId, team.id);
      if (!inTeam) throw createError(404, 'El jugador a vender no está en tu equipo');

      const alreadyIn = await PlayerRepository.isInTeam(jugadorEntraId, team.id);
      if (alreadyIn) throw createError(409, 'El jugador a fichar ya está en tu equipo');

      // Validar presupuesto ANTES de hacer cambios
      if (team.presupuesto_restante < playerIn.precio) {
        throw createError(422,
          `Presupuesto insuficiente. Necesitas ${playerIn.precio}, tienes ${team.presupuesto_restante}`
        );
      }

      // Eliminar jugador que sale (trigger devuelve presupuesto)
      const deleteResult = await client.query(
        `DELETE FROM equipo_fantasy_jugadores WHERE equipo_fantasy_id = $1 AND jugador_id = $2`,
        [team.id, jugadorSaleId]
      );

      // Validar que el DELETE realmente eliminó 1 fila
      if (deleteResult.rowCount !== 1) {
        throw createError(500, 'Error al eliminar jugador. Por favor intenta de nuevo.');
      }

      // Agregar jugador que entra (trigger descuenta presupuesto, valida límites)
      await client.query(
        `INSERT INTO equipo_fantasy_jugadores (equipo_fantasy_id, jugador_id, es_titular) VALUES ($1, $2, true)`,
        [team.id, jugadorEntraId]
      );

      // Registrar transferencia
      const jornada = await GameweekRepository.findCurrent();
      if (!jornada) {
        throw createError(400, 'No hay jornada activa. No se pueden hacer transferencias.');
      }
      
      const transfersThisWeek = await TransferRepository.countByEquipoAndJornada(team.id, jornada.id);
      let esPenalizada = transfersThisWeek > TRANSFERENCIAS_LIBRES_POR_JORNADA;

      await client.query(
        `INSERT INTO transferencias (equipo_fantasy_id, jugador_sale_id, jugador_entra_id, jornada_id, es_penalizada, penalizacion_puntos)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [team.id, jugadorSaleId, jugadorEntraId, jornada.id, esPenalizada, esPenalizada ? PENALIZACION_PUNTOS : 0]
      );

      return {
        message: 'Transferencia realizada exitosamente',
        penalizada: esPenalizada,
        penalizacion: esPenalizada ? PENALIZACION_PUNTOS : 0,
        presupuesto: await FantasyTeamRepository.getPresupuesto(team.id),
        jugadorFichado: playerIn,
      };
    });
  }

  async getMarketPlayers(filters) {
    return PlayerRepository.findAll(filters);
  }

  async getEstadoMercado() {
    return GameweekRepository.getEstadoMercado();
  }
}

module.exports = new MarketService();
