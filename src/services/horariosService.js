// src/services/horariosService.js
import { turnosApi } from "./api";

// Lista por docente
export const listHorarios = (docenteId) =>
  turnosApi.get("/horarios", { params: { docenteId } });

// Crear
export const createHorario = (payload) =>
  // payload: { docenteId, diaSemana:1..7, horaIni:"HH:mm", horaFin:"HH:mm", activo:true }
  turnosApi.post("/horarios", payload);

// Update
export const updateHorario = (id, payload) =>
  turnosApi.put(`/horarios/${id}`, payload);

// Delete
export const deleteHorario = (id) =>
  turnosApi.delete(`/horarios/${id}`);

// Reemplazar todo (opcional)
export const replaceHorarios = (docenteId, rows) =>
  turnosApi.post(`/horarios/replace`, rows, { params: { docenteId } });
