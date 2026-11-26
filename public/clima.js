// JavaScript del widget del clima (los datos vienen de /api/clima, que usa Open-Meteo)

async function cargarClima() {
  const caja = document.getElementById('clima');

  try {
    const respuesta = await fetch('/api/clima');
    const c = await respuesta.json();

    if (!respuesta.ok) {
      caja.innerHTML = '<p class="nota">🌥️ ' + escapar(c.mensaje || 'No se pudo cargar el clima') + '</p>';
      return;
    }

    // El servidor manda las próximas 24 horas (en la hora local de la ciudad); aquí mostramos 12
    const proximas = c.horas.slice(0, 12);

    // Para dibujar las barras: la más alta es la temperatura máxima
    const rango = (c.maxima - c.minima) || 1;

    caja.innerHTML = `
      <div class="clima-actual">
        <span class="clima-icono">${c.icono}</span>
        <div>
          <div class="clima-temp">${Math.round(c.temperatura)}°C</div>
          <div>${escapar(c.ciudad)} · ${c.texto}</div>
          <div class="nota">Próximas 24 h: mín ${Math.round(c.minima)}° · máx ${Math.round(c.maxima)}°</div>
        </div>
      </div>
      <div class="clima-horas">
        ${proximas.map(h => `
          <div class="clima-hora">
            <small>${Math.round(h.temperatura)}°</small>
            <div class="barra" style="height: ${20 + ((h.temperatura - c.minima) / rango) * 50}px"></div>
            <small>${h.hora}</small>
          </div>
        `).join('')}
      </div>
      <p class="nota clima-cache">
        🌱 ${c.desdeCache ? 'Dato guardado en caché' : 'Dato nuevo de Open-Meteo'}
        (se actualiza cada 30 min) · Llamadas a la API: ${c.llamadasApi} · Respuestas desde caché: ${c.respuestasCache}
        · <a href="clima.html" class="btn-ver-clima">Ver otras ciudades y gráfica →</a>
      </p>
    `;
  } catch (error) {
    caja.innerHTML = '<p class="nota">🌥️ No se pudo cargar el clima</p>';
  }
}
