// src/services/turnoLookup.js
import { catalogApi, authApi } from "./api";

/** ---------- helpers de red ---------- */

async function fetchMateria(id) {
  if (!id) return null;
  try {
    const { data } = await catalogApi.get(`/materias/${id}`);
    if (!data) return null;
    return {
      id: Number(data.id),
      nombre: String(data.nombre ?? ""),
      clave: String(data.clave ?? ""),
    };
  } catch {
    return null;
  }
}

async function fetchUserNameByUserId(userId) {
  if (!userId) return null;
  try {
    // Debe existir endpoint GET /users/{id} autenticado (NO /admin/)
    const { data } = await authApi.get(`/users/${userId}`);
    const nombre = data?.nombre ?? null;
    return nombre ? String(nombre) : null;
  } catch {
    return null;
  }
}

async function fetchDocente(id) {
  if (!id) return null;
  try {
    const { data } = await catalogApi.get(`/docentes/${id}`);
    if (!data) return null;

    const userId = data.userId ?? data.user?.id ?? null;
    const nombreEmbebido =
      (data.user && (data.user.nombre || data.user.fullName)) ||
      data.nombre ||
      null;

    let nombre = nombreEmbebido;
    if (!nombre && userId) {
      // Fallback: leer nombre desde auth_service
      nombre = await fetchUserNameByUserId(userId);
    }

    return {
      id: Number(data.id),
      userId,
      nombre: nombre || null,
      noEmpleado: data.noEmpleado ?? data.noTrabajador ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchAlumno(id) {
  if (!id) return null;
  try {
    const { data } = await catalogApi.get(`/alumnos/${id}`);
    if (!data) return null;

    const userId = data.userId ?? data.user?.id ?? null;
    const nombreEmbebido =
      (data.user && (data.user.nombre || data.user.fullName)) ||
      data.nombre ||
      null;

    let nombre = nombreEmbebido;
    if (!nombre && userId) {
      // Fallback: leer nombre desde auth_service
      nombre = await fetchUserNameByUserId(userId);
    }

    return {
      id: Number(data.id),
      userId,
      nombre: nombre || null,
      noControl: data.no_control ?? data.noControl ?? null,
    };
  } catch {
    return null;
  }
}

/** ---------- hidratadores públicos ---------- */

export async function hydrateTurnosForAlumno(turnos) {
  const list = Array.isArray(turnos) ? turnos : [];
  const materiaIds = [...new Set(list.map(t => Number(t.materiaId)).filter(Boolean))];
  const docenteIds = [...new Set(list.map(t => Number(t.docenteId)).filter(Boolean))];

  const materiaMap = new Map();
  const docenteMap = new Map();

  await Promise.all([
    Promise.all(materiaIds.map(async (id) => {
      if (!materiaMap.has(id)) materiaMap.set(id, await fetchMateria(id));
    })),
    Promise.all(docenteIds.map(async (id) => {
      if (!docenteMap.has(id)) docenteMap.set(id, await fetchDocente(id));
    })),
  ]);

  return list.map(t => {
    const m = materiaMap.get(Number(t.materiaId));
    const d = docenteMap.get(Number(t.docenteId));
    return {
      ...t,
      materiaNombre: m?.nombre || `Materia #${t.materiaId}`,
      docenteNombre: d?.nombre || d?.noEmpleado || `Docente #${t.docenteId}`,
    };
  });
}

export async function hydrateTurnosForDocente(turnos) {
  const list = Array.isArray(turnos) ? turnos : [];
  const materiaIds = [...new Set(list.map(t => Number(t.materiaId)).filter(Boolean))];
  const alumnoIds  = [...new Set(list.map(t => Number(t.alumnoId)).filter(Boolean))];

  const materiaMap = new Map();
  const alumnoMap  = new Map();

  await Promise.all([
    Promise.all(materiaIds.map(async (id) => {
      if (!materiaMap.has(id)) materiaMap.set(id, await fetchMateria(id));
    })),
    Promise.all(alumnoIds.map(async (id) => {
      if (!alumnoMap.has(id)) alumnoMap.set(id, await fetchAlumno(id));
    })),
  ]);

  return list.map(t => {
    const m = materiaMap.get(Number(t.materiaId));
    const a = alumnoMap.get(Number(t.alumnoId));
    return {
      ...t,
      materiaNombre: m?.nombre || `Materia #${t.materiaId}`,
      alumnoNombre: a?.nombre || `Alumno #${t.alumnoId}`,
    };
  });
}

/** Mensaje compacto de error */
export function pickErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data ||
    err?.message ||
    "Ocurrió un error"
  );
}
