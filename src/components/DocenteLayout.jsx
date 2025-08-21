// src/layouts/DocenteLayout.jsx
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DocenteLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Navbar superior */}
      <nav className="navbar navbar-expand-md bg-body-tertiary border-bottom">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold">Panel Docente</span>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#sidebarMenu"
            aria-controls="sidebarMenu"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="d-none d-md-flex ms-auto">
            <button onClick={logout} className="btn btn-outline-danger">
              Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <div className="container-fluid flex-grow-1">
        <div className="row">
          {/* Sidebar (colapsa en móvil) */}
          <aside
            id="sidebarMenu"
            className="col-12 col-md-3 col-lg-2 collapse d-md-block bg-light border-end p-3"
          >
            <div className="position-sticky">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="text-uppercase text-muted small mb-0">Navegación</h6>
                <span className="badge text-bg-primary">Hoy</span>
              </div>

              <ul className="nav nav-pills flex-column gap-2">
                <li className="nav-item">
                  <NavLink
                    to="/docente"
                    end
                    className={({ isActive }) =>
                      "nav-link d-flex align-items-center rounded-3 " +
                      (isActive ? "active" : "link-body-emphasis")
                    }
                  >
                    <span className="me-2">🗂️</span>
                    Mis turnos
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    to="/docente/agenda"
                    className={({ isActive }) =>
                      "nav-link d-flex align-items-center rounded-3 " +
                      (isActive ? "active" : "link-body-emphasis")
                    }
                  >
                    <span className="me-2">📅</span>
                    Agenda
                  </NavLink>
                </li>

                {/* NUEVO: Horarios / Disponibilidad */}
                <li className="nav-item">
                  <NavLink
                    to="/docente/horarios"
                    className={({ isActive }) =>
                      "nav-link d-flex align-items-center rounded-3 " +
                      (isActive ? "active" : "link-body-emphasis")
                    }
                  >
                    <span className="me-2">⏰</span>
                    Horarios
                  </NavLink>
                </li>
              </ul>

              {/* Logout en móvil */}
              <div className="d-md-none mt-4">
                <button onClick={logout} className="btn btn-outline-danger w-100">
                  Salir
                </button>
              </div>

              {/* Bloque informativo opcional */}
              <div className="mt-4 p-3 rounded-3 bg-white border shadow-sm d-none d-md-block">
                <div className="fw-semibold mb-1">Tip</div>
                <div className="text-muted small">
                  Configura tus <strong>Horarios</strong> para permitir que tus alumnos soliciten turnos.
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="col-12 col-md-9 col-lg-10 p-4">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-top py-3 text-center text-muted small">
        © {new Date().getFullYear()} Turnos — Docente
      </footer>
    </div>
  );
}
