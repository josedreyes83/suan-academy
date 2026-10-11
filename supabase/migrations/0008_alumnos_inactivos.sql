-- SUAN Academy · Estado 'inactivo' para alumnos que se retiran (conservan historial; no pueden reservar)
alter type estado_registro add value if not exists 'inactivo';
