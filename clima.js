// Clima usando la API gratuita de Open-Meteo (no necesita API key)
// https://open-meteo.com
const express = require('express');

const router = express.Router();

// Ubicación por defecto: la del .env (si no hay, la del ejemplo de Open-Meteo: Berlín)
const LATITUD = process.env.CLIMA_LATITUD || 52.52;
const LONGITUD = process.env.CLIMA_LONGITUD || 13.41;
const CIUDAD = process.env.CLIMA_CIUDAD || 'Berlín';

// 🌱 Caché: guardamos la respuesta de cada ubicación 30 minutos para no llamar a Open-Meteo en cada visita
const MINUTOS_CACHE = 30;
const caches = {};         // { "52.52,13.41": { datos, hora } }
let llamadasApi = 0;       // cuántas veces sí llamamos a Open-Meteo
let respuestasCache = 0;   // cuántas veces respondimos con la caché

// Traduce el código del clima (código WMO) a texto, un emoji y un "tipo" (la página lo usa para el color de fondo)
function describirClima(codigo) {
  if (codigo === 0) return { texto: 'Despejado', icono: '☀️', tipo: 'despejado' };
  if (codigo <= 3) return { texto: 'Parcialmente nublado', icono: '⛅', tipo: 'nublado' };
  if (codigo <= 48) return { texto: 'Niebla', icono: '🌫️', tipo: 'nublado' };
  if (codigo <= 67) return { texto: 'Lluvia', icono: '🌧️', tipo: 'lluvia' };
  if (codigo <= 77) return { texto: 'Nieve', icono: '❄️', tipo: 'nieve' };
  if (codigo <= 82) return { texto: 'Chubascos', icono: '🌦️', tipo: 'lluvia' };
  return { texto: 'Tormenta', icono: '⛈️', tipo: 'tormenta' };
}

// GET /api/clima               -> ubicación del .env
// GET /api/clima?lat=..&lon=..&ciudad=..  -> otra ubicación
router.get('/', async (req, res) => {
  const lat = Number(req.query.lat ?? LATITUD);
  const lon = Number(req.query.lon ?? LONGITUD);
  const ciudad = req.query.ciudad || (req.query.lat ? 'Coordenadas ' + lat + ', ' + lon : CIUDAD);

  // Validación de las coordenadas
  if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
    return res.status(400).json({ mensaje: 'Latitud debe estar entre -90 y 90 y longitud entre -180 y 180' });
  }

  // Redondeamos a 2 decimales (~1 km) para que coordenadas casi iguales usen la misma caché
  const clave = lat.toFixed(2) + ',' + lon.toFixed(2);
  const guardado = caches[clave];

  // Si la caché todavía sirve, respondemos con ella sin llamar a Open-Meteo
  if (guardado && (Date.now() - guardado.hora) / 1000 / 60 < MINUTOS_CACHE) {
    respuestasCache++;
    return res.json({ ...guardado.datos, ciudad, desdeCache: true, llamadasApi, respuestasCache });
  }

  try {
    // Misma consulta que la del ejemplo (hourly=temperature_2m) más:
    // - current: temperatura, código del clima y si es de día (is_day) en este momento
    // - daily: clima, máxima y mínima de cada día (para el pronóstico de 7 días)
    // - timezone=auto: horas en la zona horaria de la ciudad
    // - forecast_days=7: 7 días de pronóstico diario...
    // - forecast_hours=24: ...pero solo las PRÓXIMAS 24 horas del pronóstico por hora (24 datos en vez de 168)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&hourly=temperature_2m&current=temperature_2m,weather_code,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
      '&timezone=auto&forecast_days=7&forecast_hours=24';

    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error('Open-Meteo respondió ' + respuesta.status);
    const datos = await respuesta.json();
    llamadasApi++;

    const temperaturas = datos.hourly.temperature_2m;
    const suma = temperaturas.reduce((total, t) => total + t, 0);

    // Guardamos solo lo que necesitan las páginas
    const resultado = {
      latitud: lat,
      longitud: lon,
      temperatura: datos.current.temperature_2m,
      ...describirClima(datos.current.weather_code),
      esDeDia: datos.current.is_day === 1,
      // Mínima, máxima y promedio de las próximas 24 horas
      minima: Math.min(...temperaturas),
      maxima: Math.max(...temperaturas),
      promedio: Math.round((suma / temperaturas.length) * 10) / 10,
      zonaHoraria: datos.timezone,                 // ej. "Europe/Berlin"
      horas: datos.hourly.time.map((hora, i) => ({
        hora: hora.slice(11, 16),                  // "2026-11-25T14:00" -> "14:00"
        temperatura: temperaturas[i]
      })),
      // Pronóstico de 7 días
      dias: datos.daily.time.map((fecha, i) => ({
        fecha,                                     // "2026-11-25"
        maxima: datos.daily.temperature_2m_max[i],
        minima: datos.daily.temperature_2m_min[i],
        ...describirClima(datos.daily.weather_code[i])
      })),
      actualizado: new Date()
    };
    caches[clave] = { datos: resultado, hora: Date.now() };

    res.json({ ...resultado, ciudad, desdeCache: false, llamadasApi, respuestasCache });
  } catch (error) {
    console.log(error);
    res.status(502).json({ mensaje: 'No se pudo obtener el clima' });
  }
});

module.exports = router;
