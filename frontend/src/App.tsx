import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FirstOpenFlow from './pages/FirstOpenFlow';
import LiveMatch from './pages/LiveMatch';
import Home from './pages/Home';
import MatchReport from './pages/MatchReport';
import PlayerSelection from './pages/PlayerSelection';
import { hasCompletedOnboarding } from './lib/onboarding';

function AppGate() {
  const token = localStorage.getItem('token');
  const onboardingDone = hasCompletedOnboarding();

  if (!onboardingDone) {
    return <Navigate to="/welcome" replace />;
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const token = localStorage.getItem('token');
  const onboardingDone = hasCompletedOnboarding();

  if (!onboardingDone) {
    return <Navigate to="/welcome" replace />;
  }

  return token ? children : <Navigate to="/login" replace />;
};

function PublicAuthRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token');
  const onboardingDone = hasCompletedOnboarding();

  if (!onboardingDone) {
    return <Navigate to="/welcome" replace />;
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppGate />} />
        <Route path="/welcome" element={<FirstOpenFlow />} />
        <Route
          path="/signup"
          element={(
            <PublicAuthRoute>
              <SignUp />
            </PublicAuthRoute>
          )}
        />
        <Route
          path="/login"
          element={(
            <PublicAuthRoute>
              <Login />
            </PublicAuthRoute>
          )}
        />
        <Route
          path="/dashboard"
          element={(
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          )}
        />
        <Route
          path="/squad-builder"
          element={(
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          )}
        />
        <Route
          path="/player-selection"
          element={(
            <PrivateRoute>
              <PlayerSelection />
            </PrivateRoute>
          )}
        />
        <Route
          path="/live-match"
          element={(
            <PrivateRoute>
              <LiveMatch />
            </PrivateRoute>
          )}
        />
        <Route
          path="/match-report"
          element={(
            <PrivateRoute>
              <MatchReport />
            </PrivateRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
