import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getErrorMessage, unwrap } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [progress, setProgress] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const requests = [
          api.get('/clients?limit=50'),
          api.get('/meal-plans?limit=50'),
          api.get('/progress?limit=50')
        ];

        if (user.role === 'admin') {
          requests.push(api.get('/admin/analytics'));
        }

        const responses = await Promise.all(requests);
        setClients(unwrap(responses[0]));
        setMealPlans(unwrap(responses[1]));
        setProgress(unwrap(responses[2]));

        if (responses[3]) {
          setAnalytics(unwrap(responses[3]));
        }
      } catch (apiError) {
        setError(getErrorMessage(apiError));
      }
    };

    loadDashboard();
  }, [user.role]);

  const latestLog = useMemo(() => {
    const logs = progress.flatMap((record) => record.logs || []);
    return logs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  }, [progress]);

  const roleSummary = {
    user: 'Personal nutrition tracking',
    dietitian: user.isApproved ? 'Assigned client care' : 'Pending approval',
    admin: 'Platform administration'
  };

  return (
    <div className="page-stack">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-lg-end">
        <div>
          <p className="section-kicker mb-1">{roleSummary[user.role]}</p>
          <h1 className="page-title mb-1">Dashboard</h1>
          <p className="text-muted mb-0">Signed in as {user.email}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-success" to="/meal-plans">
            Meal plan
          </Link>
          <Link className="btn btn-outline-success" to="/progress">
            Progress
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="metric-card">
            <span>Clients</span>
            <strong>{analytics?.clientCount ?? clients.length}</strong>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="metric-card accent-blue">
            <span>Meal plans</span>
            <strong>{analytics?.mealPlanCount ?? mealPlans.length}</strong>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="metric-card accent-amber">
            <span>Progress records</span>
            <strong>{progress.length}</strong>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="metric-card accent-rose">
            <span>Adherence</span>
            <strong>{analytics?.averageAdherence ?? latestLog?.adherence ?? 0}%</strong>
          </div>
        </div>
      </div>

      {user.role === 'dietitian' && !user.isApproved && (
        <div className="alert alert-warning mb-0">
          Your dietitian account is waiting for admin approval.
        </div>
      )}

      <div className="row g-4">
        <div className="col-12 col-xl-7">
          <section className="content-panel">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 mb-0">Recent clients</h2>
              <Link to="/clients" className="btn btn-sm btn-outline-secondary">
                View
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Goal</th>
                    <th>Dietitian</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.slice(0, 5).map((client) => (
                    <tr key={client._id}>
                      <td>{client.user?.name || 'Client'}</td>
                      <td className="table-truncate">{client.goals}</td>
                      <td>{client.dietitian?.name || 'Unassigned'}</td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-muted">
                        No clients yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-5">
          <section className="content-panel">
            <h2 className="h5 mb-3">Current scope</h2>
            <div className="scope-list">
              <div>
                <span>Role</span>
                <strong>{user.role}</strong>
              </div>
              <div>
                <span>Dietitian approval</span>
                <strong>{user.role === 'dietitian' ? (user.isApproved ? 'Approved' : 'Pending') : 'N/A'}</strong>
              </div>
              {analytics && (
                <>
                  <div>
                    <span>Pending dietitians</span>
                    <strong>{analytics.pendingDietitians}</strong>
                  </div>
                  <div>
                    <span>Planned calories</span>
                    <strong>{analytics.plannedCalories}</strong>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
