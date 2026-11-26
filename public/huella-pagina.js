// JavaScript de la página de huella de carbono

// Mismas constantes del modelo que usa el servidor (se actualizan con lo que mande la API)
let KWH_POR_GB = 0.81;
let GRAMOS_CO2_POR_KWH = 494;

// Convierte bytes a un texto fácil de leer: 1536 -> "1.5 KB"
function formatoBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// Los gramos de CO2 aquí son muy pequeños, así que los mostramos en miligramos
function formatoCO2(gramos) {
  const mg = gramos * 1000;
  if (mg < 0.01) return mg.toFixed(5) + ' mg';
  if (mg < 1000) return mg.toFixed(3) + ' mg';
  return gramos.toFixed(3) + ' g';
}

function formatoEnergia(kwh) {
  return (kwh * 1000).toFixed(6) + ' Wh';
}

// Trae los datos del servidor
async function cargarHuella() {
  const respuesta = await fetch('/api/huella');

  if (respuesta.status === 401) {
    window.location.href = 'login.html';
    return;
  }

  const d = await respuesta.json();
  KWH_POR_GB = d.modelo.kwhPorGB;
  GRAMOS_CO2_POR_KWH = d.modelo.gramosCO2PorKWh;

  document.getElementById('inicio').textContent = new Date(d.inicio).toLocaleString('es-MX');
  document.getElementById('peticiones').textContent = d.peticiones;
  document.getElementById('bytes').textContent = formatoBytes(d.bytesEnviados);
  document.getElementById('energia').textContent = formatoEnergia(d.energiaKWh);
  document.getElementById('co2').textContent = formatoCO2(d.co2Gramos);
  document.getElementById('co2-peticion').textContent = formatoCO2(d.co2PorPeticion);
  document.getElementById('intensidad').textContent = GRAMOS_CO2_POR_KWH;
  document.getElementById('intensidad2').textContent = GRAMOS_CO2_POR_KWH;
  document.getElementById('kwh-gb').textContent = KWH_POR_GB;

  calcularPagina();
}

// Mide lo que descargó el navegador para esta página con la Performance API
function calcularPagina() {
  const pagina = performance.getEntriesByType('navigation');
  const recursos = performance.getEntriesByType('resource');
  const todos = [...pagina, ...recursos];

  // transferSize = bytes que realmente viajaron por la red (0 si vino de la caché)
  const bytes = todos.reduce((suma, r) => suma + (r.transferSize || 0), 0);
  const co2 = (bytes / 1e9) * KWH_POR_GB * GRAMOS_CO2_POR_KWH;

  document.getElementById('pagina-archivos').textContent = todos.length;
  document.getElementById('pagina-bytes').textContent = formatoBytes(bytes);
  document.getElementById('pagina-co2').textContent = formatoCO2(co2);
}

cargarHuella();
