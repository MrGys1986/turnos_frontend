// src/pages/Admin/Cubiculos.jsx
import { useEffect, useState } from "react";
import { catalogApi } from "../../services/api";

export default function Cubiculos() {
  const [docs, setDocs] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ id: null, codigo: "", ubicacion: "", activo: true, docentes: [] });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [d, list] = await Promise.all([
        catalogApi.get("/docentes"),
        catalogApi.get("/cubiculos"),
      ]);
      setDocs(d.data || []);
      setItems(list.data || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const toggleDoc = (id) => {
    setForm((f) =>
      f.docentes.includes(id)
        ? { ...f, docentes: f.docentes.filter((d) => d !== id) }
        : { ...f, docentes: [...f.docentes, id] }
    );
  };

  const edit = async (it) => {
    setErr(""); setOk("");
    setForm({
      id: it.id,
      codigo: it.codigo || "",
      ubicacion: it.ubicacion || "",
      activo: !!it.activo,
      docentes: [],
    });
    try {
      const { data } = await catalogApi.get(`/cubiculos/${it.id}/docentes`);
      setForm((f) => ({ ...f, docentes: (data || []).map((x) => x.id) }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      // no bloquea la edición si falla este fetch
      setErr(e?.response?.data?.error || e?.message || "No se pudieron cargar docentes asignados");
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    setSubmitting(true);
    try {
      const base = { codigo: form.codigo, ubicacion: form.ubicacion, activo: form.activo };

      // crear/actualizar cubículo
      let cubId = form.id;
      if (form.id) {
        await catalogApi.put(`/cubiculos/${form.id}`, base);
      } else {
        const resp = await catalogApi.post(`/cubiculos`, base);
        cubId = resp?.data?.id;
        // fallback por si el backend no devuelve id
        if (!cubId) {
          const all = await catalogApi.get("/cubiculos");
          cubId = (all.data || []).slice(-1)[0]?.id;
        }
      }

      // Asignar docentes si hay selección y tenemos id
      if (cubId && form.docentes.length) {
        await catalogApi.put(`/cubiculos/${cubId}/docentes`, form.docentes);
      }

      setOk(form.id ? "Cubículo actualizado" : "Cubículo creado");
      setForm({ id: null, codigo: "", ubicacion: "", activo: true, docentes: [] });
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "No se pudo guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    setErr(""); setOk("");
    if (!confirm("¿Eliminar este cubículo?")) return;
    try {
      await catalogApi.delete(`/cubiculos/${id}`);
      setOk("Cubículo eliminado");
      if (form.id === id) setForm({ id: null, codigo: "", ubicacion: "", activo: true, docentes: [] });
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "No se pudo eliminar");
    }
  };

  return (
    <>
      {/* CSS embebido (toquecitos visuales sin otro archivo) */}
      <style>{`
        .chip {
          border: 1px solid #e9ecef;
          border-radius: .5rem;
          padding: .5rem .6rem;
          display: flex;
          gap: .5rem;
          align-items: flex-start;
        }
        .chip:hover { background: #f8f9fa; }
        .table td, .table th { vertical-align: middle; }
      `}</style>

      <div className="container-fluid">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="h4 mb-0">
            <i className="bi bi-door-open me-2"></i>Cubículos
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
          <div className="col-12 col-lg-5">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">{form.id ? "Editar cubículo" : "Crear cubículo"}</h5>
                <form onSubmit={save}>
                  <div className="mb-3">
                    <label htmlFor="codigo" className="form-label">Código</label>
                    <input
                      id="codigo"
                      className="form-control"
                      placeholder="Ej. C-101"
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="ubicacion" className="form-label">Ubicación</label>
                    <input
                      id="ubicacion"
                      className="form-control"
                      placeholder="Edificio A, planta baja"
                      value={form.ubicacion}
                      onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                    />
                  </div>

                  <div className="form-check mb-3">
                    <input
                      id="activo"
                      className="form-check-input"
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="activo">Activo</label>
                  </div>

                  <fieldset className="mb-3">
                    <legend className="fs-6 mb-2">Asignar docentes</legend>
                    <div className="row g-2">
                      {docs.map((d) => (
                        <div className="col-12 col-sm-6" key={d.id}>
                          <label className="chip">
                            <input
                              className="form-check-input mt-1"
                              type="checkbox"
                              checked={form.docentes.includes(d.id)}
                              onChange={() => toggleDoc(d.id)}
                            />
                            <div>
                              <div className="fw-semibold">#{d.id} — {d.noEmpleado || "s/n"}</div>
                              <div className="text-secondary small">user {d.userId}</div>
                            </div>
                          </label>
                        </div>
                      ))}
                      {!docs.length && <div className="text-secondary small ps-2">No hay docentes (o backend caído).</div>}
                    </div>
                  </fieldset>

                  <div className="d-flex gap-2">
                    <button className="btn btn-primary" disabled={submitting}>
                      {submitting && <span className="spinner-border spinner-border-sm me-2" />}
                      {form.id ? "Actualizar" : "Crear"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setForm({ id: null, codigo: "", ubicacion: "", activo: true, docentes: [] })}
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
          <div className="col-12 col-lg-7">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">Listado</h5>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Código</th>
                        <th>Ubicación</th>
                        <th>Activo</th>
                        <th style={{ width: 170 }}></th>
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
                            <td className="fw-medium">{it.codigo}</td>
                            <td>{it.ubicacion || ""}</td>
                            <td>
                              {it.activo ? (
                                <span className="badge text-bg-success">Sí</span>
                              ) : (
                                <span className="badge text-bg-secondary">No</span>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="btn-group">
                                <button className="btn btn-outline-primary btn-sm" onClick={() => edit(it)}>
                                  Editar / Asignar
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
                            Sin cubículos (o backend caído).
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
