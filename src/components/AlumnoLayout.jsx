// src/layouts/AlumnoLayout.jsx
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AlumnoLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-md bg-body-tertiary border-bottom">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold">Panel Alumno</span>

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

      {/* Body */}
      <div className="container-fluid flex-grow-1">
        <div className="row">
          {/* Sidebar (colapsa en móvil) */}
          <nav
            id="sidebarMenu"
            className="col-12 col-md-3 col-lg-2 collapse d-md-block bg-light border-end p-3"
          >
            <div className="position-sticky">
              <h6 className="text-uppercase text-muted small px-2 mb-3">
                Navegación
              </h6>

              <ul className="nav nav-pills flex-column gap-2">
                <li className="nav-item">
                  <NavLink
                    to="/alumno"
                    end
                    className={({ isActive }) =>
                      "nav-link d-flex align-items-center rounded-3 " +
                      (isActive ? "active" : "link-body-emphasis")
                    }
                  >
                    <span className="me-2">🎫</span>
                    Solicitar turno
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/alumno/mis-turnos"
                    className={({ isActive }) =>
                      "nav-link d-flex align-items-center rounded-3 " +
                      (isActive ? "active" : "link-body-emphasis")
                    }
                  >
                    <span className="me-2">🗂️</span>
                    Mis turnos
                  </NavLink>
                </li>
              </ul>

              <div className="d-md-none mt-4">
                <button onClick={logout} className="btn btn-outline-danger w-100">
                  Salir
                </button>
              </div>

              <div className="mt-4 p-3 rounded-3 bg-white border shadow-sm d-none d-md-block">
                <div className="fw-semibold mb-1">Consejo</div>
                <div className="text-muted small">
                  Revisa “Mis turnos” para ver tu historial y estado.
                </div>
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="col-12 col-md-9 col-lg-10 p-4">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Footer simple */}
      <footer className="border-top py-3 text-center text-muted small">
        © {new Date().getFullYear()} Turnos — Alumno
      </footer>
    </div>
  );
}

