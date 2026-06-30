import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await register(form);
      navigate('/dashboard');
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="mb-4">
          <p className="text-success fw-semibold mb-1">Nutrition Assistant</p>
          <h1 className="h3 mb-1">Create account</h1>
          <p className="text-muted mb-0">New accounts start with user access.</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="name">
              Name
            </label>
            <input
              className="form-control"
              id="name"
              name="name"
              value={form.name}
              onChange={updateField}
              autoComplete="name"
              maxLength="80"
              required
            />
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
              autoComplete="email"
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
              value={form.password}
              onChange={updateField}
              autoComplete="new-password"
              minLength="8"
              required
            />
          </div>
          <button className="btn btn-success w-100" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <p className="text-muted mt-4 mb-0">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
};

export default Register;
