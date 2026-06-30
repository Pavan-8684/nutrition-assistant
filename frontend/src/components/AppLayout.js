import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
        <div className="container-fluid px-3 px-lg-4">
          <Link className="navbar-brand fw-semibold text-success" to="/dashboard">
            Nutrition Assistant
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="mainNav">
            <div className="navbar-nav me-auto gap-lg-1">
              <NavLink className="nav-link" to="/dashboard">
                Dashboard
              </NavLink>
              <NavLink className="nav-link" to="/clients">
                Clients
              </NavLink>
              <NavLink className="nav-link" to="/meal-plans">
                Meal Plans
              </NavLink>
              <NavLink className="nav-link" to="/progress">
                Progress
              </NavLink>
              {user?.role === 'admin' && (
                <NavLink className="nav-link" to="/admin">
                  Admin
                </NavLink>
              )}
            </div>
            <div className="d-flex align-items-lg-center gap-2 flex-column flex-lg-row mt-3 mt-lg-0">
              <span className="small text-muted">
                {user?.name} · {user?.role}
              </span>
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container-fluid px-3 px-lg-4 py-4">{children}</main>
    </div>
  );
};

export default AppLayout;
