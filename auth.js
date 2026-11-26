// Rutas del login y middleware para proteger rutas
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');

const router = express.Router();

// POST /api/login - Iniciar sesión
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ mensaje: 'Usuario y contraseña son obligatorios' });
  }

  try {
    const [usuarios] = await db.query('SELECT id, nombre, usuario, password FROM usuarios WHERE usuario = ?', [usuario]);

    // bcrypt.compare compara la contraseña escrita con la contraseña cifrada de la base de datos
    if (usuarios.length === 0 || !(await bcrypt.compare(password, usuarios[0].password))) {
      return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
    }

    // Guardamos los datos del usuario en la sesión (nunca la contraseña)
    req.session.usuario = { id: usuarios[0].id, nombre: usuarios[0].nombre, usuario: usuarios[0].usuario };
    res.json({ mensaje: 'Bienvenido ' + usuarios[0].nombre, usuario: req.session.usuario });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
});

// POST /api/registro - Crear un usuario nuevo
router.post('/registro', async (req, res) => {
  const { nombre, usuario, password } = req.body;

  // Validaciones
  const errores = [];
  if (!nombre || !nombre.trim()) errores.push('El nombre es obligatorio');
  if (!usuario || !usuario.trim()) errores.push('El usuario es obligatorio');
  else if (usuario.includes(' ')) errores.push('El usuario no puede tener espacios');
  if (!password || password.length < 6) errores.push('La contraseña debe tener al menos 6 caracteres');

  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  try {
    // Revisamos que el usuario no exista
    const [existe] = await db.query('SELECT id FROM usuarios WHERE usuario = ?', [usuario.trim()]);
    if (existe.length > 0) {
      return res.status(400).json({ errores: ['Ese usuario ya está registrado'] });
    }

    // Ciframos la contraseña antes de guardarla (10 = número de rondas de cifrado)
    const passwordCifrada = await bcrypt.hash(password, 10);

    const [resultado] = await db.query(
      'INSERT INTO usuarios (nombre, usuario, password) VALUES (?, ?, ?)',
      [nombre.trim(), usuario.trim(), passwordCifrada]
    );

    // Iniciamos sesión de una vez para que no tenga que volver a escribir sus datos
    req.session.usuario = { id: resultado.insertId, nombre: nombre.trim(), usuario: usuario.trim() };
    res.status(201).json({ mensaje: 'Usuario registrado', usuario: req.session.usuario });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mensaje: 'Error al registrar el usuario' });
  }
});

// POST /api/logout - Cerrar sesión
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ mensaje: 'Sesión cerrada' });
  });
});

// GET /api/me - Saber quién tiene la sesión iniciada
router.get('/me', (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).json({ mensaje: 'No has iniciado sesión' });
  }
  res.json(req.session.usuario);
});

// GET /api/usuarios - Lista de usuarios para el selector "Asignado a" (solo id y nombre, nunca la contraseña)
router.get('/usuarios', verificarSesion, async (req, res) => {
  try {
    const [usuarios] = await db.query('SELECT id, nombre FROM usuarios ORDER BY nombre');
    res.json(usuarios);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mensaje: 'Error al obtener los usuarios' });
  }
});

// Middleware: si no hay sesión, no deja pasar a la ruta
function verificarSesion(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ mensaje: 'Debes iniciar sesión' });
  }
  next();
}

module.exports = { router, verificarSesion };
