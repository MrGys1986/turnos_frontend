// src/pages/Monitor/Monitor.jsx
import { useEffect, useMemo, useState } from "react";
import { listTurnosMonitor } from "../../services/turnosService";
import useStomp from "../../hooks/useStomp";

export default function Monitor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [cubiculo, setCubiculo] = useState("");
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

  const cardBorder = (e) => {
    switch (e) {
      case "ACEPTADO":    return "border-primary";
      case "EN_ATENCION": return "border-warning";
      case "FINALIZADO":  return "border-success";
      case "CANCELADO":   return "border-danger";
      default:            return "border-200"; // util opcional; si no la tienes, déjalo vacío
    }
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await listTurnosMonitor();
      setItems(data);
      setUpdatedAt(new Date());
    } catch (e) {
      setErr(e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useStomp({
    baseUrl,
    topics: ["/topic/monitor"],
    onMessage: () => load(),
  });

  const filtered = useMemo(() => {
    let list = items ?? [];
    if (estado !== "TODOS") list = list.filter((t) => t.estado === estado);
    if (cubiculo.trim()) {
      const c = cubiculo.trim().toLowerCase();
      list = list.filter((t) => String(t.cubiculoId ?? "").toLowerCase().includes(c));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          String(t.folio).toLowerCase().includes(q) ||
          String(t.docenteId).toLowerCase().includes(q) ||
          String(t.tema || "-").toLowerCase().includes(q)
      );
    }
    // Orden sugerido: EN_ATENCION -> ACEPTADO -> SOLICITADO -> FINALIZADO -> CANCELADO
    const order = { EN_ATENCION: 0, ACEPTADO: 1, SOLICITADO: 2, FINALIZADO: 3, CANCELADO: 4 };
    return list.sort((a, b) => (order[a.estado] ?? 9) - (order[b.estado] ?? 9));
  }, [items, estado, cubiculo, search]);

  const stats = useMemo(() => {
    const count = (s) => items.filter((t) => t.estado === s).length;
    return {
      total: items.length,
      solicitados: count("SOLICITADO"),
      aceptados: count("ACEPTADO"),
      enAtencion: count("EN_ATENCION"),
      finalizados: count("FINALIZADO"),
      cancelados: count("CANCELADO"),
    };
  }, [items]);

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h1 className="h3 mb-0">Monitor de Turnos</h1>
          <div className="text-muted small">
            {updatedAt ? `Última actualización: ${updatedAt.toLocaleTimeString()}` : "—"}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
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
      </div>

      {/* Alertas */}
      {err && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error:</strong> {err}
          <button type="button" className="btn-close" onClick={() => setErr("")}></button>
        </div>
      )}

      {/* Métricas / leyenda */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Total</div>
              <div className="fs-4 fw-semibold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Solicitados</div>
              <div className="fs-4 fw-semibold">{stats.solicitados}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Aceptados</div>
              <div className="fs-4 fw-semibold">{stats.aceptados}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">En atención</div>
              <div className="fs-4 fw-semibold">{stats.enAtencion}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Finalizados</div>
              <div className="fs-4 fw-semibold">{stats.finalizados}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Cancelados</div>
              <div className="fs-4 fw-semibold">{stats.cancelados}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Folio, docente o tema…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-3">
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
            <div className="col-6 col-md-3">
              <label className="form-label">Cubículo</label>
              <input
                className="form-control"
                placeholder="Ej. 3"
                value={cubiculo}
                onChange={(e) => setCubiculo(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-2 text-md-end">
              <button className="btn btn-outline-secondary w-100" onClick={load} disabled={loading}>
                {loading ? "Actualizando…" : "Refrescar"}
              </button>
            </div>
          </div>
          {/* Leyenda */}
          <div className="mt-3 d-flex flex-wrap gap-2 small">
            <span className="badge text-bg-secondary">Solicitado</span>
            <span className="badge text-bg-primary">Aceptado</span>
            <span className="badge text-bg-warning">En atención</span>
            <span className="badge text-bg-success">Finalizado</span>
            <span className="badge text-bg-danger">Cancelado</span>
          </div>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="row g-3">
        {filtered.map((t) => (
          <div key={t.id} className="col-12 col-sm-6 col-lg-4 col-xxl-3">
            <div className={`card shadow-sm ${cardBorder(t.estado)}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-muted small">Folio</div>
                    <h3 className="h5 fw-semibold mb-1">{t.folio}</h3>
                  </div>
                  <span className={`badge text-bg-${estadoVariant(t.estado)}`}>{t.estado}</span>
                </div>

                <div className="mt-2">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small">Cubículo</span>
                    <span className="fw-semibold">{t.cubiculoId ?? "—"}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small">Docente</span>
                    <span>{t.docenteId}</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-muted small mb-1">Tema</div>
                    <div className="text-truncate" title={t.tema || "-"}>
                      {t.tema || <span className="text-secondary">—</span>}
                    </div>
                  </div>
                </div>
              </div>
              {/* Pie opcional con hora/cola etc. si tu API lo expone */}
              {/* <div className="card-footer d-flex justify-content-between small">
                <span>Creado: {formatHora(t.createdAt)}</span>
                <span>Alumno: {t.alumnoId}</span>
              </div> */}
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="col-12">
            <div className="text-center text-secondary py-5">
              <div className="mb-2">🕐</div>
              {items.length === 0
                ? "Sin turnos activos"
                : "Sin resultados con los filtros actuales"}
            </div>
          </div>
        )}
      </div>

      {/* Spinner al pie durante carga inicial o refresco */}
      {loading && (
        <div className="d-flex align-items-center justify-content-center py-4">
          <div className="spinner-border me-2" role="status" />
          <span className="text-muted">Cargando…</span>
        </div>
      )}
    </div>
  );
}
