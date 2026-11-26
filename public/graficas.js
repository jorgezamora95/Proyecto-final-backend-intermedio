// JavaScript de la página de gráficas (graficas.html)
// Los datos vienen de GET /api/tickets/estadisticas, donde MySQL ya hizo los conteos con GROUP BY.

// Colores de cada estado (los mismos de las tarjetas de tickets).
// El verde es oscuro para que no se confunda con el ámbar si la persona es daltónica.
const ESTADOS = [
  { clave: 'abierto', nombre: 'Abierto', color: '#3498db' },
  { clave: 'en_progreso', nombre: 'En progreso', color: '#f39c12' },
  { clave: 'cerrado', nombre: 'Cerrado', color: '#1e7d4a' }
];
const AZUL = '#3498db';
const TEXTO = '#4a5560';
const REJILLA = '#e3e8ee';

// Estilo general de Chart.js: letra del sitio, rejilla clarita
Chart.defaults.font.family = 'Arial, Helvetica, sans-serif';
Chart.defaults.font.size = 13;
Chart.defaults.color = TEXTO;
Chart.defaults.plugins.legend.labels.usePointStyle = true;

const graficas = {}; // guardamos cada gráfica para actualizarla en lugar de crear otra

function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Tabla sencilla para "Ver datos" (por si la gráfica no se distingue bien)
function tabla(encabezados, filas) {
  return '<table class="tabla-datos"><tr>' + encabezados.map(e => `<th>${e}</th>`).join('') + '</tr>' +
    filas.map(f => '<tr>' + f.map(c => `<td>${escapar(String(c))}</td>`).join('') + '</tr>').join('') +
    '</table>';
}

// Crea la gráfica la primera vez; después solo cambia los datos
function dibujar(id, config) {
  if (graficas[id]) {
    graficas[id].data = config.data;
    graficas[id].update();
    return;
  }
  graficas[id] = new Chart(document.getElementById(id), config);
}

// Ejes con rejilla delgadita y números enteros
function ejes(horizontal, titulo) {
  const valor = { beginAtZero: true, grid: { color: REJILLA }, border: { display: false }, ticks: { precision: 0 } };
  if (titulo) valor.title = { display: true, text: titulo };
  const categoria = { grid: { display: false }, border: { color: REJILLA } };
  return horizontal ? { x: valor, y: categoria } : { x: categoria, y: valor };
}

async function cargarEstadisticas() {
  const respuesta = await fetch('/api/tickets/estadisticas');
  if (respuesta.status === 401) {
    window.location.href = 'login.html';
    return;
  }
  const e = await respuesta.json();

  // MySQL regresa SUM() como texto, lo pasamos a número
  const porTecnico = e.porTecnico.map(t => ({
    tecnico: t.tecnico,
    abierto: Number(t.abierto), en_progreso: Number(t.en_progreso), cerrado: Number(t.cerrado)
  }));

  pintarNumeros(e, porTecnico);
  pintarEstados(e.porEstado);
  pintarTecnicos(porTecnico);
  pintarDias(e.porDia);
  pintarPrioridad(e.porPrioridad);
  pintarTiempo(e.resolucion);
}

// ---------- Números principales ----------
function pintarNumeros(e, porTecnico) {
  const total = e.porEstado.reduce((suma, x) => suma + x.total, 0);
  const cerrados = (e.porEstado.find(x => x.estado === 'cerrado') || { total: 0 }).total;
  const sinAsignar = porTecnico.find(t => t.tecnico === 'Sin asignar');

  // Promedio general ponderado por cuántos resolvió cada técnico
  const resueltos = e.resolucion.reduce((suma, r) => suma + r.resueltos, 0);
  const horas = resueltos
    ? e.resolucion.reduce((suma, r) => suma + Number(r.horas_promedio) * r.resueltos, 0) / resueltos
    : null;

  document.getElementById('g-total').textContent = total;
  document.getElementById('g-resueltos').textContent =
    cerrados + (total ? ' (' + Math.round(cerrados / total * 100) + '%)' : '');
  document.getElementById('g-sin-asignar').textContent =
    sinAsignar ? sinAsignar.abierto + sinAsignar.en_progreso : 0; // los cerrados ya no cuentan
  document.getElementById('g-horas').textContent = horas === null ? '-' : horas.toFixed(1) + ' h';
}

// ---------- Estado: barra dividida en partes (HTML, sin Chart.js) ----------
function pintarEstados(porEstado) {
  const total = porEstado.reduce((suma, x) => suma + x.total, 0) || 1;

  document.getElementById('barra-estados').innerHTML = ESTADOS.map(est => {
    const n = (porEstado.find(x => x.estado === est.clave) || { total: 0 }).total;
    const porcentaje = n / total * 100;
    if (n === 0) return '';
    return `<div class="segmento" style="width:${porcentaje}%; background:${est.color}"
              title="${est.nombre}: ${n} (${Math.round(porcentaje)}%)"></div>`;
  }).join('');

  document.getElementById('leyenda-estados').innerHTML = ESTADOS.map(est => {
    const n = (porEstado.find(x => x.estado === est.clave) || { total: 0 }).total;
    return `<span class="leyenda-item"><span class="muestra" style="background:${est.color}"></span>
              ${est.nombre}: <b>${n}</b> (${Math.round(n / total * 100)}%)</span>`;
  }).join('');
}

// ---------- Por técnico: barras horizontales apiladas por estado ----------
function pintarTecnicos(porTecnico) {
  dibujar('g-tecnicos', {
    type: 'bar',
    data: {
      labels: porTecnico.map(t => t.tecnico),
      datasets: ESTADOS.map(est => ({
        label: est.nombre,
        data: porTecnico.map(t => t[est.clave]),
        backgroundColor: est.color,
        borderColor: '#ffffff', // separación blanca de 2px entre partes
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        maxBarThickness: 24
      }))
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { ...ejes(true).x, stacked: true }, y: { ...ejes(true).y, stacked: true } },
      plugins: { legend: { position: 'top' } }
    }
  });

  document.getElementById('t-tecnicos').innerHTML = tabla(
    ['Técnico', 'Abiertos', 'En progreso', 'Cerrados'],
    porTecnico.map(t => [t.tecnico, t.abierto, t.en_progreso, t.cerrado])
  );
}

// ---------- Creados por día: línea de los últimos 14 días ----------
function pintarDias(porDia) {
  // MySQL solo regresa los días que SÍ tienen tickets: rellenamos los demás con 0
  const dias = [];
  for (let i = 13; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const clave = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
    const encontrado = porDia.find(d => d.dia === clave);
    dias.push({
      etiqueta: fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      total: encontrado ? encontrado.total : 0
    });
  }

  dibujar('g-dias', {
    type: 'line',
    data: {
      labels: dias.map(d => d.etiqueta),
      datasets: [{
        label: 'Tickets creados',
        data: dias.map(d => d.total),
        borderColor: AZUL,
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        fill: true,
        borderWidth: 2,
        cubicInterpolationMode: 'monotone', // curva suave que no inventa valores entre puntos
        pointRadius: 4,
        pointBackgroundColor: AZUL,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: ejes(false),
      plugins: { legend: { display: false } } // una sola serie: el título ya dice qué es
    }
  });

  document.getElementById('t-dias').innerHTML = tabla(['Día', 'Tickets creados'], dias.map(d => [d.etiqueta, d.total]));
}

// ---------- Prioridad: barras ----------
function pintarPrioridad(porPrioridad) {
  const orden = [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']];
  const valores = orden.map(([clave]) => (porPrioridad.find(p => p.prioridad === clave) || { total: 0 }).total);

  dibujar('g-prioridad', {
    type: 'bar',
    data: {
      labels: orden.map(([, nombre]) => nombre),
      datasets: [{
        label: 'Tickets',
        data: valores,
        backgroundColor: AZUL,
        borderRadius: 4,
        borderSkipped: 'start', // esquinas redondas solo en la punta
        maxBarThickness: 24
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: ejes(false),
      plugins: { legend: { display: false } }
    }
  });

  document.getElementById('t-prioridad').innerHTML = tabla(['Prioridad', 'Tickets'], orden.map(([, nombre], i) => [nombre, valores[i]]));
}

// ---------- Tiempo de resolución: barras horizontales ----------
function pintarTiempo(resolucion) {
  dibujar('g-tiempo', {
    type: 'bar',
    data: {
      labels: resolucion.map(r => r.tecnico),
      datasets: [{
        label: 'Horas promedio',
        data: resolucion.map(r => Number(r.horas_promedio)),
        backgroundColor: AZUL,
        borderRadius: 4,
        borderSkipped: 'start',
        maxBarThickness: 24
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: ejes(true, 'Horas'),
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => c.parsed.x + ' h en promedio · ' + resolucion[c.dataIndex].resueltos + ' resueltos'
          }
        }
      }
    }
  });

  document.getElementById('t-tiempo').innerHTML = tabla(
    ['Técnico', 'Resueltos', 'Horas promedio'],
    resolucion.map(r => [r.tecnico, r.resueltos, r.horas_promedio])
  );
}

// Al abrir la página: revisar sesión y cargar
async function iniciar() {
  const respuesta = await fetch('/api/me');
  if (!respuesta.ok) {
    window.location.href = 'login.html';
    return;
  }
  cargarEstadisticas();
}

iniciar();
