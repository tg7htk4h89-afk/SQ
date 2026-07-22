import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth, type Role } from './lib/auth';
import { TabBar } from './components/Shell';
import Login from './pages/Login';
import Home from './pages/Home';
import './lib/theme';

// Code splitting: the inspector's phone should not download the dashboard.
const NewInspection = lazy(() => import('./pages/NewInspection'));
const Inspection = lazy(() => import('./pages/Inspection'));
const History = lazy(() => import('./pages/History'));
const Detail = lazy(() => import('./pages/Detail'));
const Done = lazy(() => import('./pages/Done'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));

function Guard({ children, roles }: { children: JSX.Element; roles?: Role[] }) {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !can(...roles)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <>
      <Suspense fallback={<div className="grid h-dvh place-items-center"><Loader2 className="animate-spin" /></div>}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <Routes location={location}>
              <Route path="/" element={<Guard><Home /></Guard>} />
              <Route path="/inspect" element={<Guard><NewInspection /></Guard>} />
              <Route path="/inspections/:id" element={<Guard><Inspection /></Guard>} />
              <Route path="/inspections/:id/done" element={<Guard><Done /></Guard>} />
              <Route path="/history" element={<Guard><History /></Guard>} />
              <Route path="/history/:id" element={<Guard><Detail /></Guard>} />
              <Route path="/dashboard" element={<Guard roles={['SUPERVISOR', 'ADMIN']}><Dashboard /></Guard>} />
              <Route path="/admin" element={<Guard roles={['ADMIN']}><Admin /></Guard>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Suspense>
      <TabBar />
    </>
  );
}
