import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { Footer } from './components/layout/Footer';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { MembersView } from './components/members/MembersView';
import { EventsView } from './components/events/EventsView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { InactivityTrackerView } from './components/activity/InactivityTrackerView';
import { SettingsView } from './components/settings/SettingsView';
import { ContributionsView } from './components/contributions/ContributionsView';
import { AdminProfileView } from './components/profile/AdminProfileView';
import { LoadingScreen } from './components/common/LoadingScreen';
import { setupClientProtection } from './utils/security';

// Modals
import { CreateEventModal } from './components/events/CreateEventModal';
import { MemberFormModal } from './components/members/MemberFormModal';
import { AddStrikeModal } from './components/members/AddStrikeModal';
import { MemberProfileModal } from './components/members/MemberProfileModal';
import { Member } from './types/crm';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, RefreshCw, Database } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, isMainAdmin } = useAuth();
  const {
    activeTab,
    selectedMemberForProfile,
    setSelectedMemberForProfile,
    toasts,
    removeToast,
    isLoading: crmLoading,
    isSyncingSheets,
    members,
    syncStatus,
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

  if (authLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Prevent showing empty / junk data while initializing
  if (crmLoading && members.length === 0) {
    return (
      <div className="min-h-screen bg-[#14110e]">
        <Header />
        <LoadingScreen message="Loading..." />
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
    <div className="min-h-screen flex flex-col bg-[#14110e] text-[#fef9ee] selection:bg-[#d97706] selection:text-[#fffbeb] w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <Header onOpenCreateEvent={() => setIsCreateEventOpen(true)} />

      {/* Syncing live banner when fetching in background */}
      {isSyncingSheets && (
        <div className="bg-[#451a03] border-b border-[#78350f] px-3 sm:px-4 py-1.5 text-center text-xs text-[#fef08a] flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#fbbf24]" />
          <span>Updating records...</span>
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

        {activeTab === 'activity' && <InactivityTrackerView />}

        {activeTab === 'contributions' && isMainAdmin && <ContributionsView />}

        {activeTab === 'profile' && <AdminProfileView />}

        {activeTab === 'settings' && isMainAdmin && <SettingsView />}
      </main>

      {/* Footer */}
      <Footer />

      {/* TOAST SYSTEM */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => {
          const config = {
            success: {
              border: 'border-emerald-600 bg-[#0f2918] text-emerald-100',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
            },
            warning: {
              border: 'border-amber-600 bg-[#331c08] text-amber-100',
              icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
            },
            error: {
              border: 'border-red-600 bg-[#330f0f] text-red-100',
              icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
            },
            info: {
              border: 'border-[#ca8a04] bg-[#29180d] text-[#fef08a]',
              icon: <Info className="w-4 h-4 text-[#fbbf24] shrink-0" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`p-3.5 rounded-lg border-2 shadow-2xl flex items-start justify-between gap-3 pointer-events-auto backdrop-blur-md transition-all ${config.border}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5">{config.icon}</span>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">
                    {toast.title}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5 font-sans leading-snug">
                    {toast.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0 mt-0.5"
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
