import { AuthProvider, useAuth } from './lib/auth';
import { useRouter, type Route } from './lib/router';
import { Layout } from './components/Layout';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { OrgSetupScreen } from './screens/OrgSetupScreen';
import { AssetsScreen, AssetDetailScreen } from './screens/AssetsScreen';
import { AllocationScreen } from './screens/AllocationScreen';
import { BookingScreen } from './screens/BookingScreen';
import { MaintenanceScreen } from './screens/MaintenanceScreen';
import { AuditScreen } from './screens/AuditScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { Boxes } from 'lucide-react';

function AppRoutes() {
  const { user, loading } = useAuth();
  const { route, params, navigate } = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas-200">
        <div className="w-12 h-12 rounded-xl bg-accent-500 flex items-center justify-center mb-3 animate-pulse">
          <Boxes className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <div className="text-sm text-ink-400">Loading AssetFlow…</div>
      </div>
    );
  }

  if (!user || route === 'login') {
    return <LoginScreen />;
  }

  const handleNavigate = (r: Route, p?: Record<string, string>) => navigate(r, p);

  // Role-based route access map
  const allowedRoutes: Record<string, Route[]> = {
    Admin:         ['dashboard', 'org-setup', 'audit', 'reports', 'notifications'],
    AssetManager:  ['dashboard', 'assets', 'asset-detail', 'allocation', 'maintenance', 'audit', 'reports', 'notifications'],
    DepartmentHead:['dashboard', 'assets', 'asset-detail', 'allocation', 'booking', 'notifications'],
    Employee:      ['dashboard', 'assets', 'asset-detail', 'allocation', 'booking', 'maintenance', 'notifications'],
  };

  const userRole = user.role ?? '';
  const permitted = allowedRoutes[userRole] ?? ['dashboard'];
  const effectiveRoute = permitted.includes(route) ? route : 'dashboard';

  const screen = (() => {
    switch (effectiveRoute) {
      case 'dashboard':    return <DashboardScreen onNavigate={handleNavigate} />;
      case 'org-setup':    return <OrgSetupScreen />;
      case 'assets':       return <AssetsScreen onNavigate={handleNavigate} />;
      case 'asset-detail': return <AssetDetailScreen params={params} onNavigate={handleNavigate} />;
      case 'allocation':   return <AllocationScreen params={params} onNavigate={handleNavigate} />;
      case 'booking':      return <BookingScreen />;
      case 'maintenance':  return <MaintenanceScreen />;
      case 'audit':        return <AuditScreen />;
      case 'reports':      return <ReportsScreen />;
      case 'notifications':return <NotificationsScreen />;
      default:             return <DashboardScreen onNavigate={handleNavigate} />;
    }
  })();

  return (
    <Layout current={effectiveRoute} onNavigate={handleNavigate}>
      {screen}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
