// src/pages/Alumno/SolicitarTurno.jsx
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getPerfilIdsByUserId,
  getMateriasDeAlumno,
  getDocentesParaMateria,
} from "../../services/profileHelpers";
import { solicitarTurno } from "../../services/turnosService";

export default function SolicitarTurno() {
  const { user } = useAuth();

  const [alumnoId, setAlumnoId] = useState(null);
  const [materias, setMaterias] = useState([]);   // ← normalizadas [{id, clave, nombre, divisionId, division?}]
  const [docentes, setDocentes] = useState([]);

  const [loadingMaterias, setLoadingMaterias] = useState(false);
  const [loadingDocentes, setLoadingDocentes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ materiaId: "", docenteId: "", tema: "" });
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  // Cargar perfil y materias del alumno
  useEffect(() => {
    if (!user) return;
    (async () => {
      setErr("");
      try {
        const ids = await getPerfilIdsByUserId(user.id);
        setAlumnoId(ids.alumnoId ?? null);
        if (ids.alumnoId) {
          setLoadingMaterias(true);
          const mats = await getMateriasDeAlumno(ids.alumnoId); // ← {id,clave,nombre,divisionId}
          setMaterias(Array.isArray(mats) ? mats : []);
        }
      } catch (e) {
        setErr(e?.response?.data || e?.message || "Error cargando datos");
      } finally {
        setLoadingMaterias(false);
      }
    })();
  }, [user]);

  // Cambio de materia → cargar docentes (con fallback por división)
  const onMateriaChange = async (materiaId) => {
    setOk("");
    setErr("");
    setForm((f) => ({ ...f, materiaId, docenteId: "" }));
    setDocentes([]);
    if (!materiaId) return;

    try {
      setLoadingDocentes(true);
      const docs = await getDocentesParaMateria(Number(materiaId), {
        materiasCache: materias, // ayuda al fallback para encontrar divisionId
        alumnoId,               // 2º intento para deducir división si hace falta
      });
      setDocentes(Array.isArray(docs) ? docs : []);
    } catch (e) {
      setErr(e?.response?.data || e?.message || "No se pudieron cargar docentes");
    } finally {
      setLoadingDocentes(false);
    }
  };

  const canSubmit = useMemo(
    () => !!alumnoId && !!form.materiaId && !!form.docenteId && !submitting,
    [alumnoId, form.materiaId, form.docenteId, submitting]
  );

  const resetForm = () => {
    setForm({ materiaId: "", docenteId: "", tema: "" });
    setDocentes([]);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setOk("");
    setErr("");
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      const payload = {
        alumnoId,
        materiaId: Number(form.materiaId),
        docenteId: Number(form.docenteId),
        tema: form.tema?.trim() ? form.tema.trim() : null,
      };
      await solicitarTurno(payload);
      setOk("✅ Turno solicitado correctamente.");
      resetForm();
    } catch (ex) {
      setErr(ex?.response?.data || ex?.message || "No se pudo solicitar el turno");
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 mb-0">Solicitar turno</h1>
        <div className="text-muted small">
          {loadingMaterias ? "Cargando materias…" : ""}
        </div>
      </div>

      {/* Alertas */}
      {err && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error:</strong> {err}
          <button type="button" className="btn-close" onClick={() => setErr("")}></button>
        </div>
      )}
      {ok && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {ok}
          <button type="button" className="btn-close" onClick={() => setOk("")}></button>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <form className="row g-3" onSubmit={onSubmit}>
            {/* Materia */}
            <div className="col-12 col-md-4">
              <label className="form-label">Materia</label>
              <select
                className="form-select"
                value={form.materiaId}
                onChange={(e) => onMateriaChange(e.target.value)}
                required
                disabled={loadingMaterias || submitting}
              >
                <option value="">
                  {loadingMaterias ? "Cargando materias…" : "-- Selecciona --"}
                </option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.clave} — {m.nombre}
                  </option>
                ))}
              </select>
              <div className="form-text">
                Primero elige la materia para listar docentes disponibles.
              </div>
            </div>

            {/* Docente */}
            <div className="col-12 col-md-4">
              <label className="form-label">Docente</label>
              <select
                className="form-select"
                value={form.docenteId}
                onChange={(e) => setForm({ ...form, docenteId: e.target.value })}
                required
                disabled={!form.materiaId || loadingDocentes || submitting}
              >
                <option value="">
                  {!form.materiaId
                    ? "Selecciona una materia"
                    : loadingDocentes
                    ? "Cargando docentes…"
                    : "-- Selecciona --"}
                </option>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>
                    #{d.id} {d.noEmpleado || ""} {d.user?.nombre ? `— ${d.user.nombre}` : ""}
                  </option>
                ))}
              </select>
              {!!form.materiaId && !loadingDocentes && docentes.length === 0 && (
                <div className="form-text text-warning">
                  No hay docentes asignados a esta materia (por división).
                </div>
              )}
            </div>

            {/* Tema */}
            <div className="col-12 col-md-4">
              <label className="form-label">Tema (opcional)</label>
              <input
                className="form-control"
                value={form.tema}
                onChange={(e) => setForm({ ...form, tema: e.target.value })}
                placeholder="Motivo breve"
                maxLength={120}
                disabled={submitting}
              />
              <div className="form-text">
                Describe en 120 caracteres el motivo de tu turno.
              </div>
            </div>

            {/* Acciones */}
            <div className="col-12 d-flex gap-2">
              <button className="btn btn-primary" disabled={!canSubmit}>
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Solicitando…
                  </>
                ) : (
                  "Solicitar"
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={resetForm}
                disabled={submitting}
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Estado vacío de materias */}
      {!loadingMaterias && materias.length === 0 && (
        <div className="text-center text-secondary py-4">
          No tienes materias registradas para solicitar turnos.
        </div>
      )}
    </div>
  );
}
