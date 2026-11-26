// Archivo principal: aquí se levanta el servidor
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const swaggerDocumento = require('./swagger.json');
const ticketsRoutes = require('./tickets');
const { router: authRoutes, verificarSesion } = require('./auth');
const { router: huellaRoutes, contarPeticiones } = require('./huella');
const climaRoutes = require('./clima');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(contarPeticiones);         // cuenta peticiones y bytes para la huella de carbono (va primero para contar todo)
app.use(express.json());           // permite leer el JSON que llega en req.body
app.use(express.static('public')); // sirve la página web que está en /public

// Sesiones: el servidor recuerda quién inició sesión usando una cookie
app.use(session({
  secret: process.env.SESSION_SECRET, // clave para firmar la cookie
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // la sesión dura 1 hora
}));

// Rutas
app.use('/api', authRoutes);                             // login, logout y me (públicas)
app.use('/api/tickets', verificarSesion, ticketsRoutes); // solo con sesión iniciada
app.use('/api/huella', verificarSesion, huellaRoutes);   // huella de carbono (con sesión)
app.use('/api/clima', verificarSesion, climaRoutes);     // clima con Open-Meteo (con sesión)

// Documentación de la API con Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocumento));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentación en http://localhost:${PORT}/api-docs`);
});
