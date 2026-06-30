import { useEffect, useState } from 'react';
import api, { getErrorMessage, unwrap } from '../services/api';

const emptyUserForm = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  isApproved: false
};

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [form, setForm] = useState(emptyUserForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAdminData = async () => {
    const [usersResponse, analyticsResponse] = await Promise.all([
      api.get('/users?limit=100'),
      api.get('/admin/analytics')
    ]);
    setUsers(unwrap(usersResponse));
    setAnalytics(unwrap(analyticsResponse));
  };

  useEffect(() => {
    loadAdminData().catch((apiError) => setError(getErrorMessage(apiError)));
  }, []);

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validate = () => {
    if (!form.name.trim()) {
      return 'Name is required.';
    }

    if (!form.email.includes('@')) {
      return 'Enter a valid email address.';
    }

    if (form.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }

    return '';
  };

  const createUser = async (event) => {
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/users', {
        name: form.name.trim(),
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === 'dietitian' ? { isApproved: form.isApproved } : {})
      });
      setForm(emptyUserForm);
      setSuccess('User created.');
      await loadAdminData();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSubmitting(false);
    }
  };

  const changeRole = async (userId, role) => {
    setError('');
    setSuccess('');

    try {
      await api.patch(`/users/${userId}/role`, { role });
      setSuccess('Role updated.');
      await loadAdminData();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  };

  const setApproval = async (userId, approved) => {
    setError('');
    setSuccess('');

    try {
      await api.patch(`/users/${userId}/approve-dietitian`, { approved });
      setSuccess(approved ? 'Dietitian approved.' : 'Dietitian rejected.');
      await loadAdminData();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  };

  const deleteUser = async (userId) => {
    setError('');
    setSuccess('');

    try {
      await api.delete(`/users/${userId}`);
      setSuccess('User deleted.');
      await loadAdminData();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  };

  return (
    <div className="page-stack">
      <div>
        <p className="section-kicker mb-1">Administration</p>
        <h1 className="page-title mb-1">Admin Panel</h1>
        <p className="text-muted mb-0">{users.length} user{users.length === 1 ? '' : 's'}</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row g-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="metric-card">
            <span>Users</span>
            <strong>{analytics ? Object.values(analytics.roleCounts).reduce((sum, count) => sum + count, 0) : users.length}</strong>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="metric-card accent-blue">
            <span>Clients</span>
            <strong>{analytics?.clientCount ?? 0}</strong>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="metric-card accent-amber">
            <span>Pending dietitians</span>
            <strong>{analytics?.pendingDietitians ?? 0}</strong>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="metric-card accent-rose">
            <span>Progress logs</span>
            <strong>{analytics?.progressLogCount ?? 0}</strong>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <section className="content-panel">
            <h2 className="h5 mb-3">Create user</h2>
            <form onSubmit={createUser} noValidate>
              <div className="mb-3">
                <label className="form-label" htmlFor="name">
                  Name
                </label>
                <input className="form-control" id="name" name="name" value={form.name} onChange={updateField} required />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="email">
                  Email
                </label>
                <input
                  className="form-control"
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  className="form-control"
                  id="password"
                  name="password"
                  type="password"
                  minLength="8"
                  value={form.password}
                  onChange={updateField}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="role">
                  Role
                </label>
                <select className="form-select" id="role" name="role" value={form.role} onChange={updateField}>
                  <option value="user">User</option>
                  <option value="dietitian">Dietitian</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.role === 'dietitian' && (
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    id="isApproved"
                    name="isApproved"
                    type="checkbox"
                    checked={form.isApproved}
                    onChange={updateField}
                  />
                  <label className="form-check-label" htmlFor="isApproved">
                    Approved
                  </label>
                </div>
              )}
              <button className="btn btn-success w-100" type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create user'}
              </button>
            </form>
          </section>
        </div>

        <div className="col-12 col-xl-8">
          <section className="content-panel">
            <h2 className="h5 mb-3">Users</h2>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Approval</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>{item.email}</td>
                      <td>
                        <select
                          className="form-select form-select-sm role-select"
                          value={item.role}
                          onChange={(event) => changeRole(item._id, event.target.value)}
                        >
                          <option value="user">User</option>
                          <option value="dietitian">Dietitian</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        {item.role === 'dietitian' ? (
                          <span className={`status-pill ${item.isApproved ? 'approved' : 'pending'}`}>
                            {item.isApproved ? 'Approved' : 'Pending'}
                          </span>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {item.role === 'dietitian' && (
                            <>
                              <button className="btn btn-outline-success" type="button" onClick={() => setApproval(item._id, true)}>
                                Approve
                              </button>
                              <button className="btn btn-outline-warning" type="button" onClick={() => setApproval(item._id, false)}>
                                Reject
                              </button>
                            </>
                          )}
                          <button className="btn btn-outline-danger" type="button" onClick={() => deleteUser(item._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
