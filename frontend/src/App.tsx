import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FirstOpenFlow from './pages/FirstOpenFlow';
import LiveMatch from './pages/LiveMatch';
import Home from './pages/Home';
import MatchReport from './pages/MatchReport';
import PlayerSelection from './pages/PlayerSelection';
import PlayerProfile from './pages/PlayerProfile';
import MatchSetup from './pages/MatchSetup';
import MatchAnalysis from './pages/MatchAnalysis';
import MatchHistory from './pages/MatchHistory';
import ComingSoon from './pages/ComingSoon';
import SavedSquadsPage from './pages/SavedSquadsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import CommunityChallenges from './pages/CommunityChallenges';
import TournamentPage from './pages/TournamentPage';
import LeaderboardPage from './pages/LeaderboardPage';
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
    <ErrorBoundary>
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
          path="/player-profile"
          element={(
            <PrivateRoute>
              <PlayerProfile />
            </PrivateRoute>
          )}
        />
        <Route
          path="/match-setup"
          element={(
            <PrivateRoute>
              <MatchSetup />
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
        <Route
          path="/match-analysis"
          element={(
            <PrivateRoute>
              <MatchAnalysis />
            </PrivateRoute>
          )}
        />
        <Route
          path="/match-history"
          element={(
            <PrivateRoute>
              <MatchHistory />
            </PrivateRoute>
          )}
        />
        <Route
          path="/community-challenges"
          element={(
            <PrivateRoute>
              <CommunityChallenges />
            </PrivateRoute>
          )}
        />
        <Route
          path="/saved-squads"
          element={(
            <PrivateRoute>
              <SavedSquadsPage />
            </PrivateRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          )}
        />
        <Route
          path="/settings"
          element={(
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          )}
        />
        <Route
          path="/notifications"
          element={(
            <PrivateRoute>
              <ComingSoon />
            </PrivateRoute>
          )}
        />
        <Route
          path="/tournament"
          element={(
            <PrivateRoute>
              <TournamentPage />
            </PrivateRoute>
          )}
        />
        <Route
          path="/leaderboard"
          element={(
            <PrivateRoute>
              <LeaderboardPage />
            </PrivateRoute>
          )}
        />
        <Route
          path="/pro-subscription"
          element={(
            <PrivateRoute>
              <ComingSoon />
            </PrivateRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
