import { test } from "node:test";
import assert from "node:assert/strict";
import { claveDesdeDocumento, correoValido, edadDesde, validarRegistro, validarActivacion, type SolicitudRegistro } from "../src/domain/registro.ts";
import { sumarMinutos, filasPlantilla, validarClasePlantilla, resumenCreacion } from "../src/domain/horarios.ts";
import { inicioPorRol } from "../src/domain/auth.ts";

const solicitud: SolicitudRegistro = {
  codigoLink: "general", nombres: "Ana", apellidos: "Pérez", fechaNacimiento: "2000-05-10",
  tipoDocumento: "CC", numeroDocumento: "1234567", celular: "3001234567", correo: "ana@correo.com",
  parq: { q1: false, q2: false, q3: false, q4: false, q5: false, q6: false, q7: false }, parqObservaciones: "",
  acudiente: null, aceptaDatos: true,
};

test("clave desde documento: mínimo 6 caracteres", () => {
  assert.equal(claveDesdeDocumento("1234567"), "1234567");
  assert.equal(claveDesdeDocumento("123"), "000123");
  assert.equal(claveDesdeDocumento("12 34"), "001234");
});

test("correo válido", () => {
  assert.ok(correoValido("ana@correo.com"));
  assert.ok(!correoValido("ana@correo"));
  assert.ok(!correoValido(""));
});

test("edad", () => {
  assert.equal(edadDesde("2010-10-11", new Date("2026-10-11T12:00:00")), 16);
  assert.equal(edadDesde("2010-10-12", new Date("2026-10-11T12:00:00")), 15);
  assert.equal(edadDesde("no-fecha"), null);
});

test("registro: correo obligatorio y acudiente para menores", () => {
  assert.equal(validarRegistro(solicitud), null);
  assert.match(validarRegistro({ ...solicitud, correo: "" }) ?? "", /correo/);
  const menor = { ...solicitud, fechaNacimiento: new Date(Date.now() - 12 * 365.25 * 864e5).toISOString().slice(0, 10) };
  assert.match(validarRegistro(menor) ?? "", /acudiente/);
  assert.equal(validarRegistro({ ...menor, acudiente: { nombres: "M", apellidos: "P", tipo_documento: "CC", numero_documento: "1", celular: "3001234567", correo: "", parentesco: "Madre" } }), null);
});

test("activación: nivel y tipo obligatorios", () => {
  assert.match(validarActivacion({ alumnoId: "x", nivelId: 0, tipoAlumnoId: 1 }) ?? "", /nivel/);
  assert.match(validarActivacion({ alumnoId: "x", nivelId: 1, tipoAlumnoId: 0 }) ?? "", /tipo/);
  assert.equal(validarActivacion({ alumnoId: "x", nivelId: 1, tipoAlumnoId: 1 }), null);
});

test("horarios: una fila por día en orden Lun→Dom", () => {
  assert.equal(sumarMinutos("07:30", 90), "09:00");
  const clase = { canchaId: 1, dias: [0, 3, 1], horaInicio: "07:00", duracionMin: 60, nivelId: 1, tipo: "grupal" as const, entrenadorId: "e", cupo: 4 };
  assert.equal(validarClasePlantilla(clase), null);
  assert.deepEqual(filasPlantilla(clase).map((f) => f.dia_semana), [1, 3, 0]);
  assert.equal(filasPlantilla(clase)[0].hora_fin, "08:00");
  assert.match(validarClasePlantilla({ ...clase, dias: [] }) ?? "", /al menos un día/);
  assert.match(validarClasePlantilla({ ...clase, duracionMin: 10 }) ?? "", /duración/);
});

test("horarios: resumen de creación", () => {
  assert.equal(resumenCreacion("07:00", [1, 3], []).ok, true);
  assert.match(resumenCreacion("07:00", [1, 3], []).mensaje, /2 clases agregadas .*Lun, Mié/);
  assert.equal(resumenCreacion("07:00", [], [{ dia: 2, motivo: "cruce" }]).ok, false);
});

test("inicio por rol", () => {
  assert.equal(inicioPorRol(["alumno"]), "/alumno");
  assert.equal(inicioPorRol(["administrador", "alumno"]), "/admin");
  assert.equal(inicioPorRol([]), "/sin-rol");
});
