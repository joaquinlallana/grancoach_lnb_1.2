/**
 * updatePricesFromDB.js
 *
 * Calcula la valoración real (FIBA EFF) de cada jugador a partir de las
 * estadísticas almacenadas en la tabla `estadisticas` y actualiza el precio
 * en la tabla `jugadores`.
 *
 * FÓRMULA VALORACIÓN (FIBA EFF):
 *   VAL = PTS + REB + AST + ROB + TAP
 *         - (FGA - FGM) - (FTA - FTM) - TOV
 *
 * FÓRMULA PRECIO:
 *   precio = CLAMP(ROUND(1_000_000 + val * 800_000, -100_000), 6_500_000, 18_000_000)
 *
 * Jugadores sin estadísticas → precio común (configurable en PRECIO_COMUN).
 *
 * REQUISITO: La tabla `estadisticas` debe estar populada con datos reales
 *            (via SyncService.syncAllGameStats).
 *
 * Uso:
 *   node src/scripts/updatePricesFromDB.js
 *   node src/scripts/updatePricesFromDB.js --dry-run   (preview sin modificar DB)
 *   node src/scripts/updatePricesFromDB.js --min-partidos 5  (mínimo de PJ para considerar)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { query, pool } = require('../config/database');

const DRY_RUN = process.argv.includes('--dry-run');
const MIN_PARTIDOS_ARG = process.argv.find(a => a.startsWith('--min-partidos='));
const MIN_PARTIDOS = MIN_PARTIDOS_ARG ? parseInt(MIN_PARTIDOS_ARG.split('=')[1]) : 5;
const PRECIO_COMUN = 6_500_000;

// ─── Fórmula de precio ────────────────────────────────────────────────────────

function calcularPrecio(val) {
  const raw = 1_000_000 + val * 800_000;
  const clamped = Math.max(6_500_000, Math.min(18_000_000, raw));
  return Math.round(clamped / 100_000) * 100_000;
}

function formatM(n) {
  return '$' + (n / 1_000_000).toFixed(1) + 'M';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   Actualización de Precios — Valoración Real desde estadisticas  ║');
  if (DRY_RUN) {
    console.log('║   MODO PREVIEW (--dry-run): no se modificará la base de datos     ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // ─── Paso 1: Calcular valoración promedio por jugador ─────────────────────

  console.log('[1/3] Calculando valoración FIBA EFF desde tabla estadisticas...\n');

  const statsResult = await query(`
    SELECT
      j.id                                                          AS jugador_id,
      j.nombre,
      j.posicion,
      j.precio                                                      AS precio_actual,
      COUNT(e.id)                                                   AS partidos,
      ROUND(AVG(
        e.puntos
        + e.rebotes
        + e.asistencias
        + e.robos
        + e.tapas
        - (e.tiros_campo_intentados - e.tiros_campo_convertidos)
        - (e.libres_intentados      - e.libres_convertidos)
        - e.perdidas
      )::numeric, 2)                                               AS val_prom,
      ROUND(AVG(e.puntos)::numeric, 1)                             AS pts,
      ROUND(AVG(e.rebotes)::numeric, 1)                            AS reb,
      ROUND(AVG(e.asistencias)::numeric, 1)                        AS ast,
      ROUND(AVG(e.robos)::numeric, 1)                              AS rob,
      ROUND(AVG(e.tapas)::numeric, 1)                              AS tap,
      ROUND(AVG(e.perdidas)::numeric, 1)                           AS perd
    FROM jugadores j
    JOIN estadisticas e ON e.jugador_id = j.id
    GROUP BY j.id, j.nombre, j.posicion, j.precio
    HAVING COUNT(e.id) >= $1
    ORDER BY val_prom DESC
  `, [MIN_PARTIDOS]);

  const jugadoresConStats = statsResult.rows;
  console.log(`  Jugadores con ${MIN_PARTIDOS}+ partidos jugados: ${jugadoresConStats.length}`);

  // ─── Paso 2: Precio común a todos (base) ──────────────────────────────────

  console.log(`\n[2/3] Asignando precio común ${formatM(PRECIO_COMUN)} como base a todos...`);
  if (!DRY_RUN) {
    const r = await query('UPDATE jugadores SET precio = $1', [PRECIO_COMUN]);
    console.log(`      ${r.rowCount} jugadores actualizados con precio común.\n`);
  } else {
    const total = await query('SELECT COUNT(*) AS n FROM jugadores');
    console.log(`      (preview) ${total.rows[0].n} jugadores recibirían precio común.\n`);
  }

  // ─── Paso 3: Precio por valoración para jugadores con estadísticas ────────

  console.log('[3/3] Actualizando precios por valoración real...\n');
  console.log(
    '  ' +
    'Jugador'.padEnd(32) +
    'POS'.padEnd(12) +
    'PJ'.padStart(4) +
    'VAL'.padStart(7) +
    'PTS'.padStart(6) +
    'REB'.padStart(5) +
    'AST'.padStart(5) +
    '  Precio nuevo'
  );
  console.log('  ' + '─'.repeat(85));

  const cambios = [];
  for (const j of jugadoresConStats) {
    const precio = calcularPrecio(parseFloat(j.val_prom));
    if (!DRY_RUN) {
      await query('UPDATE jugadores SET precio = $1 WHERE id = $2', [precio, j.jugador_id]);
    }
    cambios.push({ nombre: j.nombre, posicion: j.posicion, partidos: j.partidos, val: j.val_prom, precio, precio_anterior: j.precio_actual });

    console.log(
      '  ' +
      j.nombre.substring(0, 30).padEnd(32) +
      j.posicion.padEnd(12) +
      String(j.partidos).padStart(4) +
      String(j.val_prom).padStart(7) +
      String(j.pts).padStart(6) +
      String(j.reb).padStart(5) +
      String(j.ast).padStart(5) +
      '  ' + formatM(precio)
    );
  }

  // ─── Resumen final ────────────────────────────────────────────────────────

  console.log('\n' + '═'.repeat(90));
  console.log('RESUMEN:\n');

  const conStats = jugadoresConStats.length;
  const totalResult = await query('SELECT COUNT(*) AS n FROM jugadores');
  const total = parseInt(totalResult.rows[0].n);
  const sinStats = total - conStats;

  console.log(`  Total jugadores en DB          : ${total}`);
  console.log(`  Con valoración real (actualizados): ${conStats}`);
  console.log(`  Sin estadísticas (precio común)  : ${sinStats}`);

  // Distribución por rangos
  const tiers = [
    { label: 'Elite   (VAL ≥ 16)', min: 16 },
    { label: 'Estrella (VAL 13-16)', min: 13, max: 16 },
    { label: 'Bueno   (VAL 10-13)', min: 10, max: 13 },
    { label: 'Regular  (VAL  7-10)', min: 7,  max: 10 },
    { label: 'Bajo    (VAL  < 7)', max: 7 },
  ];
  console.log('\n  Distribución:');
  for (const t of tiers) {
    const n = cambios.filter(j => {
      const v = parseFloat(j.val);
      return (t.min === undefined || v >= t.min) && (t.max === undefined || v < t.max);
    }).length;
    if (n > 0) {
      const precio_rango_min = calcularPrecio(t.min ?? 0);
      const precio_rango_max = t.max ? calcularPrecio(t.max) : calcularPrecio(20);
      console.log(`    ${t.label.padEnd(22)}: ${String(n).padStart(3)} jugadores  →  ${formatM(precio_rango_min)} – ${formatM(precio_rango_max)}`);
    }
  }
  console.log(`    ${'Sin stats'.padEnd(22)}: ${String(sinStats).padStart(3)} jugadores  →  ${formatM(PRECIO_COMUN)} (precio común)`);

  console.log('\n  Escala de precios (fórmula: 1M + VAL × 0.8M):');
  [18, 16, 14, 12, 10, 8].forEach(v => {
    console.log(`    VAL ${v} → ${formatM(calcularPrecio(v))}`);
  });
  console.log(`    Sin datos → ${formatM(PRECIO_COMUN)}`);

  console.log('\n  Composición de equipo ejemplo (presupuesto $100M, 10 jugadores):');
  console.log('    2 × Elite   (≈$15M)  + 4 × Bueno (≈$11M) + 4 × Común ($6.5M) = ' +
    formatM(2 * 15_000_000 + 4 * 11_000_000 + 4 * PRECIO_COMUN));
  console.log('    1 × Elite   (≈$16M)  + 9 × Regular (≈$9M)                     = ' +
    formatM(1 * 16_000_000 + 9 * 9_000_000));

  if (DRY_RUN) {
    console.log('\n⚠  MODO PREVIEW: ningún precio fue modificado.');
    console.log('   Para aplicar: node src/scripts/updatePricesFromDB.js\n');
  } else {
    console.log('\n✓  Precios actualizados correctamente desde estadísticas reales.\n');
  }
}

main()
  .catch(err => {
    console.error('\n[ERROR]', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
