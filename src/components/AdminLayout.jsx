// src/layouts/AdminLayout.jsx
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const closeSidebar = () => setOpen(false);

  return (
    <>
      {/* CSS embebido */}
      <style>{`
        :root {
          --side-w: 260px;
        }
        .layout {
          min-height: 100vh;
          background: #f8f9fa;
        }
        /* Sidebar base */
        .sidebar {
          width: var(--side-w);
          background: #ffffff;
          border-right: 1px solid #e9ecef;
          padding: 1rem;
          position: fixed;
          top: 56px;       /* altura navbar */
          bottom: 0;
          left: 0;
          transform: translateX(-100%);
          transition: transform .25s ease;
          z-index: 1030;   /* sobre el contenido */
        }
        .sidebar .brand {
          font-weight: 700;
          letter-spacing: .4px;
        }
        .sidebar .nav-link {
          border-radius: .75rem;
          padding: .6rem .9rem;
          font-weight: 500;
        }
        .sidebar .nav-link:hover {
          background: #f1f3f5;
        }
        .sidebar .nav-link.active {
          background: #0d6efd;
          color: #fff !important;
          box-shadow: 0 6px 20px rgba(13,110,253,.25);
        }
        .sidebar .section-title {
          font-size: .75rem;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #6c757d;
          margin: 1.25rem .5rem .5rem;
          font-weight: 600;
        }
        .sidebar .logout-btn {
          border-radius: .75rem;
        }

        /* Mostrar sidebar cuando está abierto (móvil) */
        .sidebar.show {
          transform: translateX(0);
        }

        /* Overlay para móvil cuando sidebar está abierto */
        .scrim {
          position: fixed;
          inset: 56px 0 0 0;
          background: rgba(0,0,0,.25);
          backdrop-filter: blur(1px);
          opacity: 0;
          pointer-events: none;
          transition: opacity .2s ease;
          z-index: 1029;
        }
        .scrim.show {
          opacity: 1;
          pointer-events: auto;
        }

        /* Contenido principal */
        .content {
          padding: 1.25rem;
          margin-top: 56px; /* navbar */
        }

        /* Desktop: sidebar fijo visible */
        @media (min-width: 992px) {
          .sidebar {
            transform: none; /* siempre visible */
            position: fixed;
          }
          .content {
            margin-left: var(--side-w);
          }
        }
      `}</style>

      {/* Navbar superior */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom fixed-top">
        <div className="container-fluid">
          <button
            className="btn btn-outline-primary d-lg-none me-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <i className="bi bi-list"></i>
          </button>

          <span className="navbar-brand fw-semibold">
            <i className="bi bi-speedometer2 me-2"></i> Panel UTEQ
          </span>

          <div className="ms-auto d-flex align-items-center gap-2">
            <button className="btn btn-outline-danger" onClick={logout}>
              <i className="bi bi-box-arrow-right me-2"></i>Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay (móvil) */}
      <div className={`scrim ${open ? "show" : ""}`} onClick={closeSidebar} />

      <div className="layout">
        {/* Sidebar */}
        <aside className={`sidebar ${open ? "show" : ""}`}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span className="brand">Administración</span>
            <button
              className="btn btn-light btn-sm d-lg-none"
              onClick={closeSidebar}
              aria-label="Cerrar menú"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="section-title">General</div>
          <nav className="nav flex-column gap-1">
            <NavLink to="/admin" end className="nav-link" onClick={closeSidebar}>
              <i className="bi bi-house-door me-2"></i>Dashboard
            </NavLink>
          </nav>

          <div className="section-title">Académico</div>
          <nav className="nav flex-column gap-1">
            <NavLink to="/admin/divisiones" className="nav-link" onClick={closeSidebar}>
              <i className="bi bi-diagram-3 me-2"></i>Divisiones
            </NavLink>
            <NavLink to="/admin/materias" className="nav-link" onClick={closeSidebar}>
              <i className="bi bi-journal-text me-2"></i>Materias
            </NavLink>
            <NavLink to="/admin/asignar-materias" className="nav-link" onClick={closeSidebar}>
              <i className="bi bi-journal-plus me-2"></i>Asignar Materias
            </NavLink>
            <NavLink to="/admin/usuarios" className="nav-link" onClick={closeSidebar}>
              <i className="bi bi-people me-2"></i>Usuarios
            </NavLink>
            <NavLink to="/admin/cubiculos" className="nav-link" onClick={closeSidebar}>
              <i className="bi bi-door-open me-2"></i>Cubículos
            </NavLink>
          </nav>

          <div className="mt-4">
            <button className="btn btn-outline-danger w-100 logout-btn" onClick={logout}>
              <i className="bi bi-box-arrow-right me-2"></i>Salir
            </button>
          </div>

          <div className="mt-4 small text-secondary">
            © {new Date().getFullYear()} UTEQ
          </div>
        </aside>

        {/* Contenido */}
        <main className="content">
          <div className="container-fluid">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}
