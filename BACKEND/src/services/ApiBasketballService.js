/**
 * ApiBasketballService.js
 *
 * Cliente HTTP para la API de api-basketball.com (api-sports.io).
 * Encapsula todas las llamadas a la API externa y normaliza las respuestas
 * antes de pasarlas a la capa de sincronización.
 *
 * Base URL: https://v1.basketball.api-sports.io
 * Autenticación: Header "x-apisports-key"
 * Límite gratuito: 100 requests/día
 */

const https = require('https');

class ApiBasketballService {
  constructor() {
    this.baseURL = process.env.API_BASKETBALL_URL || 'https://v1.basketball.api-sports.io';
    this.apiKey = process.env.API_BASKETBALL_KEY;

    if (!this.apiKey) {
      console.warn('[ApiBasketballService] ADVERTENCIA: API_BASKETBALL_KEY no configurada en .env');
    }
  }

  // ─── Método base de petición HTTP ──────────────────────────────────────────

  /**
   * Realiza una petición GET a la API.
   * @param {string} endpoint - Ruta del endpoint, ej: "/leagues"
   * @param {Object} params   - Query parameters, ej: { league: 116, season: "2024-2025" }
   * @returns {Promise<Object>} Respuesta parseada de la API
   */
  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${this.baseURL}${endpoint}${query ? '?' + query : ''}`;

    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        headers: {
          'x-apisports-key': this.apiKey,
          'Accept': 'application/json',
        },
      };

      const req = https.get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => { data += chunk; });

        res.on('end', () => {
          try {
            // Verificar códigos de error HTTP antes de parsear el body
            if (res.statusCode === 429) {
              return reject(new Error('[API Basketball] Límite de requests diarios alcanzado (429)'));
            }

            if (res.statusCode !== 200) {
              return reject(new Error(`[API Basketball] HTTP ${res.statusCode} en ${endpoint}`));
            }

            const parsed = JSON.parse(data);

            // La API devuelve errores en el campo "errors"
            if (parsed.errors && Object.keys(parsed.errors).length > 0) {
              const errMsg = JSON.stringify(parsed.errors);
              return reject(new Error(`[API Basketball] Error de API: ${errMsg}`));
            }

            resolve(parsed);
          } catch (e) {
            reject(new Error(`[API Basketball] Error al parsear respuesta: ${e.message}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`[API Basketball] Error de red: ${err.message}`));
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error(`[API Basketball] Timeout en ${endpoint}`));
      });
    });
  }

  // ─── Endpoint: Status ───────────────────────────────────────────────────────

  /**
   * Verifica conectividad con la API y cuota de requests disponible.
   * GET /status
   * @returns {Promise<Object>} { account, subscription, requests }
   */
  async getStatus() {
    const res = await this.get('/status');
    return res.response;
  }

  // ─── Endpoint: Leagues ──────────────────────────────────────────────────────

  /**
   * Busca ligas de básquet por nombre y/o país.
   * GET /leagues
   * @param {Object} filters - { name, country, id, season }
   * @returns {Promise<Array>} Lista de ligas con su ID de la API
   *
   * Para la LNB Argentina usar: { name: "Liga Nacional", country: "Argentina" }
   */
  async getLeagues(filters = {}) {
    const res = await this.get('/leagues', filters);
    return res.response || [];
  }

  // ─── Endpoint: Teams ────────────────────────────────────────────────────────

  /**
   * Obtiene todos los equipos de una liga y temporada.
   * GET /teams
   * @param {number} leagueId - ID de la liga en la API
   * @param {string} season   - Temporada, ej: "2024-2025"
   * @returns {Promise<Array>} Lista de equipos normalizados
   *
   * Estructura de cada equipo devuelto:
   * {
   *   api_id: number,       // ID en la API externa
   *   nombre: string,       // Nombre del equipo
   *   codigo: string,       // Código corto (ej: "PEÑ")
   *   logo_url: string,     // URL del logo
   *   ciudad: string,       // Ciudad (puede ser null)
   * }
   */
  async getTeams(leagueId, season) {
    const res = await this.get('/teams', { league: leagueId, season });
    const raw = res.response || [];

    return raw.map((item) => ({
      api_id: item.id,
      nombre: item.name,
      codigo: item.code || item.name.substring(0, 3).toUpperCase(),
      logo_url: item.logo || null,
      ciudad: item.country?.name || null,
    }));
  }

  // ─── Endpoint: Players ──────────────────────────────────────────────────────

  /**
   * Obtiene jugadores de una liga y temporada (con paginación automática).
   * GET /players
   * @param {number} leagueId - ID de la liga en la API
   * @param {string} season   - Temporada, ej: "2024-2025"
   * @returns {Promise<Array>} Lista de jugadores normalizados
   *
   * Estructura de cada jugador devuelto:
   * {
   *   api_id: number,       // ID del jugador en la API externa
   *   nombre: string,       // Nombre completo
   *   posicion_api: string, // Posición en inglés: "G", "F", "C", "G-F", "F-C"
   *   numero_camiseta: number|null,
   *   equipo_api_id: number, // ID del equipo en la API
   *   altura: string|null,
   *   peso: string|null,
   *   nacionalidad: string|null,
   *   fecha_nacimiento: string|null,
   * }
   */
  /**
   * Obtiene jugadores de un equipo específico (con paginación automática).
   * La API requiere `team` (no `league`) para filtrar jugadores.
   * GET /players?team=<teamId>&season=<season>
   *
   * @param {number} teamId   - ID del equipo en la API
   * @param {string} season   - Temporada, ej: "2024-2025"
   * @param {number} leagueId - Opcional: ID de liga para resolver número de camiseta
   */
  async getPlayersByTeam(teamId, season, leagueId = null, intentos = 3) {
    try {
      const res = await this.get('/players', { team: teamId, season });
      const data = res.response || [];

      // La API devuelve estructura plana: { id, name, number, position, country, age }
      return data
        .filter((item) => item && item.id)
        .map((item) => ({
          api_id: item.id,
          nombre: item.name || '',
          posicion_api: item.position || null,
          numero_camiseta: parseInt(item.number, 10) || null,
          equipo_api_id: teamId,
          nacionalidad: item.country || null,
          fecha_nacimiento: null,
        }));
    } catch (err) {
      // Reintentar en caso de corte de conexión (ECONNRESET)
      if (intentos > 1 && err.message.includes('ECONNRESET')) {
        console.warn(`[ApiBasketballService] ECONNRESET en equipo ${teamId}, reintentando en 5s... (${intentos - 1} intentos restantes)`);
        await this._sleep(5000);
        return this.getPlayersByTeam(teamId, season, leagueId, intentos - 1);
      }
      throw err;
    }
  }

  // ─── Endpoint: Games ────────────────────────────────────────────────────────

  /**
   * Obtiene todos los partidos de una liga y temporada.
   * GET /games
   * @param {number} leagueId - ID de la liga en la API
   * @param {string} season   - Temporada, ej: "2024-2025"
   * @param {Object} extra    - Filtros adicionales: { date, team, id }
   * @returns {Promise<Array>} Lista de partidos normalizados
   *
   * Estructura de cada partido devuelto:
   * {
   *   api_id: number,           // ID del partido en la API
   *   fecha: string,            // ISO date string
   *   ronda: string,            // Ej: "Regular Season - 12"
   *   numero_jornada: number|null, // Extraído del campo "ronda"
   *   equipo_local_api_id: number,
   *   equipo_visitante_api_id: number,
   *   puntos_local: number|null,
   *   puntos_visitante: number|null,
   *   estado_api: string,       // "NS", "Q1", "Q2", "HT", "Q3", "Q4", "OT", "FT", "AOT", "POST", "CANC"
   *   estado_normalizado: string, // "PROGRAMADO", "EN_CURSO", "FINALIZADO", "CANCELADO"
   * }
   */
  async getGames(leagueId, season, extra = {}) {
    const res = await this.get('/games', { league: leagueId, season, ...extra });
    const raw = res.response || [];

    return raw.map((game) => ({
      api_id: game.id,
      fecha: game.date,
      ronda: game.league?.round || '',
      numero_jornada: this._extractRoundNumber(game.league?.round),
      equipo_local_api_id: game.teams?.home?.id,
      equipo_visitante_api_id: game.teams?.away?.id,
      puntos_local: game.scores?.home?.total ?? null,
      puntos_visitante: game.scores?.away?.total ?? null,
      estado_api: game.status?.short,
      estado_normalizado: this._mapGameStatus(game.status?.short),
    }));
  }

  // ─── Endpoint: Game Statistics ──────────────────────────────────────────────

  /**
   * Obtiene las estadísticas individuales de jugadores de un partido.
   * GET /games/statistics
   * @param {number} gameId - ID del partido en la API
   * @returns {Promise<Array>} Lista de estadísticas por jugador
   *
   * Estructura de cada entrada devuelta:
   * {
   *   jugador_api_id: number,
   *   equipo_api_id: number,
   *   minutos: string|null,           // Ej: "32:15"
   *   puntos: number,
   *   rebotes_totales: number,
   *   rebotes_ofensivos: number,
   *   rebotes_defensivos: number,
   *   asistencias: number,
   *   robos: number,
   *   tapas: number,
   *   perdidas: number,
   *   faltas: number,
   *   tiros_campo_intentados: number,
   *   tiros_campo_convertidos: number,
   *   triples_intentados: number,
   *   triples_convertidos: number,
   *   libres_intentados: number,
   *   libres_convertidos: number,
   * }
   */
  async getGameStatistics(gameId) {
    const res = await this.get('/games/statistics', { id: gameId });
    const raw = res.response || [];

    const stats = [];

    for (const teamData of raw) {
      const equipo_api_id = teamData.team?.id;

      for (const playerStat of (teamData.players || [])) {
        const p = playerStat.player;
        const s = playerStat.statistics?.[0] || {};

        stats.push({
          jugador_api_id: p?.id,
          equipo_api_id,
          minutos: s.min || null,
          puntos: this._toInt(s.points),
          rebotes_totales: this._toInt(s.totReb),
          rebotes_ofensivos: this._toInt(s.offReb),
          rebotes_defensivos: this._toInt(s.defReb),
          asistencias: this._toInt(s.assists),
          robos: this._toInt(s.steals),
          tapas: this._toInt(s.blocks),
          perdidas: this._toInt(s.turnovers),
          faltas: this._toInt(s.pFouls),
          tiros_campo_intentados: this._toInt(s.fga),
          tiros_campo_convertidos: this._toInt(s.fgm),
          triples_intentados: this._toInt(s.tpa),
          triples_convertidos: this._toInt(s.tpm),
          libres_intentados: this._toInt(s.fta),
          libres_convertidos: this._toInt(s.ftm),
        });
      }
    }

    return stats;
  }

  // ─── Helpers privados ───────────────────────────────────────────────────────

  /**
   * Mapea el estado corto de la API al estado usado en la DB.
   * Estados de la API: NS (Not Started), Q1-Q4, HT, OT, FT, AOT, POST, CANC, SUSP, INT, ABD, WO, AW, LIVE
   */
  _mapGameStatus(short) {
    const map = {
      NS: 'PROGRAMADO',
      POST: 'PROGRAMADO',
      CANC: 'CANCELADO',
      SUSP: 'CANCELADO',
      ABD: 'CANCELADO',
      FT: 'FINALIZADO',
      AOT: 'FINALIZADO',
      AW: 'FINALIZADO',
      WO: 'FINALIZADO',
      Q1: 'EN_CURSO',
      Q2: 'EN_CURSO',
      HT: 'EN_CURSO',
      Q3: 'EN_CURSO',
      Q4: 'EN_CURSO',
      OT: 'EN_CURSO',
      INT: 'EN_CURSO',
      LIVE: 'EN_CURSO',
    };
    return map[short] || 'PROGRAMADO';
  }

  /**
   * Extrae el número de jornada desde el campo "round" de la API.
   * Ej: "Regular Season - 12" → 12
   */
  _extractRoundNumber(round) {
    if (!round) return null;
    const match = round.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  _toInt(val) {
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new ApiBasketballService();
