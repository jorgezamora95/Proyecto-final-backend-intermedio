-- Datos de ejemplo para que la página de Gráficas tenga algo que mostrar en la presentación.
-- Todos los tickets de prueba usan correos @demo.com para poder borrarlos fácil (ver abajo).
-- Las fechas son relativas a HOY (NOW() - INTERVAL ...), así siempre caen en los últimos 14 días.

USE tickets_db;

-- Dos técnicos más (contraseña de los dos: tecnico123)
INSERT IGNORE INTO usuarios (nombre, usuario, password) VALUES
('Ana Soporte', 'ana.soporte', '$2b$10$zrXw0lvtRPBjmNn7u5VqNOokftXKWPFmFaR5XwHIJAiplhI8jjxoO'),
('Pedro Redes', 'pedro.redes', '$2b$10$zrXw0lvtRPBjmNn7u5VqNOokftXKWPFmFaR5XwHIJAiplhI8jjxoO');

SET @luis  = (SELECT id FROM usuarios WHERE usuario = 'tecnico');
SET @ana   = (SELECT id FROM usuarios WHERE usuario = 'ana.soporte');
SET @pedro = (SELECT id FROM usuarios WHERE usuario = 'pedro.redes');

INSERT INTO tickets (titulo, descripcion, solicitante, email, prioridad, estado, asignado_a, solucion, resuelto_por, created_at, resuelto_at) VALUES
('No hay internet en recepción', 'Ningún equipo de recepción tiene internet.', 'Sofía Martínez', 'sofia@demo.com', 'alta', 'cerrado', @pedro, 'Se reinició el switch del rack 2.', @pedro, NOW() - INTERVAL 13 DAY, NOW() - INTERVAL 13 DAY + INTERVAL 2 HOUR),
('Olvidé mi contraseña del correo', 'No puedo entrar a Outlook.', 'Jorge Ramírez', 'jorge@demo.com', 'media', 'cerrado', @ana, 'Se restableció la contraseña y se activó la verificación en dos pasos.', @ana, NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 12 DAY + INTERVAL 1 HOUR),
('Impresora de Contabilidad no imprime', 'Marca error de papel atascado.', 'Lucía Herrera', 'lucia@demo.com', 'media', 'cerrado', @luis, 'Se retiró una hoja atascada en la bandeja 2.', @luis, NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 11 DAY),
('Instalar Office en equipo nuevo', 'Equipo nuevo de la practicante sin Office.', 'Marta Díaz', 'marta@demo.com', 'baja', 'cerrado', @ana, 'Se instaló Office y se activó la licencia.', @ana, NOW() - INTERVAL 11 DAY, NOW() - INTERVAL 10 DAY),
('El Wi-Fi de la sala de juntas se cae', 'Se desconecta cada 10 minutos.', 'Raúl Torres', 'raul@demo.com', 'alta', 'cerrado', @pedro, 'Se cambió el canal del access point para evitar interferencia.', @pedro, NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY + INTERVAL 5 HOUR),
('Pantalla parpadea', 'El monitor parpadea al encender.', 'Elena Cruz', 'elena@demo.com', 'baja', 'cerrado', @luis, 'Se cambió el cable HDMI.', @luis, NOW() - INTERVAL 9 DAY, NOW() - INTERVAL 8 DAY),
('Acceso a carpeta de Ventas', 'Necesito permisos de lectura.', 'Diego Flores', 'diego@demo.com', 'media', 'cerrado', @ana, 'Se agregó el usuario al grupo Ventas-Lectura.', @ana, NOW() - INTERVAL 8 DAY, NOW() - INTERVAL 8 DAY + INTERVAL 3 HOUR),
('Teléfono IP sin tono', 'La extensión 214 no tiene tono.', 'Paola Reyes', 'paola@demo.com', 'media', 'cerrado', @pedro, 'Se reconfiguró la extensión en el conmutador.', @pedro, NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 7 DAY + INTERVAL 4 HOUR),
('Laptop muy lenta', 'Tarda 10 minutos en encender.', 'Andrés Vega', 'andres@demo.com', 'media', 'cerrado', @luis, 'Se cambió el disco duro por un SSD.', @luis, NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 4 DAY),
('Correo con virus', 'Me llegó un correo sospechoso y lo abrí.', 'Carmen Ortiz', 'carmen@demo.com', 'alta', 'cerrado', @ana, 'Se analizó el equipo con el antivirus y se cambió la contraseña.', @ana, NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 5 DAY + INTERVAL 2 HOUR),
('No funciona la VPN', 'No puedo conectarme desde casa.', 'Héctor Silva', 'hector@demo.com', 'alta', 'en_progreso', @pedro, NULL, NULL, NOW() - INTERVAL 4 DAY, NULL),
('Mouse inalámbrico no responde', 'Ya le cambié las pilas.', 'Valeria Mora', 'valeria@demo.com', 'baja', 'cerrado', @luis, 'Se volvió a emparejar el receptor USB.', @luis, NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 4 DAY + INTERVAL 1 HOUR),
('Actualizar Windows', 'Me pide reiniciar a cada rato.', 'Iván Castro', 'ivan@demo.com', 'baja', 'en_progreso', @ana, NULL, NULL, NOW() - INTERVAL 3 DAY, NULL),
('Proyector de la sala 3 sin imagen', 'No detecta la laptop.', 'Natalia Ríos', 'natalia@demo.com', 'media', 'abierto', NULL, NULL, NULL, NOW() - INTERVAL 3 DAY, NULL),
('Alta de usuario nuevo', 'Ingresa un nuevo empleado el lunes.', 'Recursos Humanos', 'rh@demo.com', 'media', 'en_progreso', @ana, NULL, NULL, NOW() - INTERVAL 2 DAY, NULL),
('Sin acceso al sistema de nómina', 'Dice usuario bloqueado.', 'Gabriel Núñez', 'gabriel@demo.com', 'alta', 'abierto', @luis, NULL, NULL, NOW() - INTERVAL 2 DAY, NULL),
('Cable de red dañado', 'El cable del escritorio 12 está roto.', 'Fernanda Luna', 'fernanda@demo.com', 'baja', 'abierto', @pedro, NULL, NULL, NOW() - INTERVAL 1 DAY, NULL),
('Teclado con teclas pegadas', 'Se derramó café.', 'Ricardo Peña', 'ricardo@demo.com', 'baja', 'abierto', NULL, NULL, NULL, NOW() - INTERVAL 1 DAY, NULL),
('Servidor de archivos lento', 'Abrir archivos tarda mucho.', 'Daniela Soto', 'daniela@demo.com', 'alta', 'en_progreso', @pedro, NULL, NULL, NOW() - INTERVAL 5 HOUR, NULL),
('Instalar impresora en laptop', 'No aparece la impresora del piso.', 'Tomás Aguilar', 'tomas@demo.com', 'media', 'abierto', NULL, NULL, NULL, NOW() - INTERVAL 2 HOUR, NULL);

-- Para BORRAR los datos de ejemplo:
-- DELETE FROM tickets WHERE email LIKE '%@demo.com';
-- DELETE FROM usuarios WHERE usuario IN ('ana.soporte', 'pedro.redes');
