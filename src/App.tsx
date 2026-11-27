import React from 'react';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { StudentShell } from './components/student/StudentShell';
import { AdminDashboardShell } from './components/admin/AdminDashboardShell';
import { OfflineIndicator } from './components/common/OfflineIndicator';

const PlatformRouter: React.FC = () => {
  const { currentUser, activeAppMode } = usePlatform();

  const renderMainContent = () => {
    if (!currentUser) {
      return <AuthScreen />;
    }

    if (activeAppMode === 'admin' && currentUser.role === 'admin') {
      return <AdminDashboardShell />;
    }

    if (activeAppMode === 'student' && currentUser.role === 'student') {
      return <StudentShell />;
    }

    return <AuthScreen />;
  };

  return (
    <div className="min-h-[100dvh] bg-[#090712] text-white relative selection:bg-purple-500/35 selection:text-purple-100">
      {renderMainContent()}
      <OfflineIndicator />
    </div>
  );
};

export function App() {
  return (
    <PlatformProvider>
      <PlatformRouter />
    </PlatformProvider>
  );
}

export default App;
