// src/pages/Admin/AsignarMaterias.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { catalogApi } from "../../services/api";
import { listAlumnos, listAuthUsers } from "../../services/userCatalogApi"; // AuthDB + Catálogo
import { useAuth } from "../../context/AuthContext";

export default function AsignarMaterias() {
  // Auth (para reintentos cuando cambie el token)
  const { accessToken } = useAuth();

  // Mensajes/carga
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Alumno (search + selección)
  const [q, setQ] = useState("");
  const [alumnos, setAlumnos] = useState([]); // [{catalogId,userId,nombre,matricula,email}]
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [alumnoSel, setAlumnoSel] = useState(null); // {catalogId,userId,nombre,matricula}

  // Divisiones / Materias
  const [divisiones, setDivisiones] = useState([]);
  const [divisionSel, setDivisionSel] = useState("");
  const [materiasDiv, setMateriasDiv] = useState([]);
  const [loadingMateriasDiv, setLoadingMateriasDiv] = useState(false);

  // Asignadas del alumno
  const [asignadas, setAsignadas] = useState([]);
  const [loadingAsignadas, setLoadingAsignadas] = useState(false);

  // Selección con checkboxes
  const [materiasSel, setMateriasSel] = useState([]); // array de IDs string
  const selectAllRef = useRef(null);
  const debounceRef = useRef(null);

  const resetMsgs = () => { setErr(""); setOk(""); };

  // Cargar divisiones (solo si hay token)
  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const { data } = await catalogApi.get("/divisiones");
        setDivisiones(data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Error al cargar divisiones");
      }
    })();
  }, [accessToken]);

  // Buscar alumnos combinando dos MS
  const buscarAlumnos = async (term) => {
    if (!accessToken) { setErr("No hay sesión activa. Vuelve a iniciar sesión."); return; }
    if (!term || term.trim().length < 2) { setAlumnos([]); return; }
    setLoadingAlumnos(true);
    try {
      const [catRes, authRes] = await Promise.all([listAlumnos(), listAuthUsers()]);
      const usersById = Object.fromEntries((authRes.data || []).map(u => [u.id, u]));
      const rows = (catRes.data || []).map(c => {
        const u = usersById[c.userId] || {};
        return {
          catalogId: c.id,
          userId: c.userId,
          nombre: u.nombre || "",
          email: u.email || "",
          matricula: c.noControl || "",
        };
      });
      const s = term.trim().toLowerCase();
      setAlumnos(rows.filter(r =>
        (r.nombre || "").toLowerCase().includes(s) ||
        (r.matricula || "").toLowerCase().includes(s) ||
        (r.email || "").toLowerCase().includes(s)
      ));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Error al buscar alumnos");
    } finally {
      setLoadingAlumnos(false);
    }
  };

  const onChangeBuscar = (v) => {
    resetMsgs();
    setQ(v);
    setAlumnoSel(null);
    setAsignadas([]);
    setMateriasSel([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarAlumnos(v), 350);
  };

  const seleccionarAlumno = (a) => {
    resetMsgs();
    setAlumnoSel(a);
    setMateriasSel([]);
    cargarAsignadas(a.catalogId);
  };

  // NUEVO: usa GET /alumnos/{alumnoId}/materias
  const cargarAsignadas = async (alumnoCatalogId) => {
    if (!accessToken) { setErr("No hay sesión activa. Vuelve a iniciar sesión."); return; }
    if (!alumnoCatalogId) return;
    setLoadingAsignadas(true);
    try {
      const { data } = await catalogApi.get(`/alumnos/${alumnoCatalogId}/materias`);
      // data: List<AlumnoMateria> con { id, alumno, materia }
      setAsignadas(data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Error al cargar materias asignadas");
    } finally {
      setLoadingAsignadas(false);
    }
  };

  // Cambiar división -> materias
  const onChangeDivision = async (divisionId) => {
    resetMsgs();
    setDivisionSel(divisionId);
    setMateriasDiv([]);
    setMateriasSel([]);
    if (!accessToken) { setErr("No hay sesión activa. Vuelve a iniciar sesión."); return; }
    if (!divisionId) return;
    setLoadingMateriasDiv(true);
    try {
      const { data } = await catalogApi.get(`/materias`, { params: { divisionId } });
      setMateriasDiv(data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Error al cargar materias de la división");
    } finally {
      setLoadingMateriasDiv(false);
    }
  };

  // Disponibles = materias de la división que NO estén ya asignadas
  const materiasDisponibles = useMemo(() => {
    const ya = new Set((asignadas || []).map(am => String(am?.materia?.id)));
    return (materiasDiv || []).filter(m => !ya.has(String(m.id)));
  }, [materiasDiv, asignadas]);

  // Checkboxes
  const toggleMateria = (id) => {
    const s = String(id);
    setMateriasSel(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };
  const allSelected = materiasDisponibles.length > 0 && materiasSel.length === materiasDisponibles.length;
  const someSelected = materiasSel.length > 0 && materiasSel.length < materiasDisponibles.length;
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);
  const toggleSelectAll = () => {
    if (allSelected) setMateriasSel([]);
    else setMateriasSel(materiasDisponibles.map(m => String(m.id)));
  };

  // NUEVO: usa POST /alumnos/{alumnoId}/inscribir/{materiaId}
  const onAsignar = async (e) => {
    e.preventDefault();
    resetMsgs();
    if (!accessToken) { setErr("No hay sesión activa. Vuelve a iniciar sesión."); return; }
    if (!alumnoSel?.catalogId || materiasSel.length === 0) return;
    setLoading(true);
    try {
      for (const mid of materiasSel) {
        await catalogApi.post(`/alumnos/${alumnoSel.catalogId}/inscribir/${mid}`);
      }
      setOk("Materias asignadas correctamente.");
      setMateriasSel([]);
      await cargarAsignadas(alumnoSel.catalogId);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e?.message || "No se pudo asignar");
    } finally {
      setLoading(false);
    }
  };

  // NUEVO: usa DELETE /alumnos/{alumnoId}/desinscribir/{materiaId}
  const quitar = async (alumnoCatalogId, materiaId) => {
    resetMsgs();
    if (!accessToken) { setErr("No hay sesión activa. Vuelve a iniciar sesión."); return; }
    if (!confirm("¿Quitar esta materia del alumno?")) return;
    setLoading(true);
    try {
      await catalogApi.delete(`/alumnos/${alumnoCatalogId}/desinscribir/${materiaId}`);
      setOk("Asignación eliminada.");
      await cargarAsignadas(alumnoCatalogId);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e?.message || "No se pudo eliminar asignación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h4 mb-0">
          <i className="bi bi-link-45deg me-2" />
          Asignar materias a alumnos
        </h2>
      </div>

      {!accessToken && (
        <div className="alert alert-warning">
          No hay token activo. Inicia sesión nuevamente.
        </div>
      )}

      {err && (
        <div className="alert alert-warning alert-dismissible fade show" role="alert">
          {err}
          <button type="button" className="btn-close" onClick={() => setErr("")}></button>
        </div>
      )}
      {ok && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {ok}
          <button type="button" className="btn-close" onClick={() => setOk("")}></button>
        </div>
      )}

      <div className="row g-4">
        {/* IZQ: Buscador alumno + División */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">1) Buscar alumno</h5>
              <label className="form-label">Nombre o matrícula</label>
              <div className="input-group mb-2">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input
                  className="form-control"
                  placeholder="Ej. Ana, 20231234…"
                  value={q}
                  onChange={(e) => onChangeBuscar(e.target.value)}
                  disabled={!accessToken}
                />
              </div>
              <div className="form-text">Une AuthDB (nombre/email) + Catálogo (matrícula).</div>

              <div className="list-group mt-3" style={{ maxHeight: 300, overflowY: "auto", borderRadius: 8 }}>
                {loadingAlumnos && (
                  <div className="list-group-item text-muted">
                    <span className="spinner-border spinner-border-sm me-2" /> Buscando…
                  </div>
                )}
                {!loadingAlumnos && alumnos.length === 0 && q.trim().length >= 2 && (
                  <div className="list-group-item text-secondary">Sin resultados</div>
                )}
                {alumnos.map((a) => (
                  <button
                    key={a.userId}
                    type="button"
                    className={"list-group-item list-group-item-action d-flex justify-content-between" + (alumnoSel?.userId === a.userId ? " active" : "")}
                    onClick={() => seleccionarAlumno(a)}
                    disabled={!accessToken}
                  >
                    <span>
                      <span className="fw-semibold">{a.nombre || "—"}</span>
                      <span className="text-muted"> — {a.matricula || "sin matrícula"}</span>
                    </span>
                    <span className="badge text-bg-light">UID #{a.userId}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* División */}
          <div className="card shadow-sm mt-4">
            <div className="card-body">
              <h5 className="card-title">2) Elegir división</h5>
              <select
                className="form-select"
                value={divisionSel}
                onChange={(e) => onChangeDivision(e.target.value)}
                disabled={!alumnoSel || !accessToken}
              >
                <option value="">{!alumnoSel ? "Selecciona primero un alumno" : "-- Selecciona división --"}</option>
                {divisiones.map((d) => (
                  <option key={d.id} value={d.id}>{d.clave} — {d.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DER: Checkboxes de materias + Tabla asignadas */}
        <div className="col-12 col-lg-8">
          {/* Checkboxes materias */}
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">3) Seleccionar materias de la división</h5>

              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="form-check">
                  <input
                    ref={selectAllRef}
                    id="select-all"
                    type="checkbox"
                    className="form-check-input"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={!alumnoSel || !divisionSel || loadingMateriasDiv || materiasDisponibles.length === 0 || !accessToken}
                  />
                  <label htmlFor="select-all" className="form-check-label">Seleccionar todas</label>
                </div>
                <small className="text-muted">
                  {loadingMateriasDiv ? "Cargando materias…" : `${materiasDisponibles.length} disponibles`}
                </small>
              </div>

              <div className="row row-cols-1 row-cols-md-2 g-2">
                {loadingMateriasDiv && (
                  <div className="col">
                    <div className="text-muted d-flex align-items-center gap-2">
                      <div className="spinner-border spinner-border-sm" role="status" /> Cargando…
                    </div>
                  </div>
                )}
                {!loadingMateriasDiv && materiasDisponibles.length === 0 && (
                  <div className="col text-secondary">
                    {divisionSel ? "No hay materias disponibles (o ya están asignadas)." : "Selecciona una división."}
                  </div>
                )}
                {materiasDisponibles.map((m) => {
                  const checked = materiasSel.includes(String(m.id));
                  return (
                    <div className="col" key={m.id}>
                      <div className={"form-check border rounded-3 p-2 " + (checked ? "border-primary" : "border-200")}>
                        <input
                          id={`m-${m.id}`}
                          type="checkbox"
                          className="form-check-input"
                          checked={checked}
                          onChange={() => toggleMateria(m.id)}
                          disabled={!alumnoSel || !divisionSel || !accessToken}
                        />
                        <label htmlFor={`m-${m.id}`} className="form-check-label ms-1">
                          <span className="fw-semibold">{m.clave}</span> — {m.nombre}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 d-flex gap-2">
                <button
                  className="btn btn-primary"
                  onClick={onAsignar}
                  disabled={!alumnoSel?.catalogId || materiasSel.length === 0 || loading || !accessToken}
                >
                  {loading ? <><span className="spinner-border spinner-border-sm me-2" />Asignando…</> : "Asignar seleccionadas"}
                </button>
                <button className="btn btn-outline-secondary" onClick={() => setMateriasSel([])} disabled={loading}>
                  Limpiar selección
                </button>
              </div>
            </div>
          </div>

          {/* Tabla asignadas: Alumno + Matrícula + Materia */}
          <div className="card shadow-sm mt-4">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="card-title mb-0">4) Materias asignadas</h5>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => alumnoSel && cargarAsignadas(alumnoSel.catalogId)}
                  disabled={!alumnoSel || loadingAsignadas || !accessToken}
                >
                  {loadingAsignadas ? "Actualizando…" : "Actualizar"}
                </button>
              </div>

              {!alumnoSel ? (
                <div className="text-secondary">Selecciona un alumno para ver sus materias.</div>
              ) : loadingAsignadas ? (
                <div className="d-flex align-items-center gap-2 text-muted">
                  <div className="spinner-border spinner-border-sm" role="status" />
                  Cargando asignaciones…
                </div>
              ) : asignadas.length === 0 ? (
                <div className="text-secondary">Este alumno no tiene materias asignadas.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Alumno</th>
                        <th>Matrícula</th>
                        <th>Materia</th>
                        <th>Clave</th>
                        <th className="text-end" style={{ width: 120 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asignadas.map((am) => {
                        const mid = am?.materia?.id;
                        const m = am?.materia || {};
                        return (
                          <tr key={am.id ?? `${alumnoSel.catalogId}-${mid}`}>
                            <td className="fw-medium">{alumnoSel?.nombre || "—"}</td>
                            <td>{alumnoSel?.matricula || "—"}</td>
                            <td>{m.nombre || "—"}</td>
                            <td><span className="badge text-bg-secondary">{m.clave || "—"}</span></td>
                            <td className="text-end">
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => quitar(alumnoSel.catalogId, mid)}
                                disabled={loading || !accessToken}
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {alumnoSel && (
            <div className="text-muted small mt-2">
              Seleccionado: <strong>{alumnoSel.nombre || "—"}</strong> — Matrícula: <strong>{alumnoSel.matricula || "—"}</strong> — UID: #{alumnoSel.userId} — CatID: #{alumnoSel.catalogId}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
