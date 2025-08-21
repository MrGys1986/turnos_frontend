// src/pages/Docente/Horarios.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getPerfilIdsByUserId } from "../../services/profileHelpers";
import {
  listHorarios,
  createHorario,
  updateHorario,
  deleteHorario,
  replaceHorarios,
} from "../../services/horariosService";

const DAYS = [
  { v: 1, t: "Lunes" },
  { v: 2, t: "Martes" },
  { v: 3, t: "Miércoles" },
  { v: 4, t: "Jueves" },
  { v: 5, t: "Viernes" },
  { v: 6, t: "Sábado" },
  { v: 7, t: "Domingo" },
];

export default function Horarios() {
  const { user } = useAuth();
  const [docenteId, setDocenteId] = useState(null);
  const [rows, setRows] = useState([]); // [{id, diaSemana, horaIni, horaFin, activo}]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [form, setForm] = useState({
    diaSemana: "",
    horaIni: "",
    horaFin: "",
    activo: true,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setErr("");
      try {
        const { docenteId } = await getPerfilIdsByUserId(user.id);
        setDocenteId(docenteId ?? null);
        if (docenteId) {
          await load(docenteId);
        }
      } catch (e) {
        setErr(e?.response?.data || e.message || "Error cargando perfil del docente");
      }
    })();
  }, [user]);

  const load = async (id = docenteId) => {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const { data } = await listHorarios(id);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data || e.message || "No se pudieron cargar horarios");
    } finally {
      setLoading(false);
    }
  };

  const addRow = async (e) => {
    e.preventDefault();
    setOk("");
    setErr("");
    if (!docenteId) return;
    const payload = {
      docenteId, // lo enviamos por si tu backend lo necesita
      diaSemana: Number(form.diaSemana),
      horaIni: (form.horaIni || "").trim(),
      horaFin: (form.horaFin || "").trim(),
      activo: !!form.activo,
    };
    if (!payload.diaSemana || !payload.horaIni || !payload.horaFin) {
      setErr("Completa día y rango de horas.");
      return;
    }
    setSaving(true);
    try {
      await createHorario(payload);
      setOk("Horario creado.");
      setForm({ diaSemana: "", horaIni: "", horaFin: "", activo: true });
      await load();
    } catch (e) {
      setErr(e?.response?.data || e.message || "No se pudo crear el horario");
    } finally {
      setSaving(false);
    }
  };

  const onToggleActivo = async (row) => {
    setOk("");
    setErr("");
    setSaving(true);
    try {
      await updateHorario(row.id, {
        diaSemana: row.diaSemana,
        horaIni: row.horaIni,
        horaFin: row.horaFin,
        activo: !row.activo,
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data || e.message || "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm("¿Eliminar este horario?")) return;
    setOk("");
    setErr("");
    setSaving(true);
    try {
      await deleteHorario(row.id);
      await load();
    } catch (e) {
      setErr(e?.response?.data || e.message || "No se pudo eliminar");
    } finally {
      setSaving(false);
    }
  };

  const sorted = useMemo(() => {
    const order = [...rows];
    return order.sort((a, b) =>
      a.diaSemana === b.diaSemana
        ? (a.horaIni || "").localeCompare(b.horaIni || "")
        : a.diaSemana - b.diaSemana
    );
  }, [rows]);

  if (!docenteId) {
    return (
      <div className="text-muted d-flex align-items-center gap-2">
        <div className="spinner-border spinner-border-sm" role="status" />
        Cargando perfil de docente…
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Disponibilidad de atención</h1>
        <button className="btn btn-outline-secondary" onClick={() => load()} disabled={loading}>
          {loading ? "Actualizando…" : "Refrescar"}
        </button>
      </div>

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

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <form className="row g-3" onSubmit={addRow}>
            <div className="col-12 col-md-3">
              <label className="form-label">Día</label>
              <select
                className="form-select"
                value={form.diaSemana}
                onChange={(e) => setForm({ ...form, diaSemana: e.target.value })}
              >
                <option value="">-- Selecciona --</option>
                {DAYS.map((d) => (
                  <option key={d.v} value={d.v}>{d.t}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Hora inicio</label>
              <input
                type="time"
                className="form-control"
                value={form.horaIni}
                onChange={(e) => setForm({ ...form, horaIni: e.target.value })}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Hora fin</label>
              <input
                type="time"
                className="form-control"
                value={form.horaFin}
                onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
              />
            </div>
            <div className="col-12 col-md-3 d-flex align-items-end">
              <div className="form-check">
                <input
                  id="chk-activo"
                  className="form-check-input"
                  type="checkbox"
                  checked={!!form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
                <label className="form-check-label ms-2" htmlFor="chk-activo">Activo</label>
              </div>
            </div>
            <div className="col-12 col-md-2 d-flex align-items-end">
              <button className="btn btn-primary w-100" disabled={saving}>
                {saving ? "Guardando…" : "Agregar"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Activo</th>
                  <th style={{ width: 140 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id}>
                    <td>{DAYS.find(d => d.v === r.diaSemana)?.t || r.diaSemana}</td>
                    <td>{r.horaIni}</td>
                    <td>{r.horaFin}</td>
                    <td>
                      <span className={`badge text-bg-${r.activo ? "success" : "secondary"}`}>
                        {r.activo ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => onToggleActivo(r)}
                        disabled={saving}
                      >
                        {r.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onDelete(r)}
                        disabled={saving}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && sorted.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-secondary py-4">
                      Sin horarios. Agrega al menos uno para permitir solicitudes de turno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
