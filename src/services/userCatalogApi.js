// src/services/userCatalogApi.js
import { authApi, catalogApi } from "./api";

/* ============ AUTH-SERVICE (usuarios) ============ */
// payload: { email, nombre, password, roles: ["ALUMNO"|"DOCENTE"|"ADMIN"], activo? }
export const createAuthUser = (payload) => authApi.post("/admin/users", payload);
export const updateAuthUser = (id, patch) => authApi.put(`/admin/users/${id}`, patch);
export const deleteAuthUser = (id) => authApi.delete(`/admin/users/${id}`);
export const listAuthUsers  = () => authApi.get("/admin/users");

// (Opcionales: si expusiste estos endpoints en auth-service)
export const listAuthUsersByRole = (role) =>
  authApi.get("/admin/users/by-role", { params: { role } });

export const getAuthUserByEmail = (email) =>
  authApi.get("/admin/users/by-email", { params: { email } });

/* ============ CATALOG-SERVICE (perfiles) ============ */
// Listados
export const listAdministradores = () => catalogApi.get("/administradores");
export const listDocentes        = () => catalogApi.get("/docentes");
export const listAlumnos         = () => catalogApi.get("/alumnos");

// Crear perfiles (enlazan por userId)
export const createAdministrador = (payload) => catalogApi.post("/administradores", payload); // { userId, noTrabajador, activo }
export const createDocente       = (payload) => catalogApi.post("/docentes", payload);        // { userId, noEmpleado, divisionId, activo }
export const createAlumno        = (payload) => catalogApi.post("/alumnos", payload);         // { userId, noControl, activo }

// Actualizar perfiles
export const updateAdministrador = (id, patch) => catalogApi.put(`/administradores/${id}`, patch);
export const updateDocente       = (id, patch) => catalogApi.put(`/docentes/${id}`, patch);
export const updateAlumno        = (id, patch) => catalogApi.put(`/alumnos/${id}`, patch);

// Eliminar perfiles (pasando userId para que el backend borre también en auth-service)
export const deleteAdministrador = (id, userId) =>
  catalogApi.delete(`/administradores/${id}`, { params: userId ? { userId } : undefined });

export const deleteDocente = (id, userId) =>
  catalogApi.delete(`/docentes/${id}`, { params: userId ? { userId } : undefined });

export const deleteAlumno = (id, userId) =>
  catalogApi.delete(`/alumnos/${id}`, { params: userId ? { userId } : undefined });

/* ============ Apoyos usados por las vistas ============ */
export const listDivisiones = () => catalogApi.get("/divisiones");

export const getMateriasPorDivision = (divisionId) =>
  catalogApi.get("/materias", { params: divisionId ? { divisionId } : undefined });

// Alumno ↔ Materias (para AsignarMaterias.jsx)
export const getMateriasDeAlumno = (alumnoId) =>
  catalogApi.get(`/alumnos/${alumnoId}/materias`);

export const inscribirAlumnoEnMateria = (alumnoId, materiaId) =>
  catalogApi.post(`/alumnos/${alumnoId}/inscribir/${materiaId}`);

export const desinscribirAlumnoDeMateria = (alumnoId, materiaId) =>
  catalogApi.delete(`/alumnos/${alumnoId}/desinscribir/${materiaId}`);
