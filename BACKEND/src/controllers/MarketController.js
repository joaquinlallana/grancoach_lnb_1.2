const MarketService = require('../services/MarketService');
const PlayerRepository = require('../repositories/PlayerRepository');

class MarketController {
  async getPlayers(req, res, next) {
    try {
      const { posicion, equipo_id, page, limit, q } = req.query;
      const result = await MarketService.getMarketPlayers({
        posicion,
        equipoId: equipo_id ? parseInt(equipo_id) : undefined,
        page: page ? parseInt(page) : 1,
        limit: limit ? Math.min(parseInt(limit), 100) : 20,
        search: q,
        excludeUserId: req.user?.id, // Si está autenticado, excluir jugadores que ya tiene
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getPlayer(req, res, next) {
    try {
      const player = await PlayerRepository.findById(parseInt(req.params.id));
      if (!player) return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
      res.json({ success: true, data: player });
    } catch (err) {
      next(err);
    }
  }

  async buyPlayer(req, res, next) {
    try {
      const result = await MarketService.buyPlayer(req.user.id, parseInt(req.params.jugadorId));
      res.status(201).json({ success: true, data: result, message: 'Jugador fichado exitosamente' });
    } catch (err) {
      next(err);
    }
  }

  async sellPlayer(req, res, next) {
    try {
      const result = await MarketService.sellPlayer(req.user.id, parseInt(req.params.jugadorId));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async transferPlayer(req, res, next) {
    try {
      const { jugador_sale_id, jugador_entra_id } = req.body;
      const result = await MarketService.transferPlayer(req.user.id, {
        jugadorSaleId: jugador_sale_id,
        jugadorEntraId: jugador_entra_id,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getMarketStatus(req, res, next) {
    try {
      const status = await MarketService.getEstadoMercado();
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  async getEquiposLnb(req, res, next) {
    try {
      const equipos = await PlayerRepository.getEquiposLnb();
      res.json({ success: true, data: equipos });
    } catch (err) {
      next(err);
    }
  }

  async getPosiciones(req, res, next) {
    try {
      const posiciones = await PlayerRepository.getPosiciones();
      res.json({ success: true, data: posiciones });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MarketController();
