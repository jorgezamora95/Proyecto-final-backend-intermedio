// Rutas del CRUD de tickets
const express = require('express');
const db = require('./db');

const router = express.Router();

// Columnas que necesita la página. Pedimos solo estas en lugar de SELECT * para mandar menos datos.
// Con LEFT JOIN traemos también el NOMBRE del técnico asignado y de quien lo resolvió
// (LEFT JOIN para que también salgan los tickets sin asignar).
const CONSULTA = `
  SELECT t.id, t.titulo, t.descripcion, t.solicitante, t.email, t.prioridad, t.estado, t.created_at,
         t.asignado_a, asignado.nombre AS asignado_nombre,
         t.solucion, t.resuelto_at, resolvio.nombre AS resuelto_por_nombre
  FROM tickets t
  LEFT JOIN usuarios asignado ON asignado.id = t.asignado_a
  LEFT JOIN usuarios resolvio ON resolvio.id = t.resuelto_por`;

const PRIORIDADES = ['baja', 'media', 'alta'];
const ESTADOS = ['abierto', 'en_progreso', 'cerrado'];

// Revisa que vengan los datos obligatorios. Regresa un arreglo con los errores encontrados.
function validar(ticket) {
  const errores = [];
  if (!ticket.titulo) errores.push('El título es obligatorio');
  if (!ticket.descripcion) errores.push('La descripción es obligatoria');
  if (!ticket.solicitante) errores.push('El solicitante es obligatorio');
  if (!ticket.email || !ticket.email.includes('@')) errores.push('El email no es válido');
  if (ticket.prioridad && !PRIORIDADES.includes(ticket.prioridad)) errores.push('Prioridad no válida');
  if (ticket.estado && !ESTADOS.includes(ticket.estado)) errores.push('Estado no válido');
  if (ticket.asignado_a && !Number.isInteger(Number(ticket.asignado_a))) errores.push('Técnico asignado no válido');
  return errores;
}

// "" o undefined = sin asignar (NULL en la base de datos)
function idAsignado(valor) {
  return valor ? Number(valor) : null;
}

// Si el técnico asignado no existe, MySQL rechaza el INSERT/UPDATE por la llave foránea
function esTecnicoInexistente(error) {
  return error.code === 'ER_NO_REFERENCED_ROW_2';
}

// READ - Obtener todos los tickets
router.get('/', async (req, res) => {
  try {
    const [tickets] = await db.query(`${CONSULTA} ORDER BY t.id DESC`);
    res.json(tickets);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mensaje: 'Error al obtener los tickets' });
  }
});

// ESTADÍSTICAS - Datos para la página de gráficas.
// Los conteos y promedios los calcula MySQL con GROUP BY, así el servidor manda solo los totales
// y no la lista completa de tickets.
// OJO: esta ruta va ANTES de '/:id', si no Express pensaría que "estadisticas" es un id.
router.get('/estadisticas', async (req, res) => {
  try {
    // Promise.all lanza las 5 consultas al mismo tiempo (el pool tiene varias conexiones)
    const [[porEstado], [porPrioridad], [porTecnico], [porDia], [resolucion]] = await Promise.all([
      db.query('SELECT estado, COUNT(*) AS total FROM tickets GROUP BY estado'),

      db.query('SELECT prioridad, COUNT(*) AS total FROM tickets GROUP BY prioridad'),

      // Por técnico, separado por estado. SUM(condición) cuenta cuántas filas la cumplen.
      db.query(`
        SELECT COALESCE(u.nombre, 'Sin asignar') AS tecnico,
               SUM(t.estado = 'abierto') AS abierto,
               SUM(t.estado = 'en_progreso') AS en_progreso,
               SUM(t.estado = 'cerrado') AS cerrado
        FROM tickets t
        LEFT JOIN usuarios u ON u.id = t.asignado_a
        GROUP BY t.asignado_a, u.nombre
        ORDER BY COUNT(*) DESC`),

      // Tickets creados en los últimos 14 días
      db.query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS dia, COUNT(*) AS total
        FROM tickets
        WHERE created_at >= CURDATE() - INTERVAL 13 DAY
        GROUP BY dia
        ORDER BY dia`),

      // Horas promedio entre que se creó y se resolvió, por quien lo resolvió
      db.query(`
        SELECT u.nombre AS tecnico, COUNT(*) AS resueltos,
               ROUND(AVG(TIMESTAMPDIFF(MINUTE, t.created_at, t.resuelto_at)) / 60, 1) AS horas_promedio
        FROM tickets t
        JOIN usuarios u ON u.id = t.resuelto_por
        WHERE t.resuelto_at IS NOT NULL
        GROUP BY u.id, u.nombre
        ORDER BY horas_promedio`)
    ]);

    res.json({ porEstado, porPrioridad, porTecnico, porDia, resolucion });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mensaje: 'Error al obtener las estadísticas' });
  }
});

// READ - Obtener un ticket por su id
router.get('/:id', async (req, res) => {
  try {
    const [tickets] = await db.query(`${CONSULTA} WHERE t.id = ?`, [req.params.id]);

    if (tickets.length === 0) {
      return res.status(404).json({ mensaje: 'Ticket no encontrado' });
    }
    res.json(tickets[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mensaje: 'Error al obtener el ticket' });
  }
});

// CREATE - Crear un ticket nuevo
router.post('/', async (req, res) => {
  const { titulo, descripcion, solicitante, email, prioridad, asignado_a } = req.body;

  const errores = validar(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO tickets (titulo, descripcion, solicitante, email, prioridad, asignado_a) VALUES (?, ?, ?, ?, ?, ?)',
      [titulo, descripcion, solicitante, email, prioridad || 'media', idAsignado(asignado_a)]
    );
    res.status(201).json({ mensaje: 'Ticket creado', id: resultado.insertId });
  } catch (error) {
    if (esTecnicoInexistente(error)) return res.status(400).json({ errores: ['El técnico asignado no existe'] });
    console.log(error);
    res.status(500).json({ mensaje: 'Error al crear el ticket' });
  }
});

// UPDATE - Actualizar un ticket existente
router.put('/:id', async (req, res) => {
  const { titulo, descripcion, solicitante, email, prioridad, estado, asignado_a } = req.body;

  const errores = validar(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  try {
    // Para CERRAR un ticket hay que escribir la solución (ruta PUT /:id/resolver).
    // Aquí solo se permite "cerrado" si el ticket ya tenía su solución guardada.
    if (estado === 'cerrado') {
      const [filas] = await db.query('SELECT solucion FROM tickets WHERE id = ?', [req.params.id]);
      if (filas.length > 0 && !filas[0].solucion) {
        return res.status(400).json({ errores: ['Para cerrar el ticket usa "Resolver" y escribe la solución'] });
      }
    }

    let sql = 'UPDATE tickets SET titulo = ?, descripcion = ?, solicitante = ?, email = ?, prioridad = ?, estado = ?, asignado_a = ?';
    // Si se reabre el ticket, se borra la solución anterior
    if (estado !== 'cerrado') {
      sql += ', solucion = NULL, resuelto_por = NULL, resuelto_at = NULL';
    }
    sql += ' WHERE id = ?';

    const [resultado] = await db.query(sql, [
      titulo, descripcion, solicitante, email, prioridad || 'media', estado || 'abierto',
      idAsignado(asignado_a), req.params.id
    ]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Ticket no encontrado' });
    }
    res.json({ mensaje: 'Ticket actualizado' });
  } catch (error) {
    if (esTecnicoInexistente(error)) return res.status(400).json({ errores: ['El técnico asignado no existe'] });
    console.log(error);
    res.status(500).json({ mensaje: 'Error al actualizar el ticket' });
  }
});

// RESOLVER - El técnico escribe qué hizo y el ticket se cierra
router.put('/:id/resolver', async (req, res) => {
  const solucion = (req.body.solucion || '').trim();

  if (solucion.length < 5) {
    return res.status(400).json({ errores: ['Describe la solución (mínimo 5 caracteres)'] });
  }

  try {
    // Quién lo resolvió sale de la sesión: es el usuario que inició sesión
    const [resultado] = await db.query(
      "UPDATE tickets SET estado = 'cerrado', solucion = ?, resuelto_por = ?, resuelto_at = NOW() WHERE id = ?",
      [solucion, req.session.usuario.id, req.params.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Ticket no encontrado' });
    }
    res.json({ mensaje: 'Ticket resuelto', resuelto_por_nombre: req.session.usuario.nombre });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mensaje: 'Error al resolver el ticket' });
  }
});

// DELETE - Eliminar un ticket
router.delete('/:id', async (req, res) => {
  try {
    const [resultado] = await db.query('DELETE FROM tickets WHERE id = ?', [req.params.id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Ticket no encontrado' });
    }
    res.json({ mensaje: 'Ticket eliminado' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mensaje: 'Error al eliminar el ticket' });
  }
});

module.exports = router;
