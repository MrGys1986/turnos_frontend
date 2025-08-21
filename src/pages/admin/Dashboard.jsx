import { useEffect, useMemo, useState } from "react";
import { catalogApi, turnosApi } from "../../services/api"; // Ajusta si usas otra instancia de axios
// Gráficas
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

// ────────────────────────────────────────────────────────────────────────────────
// Helpers de exportación y utilidades
// ────────────────────────────────────────────────────────────────────────────────
function downloadCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    if (value == null) return "";
    const str = String(value).replace(/"/g, '""');
    if (/[",\n]/.test(str)) return `"${str}"`;
    return str;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadExcel(filename, rows) {
  if (!rows?.length) return;
  // Requiere: npm i xlsx file-saver
  const XLSX = await import("xlsx");
  const { saveAs } = await import("file-saver");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Turnos");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);
}

function monthKey(date) {
  const d = new Date(date);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
}

function formatMonthLabel(key) {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function guessDate(t) {
  // Intenta distintas convenciones de nombre
  const cand = t?.fecha || t?.createdAt || t?.creadoEl || t?.fechaTurno || t?.timestamp;
  const d = cand ? new Date(cand) : null;
  return d && !isNaN(d) ? d : null;
}

function fullName(d) {
  if (!d) return "";
  const parts = [d.nombre, d.apellidoPaterno, d.apellidoMaterno].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return d.nombre || d.displayName || d.matricula || `Docente #${d.id}`;
}

// Paleta mínima de colores para gráficas
const COLORS = [
  "#2E96F5", "#E43700", "#0042A6", "#8E1100", "#EAFE07", "#0960E1", "#07173F",
  "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57",
];

// ────────────────────────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const [docentes, setDocentes] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [turnos, setTurnos] = useState([]);

  const [range, setRange] = useState("30"); // "30" | "90" | "all"

  // ── Carga de datos (ajusta endpoints según tu backend) ───────────────────────
  const loadData = async () => {
    setLoading(true);
    setError("");
    setNote("");
    try {
      const since = range === "all" ? null : new Date(Date.now() - Number(range) * 24 * 60 * 60 * 1000);
      const params = since ? { params: { desde: since.toISOString().slice(0, 10) } } : undefined;

      // Cargar catálogos primero
      const [dRes, mRes] = await Promise.all([
        catalogApi.get("/docentes"),
        catalogApi.get("/materias"),
      ]);

      const d = dRes?.data || [];
      const m = mRes?.data || [];

      // Intento 1: /turnos (global)
      let t = [];
      try {
        const tRes = await turnosApi.get("/turnos", params);
        t = Array.isArray(tRes?.data) ? tRes.data : [];
      } catch (e1) {
        console.warn("GET /turnos falló, usando respaldo por docente", e1?.response?.status);
        // Intento 2: Agregar por docente => /turnos?docenteId=...
        try {
          const ids = (d || []).map((x) => x.id ?? x.docenteId ?? x.ID).filter(Boolean);
          const settled = await Promise.allSettled(
            ids.map((id) => turnosApi.get("/turnos", { params: { docenteId: id, ...(params?.params || {}) } }))
          );
          t = settled.flatMap((r) => (r.status === "fulfilled" ? (Array.isArray(r.value?.data) ? r.value.data : []) : []));
          if (t.length) setNote("Usando respaldo: turnos agregados por docente (GET /turnos?docenteId=...).");
        } catch (e2) {
          console.warn("Respaldo por docente falló, probando /monitor/turnos", e2?.response?.status);
          // Intento 3: /monitor/turnos (si expone listado general)
          try {
            const mon = await turnosApi.get("/monitor/turnos", params);
            t = Array.isArray(mon?.data) ? mon.data : [];
            if (t.length) setNote("Usando respaldo: /monitor/turnos.");
          } catch (e3) {
            console.warn("/monitor/turnos también falló", e3?.response?.status);
          }
        }
      }

      // Si no hay turnos o falla todo, usa modo demo
      if (!Array.isArray(t) || !t.length) {
        console.warn("Sin datos de turnos; usando datos demo en memoria");
        const docenteIds = (d.length ? d : Array.from({ length: 6 }, (_, i) => ({ id: i + 1, nombre: `Docente ${i + 1}` }))).map((x) => x.id ?? x.docenteId ?? x.ID);
        const materiaIds = (m.length ? m : Array.from({ length: 8 }, (_, i) => ({ id: i + 1, nombre: `Materia ${i + 1}` }))).map((x) => x.id ?? x.materiaId ?? x.ID);
        const now = Date.now();
        const days = range === "all" ? 365 : Number(range);
        t = Array.from({ length: Math.max(120, days * 3) }, (_, i) => {
          const rnd = Math.floor(Math.random() * days);
          const fecha = new Date(now - rnd * 86400000);
          const estados = ["CREADO", "ATENDIDO", "CANCELADO"];
          return {
            id: i + 1,
            docenteId: docenteIds[Math.floor(Math.random() * docenteIds.length)],
            materiaId: materiaIds[Math.floor(Math.random() * materiaIds.length)],
            estado: estados[Math.floor(Math.random() * estados.length)],
            fecha: fecha.toISOString(),
          };
        });
        setNote((n) => n || "Modo demo: no se pudieron obtener turnos reales.");
      }

      setDocentes(d);
      setMaterias(m);
      setTurnos(t);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || e?.message || "Error al cargar el dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // ── Agregaciones ─────────────────────────────────────────────────────────────
  const { kpis, porProfesor, porMateria, porMes, porEstado, exportRows } = useMemo(() => {
    if (!turnos?.length) return { kpis: {}, porProfesor: [], porMateria: [], porMes: [], porEstado: [], exportRows: [] };

    const docenteMap = new Map(docentes.map((d) => [String(d.id ?? d.docenteId ?? d.ID), d]));
    const materiaMap = new Map(materias.map((m) => [String(m.id ?? m.materiaId ?? m.ID), m]));

    const byProf = new Map();
    const byMat = new Map();
    const byMonth = new Map();
    const byStatus = new Map();

    const rows = [];

    for (const t of turnos) {
      const did = String(t.docenteId ?? t.idDocente ?? t.docente_id ?? t.docente);
      const mid = String(t.materiaId ?? t.idMateria ?? t.materia_id ?? t.materia);
      const dInfo = docenteMap.get(did);
      const mInfo = materiaMap.get(mid);

      const dt = guessDate(t);
      const mkey = dt ? monthKey(dt) : "";

      // por profesor
      const dname = fullName(dInfo);
      byProf.set(dname, (byProf.get(dname) || 0) + 1);

      // por materia
      const mname = mInfo?.nombre || mInfo?.name || `Materia #${mid}`;
      byMat.set(mname, (byMat.get(mname) || 0) + 1);

      // por mes
      if (mkey) byMonth.set(mkey, (byMonth.get(mkey) || 0) + 1);

      // por estado
      const st = (t.estado || t.status || "DESCONOCIDO").toString().toUpperCase();
      byStatus.set(st, (byStatus.get(st) || 0) + 1);

      rows.push({
        id: t.id ?? "",
        fecha: dt ? dt.toISOString() : "",
        profesor: dname,
        materia: mname,
        estado: st,
      });
    }

    // KPIs
    const totalTurnos = turnos.length;
    const totalProfes = byProf.size;
    const totalMaterias = byMat.size;
    const promPorProf = totalProfes ? (totalTurnos / totalProfes) : 0;

    // Arrays ordenados para gráficas
    const arrProf = Array.from(byProf, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const arrMat = Array.from(byMat, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const arrStatus = Array.from(byStatus, ([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Últimos 12 meses presentes en datos
    const months = Array.from(byMonth.keys()).sort();
    const arrMonth = months.map((k) => ({ month: formatMonthLabel(k), count: byMonth.get(k) }));

    return {
      kpis: { totalTurnos, totalProfes, totalMaterias, promPorProf: Number(promPorProf.toFixed(2)) },
      porProfesor: arrProf,
      porMateria: arrMat,
      porMes: arrMonth,
      porEstado: arrStatus,
      exportRows: rows,
    };
  }, [turnos, docentes, materias]);

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4">
      <style>{`
        .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 600px)  { .kpis { grid-template-columns: 1fr; } }
        .card { border: 1px solid #E5E7EB; border-radius: 16px; padding: 16px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .title { font-size: 20px; font-weight: 700; margin: 8px 0 16px; }
        .muted { color: #6B7280; font-size: 12px; }
        .row { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
        @media (max-width: 1100px) { .row { grid-template-columns: 1fr; } }
        .btn { appearance: none; border: 1px solid #d1d5db; border-radius: 10px; padding: 8px 12px; background: #fff; cursor: pointer; font-weight: 600; }
        .btn:hover { background: #f8fafc; }
        .btn-primary { border-color: #2E96F5; }
        .toolbar { display:flex; gap:8px; align-items:center; flex-wrap: wrap; }
        .segmented { display:flex; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
        .segmented button { border:none; background:#fff; padding:8px 12px; cursor:pointer; }
        .segmented button.active { background:#2E96F5; color:#fff; }
        .empty { padding: 24px; text-align:center; color:#6B7280; }
      `}</style>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Dashboard ADMIN</h1>
      <p className="muted">Indicadores rápidos, gráficas por profesor, materias, estados y series por mes. Exporta los turnos en CSV o Excel.</p>

      <div className="toolbar" style={{ margin: "16px 0" }}>
        <div className="segmented">
          {[
            { k: "30", label: "Últimos 30 días" },
            { k: "90", label: "Últimos 90 días" },
            { k: "all", label: "Todo" },
          ].map((opt) => (
            <button key={opt.k} className={range === opt.k ? "active" : ""} onClick={() => setRange(opt.k)}>
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => downloadCSV(`turnos_${range}.csv`, exportRows)}>
          Descargar CSV
        </button>
        <button className="btn" onClick={() => downloadExcel(`turnos_${range}.xlsx`, exportRows)}>
  Descargar Excel
</button>

      </div>

      {error && <div className="card" style={{ borderColor: "#fecaca", background: "#fff1f2" }}>
        <strong>Error:</strong> {error}
      </div>}

      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="muted">Turnos totales</div>
          <div className="title">{loading ? "…" : (kpis.totalTurnos ?? 0)}</div>
        </div>
        <div className="card">
          <div className="muted">Profesores con turnos</div>
          <div className="title">{loading ? "…" : (kpis.totalProfes ?? 0)}</div>
        </div>
        <div className="card">
          <div className="muted">Materias con turnos</div>
          <div className="title">{loading ? "…" : (kpis.totalMaterias ?? 0)}</div>
        </div>
        <div className="card">
          <div className="muted">Prom. turnos / profesor</div>
          <div className="title">{loading ? "…" : (kpis.promPorProf ?? 0)}</div>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="title">Turnos por profesor (Top 10)</div>
            <span className="muted">{porProfesor.length} profesores</span>
          </div>
          {(!porProfesor?.length || loading) ? (
            <div className="empty">{loading ? "Cargando…" : "Sin datos"}</div>
          ) : (
            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <BarChart data={porProfesor.slice(0, 10)} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Turnos" fill="#2E96F5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="title">Turnos por materia</div>
            <span className="muted">{porMateria.length} materias</span>
          </div>
          {(!porMateria?.length || loading) ? (
            <div className="empty">{loading ? "Cargando…" : "Sin datos"}</div>
          ) : (
            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={porMateria.slice(0, 12)}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label
                  >
                    {porMateria.slice(0, 12).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="title">Turnos por mes</div>
          {(!porMes?.length || loading) ? (
            <div className="empty">{loading ? "Cargando…" : "Sin datos"}</div>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={porMes} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Turnos" stroke="#2E96F5" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="title">Turnos por estado</div>
          {(!porEstado?.length || loading) ? (
            <div className="empty">{loading ? "Cargando…" : "Sin datos"}</div>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={porEstado} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Turnos" radius={[8, 8, 0, 0]}>
                    {porEstado.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="title">Cómo conectar con tu backend</div>
        <ol className="muted" style={{ paddingLeft: 16 }}>
          <li><strong>/docentes</strong> debe devolver una lista con <code>id</code>, <code>nombre</code> y opcionales apellidos.</li>
          <li><strong>/materias</strong> debe devolver una lista con <code>id</code> y <code>nombre</code>.</li>
          <li><strong>/turnos</strong> debe devolver una lista con <code>id</code>, <code>docenteId</code>, <code>materiaId</code>, <code>estado</code> y <code>fecha</code> (o <em>createdAt</em>).</li>
          <li>Si tus endpoints son distintos, ajusta la función <code>loadData()</code> y los campos leídos en el mapeo.</li>
        </ol>
      </div>
    </div>
  );
}
