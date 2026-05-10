/**
 * Genera estadísticas realistas para todos los partidos en la BD.
 *
 * Para cada partido finalizado:
 *   - Obtiene los jugadores de cada equipo (max 10 por equipo)
 *   - Genera stats realistas basadas en la posición
 *   - Inserta en la tabla `estadisticas`
 *
 * Uso:
 *   node scripts/generateRealisticStats.js
 */

require('dotenv').config();
const { pool } = require('../src/config/database');

// ─── Rangos de stats por posición ───────────────────────────────────────────
// [min, max] para titulares. Suplentes reciben ~60% del valor.
const STATS_BY_POSITION = {
  base: {
    puntos: [6, 18],
    rebotes: [1, 4],
    asistencias: [3, 8],
    robos: [0, 3],
    tapas: [0, 1],
    perdidas: [1, 4],
    faltas: [1, 4],
    tiros_intentados: [6, 14],
    triples_intentados: [2, 6],
    libres_intentados: [1, 5],
    minutos: [22, 35],
  },
  escolta: {
    puntos: [8, 20],
    rebotes: [2, 5],
    asistencias: [1, 4],
    robos: [0, 2],
    tapas: [0, 1],
    perdidas: [1, 3],
    faltas: [1, 4],
    tiros_intentados: [7, 15],
    triples_intentados: [3, 8],
    libres_intentados: [1, 5],
    minutos: [22, 33],
  },
  alero: {
    puntos: [8, 17],
    rebotes: [3, 7],
    asistencias: [1, 3],
    robos: [0, 2],
    tapas: [0, 1],
    perdidas: [1, 3],
    faltas: [1, 4],
    tiros_intentados: [6, 13],
    triples_intentados: [2, 5],
    libres_intentados: [1, 4],
    minutos: [20, 32],
  },
  'ala-pivot': {
    puntos: [6, 15],
    rebotes: [5, 9],
    asistencias: [0, 2],
    robos: [0, 2],
    tapas: [0, 2],
    perdidas: [1, 3],
    faltas: [2, 5],
    tiros_intentados: [5, 11],
    triples_intentados: [0, 3],
    libres_intentados: [2, 6],
    minutos: [20, 30],
  },
  pivot: {
    puntos: [4, 13],
    rebotes: [6, 11],
    asistencias: [0, 2],
    robos: [0, 1],
    tapas: [0, 3],
    perdidas: [1, 3],
    faltas: [2, 5],
    tiros_intentados: [4, 10],
    triples_intentados: [0, 1],
    libres_intentados: [2, 6],
    minutos: [18, 28],
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateStat(posicion, esTitular) {
  const ranges = STATS_BY_POSITION[posicion] || STATS_BY_POSITION.base;
  const factor = esTitular ? 1.0 : 0.55; // suplentes: ~55% de los titulares

  // Generar tiros intentados/convertidos
  const tirosIntentados = Math.round(rand(ranges.tiros_intentados[0], ranges.tiros_intentados[1]) * factor);
  const tirosConvertidos = Math.min(tirosIntentados, Math.round(tirosIntentados * (0.4 + Math.random() * 0.25))); // 40-65% efectividad

  const triplesIntentados = Math.min(tirosIntentados, Math.round(rand(ranges.triples_intentados[0], ranges.triples_intentados[1]) * factor));
  const triplesConvertidos = Math.min(triplesIntentados, Math.round(triplesIntentados * (0.25 + Math.random() * 0.20))); // 25-45%

  const libresIntentados = Math.round(rand(ranges.libres_intentados[0], ranges.libres_intentados[1]) * factor);
  const libresConvertidos = Math.min(libresIntentados, Math.round(libresIntentados * (0.65 + Math.random() * 0.25))); // 65-90%

  // Calcular puntos: 2 por tiro de 2, 3 por triple, 1 por libre
  const tirosDe2Convertidos = Math.max(0, tirosConvertidos - triplesConvertidos);
  const puntos = (tirosDe2Convertidos * 2) + (triplesConvertidos * 3) + libresConvertidos;

  // Convertir minutos a formato "MM:SS"
  const minutosNum = Math.round(rand(ranges.minutos[0], ranges.minutos[1]) * factor);
  const segundos = rand(0, 59);
  const minutos = `${String(minutosNum).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

  return {
    puntos,
    rebotes: Math.round(rand(ranges.rebotes[0], ranges.rebotes[1]) * factor),
    asistencias: Math.round(rand(ranges.asistencias[0], ranges.asistencias[1]) * factor),
    robos: Math.round(rand(ranges.robos[0], ranges.robos[1]) * factor),
    tapas: Math.round(rand(ranges.tapas[0], ranges.tapas[1]) * factor),
    perdidas: Math.round(rand(ranges.perdidas[0], ranges.perdidas[1]) * factor),
    faltas: Math.min(5, Math.round(rand(ranges.faltas[0], ranges.faltas[1]) * factor)),
    tiros_campo_intentados: tirosIntentados,
    tiros_campo_convertidos: tirosConvertidos,
    triples_intentados: triplesIntentados,
    triples_convertidos: triplesConvertidos,
    libres_intentados: libresIntentados,
    libres_convertidos: libresConvertidos,
    minutos,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎯 Generando estadísticas realistas para todos los partidos...\n');

  // 1. Verificar partidos existentes
  const partidosResult = await pool.query(`
    SELECT id, jornada_id, equipo_local_id, equipo_visitante_id, fecha, estado
    FROM partidos
    WHERE jornada_id IS NOT NULL
    ORDER BY fecha
  `);
  const partidos = partidosResult.rows;
  console.log(`✅ ${partidos.length} partidos encontrados con jornada asignada`);

  if (partidos.length === 0) {
    console.error('❌ No hay partidos para procesar');
    await pool.end();
    return;
  }

  // 2. Verificar que ya existen jugadores
  const jugadoresResult = await pool.query(`
    SELECT j.id, j.nombre, j.posicion, j.equipo_id
    FROM jugadores j
    WHERE j.equipo_id IS NOT NULL AND j.activo = true
    ORDER BY j.equipo_id, j.nombre
  `);
  const jugadores = jugadoresResult.rows;
  console.log(`✅ ${jugadores.length} jugadores encontrados`);

  // Agrupar jugadores por equipo
  const jugadoresPorEquipo = {};
  for (const j of jugadores) {
    if (!jugadoresPorEquipo[j.equipo_id]) {
      jugadoresPorEquipo[j.equipo_id] = [];
    }
    jugadoresPorEquipo[j.equipo_id].push(j);
  }

  // 3. Borrar stats existentes (si hay) para evitar duplicados antiguos
  const oldStatsResult = await pool.query('SELECT COUNT(*) FROM estadisticas');
  if (parseInt(oldStatsResult.rows[0].count) > 0) {
    console.log(`⚠️  Borrando ${oldStatsResult.rows[0].count} stats antiguas para regenerar...`);
    await pool.query('TRUNCATE estadisticas RESTART IDENTITY CASCADE');
  }

  // 4. Generar stats para cada partido
  let totalGenerados = 0;
  let partidosProcesados = 0;
  let partidosSinJugadores = 0;

  for (const partido of partidos) {
    const equipoLocal = jugadoresPorEquipo[partido.equipo_local_id] || [];
    const equipoVisitante = jugadoresPorEquipo[partido.equipo_visitante_id] || [];

    if (equipoLocal.length === 0 || equipoVisitante.length === 0) {
      partidosSinJugadores++;
      continue;
    }

    // Tomar hasta 10 jugadores de cada equipo (5 titulares + 5 suplentes)
    const localPlayers = equipoLocal.slice(0, 10);
    const visitantePlayers = equipoVisitante.slice(0, 10);

    const allPlayers = [
      ...localPlayers.map((j, idx) => ({ ...j, esTitular: idx < 5 })),
      ...visitantePlayers.map((j, idx) => ({ ...j, esTitular: idx < 5 })),
    ];

    // Insertar stats para cada jugador
    for (const jugador of allPlayers) {
      const stats = generateStat(jugador.posicion || 'base', jugador.esTitular);

      try {
        await pool.query(
          `INSERT INTO estadisticas (
            partido_id, jugador_id,
            puntos, rebotes, asistencias, robos, tapas,
            perdidas, faltas,
            tiros_campo_intentados, tiros_campo_convertidos,
            triples_intentados, triples_convertidos,
            libres_intentados, libres_convertidos,
            minutos
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (partido_id, jugador_id) DO NOTHING`,
          [
            partido.id, jugador.id,
            stats.puntos, stats.rebotes, stats.asistencias, stats.robos, stats.tapas,
            stats.perdidas, stats.faltas,
            stats.tiros_campo_intentados, stats.tiros_campo_convertidos,
            stats.triples_intentados, stats.triples_convertidos,
            stats.libres_intentados, stats.libres_convertidos,
            stats.minutos,
          ]
        );
        totalGenerados++;
      } catch (err) {
        console.error(`Error al insertar stat partido ${partido.id} jugador ${jugador.id}: ${err.message}`);
      }
    }

    partidosProcesados++;
    if (partidosProcesados % 50 === 0) {
      console.log(`   📊 ${partidosProcesados}/${partidos.length} partidos procesados (${totalGenerados} stats generados)...`);
    }

    // Marcar partido como FINALIZADO si no lo está
    if (partido.estado !== 'FINALIZADO') {
      const puntosLocal = (Math.floor(Math.random() * 30) + 65); // entre 65-95
      const puntosVisitante = (Math.floor(Math.random() * 30) + 65);
      await pool.query(
        `UPDATE partidos SET estado = 'FINALIZADO', puntos_local = $1, puntos_visitante = $2 WHERE id = $3`,
        [puntosLocal, puntosVisitante, partido.id]
      );
    }
  }

  console.log(`\n✅ COMPLETADO`);
  console.log(`   Partidos procesados: ${partidosProcesados}/${partidos.length}`);
  console.log(`   Partidos sin jugadores: ${partidosSinJugadores}`);
  console.log(`   Estadísticas generadas: ${totalGenerados}`);

  // 5. Verificar resultado por jornada
  const resumen = await pool.query(`
    SELECT j.numero, COUNT(DISTINCT e.partido_id) as partidos_con_stats, COUNT(e.id) as total_stats
    FROM jornadas j
    JOIN partidos p ON p.jornada_id = j.id
    LEFT JOIN estadisticas e ON e.partido_id = p.id
    GROUP BY j.numero
    ORDER BY j.numero
    LIMIT 5
  `);
  console.log(`\n📊 Resumen primeras 5 jornadas:`);
  for (const row of resumen.rows) {
    console.log(`   Jornada ${row.numero}: ${row.partidos_con_stats} partidos con stats, ${row.total_stats} stats totales`);
  }

  await pool.end();
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
