// JavaScript de la página principal: consume la API de tickets con fetch()
const API = '/api/tickets';
let tickets = [];   // aquí guardamos los tickets que llegan del servidor
let usuarios = [];  // técnicos para el selector "Asignado a"
let yo = null;      // usuario que inició sesión

const ESTADOS = { abierto: 'Abierto', en_progreso: 'En progreso', cerrado: 'Cerrado' };

// Convierte caracteres especiales para que nadie pueda meter HTML/JS en un ticket
function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Muestra un mensaje en la esquina que desaparece solo
function mostrarMensaje(texto, esError = false) {
  const caja = document.getElementById('mensaje');
  caja.textContent = texto;
  caja.className = esError ? 'error' : '';
  caja.style.display = 'block';
  setTimeout(() => caja.style.display = 'none', 3000);
}

function formatoFecha(fecha) {
  return new Date(fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

// Busca el nombre de un usuario por su id (para no tener que pedirlo al servidor)
function nombreUsuario(id) {
  const u = usuarios.find(u => u.id === id);
  return u ? u.nombre : null;
}

// ---------- READ ----------
async function cargarTickets() {
  try {
    const respuesta = await fetch(API);

    // Si la sesión ya expiró, regresamos al login
    if (respuesta.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    tickets = await respuesta.json();
    refrescarVista();
  } catch (error) {
    mostrarMensaje('No se pudo conectar con el servidor', true);
  }
}

// Llena el selector "Asignado a" del formulario con los usuarios
async function cargarUsuarios() {
  const respuesta = await fetch('/api/usuarios');
  if (!respuesta.ok) return;
  usuarios = await respuesta.json();

  document.getElementById('asignado').innerHTML =
    '<option value="">Sin asignar</option>' +
    usuarios.map(u => `<option value="${u.id}">${escapar(u.nombre)}${u.id === yo.id ? ' (yo)' : ''}</option>`).join('');
}

function actualizarContadores() {
  document.getElementById('total').textContent = tickets.length;
  for (const estado in ESTADOS) {
    const cantidad = tickets.filter(t => t.estado === estado).length;
    document.getElementById('total-' + estado).textContent = cantidad;
  }
}

// Pinta los tickets aplicando la búsqueda y los filtros
function pintarTickets() {
  const texto = document.getElementById('buscar').value.toLowerCase();
  const estado = document.getElementById('filtro-estado').value;
  const prioridad = document.getElementById('filtro-prioridad').value;
  const asignado = document.getElementById('filtro-asignado').value;

  const filtrados = tickets.filter(t =>
    (t.titulo.toLowerCase().includes(texto) || t.solicitante.toLowerCase().includes(texto)) &&
    (estado === '' || t.estado === estado) &&
    (prioridad === '' || t.prioridad === prioridad) &&
    (asignado === '' ||
      (asignado === 'mios' && t.asignado_a === yo.id) ||
      (asignado === 'sin' && !t.asignado_a))
  );

  const lista = document.getElementById('lista');

  if (filtrados.length === 0) {
    lista.innerHTML = '<div class="vacio">No hay tickets para mostrar 😴</div>';
    return;
  }

  lista.innerHTML = filtrados.map(t => `
    <div class="ticket ${t.estado}">
      <div class="ticket-cabecera">
        <h3><span class="id">#${t.id}</span> ${escapar(t.titulo)}</h3>
        <span class="badge ${t.prioridad}">${t.prioridad}</span>
      </div>
      <p>${escapar(t.descripcion)}</p>
      <div class="info">
        👤 ${escapar(t.solicitante)} &nbsp; ✉️ ${escapar(t.email)} &nbsp;
        📅 ${formatoFecha(t.created_at)}
      </div>

      <div class="asignado ${t.asignado_a ? '' : 'sin-asignar'}">
        🔧 ${t.asignado_a
          ? 'Asignado a: <b>' + escapar(t.asignado_nombre) + '</b>' + (t.asignado_a === yo.id ? ' <span class="tu">Tú</span>' : '')
          : 'Sin asignar'}
      </div>

      ${t.estado === 'cerrado' && t.solucion ? `
        <div class="solucion">
          <b>✅ Solución</b> · por ${escapar(t.resuelto_por_nombre || 'usuario eliminado')} el ${formatoFecha(t.resuelto_at)}
          <p>${escapar(t.solucion)}</p>
        </div>` : ''}

      <div class="acciones">
        <select onchange="cambiarEstado(${t.id}, this.value)">
          ${Object.keys(ESTADOS).map(e =>
            `<option value="${e}" ${e === t.estado ? 'selected' : ''}>${ESTADOS[e]}</option>`
          ).join('')}
        </select>
        ${!t.asignado_a && t.estado !== 'cerrado' ? `<button class="btn-tomar" onclick="tomar(${t.id})">🙋 Tomar</button>` : ''}
        ${t.estado !== 'cerrado' || !t.solucion ? `<button class="btn-resolver" onclick="abrirResolver(${t.id})">✔️ Resolver</button>` : ''}
        <button class="btn-editar" onclick="editar(${t.id})">✏️ Editar / Asignar</button>
        <button class="btn-eliminar" onclick="eliminar(${t.id})">Eliminar</button>
      </div>
    </div>
  `).join('');
}

// ---------- CREATE / UPDATE ----------
document.getElementById('formulario').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('id').value;
  const asignado = document.getElementById('asignado').value;
  const ticket = {
    titulo: document.getElementById('titulo').value.trim(),
    descripcion: document.getElementById('descripcion').value.trim(),
    solicitante: document.getElementById('solicitante').value.trim(),
    email: document.getElementById('email').value.trim(),
    prioridad: document.getElementById('prioridad').value,
    estado: document.getElementById('estado').value,
    asignado_a: asignado ? Number(asignado) : null
  };

  // Si hay id estamos editando (PUT), si no estamos creando (POST)
  const respuesta = await fetch(id ? `${API}/${id}` : API, {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket)
  });
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    // El error se muestra DENTRO de la ventana (el mensaje de la esquina quedaría tapado)
    document.getElementById('error-ticket').textContent = datos.errores ? datos.errores.join(' · ') : datos.mensaje;
    return;
  }

  ticket.asignado_nombre = nombreUsuario(ticket.asignado_a);

  // 🌱 Software verde: en lugar de volver a descargar TODA la lista,
  // actualizamos solo el ticket que cambió en el arreglo que ya tenemos.
  if (id) {
    // Editar: reemplazamos los datos del ticket en el arreglo
    const i = tickets.findIndex(t => t.id === Number(id));
    tickets[i] = { ...tickets[i], ...ticket };
    if (ticket.estado !== 'cerrado') borrarSolucion(tickets[i]); // el servidor también la borra al reabrir
  } else {
    // Crear: el servidor nos regresa el id nuevo; lo agregamos al inicio de la lista
    tickets.unshift({ ...ticket, id: datos.id, estado: 'abierto', created_at: new Date().toISOString() });
  }

  mostrarMensaje(datos.mensaje + ' ✅');
  cerrarFormulario();
  refrescarVista();
});

// Manda el ticket completo con algunos cambios (estado, asignado...) usando PUT
async function guardarCambios(ticket, cambios) {
  const respuesta = await fetch(`${API}/${ticket.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...ticket, ...cambios })
  });

  if (!respuesta.ok) {
    const datos = await respuesta.json();
    mostrarMensaje(datos.errores ? datos.errores.join(' · ') : datos.mensaje, true);
    cargarTickets(); // algo salió mal: volvemos a pedir la lista para quedar igual que el servidor
    return false;
  }

  Object.assign(ticket, cambios); // 🌱 solo cambiamos ese ticket, sin descargar todo
  return true;
}

// Cambia el estado directamente desde la tarjeta
async function cambiarEstado(id, nuevoEstado) {
  // Para cerrar hay que escribir la solución
  if (nuevoEstado === 'cerrado') {
    abrirResolver(id);
    return;
  }

  const ticket = tickets.find(t => t.id === id);
  if (ticket.estado === 'cerrado' && !confirm('Al reabrir el ticket se borra la solución. ¿Continuar?')) {
    pintarTickets(); // regresa el selector a "Cerrado"
    return;
  }

  if (await guardarCambios(ticket, { estado: nuevoEstado })) {
    borrarSolucion(ticket);
    mostrarMensaje('Estado actualizado a: ' + ESTADOS[nuevoEstado]);
    refrescarVista();
  }
}

// El técnico se asigna el ticket a sí mismo y lo pasa a "En progreso"
async function tomar(id) {
  const ticket = tickets.find(t => t.id === id);
  if (await guardarCambios(ticket, { asignado_a: yo.id, asignado_nombre: yo.nombre, estado: 'en_progreso' })) {
    mostrarMensaje('Tomaste el ticket #' + id + ' 🙋');
    refrescarVista();
  }
}

function borrarSolucion(ticket) {
  ticket.solucion = null;
  ticket.resuelto_at = null;
  ticket.resuelto_por_nombre = null;
}

// ---------- VENTANA DE CREAR / EDITAR / ASIGNAR ----------
const dialogoTicket = document.getElementById('dialogo-ticket');

// Abre la ventana vacía para crear un ticket
function abrirNuevo() {
  limpiar();
  dialogoTicket.showModal();
  document.getElementById('titulo').focus();
}

// Cierra la ventana y deja el formulario como nuevo
function cerrarFormulario() {
  dialogoTicket.close();
  limpiar();
}

// ---------- RESOLVER ----------
const dialogo = document.getElementById('dialogo-resolver');

function abrirResolver(id) {
  const t = tickets.find(t => t.id === id);
  document.getElementById('resolver-id').value = id;
  document.getElementById('resolver-titulo').textContent = '#' + t.id + ' · ' + t.titulo;
  document.getElementById('solucion').value = '';
  document.getElementById('error-resolver').textContent = '';
  dialogo.showModal();
}

function cerrarDialogo() {
  dialogo.close();
  pintarTickets(); // por si el selector de estado se quedó en "Cerrado"
}

document.getElementById('form-resolver').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = Number(document.getElementById('resolver-id').value);
  const solucion = document.getElementById('solucion').value.trim();

  const respuesta = await fetch(`${API}/${id}/resolver`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ solucion })
  });
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    document.getElementById('error-resolver').textContent = datos.errores ? datos.errores.join(' · ') : datos.mensaje;
    return;
  }

  // 🌱 actualizamos solo ese ticket
  const ticket = tickets.find(t => t.id === id);
  ticket.estado = 'cerrado';
  ticket.solucion = solucion;
  ticket.resuelto_por_nombre = datos.resuelto_por_nombre;
  ticket.resuelto_at = new Date().toISOString();

  dialogo.close();
  mostrarMensaje('Ticket #' + id + ' resuelto ✅');
  refrescarVista();
});

// Abre la ventana con los datos del ticket para editarlo o asignarlo
function editar(id) {
  const t = tickets.find(t => t.id === id);
  document.getElementById('id').value = t.id;
  document.getElementById('titulo').value = t.titulo;
  document.getElementById('descripcion').value = t.descripcion;
  document.getElementById('solicitante').value = t.solicitante;
  document.getElementById('email').value = t.email;
  document.getElementById('prioridad').value = t.prioridad;
  document.getElementById('estado').value = t.estado;
  document.getElementById('asignado').value = t.asignado_a || '';

  document.getElementById('titulo-form').textContent = '✏️ Editar / asignar ticket #' + t.id;
  document.getElementById('btn-guardar').textContent = 'Guardar cambios';
  document.getElementById('campo-estado').style.display = 'block';
  dialogoTicket.showModal();
}

// ---------- DELETE ----------
async function eliminar(id) {
  if (!confirm('¿Seguro que quieres eliminar el ticket #' + id + '?')) return;

  const respuesta = await fetch(`${API}/${id}`, { method: 'DELETE' });
  const datos = await respuesta.json();
  mostrarMensaje(datos.mensaje, !respuesta.ok);

  if (!respuesta.ok) {
    cargarTickets(); // algo salió mal: volvemos a pedir la lista para quedar igual que el servidor
    return;
  }

  tickets = tickets.filter(t => t.id !== id); // 🌱 quitamos el ticket del arreglo, sin descargar todo
  refrescarVista();
}

// Vuelve a pintar contadores y tarjetas con los datos que ya tenemos (sin llamar al servidor)
function refrescarVista() {
  actualizarContadores();
  pintarTickets();
}

// Deja el formulario como nuevo
function limpiar() {
  document.getElementById('formulario').reset();
  document.getElementById('id').value = '';
  document.getElementById('error-ticket').textContent = '';
  document.getElementById('titulo-form').textContent = '➕ Nuevo ticket';
  document.getElementById('btn-guardar').textContent = 'Crear ticket';
  document.getElementById('campo-estado').style.display = 'none';
}

// Los filtros se aplican al momento, sin volver a llamar al servidor
document.getElementById('buscar').addEventListener('input', pintarTickets);
document.getElementById('filtro-estado').addEventListener('change', pintarTickets);
document.getElementById('filtro-prioridad').addEventListener('change', pintarTickets);
document.getElementById('filtro-asignado').addEventListener('change', pintarTickets);

// ---------- SESIÓN ----------
// Al abrir la página revisamos si hay sesión. Si no, mandamos al login.
async function iniciar() {
  const respuesta = await fetch('/api/me');
  if (!respuesta.ok) {
    window.location.href = 'login.html';
    return;
  }
  yo = await respuesta.json();
  document.getElementById('nombre-usuario').textContent = yo.nombre;
  await cargarUsuarios(); // primero los usuarios, para poder mostrar los nombres
  cargarTickets();
  cargarClima(); // está en clima.js
}

async function cerrarSesion() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = 'login.html';
}

iniciar();
