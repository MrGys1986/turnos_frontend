import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getPerfilIdsByUserId } from "../../services/profileHelpers";
import { listTurnosDocente } from "../../services/turnosService";
import { hydrateTurnosForDocente, pickErrorMessage } from "../../services/turnoLookup";

export default function AgendaDocente() {
  const { user } = useAuth();
  const [docenteId, setDocenteId] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { docenteId } = await getPerfilIdsByUserId(user.id);
        setDocenteId(docenteId);
        if (docenteId) {
          setLoading(true);
          const { data } = await listTurnosDocente(docenteId);
          const enriched = await hydrateTurnosForDocente(data ?? []);
          setItems(enriched);
        }
      } catch (e) {
        setErr(pickErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Sólo programados (tienen fecha) y en estados con horario
  const programados = useMemo(() => {
    const allowed = new Set(["ACEPTADO","EN_ATENCION","FINALIZADO"]);
    return (items ?? []).filter(t => t.fecha && allowed.has(t.estado));
  }, [items]);

  // Agrupar por fecha y ordenar por hora
  const porDia = useMemo(() => {
    const map = new Map();
    for (const t of programados) {
      if (!map.has(t.fecha)) map.set(t.fecha, []);
      map.get(t.fecha).push(t);
    }
    for (const [k, arr] of map) {
      arr.sort((a,b) => (a.horaIni||"").localeCompare(b.horaIni||""));
    }
    // ordenar fechas asc
    return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b));
  }, [programados]);

  if (!docenteId) return <p className="text-muted">Cargando perfil de docente…</p>;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <h1 className="h4 mb-0">Agenda</h1>
        <span className="text-muted small">{loading ? "Actualizando…" : ""}</span>
      </div>

      {err && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error:</strong> {err}
          <button type="button" className="btn-close" onClick={() => setErr("")}></button>
        </div>
      )}

      {porDia.length === 0 && !loading && (
        <div className="text-center text-secondary py-4">
          No hay turnos programados.
        </div>
      )}

      {porDia.map(([fecha, arr]) => (
        <div key={fecha} className="card border-0 shadow-sm">
          <div className="card-header bg-white">
            <strong>{fecha}</strong>
            <span className="text-muted ms-2">({arr.length})</span>
          </div>
          <div className="card-body p-0">
            <div className="list-group list-group-flush">
              {arr.map(t => (
                <details key={t.id} className="list-group-item">
                  <summary className="d-flex align-items-center justify-content-between">
                    <span>
                      <span className="badge text-bg-light me-2">{t.horaIni}–{t.horaFin}</span>
                      <strong>{t.alumnoNombre || t.alumnoId}</strong>
                      <span className="text-muted"> — {t.materiaNombre || t.materiaId}</span>
                    </span>
                    <span className="badge text-bg-secondary">{t.estado}</span>
                  </summary>
                  <div className="mt-3 small">
                    <div><strong>Folio:</strong> {t.folio}</div>
                    <div><strong>Tema:</strong> {t.tema || "—"}</div>
                    <div><strong>Lugar:</strong> {t.lugar || "—"}</div>
                    <div><strong>Observaciones:</strong> {t.observaciones || "—"}</div>
                    <div className="text-muted mt-2">
                      Creado: {t.creadoEn ? new Date(t.creadoEn).toLocaleString() : "—"}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
