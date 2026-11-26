// Huella de carbono del servidor
// Cuenta cuántas peticiones atiende el servidor y cuántos bytes envía,
// y con eso estima la energía y el CO2 usando el modelo "Sustainable Web Design" (SWD v3),
// el mismo que usa la librería CO2.js de The Green Web Foundation.
const express = require('express');

const router = express.Router();

// Constantes del modelo Sustainable Web Design (v3)
const KWH_POR_GB = 0.81;          // energía que se gasta por cada GB transferido (servidores, red y dispositivos)
const GRAMOS_CO2_POR_KWH = 494;   // intensidad de carbono promedio de la electricidad en el mundo
const BYTES_POR_GB = 1000 * 1000 * 1000;

// Aquí vamos guardando los datos desde que se prende el servidor
const datos = {
  inicio: new Date(),
  peticiones: 0,
  bytesEnviados: 0
};

// Calcula energía y CO2 a partir de una cantidad de bytes
function calcularHuella(bytes) {
  const energiaKWh = (bytes / BYTES_POR_GB) * KWH_POR_GB;
  const co2Gramos = energiaKWh * GRAMOS_CO2_POR_KWH;
  return { energiaKWh, co2Gramos };
}

// Middleware: se ejecuta en TODAS las peticiones y cuenta los bytes de la respuesta
function contarPeticiones(req, res, next) {
  // 'finish' se dispara cuando el servidor terminó de mandar la respuesta
  res.on('finish', () => {
    datos.peticiones++;
    datos.bytesEnviados += Number(res.getHeader('Content-Length')) || 0;
  });
  next();
}

// GET /api/huella - Regresa los datos y la estimación de CO2
router.get('/', (req, res) => {
  const { energiaKWh, co2Gramos } = calcularHuella(datos.bytesEnviados);

  res.json({
    inicio: datos.inicio,
    peticiones: datos.peticiones,
    bytesEnviados: datos.bytesEnviados,
    energiaKWh,
    co2Gramos,
    // Esto es la idea del SCI: CO2 dividido entre una unidad de trabajo (R = una petición)
    co2PorPeticion: datos.peticiones > 0 ? co2Gramos / datos.peticiones : 0,
    memoriaMB: process.memoryUsage().rss / 1024 / 1024,
    modelo: {
      nombre: 'Sustainable Web Design v3',
      kwhPorGB: KWH_POR_GB,
      gramosCO2PorKWh: GRAMOS_CO2_POR_KWH
    }
  });
});

module.exports = { router, contarPeticiones, KWH_POR_GB, GRAMOS_CO2_POR_KWH };
