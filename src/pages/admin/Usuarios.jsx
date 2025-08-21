// src/pages/Admin/Usuarios.jsx
import { useEffect, useMemo, useState } from "react";
import {
  // Auth
  createAuthUser, updateAuthUser, deleteAuthUser, listAuthUsers,
  // Catálogo
  listAdministradores, createAdministrador, updateAdministrador, deleteAdministrador,
  listDocentes, createDocente, updateDocente, deleteDocente,
  listAlumnos, createAlumno, updateAlumno, deleteAlumno
} from "../../services/userCatalogApi";
import { catalogApi } from "../../services/api";

export default function Usuarios() {
  const [tab, setTab] = useState("ADMIN"); // ADMIN | DOCENTE | ALUMNO

  return (
    <>
      <style>{`
        .sticky-card { position: sticky; top: 80px; z-index: 1; }
        .table td, .table th { vertical-align: middle; }
        .nav-tabs .nav-link { cursor: pointer; }
      `}</style>

      <div className="container-fluid">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h1 className="h4 mb-0"><i className="bi bi-people me-2" />Usuarios</h1>
        </div>

        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button className={`nav-link ${tab==="ADMIN"?"active":""}`} onClick={() => setTab("ADMIN")}>
              Administradores
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${tab==="DOCENTE"?"active":""}`} onClick={() => setTab("DOCENTE")}>
              Docentes
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${tab==="ALUMNO"?"active":""}`} onClick={() => setTab("ALUMNO")}>
              Alumnos
            </button>
          </li>
        </ul>

        {tab === "ADMIN"  && <AdminsTab />}
        {tab === "DOCENTE" && <DocentesTab />}
        {tab === "ALUMNO"  && <AlumnosTab />}
      </div>
    </>
  );
}

/* ======================= HELPERS COMUNES ======================= */
function useToast() {
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const toastOk = (msg) => { setOk(msg); setTimeout(() => setOk(""), 2000); };
  const toastErr = (msg) => { setErr(msg); setTimeout(() => setErr(""), 3500); };
  return { ok, err, setOk, setErr, toastOk, toastErr };
}

function StatusBadge({ active }) {
  if (active) return <span className="badge text-bg-success">Activo</span>;
  return <span className="badge text-bg-secondary">Inactivo</span>;
}

/* ======================= ADMINISTRADORES ======================= */
function AdminsTab() {
  const [items, setItems] = useState([]);
  const empty = { catalogId:null, userId:null, nombre:"", email:"", activo:true, noTrabajador:"", password:"" };
  const [form, setForm] = useState(empty);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rowBusy, setRowBusy] = useState({}); // { [catalogId]: true }
  const [q, setQ] = useState("");

  const { ok, err, setErr, toastOk, toastErr } = useToast();
  const setBusyRow = (id, v) => setRowBusy(prev => ({ ...prev, [id]: v }));

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [catRes, authRes] = await Promise.all([listAdministradores(), listAuthUsers()]);
      const usersById = Object.fromEntries((authRes.data || []).map(u => [u.id, u]));
      const rows = (catRes.data || []).map(c => {
        const u = usersById[c.userId] || null;
        return {
          catalogId: c.id,
          userId: c.userId,
          noTrabajador: c.noTrabajador ?? "",
          activo: !!c.activo && !!u?.activo, // combinamos ambos
          user: u
        };
      });
      setItems(rows);
    } catch (e) {
      toastErr(e?.response?.data?.error || e?.message || "Error cargando administradores");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const refresh = async (msg) => { await load(); if (msg) toastOk(msg); };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(r =>
      (r.user?.nombre || "").toLowerCase().includes(term) ||
      (r.user?.email || "").toLowerCase().includes(term)
    );
  }, [q, items]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      if (form.catalogId) {
        // UPDATE: Auth y Catálogo
        await updateAuthUser(form.userId, { nombre: form.nombre, email: form.email, activo: form.activo });
        await updateAdministrador(form.catalogId, { noTrabajador: form.noTrabajador, activo: form.activo });
        setForm(empty);
        await refresh("Administrador actualizado");
      } else {
        // CREATE: secuencial + compensación
        const uRes = await createAuthUser({
          nombre: form.nombre,
          email: form.email,
          password: form.password || "123456",
          roles: ["ADMIN"],
          activo: form.activo
        });
        const u = uRes.data;
        try {
          await createAdministrador({ userId: u.id, noTrabajador: form.noTrabajador, activo: form.activo });
          setForm(empty);
          await refresh("Administrador creado");
        } catch (err) {
          await deleteAuthUser(u.id).catch(()=>{});
          throw err;
        }
      }
    } catch (e2) {
      toastErr(e2?.response?.data?.error || e2?.message || "No se pudo guardar");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const edit = (row) => {
    setErr("");
    setForm({
      catalogId: row.catalogId,
      userId: row.userId,
      nombre: row.user?.nombre ?? "",
      email: row.user?.email ?? "",
      activo: !!row.user?.activo && !!row.activo,
      noTrabajador: row.noTrabajador ?? "",
      password: "" // no se muestra al editar
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (row) => {
    if (!confirm("¿Eliminar este administrador? Se borrará perfil y usuario auth.")) return;
    setErr("");
    setBusyRow(row.catalogId, true);
    try {
      // 1) catálogo
      await deleteAdministrador(row.catalogId);
      // 2) auth (si falla, avisamos pero recargamos igual)
      await deleteAuthUser(row.userId).catch((e)=>{
        console.warn("Auth delete falló:", e);
        toastErr("Se eliminó del catálogo, pero no del auth: " + (e?.response?.data?.error || e?.message));
      });
      if (form.catalogId === row.catalogId) setForm(empty);
      await refresh("Administrador eliminado");
    } catch (e) {
      toastErr(e?.response?.data?.error || e?.message || "No se pudo eliminar");
      await load();
    } finally {
      setBusyRow(row.catalogId, false);
    }
  };

  return (
    <>
      {err && <div className="alert alert-warning">{err}</div>}
      {ok  && <div className="alert alert-success">{ok}</div>}

      <div className="row g-4">
        {/* Formulario */}
        <div className="col-12 col-lg-5 col-xxl-4">
          <div className="card shadow-sm sticky-card">
            <div className="card-body">
              <h5 className="card-title mb-3">{form.catalogId ? "Editar administrador" : "Crear administrador"}</h5>
              <form onSubmit={submit} className="row g-2 align-items-end">
                <div className="col-md-6">
                  <label className="form-label">Nombre</label>
                  <input className="form-control" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required/>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
                </div>
                {!form.catalogId && (
                  <div className="col-md-6">
                    <label className="form-label">Contraseña</label>
                    <input type="password" className="form-control" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={6}/>
                    <div className="form-text">Mínimo 6 caracteres</div>
                  </div>
                )}
                <div className="col-md-6">
                  <label className="form-label">No. trabajador</label>
                  <input className="form-control" value={form.noTrabajador} onChange={e=>setForm({...form,noTrabajador:e.target.value})}/>
                </div>
                <div className="col-12 d-flex align-items-center gap-3">
                  <div className="form-check">
                    <input id="a-activo" type="checkbox" className="form-check-input" checked={form.activo} onChange={e=>setForm({...form,activo:e.target.checked})}/>
                    <label htmlFor="a-activo" className="form-check-label">Activo</label>
                  </div>
                  <div className="ms-auto">
                    <button className="btn btn-primary" disabled={submitting}>
                      {submitting && <span className="spinner-border spinner-border-sm me-2" />}
                      {form.catalogId ? "Guardar cambios" : "Crear Administrador"}
                    </button>
                    {form.catalogId && (
                      <button type="button" className="btn btn-secondary ms-2" onClick={()=>setForm(empty)} disabled={submitting}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="col-12 col-lg-7 col-xxl-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="card-title mb-0">Listado</h5>
                <div className="d-flex gap-2">
                  <input className="form-control form-control-sm" placeholder="Buscar nombre/email…" value={q} onChange={e=>setQ(e.target.value)} />
                  <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-arrow-clockwise me-2" />}
                    {loading ? "Cargando..." : "Recargar"}
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>CatID</th><th>UserId</th><th>Nombre</th><th>Email</th><th>NoTrabajador</th><th>Estado</th><th style={{width:170}}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="text-center py-4"><div className="spinner-border" /></td></tr>
                    ) : filtered.length ? (
                      filtered.map(row => (
                        <tr key={row.catalogId}>
                          <td>{row.catalogId}</td>
                          <td>{row.userId}</td>
                          <td>{row.user?.nombre ?? "—"}</td>
                          <td>{row.user?.email ?? "—"}</td>
                          <td>{row.noTrabajador || ""}</td>
                          <td><StatusBadge active={!!row.activo} /></td>
                          <td className="text-end">
                            <div className="btn-group">
                              <button className="btn btn-sm btn-outline-primary" onClick={()=>edit(row)} disabled={!!rowBusy[row.catalogId]}>Editar</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(row)} disabled={!!rowBusy[row.catalogId]}>
                                {rowBusy[row.catalogId] ? <span className="spinner-border spinner-border-sm" /> : "Eliminar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={7} className="text-center text-secondary py-4">Sin registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ======================= DOCENTES ======================= */
function DocentesTab() {
  const [divs, setDivs] = useState([]);
  const [items, setItems] = useState([]);
  const empty = { catalogId:null, userId:null, nombre:"", email:"", activo:true, noEmpleado:"", divisionId:"", password:"" };
  const [form, setForm] = useState(empty);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rowBusy, setRowBusy] = useState({});
  const [q, setQ] = useState("");

  const { ok, err, setErr, toastOk, toastErr } = useToast();
  const setBusyRow = (id, v) => setRowBusy(prev => ({ ...prev, [id]: v }));

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [divRes, catRes, authRes] = await Promise.all([
        catalogApi.get("/divisiones"),
        listDocentes(),
        listAuthUsers()
      ]);
      setDivs(divRes.data || []);
      const usersById = Object.fromEntries((authRes.data || []).map(u => [u.id, u]));
      const rows = (catRes.data || []).map(c => {
        const u = usersById[c.userId] || null;
        const divId = c.division?.id ? String(c.division.id) : "";
        const divLabel = c.division?.clave ?? (divId || "—");
        return {
          catalogId: c.id,
          userId: c.userId,
          noEmpleado: c.noEmpleado ?? "",
          divisionId: divId,
          divisionLabel: divLabel,
          activo: !!c.activo && !!u?.activo,
          user: u
        };
      });
      setItems(rows);
    } catch (e) {
      toastErr(e?.response?.data?.error || e?.message || "Error cargando docentes");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const refresh = async (msg) => { await load(); if (msg) toastOk(msg); };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(r =>
      (r.user?.nombre || "").toLowerCase().includes(term) ||
      (r.user?.email || "").toLowerCase().includes(term) ||
      (r.divisionLabel || "").toLowerCase().includes(term)
    );
  }, [q, items]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      if (form.catalogId) {
        await updateAuthUser(form.userId, { nombre: form.nombre, email: form.email, activo: form.activo });
        await updateDocente(form.catalogId, { noEmpleado: form.noEmpleado, divisionId: Number(form.divisionId), activo: form.activo });
        setForm(empty);
        await refresh("Docente actualizado");
      } else {
        const uRes = await createAuthUser({
          nombre: form.nombre,
          email: form.email,
          password: form.password || "123456",
          roles: ["DOCENTE"],
          activo: form.activo
        });
        const u = uRes.data;
        try {
          await createDocente({ userId: u.id, noEmpleado: form.noEmpleado, divisionId: Number(form.divisionId), activo: form.activo });
          setForm(empty);
          await refresh("Docente creado");
        } catch (err) {
          await deleteAuthUser(u.id).catch(()=>{});
          throw err;
        }
      }
    } catch (e2) {
      toastErr(e2?.response?.data?.error || e2?.message || "No se pudo guardar");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const edit = (row) => {
    setErr("");
    setForm({
      catalogId: row.catalogId,
      userId: row.userId,
      nombre: row.user?.nombre ?? "",
      email: row.user?.email ?? "",
      activo: !!row.user?.activo && !!row.activo,
      noEmpleado: row.noEmpleado ?? "",
      divisionId: row.divisionId ?? "",
      password: ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (row) => {
    if (!confirm("¿Eliminar este docente?")) return;
    setErr("");
    setBusyRow(row.catalogId, true);
    try {
      await deleteDocente(row.catalogId);
      await deleteAuthUser(row.userId).catch((e)=>{
        console.warn("Auth delete falló:", e);
        toastErr("Se eliminó del catálogo, pero no del auth: " + (e?.response?.data?.error || e?.message));
      });
      if (form.catalogId === row.catalogId) setForm(empty);
      await refresh("Docente eliminado");
    } catch (e) {
      toastErr(e?.response?.data?.error || e?.message || "No se pudo eliminar");
      await load();
    } finally {
      setBusyRow(row.catalogId, false);
    }
  };

  return (
    <>
      {err && <div className="alert alert-warning">{err}</div>}
      {ok  && <div className="alert alert-success">{ok}</div>}

      <div className="row g-4">
        {/* Formulario */}
        <div className="col-12 col-lg-5 col-xxl-4">
          <div className="card shadow-sm sticky-card">
            <div className="card-body">
              <h5 className="card-title mb-3">{form.catalogId ? "Editar docente" : "Crear docente"}</h5>
              <form onSubmit={submit} className="row g-2 align-items-end">
                <div className="col-md-6">
                  <label className="form-label">Nombre</label>
                  <input className="form-control" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required/>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
                </div>
                {!form.catalogId && (
                  <div className="col-md-6">
                    <label className="form-label">Contraseña</label>
                    <input type="password" className="form-control" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={6}/>
                    <div className="form-text">Mínimo 6 caracteres</div>
                  </div>
                )}
                <div className="col-md-3">
                  <label className="form-label">No. empleado</label>
                  <input className="form-control" value={form.noEmpleado} onChange={e=>setForm({...form,noEmpleado:e.target.value})}/>
                </div>
                <div className="col-md-3">
                  <label className="form-label">División</label>
                  <select className="form-select" value={form.divisionId} onChange={e=>setForm({...form,divisionId:e.target.value})} required>
                    <option value="">--</option>
                    {divs.map(d => <option key={d.id} value={d.id}>{d.clave}</option>)}
                  </select>
                </div>
                <div className="col-12 d-flex align-items-center gap-3">
                  <div className="form-check">
                    <input id="d-activo" type="checkbox" className="form-check-input" checked={form.activo} onChange={e=>setForm({...form,activo:e.target.checked})}/>
                    <label htmlFor="d-activo" className="form-check-label">Activo</label>
                  </div>
                  <div className="ms-auto">
                    <button className="btn btn-primary" disabled={submitting}>
                      {submitting && <span className="spinner-border spinner-border-sm me-2" />}
                      {form.catalogId ? "Guardar cambios" : "Crear Docente"}
                    </button>
                    {form.catalogId && (
                      <button type="button" className="btn btn-secondary ms-2" onClick={()=>setForm(empty)} disabled={submitting}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="col-12 col-lg-7 col-xxl-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="card-title mb-0">Listado</h5>
                <div className="d-flex gap-2">
                  <input className="form-control form-control-sm" placeholder="Buscar nombre/email/división…" value={q} onChange={e=>setQ(e.target.value)} />
                  <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-arrow-clockwise me-2" />}
                    {loading ? "Cargando..." : "Recargar"}
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>CatID</th><th>UserId</th><th>Nombre</th><th>Email</th><th>División</th><th>NoEmpleado</th><th>Estado</th><th style={{width:170}}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border" /></td></tr>
                    ) : filtered.length ? (
                      filtered.map(row => (
                        <tr key={row.catalogId}>
                          <td>{row.catalogId}</td>
                          <td>{row.userId}</td>
                          <td>{row.user?.nombre ?? "—"}</td>
                          <td>{row.user?.email ?? "—"}</td>
                          <td>{row.divisionLabel}</td>
                          <td>{row.noEmpleado || ""}</td>
                          <td><StatusBadge active={!!row.activo} /></td>
                          <td className="text-end">
                            <div className="btn-group">
                              <button className="btn btn-sm btn-outline-primary" onClick={()=>edit(row)} disabled={!!rowBusy[row.catalogId]}>Editar</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(row)} disabled={!!rowBusy[row.catalogId]}>
                                {rowBusy[row.catalogId] ? <span className="spinner-border spinner-border-sm" /> : "Eliminar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={8} className="text-center text-secondary py-4">Sin registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ======================= ALUMNOS ======================= */
function AlumnosTab() {
  const [items, setItems] = useState([]);
  const empty = { catalogId:null, userId:null, nombre:"", email:"", activo:true, noControl:"", password:"" };
  const [form, setForm] = useState(empty);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rowBusy, setRowBusy] = useState({});
  const [q, setQ] = useState("");

  const { ok, err, setErr, toastOk, toastErr } = useToast();
  const setBusyRow = (id, v) => setRowBusy(prev => ({ ...prev, [id]: v }));

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [catRes, authRes] = await Promise.all([listAlumnos(), listAuthUsers()]);
      const usersById = Object.fromEntries((authRes.data || []).map(u=>[u.id,u]));
      const rows = (catRes.data || []).map(c => {
        const u = usersById[c.userId] || null;
        return {
          catalogId: c.id,
          userId: c.userId,
          noControl: c.noControl ?? "",
          activo: !!c.activo && !!u?.activo,
          user: u
        };
      });
      setItems(rows);
    } catch (e) {
      toastErr(e?.response?.data?.error || e?.message || "Error cargando alumnos");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const refresh = async (msg) => { await load(); if (msg) toastOk(msg); };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(r =>
      (r.user?.nombre || "").toLowerCase().includes(term) ||
      (r.user?.email || "").toLowerCase().includes(term) ||
      (r.noControl || "").toLowerCase().includes(term)
    );
  }, [q, items]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      if (form.catalogId) {
        await updateAuthUser(form.userId, { nombre: form.nombre, email: form.email, activo: form.activo });
        await updateAlumno(form.catalogId, { noControl: form.noControl, activo: form.activo });
        setForm(empty);
        await refresh("Alumno actualizado");
      } else {
        const uRes = await createAuthUser({
          nombre: form.nombre,
          email: form.email,
          password: form.password || "123456",
          roles: ["ALUMNO"],
          activo: form.activo
        });
        const u = uRes.data;
        try {
          await createAlumno({ userId: u.id, noControl: form.noControl, activo: form.activo });
          setForm(empty);
          await refresh("Alumno creado");
        } catch(err){
          await deleteAuthUser(u.id).catch(()=>{});
          throw err;
        }
      }
    } catch (e2) {
      toastErr(e2?.response?.data?.error || e2?.message || "No se pudo guardar");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const edit = (row) => {
    setErr("");
    setForm({
      catalogId: row.catalogId,
      userId: row.userId,
      nombre: row.user?.nombre ?? "",
      email: row.user?.email ?? "",
      activo: !!row.user?.activo && !!row.activo,
      noControl: row.noControl ?? "",
      password: ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (row) => {
    if (!confirm("¿Eliminar este alumno?")) return;
    setErr("");
    setBusyRow(row.catalogId, true);
    try {
      await deleteAlumno(row.catalogId);
      await deleteAuthUser(row.userId).catch((e)=>{
        console.warn("Auth delete falló:", e);
        toastErr("Se eliminó del catálogo, pero no del auth: " + (e?.response?.data?.error || e?.message));
      });
      if (form.catalogId === row.catalogId) setForm(empty);
      await refresh("Alumno eliminado");
    } catch (e) {
      toastErr(e?.response?.data?.error || e?.message || "No se pudo eliminar");
      await load();
    } finally {
      setBusyRow(row.catalogId, false);
    }
  };

  return (
    <>
      {err && <div className="alert alert-warning">{err}</div>}
      {ok  && <div className="alert alert-success">{ok}</div>}

      <div className="row g-4">
        {/* Formulario */}
        <div className="col-12 col-lg-5 col-xxl-4">
          <div className="card shadow-sm sticky-card">
            <div className="card-body">
              <h5 className="card-title mb-3">{form.catalogId ? "Editar alumno" : "Crear alumno"}</h5>
              <form onSubmit={submit} className="row g-2 align-items-end">
                <div className="col-md-6">
                  <label className="form-label">Nombre</label>
                  <input className="form-control" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required/>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
                </div>
                {!form.catalogId && (
                  <div className="col-md-6">
                    <label className="form-label">Contraseña</label>
                    <input type="password" className="form-control" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={6}/>
                    <div className="form-text">Mínimo 6 caracteres</div>
                  </div>
                )}
                <div className="col-md-6">
                  <label className="form-label">Matrícula</label>
                  <input className="form-control" value={form.noControl} onChange={e=>setForm({...form,noControl:e.target.value})} required/>
                </div>
                <div className="col-12 d-flex align-items-center gap-3">
                  <div className="form-check">
                    <input id="al-activo" type="checkbox" className="form-check-input" checked={form.activo} onChange={e=>setForm({...form,activo:e.target.checked})}/>
                    <label htmlFor="al-activo" className="form-check-label">Activo</label>
                  </div>
                  <div className="ms-auto">
                    <button className="btn btn-primary" disabled={submitting}>
                      {submitting && <span className="spinner-border spinner-border-sm me-2" />}
                      {form.catalogId ? "Guardar cambios" : "Crear Alumno"}
                    </button>
                    {form.catalogId && (
                      <button type="button" className="btn btn-secondary ms-2" onClick={()=>setForm(empty)} disabled={submitting}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="col-12 col-lg-7 col-xxl-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="card-title mb-0">Listado</h5>
                <div className="d-flex gap-2">
                  <input className="form-control form-control-sm" placeholder="Buscar nombre/email/matrícula…" value={q} onChange={e=>setQ(e.target.value)} />
                  <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-arrow-clockwise me-2" />}
                    {loading ? "Cargando..." : "Recargar"}
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>CatID</th><th>UserId</th><th>Nombre</th><th>Email</th><th>Matrícula</th><th>Estado</th><th style={{width:170}}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="text-center py-4"><div className="spinner-border" /></td></tr>
                    ) : filtered.length ? (
                      filtered.map(row => (
                        <tr key={row.catalogId}>
                          <td>{row.catalogId}</td>
                          <td>{row.userId}</td>
                          <td>{row.user?.nombre ?? "—"}</td>
                          <td>{row.user?.email ?? "—"}</td>
                          <td>{row.noControl}</td>
                          <td><StatusBadge active={!!row.activo} /></td>
                          <td className="text-end">
                            <div className="btn-group">
                              <button className="btn btn-sm btn-outline-primary" onClick={()=>edit(row)} disabled={!!rowBusy[row.catalogId]}>Editar</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(row)} disabled={!!rowBusy[row.catalogId]}>
                                {rowBusy[row.catalogId] ? <span className="spinner-border spinner-border-sm" /> : "Eliminar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={7} className="text-center text-secondary py-4">Sin registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
