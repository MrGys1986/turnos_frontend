import { catalogApi } from "./api";

/**
 * Devuelve { alumnoId, docenteId, adminId } para el userId dado.
 * Estrategia:
 *  1) /profiles/ids?userId=...    (ideal)
 *  2) /{alumnos|docentes|administradores}?userId=... (si el backend lo soporta)
 *  3) /{alumnos|docentes|administradores} y filtrar en cliente (ignora 403)
 */
export async function getPerfilIdsByUserId(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) {
    return { alumnoId: null, docenteId: null, adminId: null };
  }

  // 1) Endpoint consolidado (mejor)
  try {
    const { data } = await catalogApi.get("/profiles/ids", { params: { userId: uid } });
    const alumnoId = data?.alumnoId ?? null;
    const docenteId = data?.docenteId ?? null;
    const adminId  = data?.adminId  ?? null;
    if (alumnoId || docenteId || adminId) return { alumnoId, docenteId, adminId };
  } catch {
    // continuamos con plan B
  }

  // 2) Filtro por query param (si tu backend lo soporta)
  try {
    const [aRes, dRes, adRes] = await Promise.allSettled([
      catalogApi.get("/alumnos",         { params: { userId: uid } }),
      catalogApi.get("/docentes",        { params: { userId: uid } }),
      catalogApi.get("/administradores", { params: { userId: uid } }),
    ]);

    const pickOne = (res) =>
      res.status === "fulfilled"
        ? (Array.isArray(res.value?.data) ? res.value.data[0] : res.value?.data)
        : null;

    const alumno = pickOne(aRes);
    const docente = pickOne(dRes);
    const admin  = pickOne(adRes);

    if (alumno || docente || admin) {
      return {
        alumnoId: alumno?.id ?? null,
        docenteId: docente?.id ?? null,
        adminId:  admin?.id  ?? null,
      };
    }
  } catch {
    // seguimos al plan C
  }

  // 3) Último recurso: traer todo y filtrar (ignora 403)
  try {
    const [alumnosRes, docentesRes, adminsRes] = await Promise.allSettled([
      catalogApi.get("/alumnos"),
      catalogApi.get("/docentes"),
      catalogApi.get("/administradores"),
    ]);

    const safe = (r) => (r.status === "fulfilled" ? (r.value?.data ?? []) : []);

    const alumnos = safe(alumnosRes);
    const docentes = safe(docentesRes);
    const admins  = safe(adminsRes);

    const alumno = alumnos.find((a) => Number(a?.userId) === uid);
    const docente = docentes.find((d) => Number(d?.userId) === uid);
    const admin  = admins.find((x) => Number(x?.userId) === uid);

    return {
      alumnoId: alumno?.id ?? null,
      docenteId: docente?.id ?? null,
      adminId:  admin?.id  ?? null,
    };
  } catch {
    return { alumnoId: null, docenteId: null, adminId: null };
  }
}

/**
 * Materias del alumno (normalizadas para selects)
 * Acepta:
 *  - AlumnoMateriaDTO: [{ id, materia:{ id, clave, nombre, division } }]
 *  - Materia directa: [{ id, clave, nombre, division }]
 * Devuelve: [{ id: materiaId, clave, nombre, divisionId|null, division?:obj }]
 */
export async function getMateriasDeAlumno(alumnoId) {
  try {
    const { data } = await catalogApi.get(`/alumnos/${alumnoId}/materias`);
    const list = Array.isArray(data) ? data : [];

    return list
      .map((row) => {
        const m = row?.materia ? row.materia : row;
        const division = m?.division ?? null;
        return {
          id: Number(m?.id),
          clave: String(m?.clave ?? ""),
          nombre: String(m?.nombre ?? ""),
          divisionId: division?.id ?? null,
          division, // lo dejamos por si el frontend lo quiere usar
        };
      })
      .filter((x) => Number.isFinite(x.id));
  } catch {
    return [];
  }
}

/**
 * Docentes para una materia.
 * 1) Intenta /materias/{id}/docentes (ideal para evitar 403).
 * 2) Fallback: obtiene divisionId (desde opciones, cache de materias,
 *    /alumnos/{alumnoId}/materias, o /materias) y filtra docentes por división.
 *
 * Opcionalmente puedes pasar:
 *   opts = {
 *     materiasCache: [{ id, divisionId, division? }], // lista ya cargada en UI
 *     alumnoId: number,                                // para leer /alumnos/{id}/materias
 *     divisionId: number                               // si ya lo conoces
 *   }
 */
export async function getDocentesParaMateria(materiaId, opts = {}) {
  const mid = Number(materiaId);
  if (!Number.isFinite(mid)) return [];

  const normalizeDocente = (d) => ({
    id: Number(d?.id),
    noEmpleado: String(d?.noEmpleado ?? d?.noTrabajador ?? ""),
    divisionId: d?.division?.id ?? d?.divisionId ?? null,
    division: d?.division ?? (d?.divisionId ? { id: d.divisionId } : null),
  });

  // 1) Intento directo (debería estar abierto a ALUMNO)
  try {
    const { data } = await catalogApi.get(`/materias/${mid}/docentes`);
    return Array.isArray(data) ? data.map(normalizeDocente) : [];
  } catch (e) {
    const st = e?.response?.status;
    // 404 => no existe endpoint; 405 => método no mapeado; 403 => denegado
    if (![403, 404, 405].includes(st)) {
      // otro error inesperado; mejor no ocultarlo
      throw e;
    }
    // seguimos a fallback
  }

  // 2) Fallback: conseguir divisionId por varios caminos
  let divisionId = Number.isFinite(opts.divisionId) ? Number(opts.divisionId) : null;

  // 2a) materiasCache del frontend
  if (!divisionId && Array.isArray(opts.materiasCache) && opts.materiasCache.length) {
    const mm = opts.materiasCache.find((m) => Number(m?.id) === mid);
    divisionId = mm?.division?.id ?? mm?.divisionId ?? null;
  }

  // 2b) desde /alumnos/{alumnoId}/materias (si nos pasaron alumnoId)
  if (!divisionId && Number.isFinite(opts.alumnoId)) {
    try {
      const { data } = await catalogApi.get(`/alumnos/${opts.alumnoId}/materias`);
      const list = Array.isArray(data) ? data : [];
      const mm = list
        .map((row) => (row?.materia ? row.materia : row))
        .find((m) => Number(m?.id) === mid);
      divisionId = mm?.division?.id ?? null;
    } catch {
      // seguimos
    }
  }

  // 2c) desde /materias (si existe list)
  if (!divisionId) {
    try {
      const { data } = await catalogApi.get(`/materias`);
      const all = Array.isArray(data) ? data : [];
      const mm = all.find((m) => Number(m?.id) === mid);
      divisionId = mm?.division?.id ?? null;
    } catch {
      // seguimos
    }
  }

  // Si no logramos conocer divisionId, ya no podemos filtrar docentes.
  if (!divisionId) return [];

  // 3) Intentar traer docentes por división con varias rutas
  // 3a) /docentes?divisionId=...
  try {
    const { data } = await catalogApi.get(`/docentes`, { params: { divisionId } });
    return Array.isArray(data) ? data.map(normalizeDocente) : [];
  } catch (e) {
    const st = e?.response?.status;
    if (st && st !== 404 && st !== 403) throw e;
  }

  // 3b) /docentes/by-division/{divisionId} (si la tienes)
  try {
    const { data } = await catalogApi.get(`/docentes/by-division/${divisionId}`);
    return Array.isArray(data) ? data.map(normalizeDocente) : [];
  } catch {
    // último intento fallido
  }

  return [];
}
