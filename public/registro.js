// JavaScript de la página de registro

function mostrarError(texto) {
  const caja = document.getElementById('error-login');
  caja.textContent = texto;
  caja.style.display = 'block';
}

document.getElementById('form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();

  const datos = {
    nombre: document.getElementById('nombre').value.trim(),
    usuario: document.getElementById('usuario').value.trim(),
    password: document.getElementById('password').value
  };
  const confirmar = document.getElementById('confirmar').value;

  // Esta validación solo se hace en el navegador, el servidor no necesita la confirmación
  if (datos.password !== confirmar) {
    mostrarError('Las contraseñas no coinciden');
    return;
  }

  const respuesta = await fetch('/api/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    mostrarError(resultado.errores ? resultado.errores.join(' · ') : resultado.mensaje);
    return;
  }

  // Registro correcto: el servidor ya inició la sesión, vamos a los tickets
  window.location.href = 'index.html';
});
