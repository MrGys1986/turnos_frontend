// src/pages/Docente/DashboardDocente.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  listTurnosDocenteActivos,
  aceptarTurno,
  iniciarTurno,
  finalizarTurno,
  cancelarTurno,
} from "../../services/turnosService";
import { getPerfilIdsByUserId } from "../../services/profileHelpers";
import useStomp from "../../hooks/useStomp";
import { hydrateTurnosForDocente, pickErrorMessage } from "../../services/turnoLookup";

export default function DashboardDocente() {
  const { user } = useAuth();
  const [docenteId, setDocenteId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [buscar, setBuscar] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [turnoAConfirmar, setTurnoAConfirmar] = useState(null);
  const [turnoAAceptar, setTurnoAAceptar] = useState(null);

  // Form aceptar
  const [acceptForm, setAcceptForm] = useState({
    lugar: "", fecha: "", horaIni: "", horaFin: "", observaciones: ""
  });

  // Form cancelar
  const [cancelObs, setCancelObs] = useState("");

  const baseUrl = import.meta.env.VITE_TURNOS_API_BASE;

  const load = async (dId) => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await listTurnosDocenteActivos(dId);
      const enriched = await hydrateTurnosForDocente(data ?? []);
      setItems(enriched);
    } catch (e) {
      setErr(pickErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { docenteId } = await getPerfilIdsByUserId(user.id);
      setDocenteId(docenteId);
      if (docenteId) await load(docenteId);
    })();
  }, [user]);

  useStomp({
    baseUrl,
    topics: docenteId ? [`/topic/docente/${docenteId}`] : [],
    onMessage: () => {
      if (docenteId) load(docenteId);
    },
  });

  const estadoVariant = (estado) => {
    switch (estado) {
      case "SOLICITADO":  return "secondary";
      case "ACEPTADO":    return "primary";
      case "EN_ATENCION": return "warning";
      case "FINALIZADO":  return "success";
      case "CANCELADO":   return "danger";
      default:            return "light";
    }
  };

  const accionesDisponibles = (estado) => ({
    puedeAceptar: estado === "SOLICITADO",
    puedeIniciar: estado === "ACEPTADO",
    puedeFinalizar: estado === "ACEPTADO" || estado === "EN_ATENCION",
    puedeCancelar: estado !== "FINALIZADO" && estado !== "CANCELADO",
  });

  const onOpenAceptar = (t) => {
    setTurnoAAceptar(t);
    setAcceptForm({ lugar: "", fecha: "", horaIni: "", horaFin: "", observaciones: "" });
  };

  const onAceptar = async () => {
    try {
      await aceptarTurno(turnoAAceptar.id, acceptForm);
      setNotice("Turno aceptado correctamente.");
      setTurnoAAceptar(null);
      await load(docenteId);
    } catch (e) {
      setErr(pickErrorMessage(e));
    }
  };

  const onIniciar = async (id) => {
    try {
      await iniciarTurno(id);
      setNotice("Turno iniciado.");
      await load(docenteId);
    } catch (e) {
      setErr(pickErrorMessage(e));
    }
  };

  const onFinalizar = async (id) => {
    try {
      await finalizarTurno(id);
      setNotice("Turno finalizado.");
      await load(docenteId);
    } catch (e) {
      setErr(pickErrorMessage(e));
    }
  };

  const onOpenCancelar = (t) => {
    setTurnoAConfirmar(t);
    setCancelObs("");
  };

  const onCancelar = async () => {
    try {
      await cancelarTurno(turnoAConfirmar.id, cancelObs);
      setNotice("Turno cancelado.");
      setTurnoAConfirmar(null);
      await load(docenteId);
    } catch (e) {
      setErr(pickErrorMessage(e));
    }
  };

  const filtered = useMemo(() => {
    let list = items ?? [];
    if (estadoFiltro !== "TODOS") list = list.filter((t) => t.estado === estadoFiltro);
    if (buscar.trim()) {
      const q = buscar.trim().toLowerCase();
      list = list.filter(
        (t) =>
          String(t.folio).toLowerCase().includes(q) ||
          String(t.alumnoNombre || t.alumnoId).toLowerCase().includes(q) ||
          String(t.materiaNombre || t.materiaId).toLowerCase().includes(q) ||
          String(t.tema || "-").toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, estadoFiltro, buscar]);

  const stats = useMemo(() => {
    const count = (s) => items.filter((t) => t.estado === s).length;
    return {
      total: items.length,
      solicitados: count("SOLICITADO"),
      aceptados: count("ACEPTADO"),
      enAtencion: count("EN_ATENCION"),
    };
  }, [items]);

  if (!docenteId) return <p className="text-muted">Cargando perfil de docente…</p>;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h1 className="h3 mb-0">
          Mis turnos <span className="text-muted fw-normal">(docente #{docenteId})</span>
        </h1>
        <div>
          <button className="btn btn-outline-secondary" onClick={() => load(docenteId)} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Actualizando…
              </>
            ) : ("Actualizar")}
          </button>
        </div>
      </div>

      {err && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error:</strong> {err}
          <button type="button" className="btn-close" onClick={() => setErr("")}></button>
        </div>
      )}
      {notice && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {notice}
          <button type="button" className="btn-close" onClick={() => setNotice("")}></button>
        </div>
      )}

      <div className="row g-3">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Total</div>
              <div className="fs-4 fw-semibold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Solicitados</div>
              <div className="fs-4 fw-semibold">{stats.solicitados}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Aceptados</div>
              <div className="fs-4 fw-semibold">{stats.aceptados}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">En atención</div>
              <div className="fs-4 fw-semibold">{stats.enAtencion}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Folio, alumno, materia o tema…"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
              >
                <option value="TODOS">Todos</option>
                <option value="SOLICITADO">Solicitado</option>
                <option value="ACEPTADO">Aceptado</option>
                <option value="EN_ATENCION">En atención</option>
                <option value="FINALIZADO">Finalizado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>

            <div className="col-12 col-md-5 text-md-end">
              <button className="btn btn-outline-secondary" onClick={() => load(docenteId)} disabled={loading}>
                {loading ? "Actualizando…" : "Actualizar"}
              </button>
            </div>
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
                  <th>Alumno</th>
                  <th>Materia</th>
                  <th>Tema</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Lugar</th>
                  <th>Observaciones</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const a = accionesDisponibles(t.estado);
                  const showSched = ["ACEPTADO","EN_ATENCION","FINALIZADO"].includes(t.estado);
                  return (
                    <tr key={t.id}>
                      <td className="fw-semibold">{t.folio}</td>
                      <td>{t.alumnoNombre || t.alumnoId}</td>
                      <td>{t.materiaNombre || t.materiaId}</td>
                      <td className="text-truncate" style={{ maxWidth: 280 }}>
                        {t.tema || <span className="text-secondary">—</span>}
                      </td>
                      <td>
                        <span className={`badge text-bg-${estadoVariant(t.estado)}`}>{t.estado}</span>
                      </td>
                      <td>{showSched ? (t.fecha || "—") : "—"}</td>
                      <td>{showSched ? ((t.horaIni && t.horaFin) ? `${t.horaIni}–${t.horaFin}` : "—") : "—"}</td>
                      <td>{showSched ? (t.lugar || "—") : "—"}</td>
                      <td>{t.observaciones || "—"}</td>
                      <td className="text-end" style={{ whiteSpace: "nowrap" }}>
                        <div className="btn-group">
                          {a.puedeAceptar && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => onOpenAceptar(t)}
                              disabled={loading}
                              title="Aceptar"
                            >
                              Aceptar
                            </button>
                          )}
                          {a.puedeIniciar && (
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => onIniciar(t.id)}
                              disabled={loading}
                              title="Iniciar"
                            >
                              Iniciar
                            </button>
                          )}
                          {a.puedeFinalizar && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => onFinalizar(t.id)}
                              disabled={loading}
                              title="Finalizar"
                            >
                              Finalizar
                            </button>
                          )}
                          {a.puedeCancelar && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => onOpenCancelar(t)}
                              disabled={loading}
                              title="Cancelar"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center text-secondary py-4">
                      {items.length === 0 ? "Sin turnos activos" : "Sin resultados con los filtros actuales"}
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

      {/* Modal ACEPTAR */}
      {turnoAAceptar && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.4)" }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Aceptar turno {turnoAAceptar.folio}</h5>
                <button type="button" className="btn-close" onClick={() => setTurnoAAceptar(null)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Lugar</label>
                    <input className="form-control" value={acceptForm.lugar} onChange={(e) => setAcceptForm({ ...acceptForm, lugar: e.target.value })} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Fecha</label>
                    <input type="date" className="form-control" value={acceptForm.fecha} onChange={(e) => setAcceptForm({ ...acceptForm, fecha: e.target.value })} />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label">Hora inicio</label>
                    <input type="time" className="form-control" value={acceptForm.horaIni} onChange={(e) => setAcceptForm({ ...acceptForm, horaIni: e.target.value })} />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label">Hora fin</label>
                    <input type="time" className="form-control" value={acceptForm.horaFin} onChange={(e) => setAcceptForm({ ...acceptForm, horaFin: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Observaciones (opcional)</label>
                    <textarea className="form-control" rows={2} value={acceptForm.observaciones} onChange={(e) => setAcceptForm({ ...acceptForm, observaciones: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setTurnoAAceptar(null)}>Cerrar</button>
                <button className="btn btn-primary" onClick={onAceptar} disabled={loading || !acceptForm.lugar || !acceptForm.fecha || !acceptForm.horaIni || !acceptForm.horaFin}>
                  {loading ? "Guardando…" : "Aceptar turno"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal CANCELAR */}
      {turnoAConfirmar && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.4)" }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Cancelar {turnoAConfirmar.folio}</h5>
                <button type="button" className="btn-close" onClick={() => setTurnoAConfirmar(null)} />
              </div>
              <div className="modal-body">
                <label className="form-label">Motivo de cancelación</label>
                <textarea className="form-control" rows={3} value={cancelObs} onChange={(e) => setCancelObs(e.target.value)} placeholder="Describe el motivo…" />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setTurnoAConfirmar(null)}>Volver</button>
                <button className="btn btn-danger" onClick={onCancelar} disabled={loading || !cancelObs.trim()}>
                  {loading ? "Cancelando…" : "Cancelar turno"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
