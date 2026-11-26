/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { StudentShell } from './components/student/StudentShell';
import { AdminDashboardShell } from './components/admin/AdminDashboardShell';
import { OfflineIndicator } from './components/common/OfflineIndicator';

const AppRouter: React.FC = () => {
  const { currentUser, activeAppMode } = usePlatform();

  const renderContent = () => {
    if (!currentUser) {
      return <AuthScreen />;
    }

    if (activeAppMode === 'admin') {
      return currentUser.role === 'admin' ? <AdminDashboardShell /> : <AuthScreen />;
    }

    // Strict Student Mode — never exposes AdminDashboardShell or admin controls
    return currentUser.role === 'student' ? <StudentShell /> : <AuthScreen />;
  };

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-x-hidden">
      <div className="flex-1 flex flex-col">{renderContent()}</div>
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <PlatformProvider>
      <AppRouter />
    </PlatformProvider>
  );
}
