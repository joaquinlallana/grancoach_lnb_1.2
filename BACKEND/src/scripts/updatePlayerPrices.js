/**
 * updatePlayerPrices.js
 *
 * Actualiza el precio de cada jugador en la tabla `jugadores` según su
 * valoración promedio en la temporada regular de la LNB.
 *
 * FÓRMULA:
 *   precio = CLAMP(2_000_000 + valoracion * 750_000, 5_000_000, 20_000_000)
 *   Redondeado al 100_000 más cercano.
 *
 * Los jugadores que no figuran en el archivo de datos reciben el "precio común".
 *
 * Fuente de datos: BACKEND/src/scripts/data/player_valoracion_2023_24.json
 *   → Actualizar ese JSON con datos reales de:
 *     http://w.pickandroll.com.ar/basquet/adc/liga-a/23-24/individuales/?opci=jugadores&modo=VAL
 *
 * Uso:
 *   node src/scripts/updatePlayerPrices.js
 *   node src/scripts/updatePlayerPrices.js --dry-run   (preview sin modificar la DB)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { query, pool } = require('../config/database');
const path = require('path');

const STATS = require('./data/player_valoracion_2023_24.json');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Fórmula de precio ────────────────────────────────────────────────────────

function calcularPrecio(valoracion) {
  const raw = 2_000_000 + valoracion * 750_000;
  const clamped = Math.max(5_000_000, Math.min(20_000_000, raw));
  return Math.round(clamped / 100_000) * 100_000;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMiles(n) {
  return `$${n.toLocaleString('es-AR')}`;
}

async function buscarJugadores(terminos) {
  // Genera condiciones ILIKE para cada término (busca en nombre)
  const conditions = terminos.map((_, i) => `LOWER(nombre) LIKE $${i + 1}`);
  const params = terminos.map(t => `%${t.toLowerCase()}%`);
  const sql = `SELECT id, nombre, precio FROM jugadores WHERE ${conditions.join(' AND ')}`;
  const result = await query(sql, params);
  return result.rows;
}

async function actualizarPrecio(jugadorId, precio) {
  if (DRY_RUN) return;
  await query('UPDATE jugadores SET precio = $1 WHERE id = $2', [precio, jugadorId]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Actualización de Precios — Valoración LNB 2023-2024       ║');
  if (DRY_RUN) {
    console.log('║   MODO PREVIEW (--dry-run): no se modificará la base de datos ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const precioComunDB = STATS.precio_comun;
  const jugadoresStats = STATS.jugadores;

  // Paso 1: Precio común a todos los jugadores
  console.log(`[1/3] Asignando precio común ${formatMiles(precioComunDB)} a todos los jugadores...`);
  if (!DRY_RUN) {
    const r = await query('UPDATE jugadores SET precio = $1', [precioComunDB]);
    console.log(`      ${r.rowCount} jugadores actualizados con precio común.\n`);
  } else {
    const r = await query('SELECT COUNT(*) AS total FROM jugadores');
    console.log(`      (preview) ${r.rows[0].total} jugadores recibirían precio común.\n`);
  }

  // Paso 2: Actualizar jugadores con valoración conocida
  console.log('[2/3] Actualizando jugadores con valoración conocida...\n');

  const resultados = {
    actualizados: [],
    noEncontrados: [],
    multipleCoincidencias: [],
  };

  for (const entry of jugadoresStats) {
    // Saltar entradas que son solo separadores de tier (tienen "_tier" pero no "buscar")
    if (!entry.buscar) continue;

    const terminos = Array.isArray(entry.buscar) ? entry.buscar : [entry.buscar];
    const precio = calcularPrecio(entry.valoracion);
    const encontrados = await buscarJugadores(terminos);

    if (encontrados.length === 0) {
      resultados.noEncontrados.push({ nombre: entry.nombre, terminos, valoracion: entry.valoracion });
      console.log(`  ✗  ${entry.nombre.padEnd(30)} VAL ${String(entry.valoracion).padEnd(5)} → ${formatMiles(precio)} — NO ENCONTRADO`);
    } else if (encontrados.length > 1) {
      resultados.multipleCoincidencias.push({ nombre: entry.nombre, encontrados, precio });
      console.log(`  ⚠  ${entry.nombre.padEnd(30)} VAL ${String(entry.valoracion).padEnd(5)} → ${formatMiles(precio)} — MÚLTIPLES (${encontrados.map(j => j.nombre).join(', ')})`);
      // Actualizar todos los coincidentes (podrían ser el mismo jugador con distinto formato)
      for (const j of encontrados) {
        await actualizarPrecio(j.id, precio);
        resultados.actualizados.push({ nombre: j.nombre, valoracion: entry.valoracion, precio });
      }
    } else {
      const j = encontrados[0];
      await actualizarPrecio(j.id, precio);
      resultados.actualizados.push({ nombre: j.nombre, valoracion: entry.valoracion, precio });
      console.log(`  ✓  ${j.nombre.padEnd(30)} VAL ${String(entry.valoracion).padEnd(5)} → ${formatMiles(precio)}`);
    }
  }

  // Paso 3: Resumen
  console.log('\n[3/3] Resumen:\n');
  console.log(`  Actualizados con valoración : ${resultados.actualizados.length}`);
  console.log(`  No encontrados en la BD     : ${resultados.noEncontrados.length}`);
  console.log(`  Múltiples coincidencias     : ${resultados.multipleCoincidencias.length}`);

  if (resultados.noEncontrados.length > 0) {
    console.log('\n  Jugadores no encontrados (revisar nombre en DB):');
    for (const j of resultados.noEncontrados) {
      console.log(`    · ${j.nombre} (buscado: "${j.terminos.join(' + ')}")`);
    }
  }

  // Distribución de precios resultante
  const dist = await query(`
    SELECT
      precio,
      COUNT(*) AS cantidad
    FROM jugadores
    GROUP BY precio
    ORDER BY precio DESC
  `);

  console.log('\n  Distribución de precios en la base de datos:');
  console.log('  ' + '─'.repeat(40));
  for (const row of dist.rows) {
    const bar = '█'.repeat(Math.min(20, Math.round(parseInt(row.cantidad) / 2)));
    console.log(`  ${formatMiles(parseInt(row.precio)).padEnd(18)} × ${String(row.cantidad).padEnd(4)} ${bar}`);
  }

  console.log('\n  Escala de precios (fórmula):');
  console.log('  VAL 17+ → $15,500,000 – $20,000,000  (elite)');
  console.log('  VAL 13  → $11,750,000               (estrella)');
  console.log('  VAL 10  → $9,500,000                (bueno)');
  console.log('  VAL  7  → $7,250,000                (por encima del promedio)');
  console.log(`  Sin datos → ${formatMiles(precioComunDB)}               (precio común)\n`);

  if (DRY_RUN) {
    console.log('⚠  MODO PREVIEW: ningún precio fue modificado.\n');
    console.log('   Para aplicar los cambios: node src/scripts/updatePlayerPrices.js\n');
  } else {
    console.log('✓  Precios actualizados correctamente.\n');
    console.log('   Para actualizar con datos reales de valoración:');
    console.log('   1. Acceder a: http://w.pickandroll.com.ar/basquet/adc/liga-a/23-24/individuales/?opci=jugadores&modo=VAL');
    console.log('   2. Editar: src/scripts/data/player_valoracion_2023_24.json');
    console.log('   3. Re-ejecutar: node src/scripts/updatePlayerPrices.js\n');
  }
}

main()
  .catch(err => {
    console.error('\n[ERROR]', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
