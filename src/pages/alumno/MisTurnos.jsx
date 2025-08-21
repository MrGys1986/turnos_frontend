// src/pages/Alumno/MisTurnos.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getPerfilIdsByUserId } from "../../services/profileHelpers";
import useStomp from "../../hooks/useStomp";
import { turnosApi } from "../../services/api";
import { hydrateTurnosForAlumno, pickErrorMessage } from "../../services/turnoLookup";

export default function MisTurnos() {
  const { user } = useAuth();
  const [alumnoId, setAlumnoId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [updatedAt, setUpdatedAt] = useState(null);

  const baseUrl = import.meta.env.VITE_TURNOS_API_BASE;

  const estadoVariant = (e) => {
    switch (e) {
      case "SOLICITADO":  return "secondary";
      case "ACEPTADO":    return "primary";
      case "EN_ATENCION": return "warning";
      case "FINALIZADO":  return "success";
      case "CANCELADO":   return "danger";
      default:            return "light";
    }
  };

  const load = async () => {
    if (!alumnoId) return;
    setErr("");
    setLoading(true);
    try {
      const { data } = await turnosApi.get("/monitor/turnos");
      const propios = (data ?? []).filter((t) => t.alumnoId === alumnoId);
      const enriched = await hydrateTurnosForAlumno(propios);
      setItems(enriched);
      setUpdatedAt(new Date());
    } catch (e) {
      setErr(pickErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { alumnoId } = await getPerfilIdsByUserId(user.id);
      setAlumnoId(alumnoId);
    })();
  }, [user]);

  useEffect(() => { if (alumnoId) load(); }, [alumnoId]);

  useStomp({
    baseUrl,
    topics: alumnoId ? [`/topic/alumno/${alumnoId}`] : [],
    onMessage: () => load(),
  });

  const filtered = useMemo(() => {
    let list = items ?? [];
    if (estado !== "TODOS") list = list.filter((t) => t.estado === estado);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          String(t.folio).toLowerCase().includes(q) ||
          String(t.materiaNombre || t.materiaId).toLowerCase().includes(q) ||
          String(t.docenteNombre || t.docenteId).toLowerCase().includes(q) ||
          String(t.tema || "-").toLowerCase().includes(q)
      );
    }
    const order = { EN_ATENCION: 0, ACEPTADO: 1, SOLICITADO: 2, FINALIZADO: 3, CANCELADO: 4 };
    return list.sort((a, b) => (order[a.estado] ?? 9) - (order[b.estado] ?? 9));
  }, [items, estado, search]);

  if (!alumnoId) {
    return (
      <div className="text-muted d-flex align-items-center gap-2">
        <div className="spinner-border spinner-border-sm" role="status" />
        Cargando perfil de alumno…
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h1 className="h3 mb-0">Mis turnos</h1>
          <div className="text-muted small">
            {updatedAt ? `Última actualización: ${updatedAt.toLocaleTimeString()}` : "—"}
          </div>
        </div>
        <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Actualizando…
            </>
          ) : (
            "Actualizar"
          )}
        </button>
      </div>

      {err && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error:</strong> {err}
          <button type="button" className="btn-close" onClick={() => setErr("")}></button>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-6">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Folio, materia, docente o tema…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="TODOS">Todos</option>
                <option value="SOLICITADO">Solicitado</option>
                <option value="ACEPTADO">Aceptado</option>
                <option value="EN_ATENCION">En atención</option>
                <option value="FINALIZADO">Finalizado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            <div className="col-12 col-md-3 text-md-end">
              <button className="btn btn-outline-secondary w-100" onClick={load} disabled={loading}>
                {loading ? "Actualizando…" : "Refrescar"}
              </button>
            </div>
          </div>
          <div className="mt-3 d-flex flex-wrap gap-2 small">
            <span className="badge text-bg-secondary">Solicitado</span>
            <span className="badge text-bg-primary">Aceptado</span>
            <span className="badge text-bg-warning">En atención</span>
            <span className="badge text-bg-success">Finalizado</span>
            <span className="badge text-bg-danger">Cancelado</span>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Materia</th>
                  <th>Docente</th>
                  <th>Tema</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Lugar</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const showSched = ["ACEPTADO","EN_ATENCION","FINALIZADO"].includes(t.estado);
                  const isCancel = t.estado === "CANCELADO";
                  return (
                    <tr key={t.id}>
                      <td className="fw-semibold">{t.folio}</td>
                      <td>{t.materiaNombre || t.materiaId}</td>
                      <td>{t.docenteNombre || t.docenteId}</td>
                      <td className="text-truncate" title={t.tema || "-"} style={{ maxWidth: 260 }}>
                        {t.tema || <span className="text-secondary">—</span>}
                      </td>
                      <td>
                        <span className={`badge text-bg-${estadoVariant(t.estado)}`}>{t.estado}</span>
                      </td>
                      <td>{showSched ? (t.fecha || "—") : "—"}</td>
                      <td>{showSched ? ((t.horaIni && t.horaFin) ? `${t.horaIni}–${t.horaFin}` : "—") : "—"}</td>
                      <td>{showSched ? (t.lugar || "—") : "—"}</td>
                      <td>{(isCancel || t.observaciones) ? (t.observaciones || "—") : "—"}</td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-secondary py-4">
                      {items.length === 0 ? "No hay turnos" : "Sin resultados con los filtros actuales"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="d-flex align-items-center justify-content-center py-3">
              <div className="spinner-border me-2" role="status" />
              <span className="text-muted">Cargando…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
