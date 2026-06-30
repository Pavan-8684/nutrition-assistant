import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ClientProfile = lazy(() => import('./pages/ClientProfile'));
const MealPlanBuilder = lazy(() => import('./pages/MealPlanBuilder'));
const ProgressCharts = lazy(() => import('./pages/ProgressCharts'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

const protectedPage = (page, roles) => (
  <ProtectedRoute roles={roles}>
    <AppLayout>{page}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<div className="page-loader">Loading...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={protectedPage(<Dashboard />)} />
        <Route path="/clients" element={protectedPage(<ClientProfile />)} />
        <Route path="/meal-plans" element={protectedPage(<MealPlanBuilder />)} />
        <Route path="/progress" element={protectedPage(<ProgressCharts />)} />
        <Route path="/admin" element={protectedPage(<AdminPanel />, ['admin'])} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
