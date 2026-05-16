/**
 * updatePlayerPositions.js
 *
 * Actualiza la posición de cada jugador en la tabla `jugadores` según su
 * posición real en la LNB 2024-25, investigada en latinbasket.com y otras fuentes.
 *
 * Posiciones válidas: base | escolta | alero | ala-pivot | pivot
 *
 * Uso:
 *   node src/scripts/updatePlayerPositions.js
 *   node src/scripts/updatePlayerPositions.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { query, pool } = require('../config/database');

const DRY_RUN = process.argv.includes('--dry-run');

// Mapa: nombre exacto en DB → posición real
// Fuente: latinbasket.com planteles 2024-25 + conocimiento de jugadores argentinos
const POSICIONES = {
  // ══ ARGENTINO (Junín) ══
  'Slider Johnatan':         'ala-pivot',
  'Podesta Fernando':        'pivot',
  'Ruben Torne Edgardo':     'alero',
  'Dupuy Ezequiel':          'base',
  'Gennero Augusto':         'alero',
  'D. Daniels':              'alero',
  'C. Nylor':                'escolta',
  'L. Dominici':             'escolta',
  'M. Caporaletti':          'escolta',
  'M. Hernandez':            'escolta',
  'G. Romero':               'base',
  'Y. Fundora':              'ala-pivot',
  'T. Allende':              'base',
  'S. Capelli':              'alero',
  'J. Arias':                'alero',
  'J. Frontera':             'base',
  'P. Di Prinzio':           'base',
  'Thornton Raynere':        'alero',
  'M. Gomez':                'escolta',
  'F. Suarez':               'ala-pivot',

  // ══ ATENAS (Córdoba) ══
  'C. Buendia':              'base',
  'N. Zurschmitten':         'base',
  'Sanders Nakye':           'alero',
  'J. C. Oberto':            'pivot',
  'Lema Leonardo':           'alero',
  'Buemo Carlos Emanuel':    'alero',
  'L. Bernabei':             'base',
  'L. Rivata':               'escolta',
  'A. Vicens':               'escolta',
  'B. Imaz':                 'base',
  'E. Watson':               'alero',
  'F. E. Gallo':             'escolta',
  'F. Valfre':               'alero',
  'J. Maidana':              'escolta',
  'J. Montero':              'ala-pivot',
  'L. A. Bustamante':        'ala-pivot',
  'M. Araujo':               'base',
  'S. Marconetti':           'alero',
  'T. Tomatis':              'pivot',

  // ══ BOCA JUNIORS ══
  'Vildoza Jose':            'base',
  'Scala Santiago':          'base',
  'Cuello Martin':           'escolta',
  'Vega Sebastian':          'alero',
  'Giorgetti Franco':        'ala-pivot',
  'M. Delia':                'pivot',
  'Anderson Alphonso':       'alero',
  'Cooper Thomas':           'ala-pivot',
  'Guerrero Juan Martin':    'escolta',
  'Pinero Facundo':          'ala-pivot',
  'Ibarguen Andre':          'ala-pivot',
  'M. Torriani':             'escolta',
  'O. Donzino':              'base',
  'Prome Tiziano':           'alero',
  'R. Cifuentes':            'base',
  'T. Drocezesky':           'base',

  // ══ FERRO (Carril Oeste) ══
  'J. D. Martinez':          'base',
  'Lezcano Emiliano':        'escolta',
  'Diez Alejandro':          'ala-pivot',
  'Bettiga Valentin':        'ala-pivot',
  'Rodriguez Felipe':        'alero',
  'Gallegos Rodrigo':        'base',
  'C. Rodriguez':            'base',
  'Fierro Mariano':          'ala-pivot',
  'Lado Mogga':              'alero',
  'F. Wolinsky':             'base',
  'J. Ryzwaniuk':            'escolta',
  'M. Gonzalez Celano':      'base',
  'Malachias Gabriel':       'alero',
  'R. Moravansky':           'pivot',
  'Spano Tomas':             'base',
  'T. Tamagusuku':           'escolta',
  'A. Roveres':              'base',

  // ══ GIMNASIA (Comodoro Rivadavia) ══
  'M. Dato':                 'base',
  'Toretta Emiliano':        'escolta',
  'A. Cisneros':             'alero',
  'C. Rivero':               'ala-pivot',
  'Horton Kenneth':          'pivot',
  'Chacon Marcos':           'alero',
  'De Los Santos Nicolas':   'base',
  'Jenkins Jalen':           'alero',
  'A. Nation':               'alero',
  'Araujo Thomas':           'alero',
  'Cosolito Mauro':          'ala-pivot',
  'J. Copesky':              'base',
  'Paz Ezequiel':            'base',
  'Stokes Kamau':            'ala-pivot',
  'T. Daniels':              'alero',
  'V. Ayala':                'escolta',
  'Whitfield Robert':        'alero',

  // ══ INDEPENDIENTE DE OLIVA ══
  'E. Caffaro':              'pivot',
  'Filipetti Enzo':          'ala-pivot',
  'Tabarez Patricio':        'alero',
  'R. Vallejos':             'escolta',
  'Marcucci Nicolas Javier': 'escolta',
  'Cardenas Jordan':         'alero',
  'Nally Juan':              'alero',
  'P. Espinoza':             'pivot',
  'Cabrera Martin Andres':   'base',
  'Pautasso Agustin':        'escolta',
  'A. Jara':                 'base',
  'F. Barrionuevo':          'alero',
  'J. Augustin':             'pivot',
  'J. Diaz':                 'escolta',
  'J. Garcia':               'ala-pivot',
  'J. L. Aragon':            'base',
  'S. Ballarena':            'escolta',
  'Y. Obeng Mensah':         'ala-pivot',

  // ══ INSTITUTO DE CÓRDOBA ══
  'Vildoza Leonardo':        'base',
  'Saiz Javier':             'pivot',
  'Monacchi Tomas':          'ala-pivot',
  'Copello Nicolas':         'alero',
  'Pomoli Nicola':           'pivot',
  'Negrete Alex':            'alero',
  'Corsi Bautista':          'escolta',
  'Guerrero Jeronimo':       'alero',
  'Holt Emmitt':             'alero',
  'Schattmann Leonel':       'alero',
  'Garello Vicente':         'ala-pivot',
  'Moussa Fausto':           'escolta',
  'A. Barros':               'base',
  'B. Lugarini':             'base',
  'I. Bonizioli':            'base',
  'L. Aaliya':               'alero',
  'L. Giuliani':             'base',
  'L. Salvetti':             'escolta',
  'S. Guasco':               'base',
  'V. Ferri':                'alero',

  // ══ LA UNION (Formosa) ══
  'Sandrini Jeremias':       'base',
  'D. Owens':                'ala-pivot',
  'Rattero Ramiro':          'pivot',
  'Rodriguez Manuel':        'alero',
  'Ferguson Romeao':         'alero',
  'Sanchez Rodrigo':         'alero',
  'Alonso Gonzalo':          'base',
  'Perez Mateo':             'base',
  'A. Moresco':              'escolta',
  'F. Harina Martini':       'alero',
  'J. Bowie':                'escolta',
  'M. Genitti':              'base',
  'N. Franco':               'escolta',
  'N. Noguera':              'ala-pivot',
  'Roque Romario':           'alero',
  'T. Gronda':               'pivot',

  // ══ OBERA TC (Misiones) ══
  'Brocal Agustin':          'base',
  'W. Vorhees':              'pivot',
  'A. Azpilicueta':          'alero',
  'A. Costa':                'escolta',
  'Barreiro Agustin':        'ala-pivot',
  'Acevedo Maximiliano':     'alero',
  'Ascanio Jose':            'pivot',
  'Torresi Jonatan':         'alero',
  'D. Sinigoj':              'escolta',
  'Quiroga Nicolas':         'escolta',
  'Conrradi Francisco':      'alero',
  'E. Filippetti':           'ala-pivot',
  'K. L. Ramirez Alcantara': 'escolta',
  'Laterza Juan':            'escolta',
  'M. Mousquere':            'base',
  'Paletta Nicolas':         'escolta',
  'T. Reizner':              'alero',

  // ══ OBRAS SANITARIAS ══
  'Barral Pedro':            'base',
  'C. Clarke':               'ala-pivot',
  'C. Fields':               'base',
  'Digon Alejo':             'escolta',
  'Inyaco Felipe':           'base',
  'J. B. Lopez Lorenz':      'ala-pivot',
  'J. Madrigal':             'base',
  'J. Respaud':              'escolta',
  'L. Barrios':              'alero',
  'M. Calfani':              'escolta',
  'Mata Marcos':             'ala-pivot',
  'Opoku Nana':              'pivot',
  'T. Chapero':              'escolta',
  'Tavares Maique':          'pivot',
  'V. Finetti Lopez':        'alero',
  'Venegas Juan':            'base',

  // ══ OLÍMPICO (La Banda) ══
  'Defelippo Jose':          'escolta',
  'Perez Santiago':          'base',
  'Facello Agustin':         'base',
  'Franca Joao':             'pivot',
  'Romegialli Santino':      'pivot',
  'Mainoldi Leonardo':       'alero',
  'Walton Zach':             'alero',
  'Lockett Phillip':         'alero',
  'Maxwell Du&apos;Vaughn':  'alero',
  'Morales Julian':          'base',
  'Aliende Guillermo':       'base',
  'C. T. Martinez Acuna':    'escolta',
  'D. Shriver':              'alero',
  'F. Rivero':               'escolta',
  'G. Moreno':               'alero',
  'L. Spagnoli':             'base',
  'L. Tundis':               'escolta',
  'A. Morales':              'ala-pivot',
  'T. Dischon':              'pivot',

  // ══ PEÑAROL (Mar del Plata) ══
  'Thornton Willie Alford':  'ala-pivot',
  'Acuna Roberto':           'pivot',
  'Chiaraviglio Nicolas':    'alero',
  'Fernandez Victor':        'base',
  'L. Gonzalez':             'alero',
  'Carreras Xavier':         'escolta',
  'I. Bednarek':             'pivot',
  'M. Chapero':              'ala-pivot',
  'Cordoba Gaston':          'ala-pivot',
  'Simon Miguel':            'alero',
  'A. Marin':                'base',
  'G. Aman':                 'escolta',
  'G. L. Rossi':             'escolta',
  'Hamilton Isaac':          'escolta',
  'K. Kramer':               'pivot',
  'L. Andujar':              'base',
  'M. Thomas':               'ala-pivot',
  'Pineda Damian':           'base',
  'T. Martinez':             'base',
  'Tolosa Facundo':          'escolta',
  'Wallace Devante':         'alero',

  // ══ PLATENSE ══
  'Flor Eric':               'base',
  'Smaniotti Franco':        'alero',
  'Mazzucchelli Santino':    'ala-pivot',
  'Ianguas Pedro':           'pivot',
  'Banyard Nicholas':        'alero',
  'Barrales Santiago':       'alero',
  'Goicoechea Mariano':      'alero',
  'Graterol Windi':          'alero',
  'Morales Sebastian':       'alero',
  'F. Thygesen':             'escolta',
  'Franchela Tobias':        'escolta',
  'G. Pappalardi':           'base',
  'Graham Zach':             'escolta',
  'J. E. Noblega':           'alero',
  'J. Goncalves':            'pivot',
  'M. Jara':                 'base',
  'Mata Henyerberth':        'alero',
  'T. Bond':                 'ala-pivot',
  'Vazquez Facundo':         'escolta',

  // ══ QUIMSA (Santiago del Estero) ══
  'Robinson Brandon':        'escolta',
  'Sansimoni Bruno':         'base',
  'Bastardo Raymon':         'pivot',
  'Vassirani Eduardo':       'pivot',
  'Brussino Juan':           'alero',
  'F. Zezular':              'alero',
  'Louis Arnold':            'alero',
  'Miller Tavario':          'alero',
  'Rolfi Fortunato':         'base',
  'Basabe Emiliano':         'ala-pivot',
  'A. Cogliati':             'base',
  'I. Pizarro':              'base',
  'M. Buyatti':              'escolta',
  'M. Pikaluk':              'ala-pivot',
  'N. Gonzalez':             'base',
  'N. Romano':               'escolta',
  'P. Adams Ali':            'alero',
  'Perez Agustin':           'alero',
  'R. Amprimo':              'escolta',

  // ══ REGATAS (Corrientes) ══
  'Jaime Andres':            'base',
  'P. Gramajo':              'escolta',
  'Ramirez Fabian':          'ala-pivot',
  'I. Ortega':               'ala-pivot',
  'C. Hooper':               'base',
  'Aguirre Gustavo':         'base',
  'Giletto Salvador':        'alero',
  'Thomas Charles':          'alero',
  'F. Ferraro':              'escolta',
  'V. Bender':               'escolta',
  'A. T. Ledesma':           'escolta',
  'B. Marco':                'alero',
  'Corbalan Juan Pablo':     'alero',
  'D. Lowery':               'escolta',
  'Franchela Tobias':        'escolta',
  'G. Elias':                'escolta',
  'J. Larraza':              'pivot',
  'J. Reese':                'alero',
  'M. Carter':               'alero',
  'M. Sanz':                 'base',
  'Q. Alexander':            'ala-pivot',

  // ══ RIACHUELO (La Rioja) ══
  'Corso Mateo':             'base',
  'Figueredo Diego':         'base',
  'Aguerre Federico':        'ala-pivot',
  'Forestier Valentin':      'ala-pivot',
  'F. Diaz':                 'pivot',
  'J. Barco':                'escolta',
  'Vieta Franco':            'escolta',
  'Luchi Marco':             'alero',
  'Trocha-Morelos Tonny':    'ala-pivot',
  'Carreras Xavier':         'escolta',
  'I. Montano':              'base',
  'J. Farias':               'pivot',
  'J. Fernandez':            'base',
  'J. Rodriguez':            'escolta',
  'N. Priddy':               'escolta',
  'O. Krayem':               'pivot',
  'R. Becton':               'alero',

  // ══ SAN LORENZO ══
  'Perez Lucas':             'base',
  'Latorre Lucas':           'base',
  'Cardo Cristian':          'alero',
  'F. Rutenberg':            'ala-pivot',
  'Collomb Diego':           'alero',
  'Lugo Sebastian':          'alero',
  'Stenta Nicolas':          'alero',
  'Basualdo Ivan':           'pivot',
  'Cordoba Gaston':          'ala-pivot',
  'A. Valdivieso':           'escolta',
  'F. Alorda':               'alero',
  'G. Salomon Nicolas':      'escolta',
  'I. Cerino':               'base',
  'J. Actis':                'base',
  'L. Machuca':              'ala-pivot',
  'M. Puccio':               'base',
  'T. Roca':                 'escolta',
  'V. Nesci':                'alero',

  // ══ SAN MARTÍN (Corrientes) ══
  'Garcia Gaston':           'escolta',
  'Gargallo Lucas':          'alero',
  'Garello Vicente':         'ala-pivot',
  'Mendez Franco':           'ala-pivot',
  'Benay Lorenzo':           'pivot',
  'Carabali Bryan':          'pivot',
  'Acevedo Sebastian':       'alero',
  'Grun Federico':           'escolta',
  'Givens Samme':            'alero',
  'Ramallo Geronimo':        'alero',
  'Banegas Jorge':           'base',
  'D. Hunt':                 'ala-pivot',
  'E. Payton-Clottey':       'escolta',
  'J. Mascaro':              'base',
  'M. Rearte':               'alero',
  'R. Ledesma':              'escolta',
  'T. Botta':                'pivot',

  // ══ UNION DE SANTA FE ══
  'Alessio Ignacio':         'pivot',
  'Bombino Pedro':           'pivot',
  'Hure Daniel':             'pivot',
  'Cosolito Mauro':          'ala-pivot',
  'Morrison Dominique':      'alero',
  'Y. Guerra':               'alero',
  'G. Whelan':               'escolta',
  'Basabe Emiliano':         'ala-pivot',
  'A. Ferrari':              'base',
  'Cabot Marcos':            'base',
  'E. Peralta':              'escolta',
  'F. Alonso':               'base',
  'F. Chamorro':             'escolta',
  'Konsztadt Alejandro':     'base',
  'M. Borsatti':             'alero',
  'M. Cagliero':             'escolta',
  'M. Craion':               'alero',
  'M. Fabbroni':             'base',
  'R. Bell':                 'ala-pivot',
  'S. Astulfi':              'alero',
  'T. Mitchell':             'escolta',
  'U. Gonzalez':             'base',

  // ══ ZÁRATE BASKET ══
  'A. Diggs':                'pivot',
  'A. Maggi':                'ala-pivot',
  'Aprea Julian':            'pivot',
  'E. Merchant':             'alero',
  'P. Pinero':               'alero',
  'Safar Selem':             'escolta',
  'M. Trelles':              'escolta',
  'L. Fraga':                'base',
  'M. Ceci':                 'base',
  'L. Fernandez':            'alero',
  'L. Capponi':              'escolta',
  'C. Gomez':                'base',
  'F. Del do':               'alero',
  'F. Zawadski':             'escolta',
  'J. Genero':               'base',
  'J. Gutierrez':            'pivot',
  'J. Ruiz':                 'alero',
  'Pascolatt Facundo':       'escolta',
  'Sciamanna Gino':          'base',
  'T. Delia':                'ala-pivot',
};

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║    Actualización de Posiciones — LNB 2024-25        ║');
  if (DRY_RUN) console.log('║    MODO PREVIEW — no se modifica la DB              ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Obtener todos los jugadores con su posición actual
  const { rows: jugadores } = await query('SELECT id, nombre, posicion FROM jugadores ORDER BY nombre');

  let actualizados = 0, sinCambio = 0, noEncontrados = [];

  for (const j of jugadores) {
    const nuevaPos = POSICIONES[j.nombre];
    if (!nuevaPos) {
      noEncontrados.push(j.nombre);
      continue;
    }
    if (nuevaPos === j.posicion) {
      sinCambio++;
      continue;
    }
    if (!DRY_RUN) {
      await query('UPDATE jugadores SET posicion = $1 WHERE id = $2', [nuevaPos, j.id]);
    }
    console.log(`  ✓ ${j.nombre.padEnd(35)} ${j.posicion.padEnd(12)} → ${nuevaPos}`);
    actualizados++;
  }

  // Verificar posiciones con nombre del mapa que no existen en la DB
  const nombresDB = new Set(jugadores.map(j => j.nombre));
  const noEnDB = Object.keys(POSICIONES).filter(n => !nombresDB.has(n));

  console.log('\n══ Resumen ══════════════════════════════════════════');
  console.log(`  Actualizados  : ${actualizados}`);
  console.log(`  Sin cambio    : ${sinCambio}`);
  console.log(`  Sin mapeo     : ${noEncontrados.length} (mantienen posición actual)`);
  console.log(`  En mapa pero no en DB: ${noEnDB.length}`);

  if (noEnDB.length > 0) {
    console.log('\n  Nombres en mapa que no existen en DB (ignorados):');
    noEnDB.forEach(n => console.log(`    · ${n}`));
  }

  // Distribución final
  const dist = await query('SELECT posicion, COUNT(*) as n FROM jugadores GROUP BY posicion ORDER BY n DESC');
  console.log('\n  Distribución final de posiciones:');
  dist.rows.forEach(r => {
    const bar = '█'.repeat(Math.round(parseInt(r.n) / 5));
    console.log(`  ${r.posicion.padEnd(12)} ${String(r.n).padStart(4)}  ${bar}`);
  });

  if (DRY_RUN) console.log('\n⚠  MODO PREVIEW: no se aplicaron cambios.\n');
  else console.log('\n✓  Posiciones actualizadas correctamente.\n');
}

main()
  .catch(err => { console.error('[ERROR]', err.message); process.exit(1); })
  .finally(() => pool.end());
