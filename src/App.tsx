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

// Modals
import { CreateEventModal } from './components/events/CreateEventModal';
import { MemberFormModal } from './components/members/MemberFormModal';
import { AddStrikeModal } from './components/members/AddStrikeModal';
import { MemberProfileModal } from './components/members/MemberProfileModal';
import { Member } from './types/crm';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    activeTab,
    selectedMemberForProfile,
    setSelectedMemberForProfile,
    toasts,
    removeToast,
  } = useCRM();

  // Modals state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);

  const [isAddStrikeOpen, setIsAddStrikeOpen] = useState(false);
  const [strikeMember, setStrikeMember] = useState<Member | null>(null);
  const [strikeReason, setStrikeReason] = useState<string>('');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0d12] text-[#fef08a] font-fantasy">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#ca8a04] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm uppercase tracking-widest">Opening Alliance Gateways...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
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
    <div className="min-h-screen flex flex-col bg-[#0b0d14] text-[#f4ecd8] selection:bg-[#991b1b] selection:text-[#fef08a]">
      {/* Top Header */}
      <Header />

      {/* Main Game Banner Tabs */}
      <Navigation />

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">
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

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Footer */}
      <Footer />

      {/* TOAST SYSTEM */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => {
          const config = {
            success: {
              border: 'border-emerald-500 bg-emerald-950/90 text-emerald-200',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
            },
            warning: {
              border: 'border-amber-500 bg-amber-950/90 text-amber-200',
              icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
            },
            error: {
              border: 'border-red-500 bg-red-950/90 text-red-200',
              icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
            },
            info: {
              border: 'border-[#ca8a04] bg-[#1a160c]/95 text-[#fef08a]',
              icon: <Info className="w-4 h-4 text-[#eab308] shrink-0" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`p-3.5 rounded-lg border-2 shadow-2xl flex items-start justify-between gap-3 pointer-events-auto backdrop-blur-md transition-all animate-slideIn ${config.border}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5">{config.icon}</span>
                <div>
                  <h4 className="font-fantasy font-bold text-xs uppercase tracking-wider">
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
