// JavaScript de la página de login

// Si ya hay una sesión iniciada, pasamos directo a la página principal
fetch('/api/me').then(respuesta => {
  if (respuesta.ok) window.location.href = 'index.html';
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();

  const datos = {
    usuario: document.getElementById('usuario').value.trim(),
    password: document.getElementById('password').value
  };

  const respuesta = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    const caja = document.getElementById('error-login');
    caja.textContent = resultado.mensaje;
    caja.style.display = 'block';
    return;
  }

  // Login correcto: vamos a la página de tickets
  window.location.href = 'index.html';
});
