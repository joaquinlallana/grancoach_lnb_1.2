# Documentación de la Base de Datos -- Fantasy LNB

## 1. Visión General

Esta base de datos fue diseñada para soportar una aplicación de Fantasy
Basketball basada en la Liga Nacional de Básquet (LNB). Su objetivo es
gestionar:

-   Usuarios y autenticación.
-   Equipos fantasy creados por los usuarios.
-   Plantillas de jugadores.
-   Jornadas y partidos.
-   Estadísticas reales de los jugadores.
-   Cálculo automático de puntos fantasy.
-   Transferencias y penalizaciones.
-   Rankings generales y por jornada.
-   Auditoría de movimientos sensibles.

La base de datos centraliza la lógica crítica del negocio para
garantizar integridad, consistencia y rendimiento.

------------------------------------------------------------------------

## 2. Modelo de Dominio

### Entidades principales

-   **usuarios**: cuentas de los usuarios.
-   **equipos_fantasy**: equipo fantasy de cada usuario.
-   **equipos_lnb**: equipos reales de la Liga Nacional.
-   **jugadores**: jugadores reales disponibles para fichar.
-   **equipo_fantasy_jugadores**: plantilla actual de cada equipo
    fantasy.
-   **jornadas**: períodos competitivos.
-   **partidos**: encuentros reales de cada jornada.
-   **estadisticas**: rendimiento real de cada jugador por partido.
-   **lineup_snapshots**: congelación del roster al cierre de cada
    jornada.
-   **transferencias**: movimientos de mercado.
-   **audit_presupuesto**: historial de cambios presupuestarios.
-   **audit_log**: trazabilidad general.

------------------------------------------------------------------------

## 3. Relaciones Clave

-   Un usuario tiene un único equipo fantasy.
-   Un equipo fantasy pertenece a un usuario.
-   Un equipo fantasy posee muchos jugadores.
-   Un jugador puede pertenecer a muchos equipos fantasy.
-   Un jugador pertenece a un equipo real.
-   Un jugador tiene una posición.
-   Una jornada contiene múltiples partidos.
-   Un partido genera múltiples estadísticas.
-   Cada estadística corresponde a un jugador en un partido.
-   Cada jornada genera un snapshot de la alineación de cada equipo.

------------------------------------------------------------------------

## 4. Flujo General del Negocio

### 4.1 Registro de usuario

1.  Se crea un registro en `usuarios`.
2.  Se crea automáticamente (o mediante flujo posterior) un registro en
    `equipos_fantasy`.
3.  Se asigna presupuesto inicial.

### 4.2 Armado del equipo

1.  El usuario compra jugadores.
2.  Se insertan en `equipo_fantasy_jugadores`.
3.  Un trigger valida el presupuesto disponible.
4.  El presupuesto restante se actualiza automáticamente.

### 4.3 Cierre de jornada

1.  Se ejecuta `capturar_lineup_snapshot(jornada_id)`.
2.  Se copia la alineación actual a `lineup_snapshots`.
3.  La jornada queda bloqueada.
4.  Ya no pueden realizarse cambios en la plantilla.

### 4.4 Carga de estadísticas

1.  Se registran partidos.
2.  Se cargan estadísticas por jugador.
3.  Las vistas calculan automáticamente puntos fantasy.

### 4.5 Cálculo de puntajes

-   Se calcula el puntaje por partido.
-   Se promedia por jornada.
-   Se aplica multiplicador por titularidad.
-   Se aplica multiplicador de capitán.
-   Se descuentan penalizaciones por transferencias.

------------------------------------------------------------------------

## 5. Tablas Principales

## usuarios

Almacena autenticación y datos del usuario.

Campos clave: - `id` - `nombre` - `email` (único) - `password_hash` -
`activo` - `ultimo_login`

### Backend

-   Nunca almacenar contraseñas en texto plano.
-   Usar bcrypt o Argon2.
-   El email debe validarse antes de insertar.

------------------------------------------------------------------------

## equipos_fantasy

Representa el equipo del usuario.

Campos clave: - `id` - `nombre` - `usuario_id` - `presupuesto_inicial` -
`presupuesto_restante`

### Reglas

-   Un usuario solo puede tener un equipo.
-   El presupuesto nunca puede ser negativo.

------------------------------------------------------------------------

## jugadores

Catálogo de jugadores disponibles.

Campos clave: - `id` - `nombre` - `equipo_id` - `posicion` -
`posicion_id` - `precio` - `activo`

### Validaciones

-   Posición válida.
-   Altura razonable.
-   Número de camiseta válido.

------------------------------------------------------------------------

## equipo_fantasy_jugadores

Tabla puente entre equipos fantasy y jugadores.

Campos clave: - `equipo_fantasy_id` - `jugador_id` - `es_titular` -
`es_capitan`

### Reglas

-   Un jugador no puede repetirse dentro del mismo equipo.
-   Un capitán debe ser titular.

------------------------------------------------------------------------

## jornadas

Define cada fecha del torneo fantasy.

Campos clave: - `numero` - `fecha_inicio` - `fecha_fin` -
`lineup_lock` - `cerrada`

### Estado del mercado

-   ABIERTO
-   AÚN NO ABRE
-   CERRADO

------------------------------------------------------------------------

## partidos

Partidos reales de la LNB.

Campos clave: - `jornada_id` - `equipo_local_id` -
`equipo_visitante_id` - `estado`

Estados válidos: - PROGRAMADO - EN_CURSO - FINALIZADO - CANCELADO

------------------------------------------------------------------------

## estadisticas

Rendimiento real de un jugador en un partido.

Incluye: - puntos - rebotes - asistencias - robos - tapas - pérdidas -
faltas - tiros de campo - triples - tiros libres

------------------------------------------------------------------------

## transferencias

Registro de altas y bajas de jugadores.

Campos clave: - `jugador_sale_id` - `jugador_entra_id` -
`es_penalizada` - `penalizacion_puntos`

------------------------------------------------------------------------

## 6. Lógica Implementada en la Base de Datos

### controlar_presupuesto()

-   Se ejecuta antes de agregar un jugador.
-   Verifica saldo disponible.
-   Descuenta automáticamente el precio.

### devolver_presupuesto()

-   Se ejecuta al eliminar un jugador.
-   Reintegra su valor al presupuesto.

### bloquear_si_jornada_cerrada()

-   Impide cambios cuando el mercado está cerrado.

### capturar_lineup_snapshot(jornada_id)

-   Congela la alineación oficial de la jornada.

------------------------------------------------------------------------

## 7. Sistema de Puntaje Fantasy

### Fórmula base

-   Punto: +1
-   Rebote: +1.2
-   Asistencia: +1.5
-   Robo: +2
-   Tapa: +2
-   Triple convertido: +0.5
-   Pérdida: -1
-   Tiro de campo fallado: -0.5
-   Tiro libre fallado: -2

### Ajustes posteriores

-   Titular: x1
-   Suplente: x0.5
-   Capitán: x2

------------------------------------------------------------------------

## 8. Vistas Estratégicas

### puntos_fantasy_por_partido

Calcula puntos fantasy de cada actuación individual.

### puntos_jugador_por_jornada

Promedia el rendimiento del jugador en la jornada.

### puntos_equipo_por_jornada

Calcula los puntos de cada jugador según su rol en la alineación.

### total_equipo_por_jornada

Suma el total del equipo y descuenta penalizaciones.

### ranking_por_jornada

Ranking por fecha.

### ranking_general

Ranking acumulado.

### ranking_general_completo

Versión extendida con información del usuario y roster.

### estado_mercado

Indica si la jornada actual está abierta o bloqueada.

------------------------------------------------------------------------

## 9. Implementación en el Backend

## Capa de acceso a datos (Repository)

Responsabilidades: - Consultas SQL. - Operaciones CRUD. - Uso de
transacciones.

Ejemplo: - `UserRepository` - `FantasyTeamRepository` -
`PlayerRepository`

------------------------------------------------------------------------

## Capa de servicios (Service)

Responsabilidades: - Aplicar reglas de negocio. - Coordinar múltiples
repositorios. - Manejar transacciones complejas.

Ejemplo: - `TransferService` - `LineupService` - `ScoringService` -
`MarketService`

------------------------------------------------------------------------

## Capa de controladores (Controller)

Responsabilidades: - Validar entrada. - Invocar servicios. - Formatear
respuestas HTTP.

------------------------------------------------------------------------

## 10. Casos de Uso Importantes

### Comprar jugador

1.  Validar mercado abierto.
2.  Validar presupuesto.
3.  Validar cupo del roster.
4.  Insertar jugador.
5.  Registrar auditoría.

### Vender jugador

1.  Verificar pertenencia.
2.  Eliminar relación.
3.  Reintegrar presupuesto.
4.  Registrar transferencia.

### Cerrar jornada

1.  Ejecutar snapshot.
2.  Bloquear mercado.
3.  Generar alineaciones oficiales.

### Calcular ranking

1.  Leer vistas agregadas.
2.  Ordenar por puntaje.
3.  Exponer vía API.

------------------------------------------------------------------------

## 11. Recomendaciones de API

### Endpoints sugeridos

#### Usuarios

-   `POST /auth/register`
-   `POST /auth/login`

#### Equipos Fantasy

-   `GET /fantasy-team`
-   `PATCH /fantasy-team/lineup`

#### Mercado

-   `GET /market/players`
-   `POST /market/buy`
-   `POST /market/sell`

#### Jornadas

-   `GET /gameweeks/current`
-   `POST /gameweeks/:id/lock`

#### Rankings

-   `GET /rankings/global`
-   `GET /rankings/gameweek/:id`

------------------------------------------------------------------------

## 12. Buenas Prácticas de Implementación

-   Usar transacciones en compras y ventas.
-   Nunca duplicar reglas que ya están protegidas por constraints.
-   Validar también en backend para mejor UX.
-   Centralizar lógica de negocio en servicios.
-   Registrar eventos críticos.
-   Utilizar consultas paginadas para listados grandes.

------------------------------------------------------------------------

## 13. Consideraciones de Rendimiento

-   Índices sobre claves foráneas.
-   Índices sobre tablas de estadísticas.
-   Índices sobre snapshots y rankings.
-   Usar vistas para consultas analíticas frecuentes.

------------------------------------------------------------------------

## 14. Seguridad

-   Contraseñas hasheadas.
-   JWT o sesiones seguras.
-   Sanitización de inputs.
-   Uso de consultas parametrizadas.
-   Control de permisos por rol.

------------------------------------------------------------------------

## 15. Flujo Recomendado para Nuevos Desarrolladores

1.  Entender las tablas maestras.
2.  Revisar relaciones.
3.  Estudiar triggers y funciones.
4.  Comprender las vistas de scoring.
5.  Implementar servicios siguiendo el flujo del negocio.

------------------------------------------------------------------------

## 16. Resumen Arquitectónico

La base de datos no solo almacena información: también encapsula reglas
fundamentales del negocio.

-   **Constraints** garantizan integridad.
-   **Triggers** automatizan procesos.
-   **Funciones** centralizan lógica crítica.
-   **Views** exponen métricas complejas.
-   **Índices** optimizan rendimiento.

Esto permite que el backend se enfoque en: - autenticación, -
validación, - orquestación, - exposición de APIs.

Mientras que PostgreSQL se encarga de la consistencia y del cálculo
intensivo.

------------------------------------------------------------------------
