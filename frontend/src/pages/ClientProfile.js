import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getErrorMessage, unwrap } from '../services/api';

const emptyForm = {
  user: '',
  dietitian: '',
  age: '',
  weight: '',
  height: '',
  dietaryRestrictions: '',
  healthConditions: '',
  goals: ''
};

const csvToArray = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const arrayToCsv = (value) => (Array.isArray(value) ? value.join(', ') : '');

const ClientProfile = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const clientResponse = await api.get('/clients?limit=50');
    setClients(unwrap(clientResponse));

    if (user.role === 'admin') {
      const userResponse = await api.get('/users?limit=100');
      setUsers(unwrap(userResponse));
    }
  }, [user.role]);

  useEffect(() => {
    loadData().catch((apiError) => setError(getErrorMessage(apiError)));
  }, [loadData]);

  const clientUsers = useMemo(() => users.filter((item) => item.role === 'user'), [users]);
  const dietitians = useMemo(
    () => users.filter((item) => item.role === 'dietitian' && item.isApproved),
    [users]
  );

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
    setError('');
  };

  const startEdit = (client) => {
    setEditingId(client._id);
    setForm({
      user: client.user?._id || client.user || '',
      dietitian: client.dietitian?._id || client.dietitian || '',
      age: String(client.age),
      weight: String(client.weight),
      height: String(client.height),
      dietaryRestrictions: arrayToCsv(client.dietaryRestrictions),
      healthConditions: arrayToCsv(client.healthConditions),
      goals: client.goals || ''
    });
    setSuccess('');
    setError('');
  };

  const validate = () => {
    const age = Number(form.age);
    const weight = Number(form.weight);
    const height = Number(form.height);

    if (editingId === '' && user.role !== 'user' && !form.user) {
      return 'Linked user is required.';
    }

    if (!Number.isFinite(age) || age <= 0 || age > 120) {
      return 'Age must be between 1 and 120.';
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      return 'Weight must be a positive number.';
    }

    if (!Number.isFinite(height) || height <= 0) {
      return 'Height must be a positive number.';
    }

    if (!form.goals.trim()) {
      return 'Goals are required.';
    }

    return '';
  };

  const buildPayload = () => {
    const payload = {
      age: Number(form.age),
      weight: Number(form.weight),
      height: Number(form.height),
      dietaryRestrictions: csvToArray(form.dietaryRestrictions),
      healthConditions: csvToArray(form.healthConditions),
      goals: form.goals.trim()
    };

    if (user.role !== 'user' && form.user) {
      payload.user = form.user;
    }

    if (user.role === 'admin') {
      payload.dietitian = form.dietitian || null;
    }

    return payload;
  };

  const handleSubmit = async (event) => {
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
      if (editingId) {
        await api.put(`/clients/${editingId}`, buildPayload());
        setSuccess('Client profile updated.');
      } else {
        await api.post('/clients', buildPayload());
        setSuccess('Client profile created.');
      }

      resetForm();
      await loadData();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteClient = async (clientId) => {
    setError('');
    setSuccess('');

    try {
      await api.delete(`/clients/${clientId}`);
      setSuccess('Client profile deleted.');
      await loadData();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  };

  return (
    <div className="page-stack">
      <div>
        <p className="section-kicker mb-1">Profile management</p>
        <h1 className="page-title mb-1">Clients</h1>
        <p className="text-muted mb-0">{clients.length} profile{clients.length === 1 ? '' : 's'}</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row g-4">
        <div className="col-12 col-xl-5">
          <section className="content-panel">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 mb-0">{editingId ? 'Edit profile' : 'New profile'}</h2>
              {editingId && (
                <button className="btn btn-sm btn-outline-secondary" type="button" onClick={resetForm}>
                  Clear
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} noValidate>
              {user.role === 'admin' && (
                <>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="user">
                      Linked user
                    </label>
                    <select className="form-select" id="user" name="user" value={form.user} onChange={updateField}>
                      <option value="">Select user</option>
                      {clientUsers.map((item) => (
                        <option value={item._id} key={item._id}>
                          {item.name} ({item.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="dietitian">
                      Dietitian
                    </label>
                    <select
                      className="form-select"
                      id="dietitian"
                      name="dietitian"
                      value={form.dietitian}
                      onChange={updateField}
                    >
                      <option value="">Unassigned</option>
                      {dietitians.map((item) => (
                        <option value={item._id} key={item._id}>
                          {item.name} ({item.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {user.role === 'dietitian' && !editingId && (
                <div className="mb-3">
                  <label className="form-label" htmlFor="user">
                    Linked user id
                  </label>
                  <input className="form-control" id="user" name="user" value={form.user} onChange={updateField} />
                </div>
              )}

              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="age">
                    Age
                  </label>
                  <input
                    className="form-control"
                    id="age"
                    name="age"
                    type="number"
                    min="1"
                    max="120"
                    value={form.age}
                    onChange={updateField}
                    required
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="weight">
                    Weight
                  </label>
                  <input
                    className="form-control"
                    id="weight"
                    name="weight"
                    type="number"
                    min="1"
                    step="0.1"
                    value={form.weight}
                    onChange={updateField}
                    required
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="height">
                    Height
                  </label>
                  <input
                    className="form-control"
                    id="height"
                    name="height"
                    type="number"
                    min="1"
                    step="0.1"
                    value={form.height}
                    onChange={updateField}
                    required
                  />
                </div>
              </div>

              <div className="mb-3 mt-3">
                <label className="form-label" htmlFor="dietaryRestrictions">
                  Dietary restrictions
                </label>
                <input
                  className="form-control"
                  id="dietaryRestrictions"
                  name="dietaryRestrictions"
                  value={form.dietaryRestrictions}
                  onChange={updateField}
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="healthConditions">
                  Health conditions
                </label>
                <input
                  className="form-control"
                  id="healthConditions"
                  name="healthConditions"
                  value={form.healthConditions}
                  onChange={updateField}
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="goals">
                  Goals
                </label>
                <textarea
                  className="form-control"
                  id="goals"
                  name="goals"
                  rows="4"
                  value={form.goals}
                  onChange={updateField}
                  maxLength="500"
                  required
                />
              </div>
              <button className="btn btn-success w-100" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Save profile' : 'Create profile'}
              </button>
            </form>
          </section>
        </div>

        <div className="col-12 col-xl-7">
          <section className="content-panel">
            <h2 className="h5 mb-3">Profiles</h2>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Vitals</th>
                    <th>Goals</th>
                    <th>Dietitian</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client._id}>
                      <td>
                        <strong>{client.user?.name || 'Client'}</strong>
                        <div className="small text-muted">{client.user?.email}</div>
                      </td>
                      <td>
                        {client.age} yrs · {client.weight} kg · {client.height} cm
                      </td>
                      <td className="table-truncate">{client.goals}</td>
                      <td>{client.dietitian?.name || 'Unassigned'}</td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-secondary" type="button" onClick={() => startEdit(client)}>
                            Edit
                          </button>
                          <button className="btn btn-outline-danger" type="button" onClick={() => deleteClient(client._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-muted">
                        No client profiles available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;
