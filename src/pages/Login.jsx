// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

// Asegúrate de importar Bootstrap globalmente en tu app:
// import "bootstrap/dist/css/bootstrap.min.css";
// import "bootstrap-icons/font/bootstrap-icons.css"; // opcional (iconos)

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("admin@uteq.mx");
  const [password, setPassword] = useState("123456");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const redirectByRoles = (rolesArr = []) => {
    const roles = rolesArr.map(r => r?.toUpperCase?.().trim());
    if (roles.includes("ADMIN"))   return nav("/admin",   { replace: true });
    if (roles.includes("DOCENTE")) return nav("/docente", { replace: true });
    if (roles.includes("ALUMNO"))  return nav("/alumno",  { replace: true });
    // fallback genérico
    return nav("/", { replace: true });
  };

  // Redirige cuando el contexto ya tenga al usuario
  useEffect(() => {
    if (user?.roles?.length) {
      redirectByRoles(user.roles);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login({ email, password });

      // Fallback inmediato por si el contexto tarda un tick en actualizar:
      const token = localStorage.getItem("access_token");
      if (token) {
        const claims = jwtDecode(token);
        const rolesCsv = claims?.roles || "";
        const roles = rolesCsv.split(",").map(r => r.trim());
        redirectByRoles(roles);
      }
      // Si no hay token, el useEffect hará la redirección cuando se setee user.
    } catch (ex) {
      setErr(ex?.response?.data?.error || ex?.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-vh-100 d-flex align-items-center bg-body-tertiary py-4 py-md-5">
      <div className="container">
        <div className="row justify-content-center">
          {/* Columna contenedora responsiva */}
          <div className="col-12 col-md-10 col-lg-9 col-xl-8">
            <div className="row g-0 shadow-lg rounded-4 overflow-hidden">
              {/* Panel lateral (solo en pantallas grandes) */}
              <div className="col-lg-6 d-none d-lg-block bg-primary text-white p-4 p-xl-5">
                <div className="h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-4">
                      <span className="fs-3 fw-bold">UTEQ</span>
                      <span className="badge text-bg-light text-primary">Acceso</span>
                    </div>
                    <h2 className="fw-semibold mb-3">Bienvenido 👋</h2>
                    <p className="opacity-75 mb-4">
                      Inicia sesión para administrar <strong>usuarios, roles</strong> y acceder a los
                      <strong> módulos</strong> del sistema.
                    </p>
                    <ul className="opacity-75 small ps-3">
                      <li>Seguridad con JWT</li>
                      <li>Diseño responsivo con Bootstrap</li>
                      <li>Acceso para Admin, Docentes, Alumnos, Kioscos y Monitores</li>
                    </ul>
                  </div>
                  <div className="small opacity-75">
                    © {new Date().getFullYear()} UTEQ – Plataforma
                  </div>
                </div>
              </div>

              {/* Panel del formulario */}
              <div className="col-12 col-lg-6 bg-white p-4 p-md-5">
                <div className="mb-4 text-center text-lg-start">
                  <h1 className="h3 mb-1">Iniciar sesión</h1>
                  <p className="text-secondary mb-0 small">
                    Usa tus credenciales institucionales
                  </p>
                </div>

                {err && (
                  <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
                    <div>{err}</div>
                  </div>
                )}

                <form onSubmit={onSubmit} noValidate>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Correo</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-envelope" aria-hidden="true"></i>
                      </span>
                      <input
                        id="email"
                        type="email"
                        className="form-control"
                        placeholder="correo@uteq.mx"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="form-text">Ejemplo: admin@uteq.mx</div>
                  </div>

                  <div className="mb-2">
                    <label htmlFor="password" className="form-label">Contraseña</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-lock" aria-hidden="true"></i>
                      </span>
                      <input
                        id="password"
                        type={showPwd ? "text" : "password"}
                        className="form-control"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPwd((v) => !v)}
                        aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="remember" />
                      <label className="form-check-label" htmlFor="remember">
                        Recordarme
                      </label>
                    </div>
                    <a className="small link-primary text-decoration-none" href="#recuperar">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 d-flex align-items-center justify-content-center"
                    disabled={loading}
                  >
                    {loading && (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    )}
                    {loading ? "Entrando..." : "Entrar"}
                  </button>

                  <div className="text-center mt-3 small text-secondary">
                  <div>Admin: <code>admin@uteq.mx</code> / <code>123456</code></div>
                  <div>Docente: <code>docente1@uteq.mx</code> / <code>123456</code></div>
                  <div>Alumno: <code>alumno1@alumnos.uteq.mx</code> / <code>123456</code></div>
                  </div>

                </form>

                <hr className="my-4" />
                <div className="d-flex gap-2 justify-content-center">
                  <span className="badge text-bg-light">Bootstrap 5</span>
                  <span className="badge text-bg-light">Responsivo</span>
                  <span className="badge text-bg-light">Accesible</span>
                </div>
              </div>
            </div>

            {/* Pie pequeño visible en móvil cuando se oculta el panel lateral */}
            <p className="text-center mt-3 d-lg-none small text-secondary">
              © {new Date().getFullYear()} UTEQ – Plataforma
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
