-- Script para crear la base de datos del sistema de tickets
-- Ejecutarlo en MySQL Workbench (o en la terminal de MySQL)
-- Si ya tenías la base de datos creada de antes, ejecuta mejor actualizar-db.sql

CREATE DATABASE IF NOT EXISTS tickets_db;
USE tickets_db;

-- Usuarios que pueden entrar al sistema (también son los técnicos a los que se asignan tickets)
-- La contraseña se guarda cifrada con bcrypt, nunca en texto normal
-- Se crea primero porque la tabla tickets hace referencia a ella
CREATE TABLE IF NOT EXISTS usuarios (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  nombre   VARCHAR(100) NOT NULL,
  usuario  VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  titulo       VARCHAR(150) NOT NULL,
  descripcion  TEXT NOT NULL,
  solicitante  VARCHAR(100) NOT NULL,
  email        VARCHAR(150) NOT NULL,
  prioridad    ENUM('baja', 'media', 'alta') DEFAULT 'media',
  estado       ENUM('abierto', 'en_progreso', 'cerrado') DEFAULT 'abierto',
  asignado_a   INT NULL,       -- técnico que atiende el ticket (id de usuarios)
  solucion     TEXT NULL,      -- lo que hizo el técnico para resolverlo
  resuelto_por INT NULL,       -- quién lo resolvió (id de usuarios)
  resuelto_at  DATETIME NULL,  -- cuándo se resolvió
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Llaves foráneas: si se borra el usuario, el ticket se queda "sin asignar" (NULL)
  FOREIGN KEY (asignado_a) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (resuelto_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Usuarios de prueba
--   usuario: admin    contraseña: admin123
--   usuario: tecnico  contraseña: tecnico123
INSERT IGNORE INTO usuarios (nombre, usuario, password) VALUES
('Administrador', 'admin', '$2b$10$ud8DXBqgifxFcMl9MF00FuNE95x9HH8feuWPo4P14Ni7PkJyHaycS'),
('Luis Técnico', 'tecnico', '$2b$10$zrXw0lvtRPBjmNn7u5VqNOokftXKWPFmFaR5XwHIJAiplhI8jjxoO');

-- Tickets de prueba
INSERT INTO tickets (titulo, descripcion, solicitante, email, prioridad, estado) VALUES
('No enciende mi equipo', 'La computadora no prende desde esta mañana.', 'Ana López', 'ana@empresa.com', 'alta', 'abierto'),
('Acceso a carpeta compartida', 'Necesito permisos para la carpeta de Finanzas.', 'Carlos Pérez', 'carlos@empresa.com', 'media', 'en_progreso'),
('Cambio de mouse', 'El mouse hace doble clic solo.', 'María Ruiz', 'maria@empresa.com', 'baja', 'abierto');
