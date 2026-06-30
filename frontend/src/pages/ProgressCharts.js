import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api, { getErrorMessage, unwrap } from '../services/api';

const colors = ['#1f7a5c', '#2f6fb0', '#d99a21'];

const emptyGoals = {
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  adherenceTarget: '85'
};

const emptyLog = {
  date: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  adherence: '',
  notes: ''
};

const toNumber = (value) => Number(value);
const isNonNegative = (value) => Number.isFinite(toNumber(value)) && toNumber(value) >= 0;

const ProgressCharts = () => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [progressRecords, setProgressRecords] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [goals, setGoals] = useState(emptyGoals);
  const [log, setLog] = useState(emptyLog);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submittingGoals, setSubmittingGoals] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((client) => client._id === selectedClientId),
    [clients, selectedClientId]
  );

  const selectedProgress = progressRecords[0] || null;

  const loadClients = useCallback(async () => {
    const response = await api.get('/clients?limit=50');
    const loadedClients = unwrap(response);
    setClients(loadedClients);

    setSelectedClientId((current) => current || loadedClients[0]?._id || '');
  }, []);

  const loadProgress = useCallback(async (clientId) => {
    if (!clientId) {
      setProgressRecords([]);
      setChartData(null);
      return;
    }

    const [recordsResponse, chartResponse] = await Promise.all([
      api.get(`/progress?clientId=${clientId}&limit=10`),
      api.get(`/progress/client/${clientId}/charts`)
    ]);
    const records = unwrap(recordsResponse);
    setProgressRecords(records);
    setChartData(unwrap(chartResponse));

    if (records[0]?.goals) {
      setGoals({
        calories: String(records[0].goals.calories),
        protein: String(records[0].goals.protein),
        carbs: String(records[0].goals.carbs),
        fat: String(records[0].goals.fat),
        adherenceTarget: String(records[0].goals.adherenceTarget)
      });
    } else {
      setGoals(emptyGoals);
    }
  }, []);

  useEffect(() => {
    loadClients().catch((apiError) => setError(getErrorMessage(apiError)));
  }, [loadClients]);

  useEffect(() => {
    loadProgress(selectedClientId).catch((apiError) => setError(getErrorMessage(apiError)));
  }, [loadProgress, selectedClientId]);

  const updateGoal = (event) => {
    setGoals((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const updateLog = (event) => {
    setLog((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const validateGoals = () => {
    if (!selectedClientId) {
      return 'Select a client.';
    }

    if (!['calories', 'protein', 'carbs', 'fat', 'adherenceTarget'].every((field) => isNonNegative(goals[field]))) {
      return 'Goals must be non-negative numbers.';
    }

    if (toNumber(goals.adherenceTarget) > 100) {
      return 'Adherence target must be 100 or less.';
    }

    return '';
  };

  const validateLog = () => {
    if (!selectedProgress) {
      return 'Create goals before logging intake.';
    }

    if (!log.date) {
      return 'Log date is required.';
    }

    if (!['calories', 'protein', 'carbs', 'fat'].every((field) => isNonNegative(log[field]))) {
      return 'Logged calories and macros must be non-negative numbers.';
    }

    if (log.adherence && (!isNonNegative(log.adherence) || toNumber(log.adherence) > 100)) {
      return 'Adherence must be between 0 and 100.';
    }

    return '';
  };

  const goalPayload = () => ({
    calories: toNumber(goals.calories),
    protein: toNumber(goals.protein),
    carbs: toNumber(goals.carbs),
    fat: toNumber(goals.fat),
    adherenceTarget: toNumber(goals.adherenceTarget)
  });

  const handleGoalsSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateGoals();

    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    setSubmittingGoals(true);
    setError('');
    setSuccess('');

    try {
      if (selectedProgress) {
        await api.put(`/progress/${selectedProgress._id}`, {
          client: selectedClientId,
          goals: goalPayload()
        });
        setSuccess('Goals updated.');
      } else {
        await api.post('/progress', {
          client: selectedClientId,
          goals: goalPayload(),
          logs: []
        });
        setSuccess('Goals created.');
      }

      await loadProgress(selectedClientId);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSubmittingGoals(false);
    }
  };

  const handleLogSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateLog();

    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    setSubmittingLog(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/progress/${selectedProgress._id}/logs`, {
        date: log.date,
        calories: toNumber(log.calories),
        macros: {
          protein: toNumber(log.protein),
          carbs: toNumber(log.carbs),
          fat: toNumber(log.fat)
        },
        ...(log.adherence ? { adherence: toNumber(log.adherence) } : {}),
        notes: log.notes
      });
      setLog(emptyLog);
      setSuccess('Intake logged.');
      await loadProgress(selectedClientId);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSubmittingLog(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-lg-end">
        <div>
          <p className="section-kicker mb-1">Progress monitoring</p>
          <h1 className="page-title mb-1">Nutrient Charts</h1>
          <p className="text-muted mb-0">{selectedClient?.user?.name || 'No client selected'}</p>
        </div>
        <select
          className="form-select client-select"
          value={selectedClientId}
          onChange={(event) => setSelectedClientId(event.target.value)}
        >
          <option value="">Select client</option>
          {clients.map((client) => (
            <option key={client._id} value={client._id}>
              {client.user?.name || client._id}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="row g-4">
            <div className="col-12">
              <section className="content-panel chart-panel">
                <h2 className="h5 mb-3">Calories</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData?.intakeOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {chartData?.latestPlannedTotals?.calories && (
                      <ReferenceLine y={chartData.latestPlannedTotals.calories} stroke="#d99a21" label="Plan" />
                    )}
                    <Line type="monotone" dataKey="calories" stroke="#1f7a5c" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </section>
            </div>
            <div className="col-12 col-lg-6">
              <section className="content-panel chart-panel">
                <h2 className="h5 mb-3">Macro distribution</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={chartData?.macroDistribution || []}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {(chartData?.macroDistribution || []).map((entry, index) => (
                        <Cell key={entry.name} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </section>
            </div>
            <div className="col-12 col-lg-6">
              <section className="content-panel chart-panel">
                <h2 className="h5 mb-3">Adherence</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData?.adherenceTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="adherence" fill="#2f6fb0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="form-stack">
            <section className="content-panel">
              <h2 className="h5 mb-3">{selectedProgress ? 'Goals' : 'Create goals'}</h2>
              <form onSubmit={handleGoalsSubmit} noValidate>
                <div className="row g-2">
                  {[
                    ['calories', 'Calories'],
                    ['protein', 'Protein'],
                    ['carbs', 'Carbs'],
                    ['fat', 'Fat'],
                    ['adherenceTarget', 'Adherence target']
                  ].map(([field, label]) => (
                    <div className="col-12 col-sm-6" key={field}>
                      <label className="form-label" htmlFor={`goal-${field}`}>
                        {label}
                      </label>
                      <input
                        className="form-control"
                        id={`goal-${field}`}
                        name={field}
                        type="number"
                        min="0"
                        max={field === 'adherenceTarget' ? '100' : undefined}
                        step="0.1"
                        value={goals[field]}
                        onChange={updateGoal}
                        required
                      />
                    </div>
                  ))}
                </div>
                <button className="btn btn-success w-100 mt-3" type="submit" disabled={submittingGoals || !selectedClientId}>
                  {submittingGoals ? 'Saving...' : selectedProgress ? 'Save goals' : 'Create goals'}
                </button>
              </form>
            </section>

            <section className="content-panel">
              <h2 className="h5 mb-3">Log intake</h2>
              <form onSubmit={handleLogSubmit} noValidate>
                <div className="mb-2">
                  <label className="form-label" htmlFor="log-date">
                    Date
                  </label>
                  <input
                    className="form-control"
                    id="log-date"
                    name="date"
                    type="date"
                    value={log.date}
                    onChange={updateLog}
                    required
                  />
                </div>
                <div className="row g-2">
                  {[
                    ['calories', 'Calories'],
                    ['protein', 'Protein'],
                    ['carbs', 'Carbs'],
                    ['fat', 'Fat'],
                    ['adherence', 'Adherence']
                  ].map(([field, label]) => (
                    <div className="col-12 col-sm-6" key={field}>
                      <label className="form-label" htmlFor={`log-${field}`}>
                        {label}
                      </label>
                      <input
                        className="form-control"
                        id={`log-${field}`}
                        name={field}
                        type="number"
                        min="0"
                        max={field === 'adherence' ? '100' : undefined}
                        step="0.1"
                        value={log[field]}
                        onChange={updateLog}
                        required={field !== 'adherence'}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="form-label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    className="form-control"
                    id="notes"
                    name="notes"
                    rows="2"
                    value={log.notes}
                    onChange={updateLog}
                    maxLength="500"
                  />
                </div>
                <button className="btn btn-outline-success w-100 mt-3" type="submit" disabled={submittingLog || !selectedProgress}>
                  {submittingLog ? 'Logging...' : 'Add log'}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressCharts;
