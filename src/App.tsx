import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { Footer } from './components/layout/Footer';
import { LoginView } from './components/auth/LoginView';
import { UnderDevelopmentView } from './components/common/UnderDevelopmentView';
import { DashboardView } from './components/dashboard/DashboardView';
import { MembersView } from './components/members/MembersView';
import { EventsView } from './components/events/EventsView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { InactivityTrackerView } from './components/activity/InactivityTrackerView';
import { SettingsView } from './components/settings/SettingsView';
import { ContributionsView } from './components/contributions/ContributionsView';
import { AdminProfileView } from './components/profile/AdminProfileView';
import { LoadingScreen } from './components/common/LoadingScreen';
import { setupClientProtection } from './utils/security';
import { storageService } from './services/storage';

// Modals
import { CreateEventModal } from './components/events/CreateEventModal';
import { MemberFormModal } from './components/members/MemberFormModal';
import { AddStrikeModal } from './components/members/AddStrikeModal';
import { MemberProfileModal } from './components/members/MemberProfileModal';
import { Member } from './types/crm';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, RefreshCw, Database } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AndroidApp } from './components/android/AndroidApp';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, isMainAdmin, logout } = useAuth();
  const {
    activeTab,
    selectedMemberForProfile,
    setSelectedMemberForProfile,
    toasts,
    removeToast,
    isLoading: crmLoading,
    isSyncing,
    members,
    syncStatus,
    settings,
  } = useCRM();

  // Modals state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);

  const [isAddStrikeOpen, setIsAddStrikeOpen] = useState(false);
  const [strikeMember, setStrikeMember] = useState<Member | null>(null);
  const [strikeReason, setStrikeReason] = useState<string>('');

  // Initialize client security protection against code inspection, right click, and hotkeys
  React.useEffect(() => {
    const cleanup = setupClientProtection();
    return cleanup;
  }, []);

  const isDevMode = Boolean(settings?.underDevelopment);

  // If development mode is active, automatically suspend any active R4 officer session
  React.useEffect(() => {
    if (isDevMode && isAuthenticated && !isMainAdmin) {
      storageService.setRevokedNotice('Portal is currently in development mode. Officer (R4) login is restricted to Main Admin.');
      logout();
    }
  }, [isDevMode, isAuthenticated, isMainAdmin, logout]);

  // Detect whether to display the dedicated native Android UI
  const [uiMode, setUiMode] = useState<'auto' | 'android' | 'web'>(() => {
    try {
      const saved = localStorage.getItem('crm_ui_mode');
      if (saved === 'android' || saved === 'web') return saved;
      const params = new URLSearchParams(window.location.search);
      if (params.get('ui') === 'android') return 'android';
      if (params.get('ui') === 'web') return 'web';
    } catch {}
    return 'auto';
  });

  const isAndroidNative = Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android';
  const showAndroidUI = uiMode === 'android' || (uiMode === 'auto' && isAndroidNative);

  const handleToggleForceWeb = () => {
    const next = showAndroidUI ? 'web' : 'android';
    setUiMode(next);
    localStorage.setItem('crm_ui_mode', next);
  };

  if (authLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // Render dedicated Cyber Android App if on Android platform
  if (showAndroidUI) {
    return <AndroidApp onToggleForceWeb={handleToggleForceWeb} isForceWeb={false} />;
  }

  if (!isAuthenticated) {
    if (isDevMode) {
      return <UnderDevelopmentView />;
    }
    return <LoginView />;
  }

  // Double safety: If development mode is active and user is not Main Admin, enforce maintenance screen
  if (isDevMode && !isMainAdmin) {
    return <UnderDevelopmentView />;
  }

  // Prevent showing empty / junk data while initializing
  if (crmLoading && members.length === 0) {
    return (
      <div className="min-h-screen bg-[#090d16]">
        <Header />
        <LoadingScreen message="Loading records..." />
      </div>
    );
  }

  const handleOpenAddMember = () => {
    setMemberToEdit(null);
    setIsMemberFormOpen(true);
  };

  const handleOpenEditMember = (member: Member) => {
    setMemberToEdit(member);
    setIsMemberFormOpen(true);
  };

  const handleOpenAddStrike = (member: Member, defaultReason: string = '') => {
    setStrikeMember(member);
    setStrikeReason(defaultReason);
    setIsAddStrikeOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-amber-500 selection:text-slate-950 w-full max-w-full overflow-x-hidden">
      {/* Portal Maintenance Status Banner */}
      {isDevMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 sm:px-4 py-1.5 text-center text-xs text-amber-200 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-amber-300">
            Portal Under Maintenance
          </span>
          <span className="text-slate-400 hidden sm:inline">• Public visitors see the maintenance page</span>
        </div>
      )}

      {/* Top Header */}
      <Header onOpenCreateEvent={() => setIsCreateEventOpen(true)} />

      {/* Syncing live banner when fetching in background */}
      {isSyncing && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 sm:px-4 py-1.5 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
          <span>Updating alliance records...</span>
        </div>
      )}

      {/* Main Game Navigation Tabs */}
      <Navigation />

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 py-4 sm:py-6 animate-fade-in overflow-x-hidden">
        {activeTab === 'dashboard' && (
          <DashboardView
            onOpenCreateEvent={() => setIsCreateEventOpen(true)}
            onOpenAddMember={handleOpenAddMember}
          />
        )}

        {activeTab === 'members' && (
          <MembersView
            onOpenAddMember={handleOpenAddMember}
            onOpenEditMember={handleOpenEditMember}
            onOpenAddStrike={m => handleOpenAddStrike(m)}
          />
        )}

        {activeTab === 'events' && (
          <EventsView onOpenCreateEvent={() => setIsCreateEventOpen(true)} />
        )}

        {activeTab === 'attendance' && (
          <AttendanceView onOpenAddStrike={(m, r) => handleOpenAddStrike(m, r)} />
        )}

        {activeTab === 'leaderboard' && <LeaderboardView />}

        {activeTab === 'activity' && <InactivityTrackerView />}

        {activeTab === 'contributions' && isMainAdmin && <ContributionsView />}

        {activeTab === 'profile' && <AdminProfileView />}

        {activeTab === 'settings' && isMainAdmin && <SettingsView />}
      </main>

      {/* Footer */}
      <Footer />

      {/* TOAST SYSTEM */}
      <div className="fixed bottom-3 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 sm:max-w-sm pointer-events-none">
        {toasts.map(toast => {
          const config = {
            success: {
              border: 'border-emerald-500/30 bg-slate-900/95 text-emerald-200',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
            },
            warning: {
              border: 'border-amber-500/30 bg-slate-900/95 text-amber-200',
              icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
            },
            error: {
              border: 'border-rose-500/30 bg-slate-900/95 text-rose-200',
              icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
            },
            info: {
              border: 'border-sky-500/30 bg-slate-900/95 text-sky-200',
              icon: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`p-3.5 rounded-xl border shadow-xl flex items-start justify-between gap-3 pointer-events-auto backdrop-blur-md transition-all ${config.border}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5">{config.icon}</span>
                <div>
                  <h4 className="font-semibold text-xs text-slate-100">
                    {toast.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                    {toast.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* GLOBAL MODALS */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
      />

      <MemberFormModal
        isOpen={isMemberFormOpen}
        onClose={() => setIsMemberFormOpen(false)}
        memberToEdit={memberToEdit}
      />

      <AddStrikeModal
        isOpen={isAddStrikeOpen}
        onClose={() => setIsAddStrikeOpen(false)}
        member={strikeMember}
        defaultReason={strikeReason}
      />

      <MemberProfileModal
        isOpen={Boolean(selectedMemberForProfile)}
        onClose={() => setSelectedMemberForProfile(null)}
        member={selectedMemberForProfile}
        onOpenAddStrike={m => handleOpenAddStrike(m)}
        onOpenEditMember={m => handleOpenEditMember(m)}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <CRMProvider>
        <MainAppContent />
      </CRMProvider>
    </AuthProvider>
  );
}

export default App;
