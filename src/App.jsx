import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import Divisiones from "./pages/admin/Divisiones";
import Materias from "./pages/admin/Materias";
import AsignarMaterias from "./pages/admin/AsignarMaterias";
import Usuarios from "./pages/admin/Usuarios";
import Cubiculos from "./pages/admin/Cubiculos";
import DocenteLayout from "./components/DocenteLayout";
import AlumnoLayout from "./components/AlumnoLayout";
import DashboardDocente from "./pages/docente/DashboardDocente";
import Horarios from "./pages/docente/Horarios"; 
import AgendaDocente from "./pages/docente/Agenda";
import SolicitarTurno from "./pages/alumno/SolicitarTurno";
import MisTurnos from "./pages/alumno/MisTurnos";
import Monitor from "./pages/monitor/Monitor";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={
        <ProtectedRoute roles={["ADMIN"]}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="divisiones" element={<Divisiones />} />
        <Route path="materias" element={<Materias />} />
        <Route path="asignar-materias" element={<AsignarMaterias />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="cubiculos" element={<Cubiculos />} />
      </Route>

       <Route path="/docente" element={
        <ProtectedRoute roles={["DOCENTE","ADMIN"]}>
          <DocenteLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardDocente />} />
        <Route path="agenda" element={<AgendaDocente />} />
        <Route path="horarios" element={<Horarios />} /> {/* ⬅ NUEVA RUTA */}
     
      </Route>

 <Route path="/alumno" element={
        <ProtectedRoute roles={["ALUMNO","ADMIN"]}>
          <AlumnoLayout />
        </ProtectedRoute>
      }>
        <Route index element={<SolicitarTurno />} />
        <Route path="mis-turnos" element={<MisTurnos />} />
      </Route>

      <Route path="/monitor" element={<Monitor />} />

 <Route path="*" element={<Login />} />

    </Routes>
  );
}
