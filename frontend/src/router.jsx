import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import GithubCallback from './pages/GithubCallback';
import Dashboard from './pages/Dashboard';
import PublicProfile from './pages/PublicProfile';
import Leaderboard from './pages/Leaderboard';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/auth/github/callback',
    element: <GithubCallback />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'leaderboard', element: <Leaderboard /> },
      { path: 'settings', element: <Settings /> },
      { path: 'u/:username', element: <PublicProfile /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
