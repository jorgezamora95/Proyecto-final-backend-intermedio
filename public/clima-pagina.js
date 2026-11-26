// JavaScript de la página del clima (clima.html)

let grafica = null; // la gráfica de Chart.js (se guarda para poder actualizarla)

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Mostrar u ocultar los campos de coordenadas según la opción elegida
document.getElementById('ciudad').addEventListener('change', () => {
  const otra = document.getElementById('ciudad').value === 'otra';
  document.getElementById('latitud').hidden = !otra;
  document.getElementById('longitud').hidden = !otra;
  if (!otra) buscarClima();
});
document.getElementById('comparar').addEventListener('change', buscarClima);

// Pide el clima de una ubicación a nuestro servidor (que usa Open-Meteo)
async function pedirClima(lat, lon, ciudad) {
  const url = '/api/clima?lat=' + lat + '&lon=' + lon + '&ciudad=' + encodeURIComponent(ciudad);
  const respuesta = await fetch(url);

  if (respuesta.status === 401) {
    window.location.href = 'login.html';
    return null;
  }

  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje);
  return datos;
}

async function buscarClima() {
  const select = document.getElementById('ciudad');
  const comparar = document.getElementById('comparar');
  const estado = document.getElementById('estado-clima');
  let lat, lon, ciudad;

  if (select.value === 'otra') {
    lat = document.getElementById('latitud').value;
    lon = document.getElementById('longitud').value;
    ciudad = '';
    if (lat === '' || lon === '') {
      estado.textContent = '⚠️ Escribe la latitud y la longitud';
      return;
    }
  } else {
    [lat, lon] = select.value.split(',');
    ciudad = select.options[select.selectedIndex].text;
  }

  estado.textContent = 'Cargando...';

  try {
    // Si hay ciudad para comparar, pedimos las dos AL MISMO TIEMPO con Promise.all
    const peticiones = [pedirClima(lat, lon, ciudad)];
    if (comparar.value) {
      const [lat2, lon2] = comparar.value.split(',');
      peticiones.push(pedirClima(lat2, lon2, comparar.options[comparar.selectedIndex].text));
    }
    const [principal, otra] = await Promise.all(peticiones);
    if (!principal) return;

    estado.textContent = '';
    pintarClima(principal, otra);
  } catch (error) {
    estado.textContent = '⚠️ ' + (error.message || 'No se pudo cargar el clima');
  }
}

// HTML del clima actual de una ciudad (se usa para la principal y la de comparación)
function htmlActual(c) {
  return `
    <span class="clima-icono">${c.esDeDia ? c.icono : '🌙'}</span>
    <div>
      <div class="clima-temp">${Math.round(c.temperatura)}°C</div>
      <div>${escapar(c.ciudad)} · ${c.texto}${c.esDeDia ? '' : ' (de noche)'}</div>
      <div class="nota">Lat ${c.latitud} · Lon ${c.longitud}</div>
    </div>
  `;
}

function pintarClima(c, otra) {
  // 1) Fondo de la página según el clima: despejado, nublado, lluvia, nieve, tormenta o noche
  document.body.className = 'pagina-clima fondo-' + (c.esDeDia ? c.tipo : 'noche');

  // 2) Clima actual (y el de la ciudad a comparar, si hay)
  document.getElementById('clima-actual').innerHTML = htmlActual(c);
  const cajaComparar = document.getElementById('clima-comparar');
  cajaComparar.hidden = !otra;
  if (otra) {
    const diferencia = Math.round(c.temperatura - otra.temperatura);
    cajaComparar.innerHTML = htmlActual(otra) +
      `<div class="diferencia">${escapar(c.ciudad)} está <b>${Math.abs(diferencia)}°</b> ${diferencia >= 0 ? 'más caliente' : 'más fría'}</div>`;
  }

  // 3) Tarjetas
  document.getElementById('minima').textContent = c.minima + '°';
  document.getElementById('maxima').textContent = c.maxima + '°';
  document.getElementById('promedio').textContent = c.promedio + '°';
  document.getElementById('zona').textContent = c.zonaHoraria;

  // 4) Pronóstico de 7 días
  document.getElementById('dias').innerHTML = c.dias.map((d, i) => {
    // T12:00 para que la fecha no se recorra un día por la zona horaria
    const nombre = i === 0 ? 'Hoy' : DIAS_SEMANA[new Date(d.fecha + 'T12:00').getDay()];
    return `
      <div class="dia" title="${d.texto}">
        <b>${nombre}</b>
        <span class="dia-icono">${d.icono}</span>
        <span class="dia-max">${Math.round(d.maxima)}°</span>
        <span class="dia-min">${Math.round(d.minima)}°</span>
      </div>
    `;
  }).join('');

  // 5) Caché
  document.getElementById('cache-clima').textContent =
    '🌱 ' + (c.desdeCache ? 'Dato guardado en caché' : 'Dato nuevo de Open-Meteo') +
    ' (se actualiza cada 30 min) · Llamadas a la API: ' + (otra ? otra.llamadasApi : c.llamadasApi) +
    ' · Respuestas desde caché: ' + (otra ? otra.respuestasCache : c.respuestasCache);

  // 6) Gráfica
  dibujarGrafica(c, otra);
}

function dibujarGrafica(c, otra) {
  // Las dos ciudades empiezan en "la hora actual", así que la posición i es el MISMO momento en las dos.
  // En el eje X usamos la hora local de la ciudad principal.
  const etiquetas = c.horas.map(h => h.hora);

  const series = [{
    label: c.ciudad + ' (°C)',
    data: c.horas.map(h => h.temperatura),
    borderColor: '#3498db',
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    fill: true,
    tension: 0.3
  }];

  if (otra) {
    series.push({
      label: otra.ciudad + ' (°C)',
      data: otra.horas.map(h => h.temperatura),
      borderColor: '#e67e22',
      backgroundColor: 'rgba(230, 126, 34, 0.1)',
      fill: true,
      tension: 0.3
    });
  }

  // Si ya existe la gráfica solo cambiamos los datos (no se crea otra)
  if (grafica) {
    grafica.data.labels = etiquetas;
    grafica.data.datasets = series;
    grafica.options.scales.x.title.text = 'Hora local de ' + c.ciudad;
    grafica.update();
    return;
  }

  grafica = new Chart(document.getElementById('grafica'), {
    type: 'line',
    data: { labels: etiquetas, datasets: series },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false }, // el tooltip muestra las dos ciudades a la vez
      scales: {
        y: { title: { display: true, text: '°C' } },
        x: { title: { display: true, text: 'Hora local de ' + c.ciudad } }
      }
    }
  });
}

// Al abrir la página: revisar sesión y cargar la primera ciudad
async function iniciar() {
  const respuesta = await fetch('/api/me');
  if (!respuesta.ok) {
    window.location.href = 'login.html';
    return;
  }
  buscarClima();
}

iniciar();
