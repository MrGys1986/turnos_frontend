import { turnosApi } from "./api";

// 🔁 Nuevo: listado completo del docente (todos los estados)
export const listTurnosDocente = (docenteId) =>
  turnosApi.get(`/turnos`, { params: { docenteId } });

// ⛳ Compat (tu dashboard actual lo importa con este nombre)
export const listTurnosDocenteActivos = (docenteId) => listTurnosDocente(docenteId);

// Monitor (para alumno) — ahora ya trae TODOS los estados
export const listTurnosMonitor = () =>
  turnosApi.get(`/monitor/turnos`);

// Alumno solicita
export const solicitarTurno = (payload) =>
  turnosApi.post(`/turnos`, payload);

// Docente acepta — ahora con programación y observaciones
export const aceptarTurno = (id, acceptForm) =>
  turnosApi.post(`/turnos/${id}/aceptar`, acceptForm);

// Iniciar / Finalizar (docente)
export const iniciarTurno = (id) =>
  turnosApi.post(`/turnos/${id}/iniciar`);

export const finalizarTurno = (id) =>
  turnosApi.post(`/turnos/${id}/finalizar`);

// Cancelar con motivo (docente o alumno)
export const cancelarTurno = (id, observaciones) =>
  turnosApi.post(`/turnos/${id}/cancelar`, { observaciones });

export const listTurnos = (params) => turnosApi.get("/turnos", { params });
