import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getErrorMessage, unwrap } from '../services/api';

const emptyMeal = {
  name: '',
  ingredients: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: ''
};

const emptyPlan = {
  startDate: '',
  endDate: '',
  meals: [{ ...emptyMeal }]
};

const splitIngredients = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const MealPlanBuilder = () => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(emptyPlan);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((client) => client._id === selectedClientId),
    [clients, selectedClientId]
  );

  const loadClients = useCallback(async () => {
    const response = await api.get('/clients?limit=50');
    const loadedClients = unwrap(response);
    setClients(loadedClients);

    setSelectedClientId((current) => current || loadedClients[0]?._id || '');
  }, []);

  const loadPlans = useCallback(async (clientId) => {
    if (!clientId) {
      setPlans([]);
      return;
    }

    const response = await api.get(`/meal-plans?clientId=${clientId}&limit=50`);
    setPlans(unwrap(response));
  }, []);

  useEffect(() => {
    loadClients().catch((apiError) => setError(getErrorMessage(apiError)));
  }, [loadClients]);

  useEffect(() => {
    loadPlans(selectedClientId).catch((apiError) => setError(getErrorMessage(apiError)));
  }, [loadPlans, selectedClientId]);

  const updatePlanField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const updateMealField = (index, field, value) => {
    setForm((current) => ({
      ...current,
      meals: current.meals.map((meal, mealIndex) =>
        mealIndex === index ? { ...meal, [field]: value } : meal
      )
    }));
  };

  const addMeal = () => {
    setForm((current) => ({ ...current, meals: [...current.meals, { ...emptyMeal }] }));
  };

  const removeMeal = (index) => {
    setForm((current) => ({
      ...current,
      meals: current.meals.filter((meal, mealIndex) => mealIndex !== index)
    }));
  };

  const resetForm = () => {
    setForm(emptyPlan);
    setEditingId('');
    setError('');
  };

  const validate = () => {
    if (!selectedClientId) {
      return 'Select a client.';
    }

    if (!form.startDate || !form.endDate) {
      return 'Start and end dates are required.';
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      return 'End date must be on or after start date.';
    }

    if (form.meals.length === 0) {
      return 'At least one meal is required.';
    }

    for (const meal of form.meals) {
      const numericValues = [meal.calories, meal.protein, meal.carbs, meal.fat].map(Number);

      if (!meal.name.trim() || splitIngredients(meal.ingredients).length === 0) {
        return 'Each meal needs a name and ingredients.';
      }

      if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
        return 'Calories and macros must be non-negative numbers.';
      }
    }

    return '';
  };

  const buildPayload = () => ({
    client: selectedClientId,
    startDate: form.startDate,
    endDate: form.endDate,
    meals: form.meals.map((meal) => ({
      name: meal.name.trim(),
      ingredients: splitIngredients(meal.ingredients),
      calories: Number(meal.calories),
      macros: {
        protein: Number(meal.protein),
        carbs: Number(meal.carbs),
        fat: Number(meal.fat)
      }
    }))
  });

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
        await api.put(`/meal-plans/${editingId}`, buildPayload());
        setSuccess('Meal plan updated.');
      } else {
        await api.post('/meal-plans', buildPayload());
        setSuccess('Meal plan created.');
      }

      resetForm();
      await loadPlans(selectedClientId);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (plan) => {
    setEditingId(plan._id);
    setSelectedClientId(plan.client?._id || plan.client);
    setForm({
      startDate: plan.startDate.slice(0, 10),
      endDate: plan.endDate.slice(0, 10),
      meals: plan.meals.map((meal) => ({
        name: meal.name,
        ingredients: meal.ingredients.join(', '),
        calories: String(meal.calories),
        protein: String(meal.macros.protein),
        carbs: String(meal.macros.carbs),
        fat: String(meal.macros.fat)
      }))
    });
    setError('');
    setSuccess('');
  };

  const deletePlan = async (planId) => {
    setError('');
    setSuccess('');

    try {
      await api.delete(`/meal-plans/${planId}`);
      setSuccess('Meal plan deleted.');
      await loadPlans(selectedClientId);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  };

  return (
    <div className="page-stack">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-lg-end">
        <div>
          <p className="section-kicker mb-1">Nutrition planning</p>
          <h1 className="page-title mb-1">Meal Plans</h1>
          <p className="text-muted mb-0">{selectedClient?.user?.name || 'No client selected'}</p>
        </div>
        <select
          className="form-select client-select"
          value={selectedClientId}
          onChange={(event) => {
            setSelectedClientId(event.target.value);
            resetForm();
          }}
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
        <div className="col-12 col-xl-5">
          <section className="content-panel">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 mb-0">{editingId ? 'Edit plan' : 'New plan'}</h2>
              {editingId && (
                <button className="btn btn-sm btn-outline-secondary" type="button" onClick={resetForm}>
                  Clear
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="startDate">
                    Start date
                  </label>
                  <input
                    className="form-control"
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={updatePlanField}
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="endDate">
                    End date
                  </label>
                  <input
                    className="form-control"
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={updatePlanField}
                    required
                  />
                </div>
              </div>

              <div className="meal-form-stack">
                {form.meals.map((meal, index) => (
                  <div className="meal-editor" key={index}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h3 className="h6 mb-0">Meal {index + 1}</h3>
                      {form.meals.length > 1 && (
                        <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => removeMeal(index)}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor={`meal-name-${index}`}>
                        Name
                      </label>
                      <input
                        className="form-control"
                        id={`meal-name-${index}`}
                        value={meal.name}
                        onChange={(event) => updateMealField(index, 'name', event.target.value)}
                        maxLength="120"
                        required
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" htmlFor={`meal-ingredients-${index}`}>
                        Ingredients
                      </label>
                      <input
                        className="form-control"
                        id={`meal-ingredients-${index}`}
                        value={meal.ingredients}
                        onChange={(event) => updateMealField(index, 'ingredients', event.target.value)}
                        required
                      />
                    </div>
                    <div className="row g-2">
                      {[
                        ['calories', 'Calories'],
                        ['protein', 'Protein'],
                        ['carbs', 'Carbs'],
                        ['fat', 'Fat']
                      ].map(([field, label]) => (
                        <div className="col-6 col-md-3" key={field}>
                          <label className="form-label" htmlFor={`${field}-${index}`}>
                            {label}
                          </label>
                          <input
                            className="form-control"
                            id={`${field}-${index}`}
                            type="number"
                            min="0"
                            step="0.1"
                            value={meal[field]}
                            onChange={(event) => updateMealField(index, field, event.target.value)}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-outline-success flex-fill" type="button" onClick={addMeal}>
                  Add meal
                </button>
                <button className="btn btn-success flex-fill" type="submit" disabled={submitting || !selectedClientId}>
                  {submitting ? 'Saving...' : editingId ? 'Save plan' : 'Create plan'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="col-12 col-xl-7">
          <section className="content-panel">
            <h2 className="h5 mb-3">Plan history</h2>
            <div className="plan-list">
              {plans.map((plan) => (
                <article className="plan-row" key={plan._id}>
                  <div>
                    <div className="fw-semibold">
                      {plan.startDate.slice(0, 10)} to {plan.endDate.slice(0, 10)}
                    </div>
                    <div className="small text-muted">{plan.meals.length} meal{plan.meals.length === 1 ? '' : 's'}</div>
                  </div>
                  <div className="nutrient-pills">
                    <span>{plan.totals.calories} cal</span>
                    <span>P {plan.totals.protein}g</span>
                    <span>C {plan.totals.carbs}g</span>
                    <span>F {plan.totals.fat}g</span>
                  </div>
                  <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-secondary" type="button" onClick={() => startEdit(plan)}>
                      Edit
                    </button>
                    <button className="btn btn-outline-danger" type="button" onClick={() => deletePlan(plan._id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {plans.length === 0 && <p className="text-muted mb-0">No meal plans for this client.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MealPlanBuilder;
