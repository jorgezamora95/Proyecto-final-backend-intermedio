-- Actualización para una base de datos que ya existía (antes de "Asignado a" y "Solución")
-- Ejecutar UNA sola vez en MySQL Workbench

USE tickets_db;

-- Nuevas columnas en tickets
ALTER TABLE tickets
  ADD COLUMN asignado_a   INT NULL,
  ADD COLUMN solucion     TEXT NULL,
  ADD COLUMN resuelto_por INT NULL,
  ADD COLUMN resuelto_at  DATETIME NULL,
  ADD CONSTRAINT fk_tickets_asignado FOREIGN KEY (asignado_a) REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_tickets_resuelto FOREIGN KEY (resuelto_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Usuario técnico de prueba -> usuario: tecnico  contraseña: tecnico123
INSERT IGNORE INTO usuarios (nombre, usuario, password) VALUES
('Luis Técnico', 'tecnico', '$2b$10$zrXw0lvtRPBjmNn7u5VqNOokftXKWPFmFaR5XwHIJAiplhI8jjxoO');
