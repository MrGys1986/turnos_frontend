// src/pages/Admin/Materias.jsx
import { useEffect, useState } from "react";
import { catalogApi } from "../../services/api";

export default function Materias() {
  const [divs, setDivs] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ id: null, nombre: "", clave: "", division: { id: "" } });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [dRes, mRes] = await Promise.allSettled([
        catalogApi.get("/divisiones"),
        catalogApi.get("/materias"),
      ]);
      setDivs(dRes.status === "fulfilled" ? dRes.value.data || [] : []);
      setItems(mRes.status === "fulfilled" ? mRes.value.data || [] : []);
      if (dRes.status === "rejected" || mRes.status === "rejected") {
        setErr(dRes.reason?.message || mRes.reason?.message || "Error al cargar datos");
      }
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    setSubmitting(true);
    try {
      const body = {
        nombre: form.nombre,
        clave: form.clave,
        division: { id: Number(form.division.id) },
      };
      if (form.id) {
        await catalogApi.put(`/materias/${form.id}`, body);
        setOk("Materia actualizada");
      } else {
        await catalogApi.post(`/materias`, body);
        setOk("Materia creada");
      }
      setForm({ id: null, nombre: "", clave: "", division: { id: "" } });
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "No se pudo guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const edit = (it) => {
    setErr(""); setOk("");
    setForm({
      id: it.id,
      nombre: it.nombre ?? "",
      clave: it.clave ?? "",
      division: { id: String(it?.division?.id ?? "") },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => {
    setErr(""); setOk("");
    if (!confirm("¿Eliminar esta materia?")) return;
    try {
      await catalogApi.delete(`/materias/${id}`);
      setOk("Materia eliminada");
      if (form.id === id) setForm({ id: null, nombre: "", clave: "", division: { id: "" } });
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "No se pudo eliminar");
    }
  };

  return (
    <>
      {/* Toques visuales embebidos */}
      <style>{`
        .table td, .table th { vertical-align: middle; }
        .sticky-card { position: sticky; top: 80px; z-index: 1; }
      `}</style>

      <div className="container-fluid">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="h4 mb-0">
            <i className="bi bi-journal-text me-2" />Materias
          </h2>
          <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-arrow-clockwise me-2" />}
            {loading ? "Cargando..." : "Recargar"}
          </button>
        </div>

        {err && <div className="alert alert-warning">{err}</div>}
        {ok && <div className="alert alert-success">{ok}</div>}

        <div className="row g-4">
          {/* Formulario */}
          <div className="col-12 col-lg-5 col-xxl-4">
            <div className="card shadow-sm sticky-card">
              <div className="card-body">
                <h5 className="card-title mb-3">{form.id ? "Editar materia" : "Crear materia"}</h5>
                <form onSubmit={save}>
                  <div className="mb-3">
                    <label htmlFor="nombre" className="form-label">Nombre</label>
                    <input
                      id="nombre"
                      className="form-control"
                      placeholder="Cálculo Diferencial"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="clave" className="form-label">Clave</label>
                    <input
                      id="clave"
                      className="form-control"
                      placeholder="MAT-101"
                      value={form.clave}
                      onChange={(e) => setForm({ ...form, clave: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="division" className="form-label">División</label>
                    <select
                      id="division"
                      className="form-select"
                      value={form.division.id}
                      onChange={(e) => setForm({ ...form, division: { id: e.target.value } })}
                      required
                    >
                      <option value="">-- Selecciona división --</option>
                      {divs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.clave} — {d.nombre}
                        </option>
                      ))}
                    </select>
                    {!divs.length && (
                      <div className="form-text text-danger">No hay divisiones (o backend caído).</div>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button className="btn btn-primary" disabled={submitting}>
                      {submitting && <span className="spinner-border spinner-border-sm me-2" />}
                      {form.id ? "Actualizar" : "Crear"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setForm({ id: null, nombre: "", clave: "", division: { id: "" } })}
                      disabled={submitting}
                    >
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="col-12 col-lg-7 col-xxl-8">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">Listado</h5>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Clave</th>
                        <th>División</th>
                        <th style={{ width: 160 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            <div className="spinner-border" role="status" />
                          </td>
                        </tr>
                      ) : items.length ? (
                        items.map((it) => (
                          <tr key={it.id}>
                            <td>{it.id}</td>
                            <td className="fw-medium">{it.nombre}</td>
                            <td><span className="badge text-bg-secondary">{it.clave}</span></td>
                            <td>{it.division?.clave || <span className="text-secondary">—</span>}</td>
                            <td className="text-end">
                              <div className="btn-group">
                                <button className="btn btn-outline-primary btn-sm" onClick={() => edit(it)}>
                                  Editar
                                </button>
                                <button className="btn btn-outline-danger btn-sm" onClick={() => remove(it.id)}>
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center text-secondary py-4">
                            Sin materias (o backend caído).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                
              </div>
            </div>
          </div>
        </div>
      </div>    
    </>
  );
}
