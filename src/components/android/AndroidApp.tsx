import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { Member } from '../../types/crm';
import { AndroidLoginView } from './AndroidLoginView';

// Full Web CRM View Components
import { DashboardView } from '../dashboard/DashboardView';
import { MembersView } from '../members/MembersView';
import { EventsView } from '../events/EventsView';
import { AttendanceView } from '../attendance/AttendanceView';
import { LeaderboardView } from '../leaderboard/LeaderboardView';
import { InactivityTrackerView } from '../activity/InactivityTrackerView';
import { ContributionsView } from '../contributions/ContributionsView';
import { AdminProfileView } from '../profile/AdminProfileView';
import { SettingsView } from '../settings/SettingsView';

// Modals
import { CreateEventModal } from '../events/CreateEventModal';
import { MemberFormModal } from '../members/MemberFormModal';
import { AddStrikeModal } from '../members/AddStrikeModal';
import { MemberProfileModal } from '../members/MemberProfileModal';

import {
  Flame,
  RefreshCw,
  LayoutDashboard,
  Users,
  Swords,
  ClipboardCheck,
  Trophy,
  AlertTriangle,
  Award,
  User,
  Settings,
  LogOut,
  Monitor,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

interface AndroidAppProps {
  onToggleForceWeb?: () => void;
  isForceWeb?: boolean;
}

export const AndroidApp: React.FC<AndroidAppProps> = ({
  onToggleForceWeb = () => {},
  isForceWeb = false,
}) => {
  const { isAuthenticated, isMainAdmin, admin, logout } = useAuth();
  const {
    activeTab,
    setActiveTab,
    members,
    events,
    stats,
    isSyncing,
    refreshData,
    settings,
    updateSettings,
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

  const [soundEnabled, setSoundEnabled] = useState(() => settings.soundEnabled ?? true);
  const navScrollRef = useRef<HTMLDivElement>(null);

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

  const handleToggleSound = async () => {
    sounds.playClick();
    const next = !soundEnabled;
    setSoundEnabled(next);
    await updateSettings({ ...settings, soundEnabled: next });
    if (next) sounds.playSuccess();
  };

  const handleLogout = () => {
    sounds.playAlert();
    logout();
  };

  // 1. GATEWAY: First login screen then open CRM
  if (!isAuthenticated) {
    return (
      <AndroidLoginView
        onToggleForceWeb={onToggleForceWeb}
        isForceWeb={isForceWeb}
      />
    );
  }

  // Navigation Items matching the Web CRM structure exactly
  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'members',
      label: 'Members',
      icon: Users,
      badge: stats.membersWithStrikes > 0 ? `${stats.membersWithStrikes}` : null,
    },
    { id: 'events', label: 'Events', icon: Swords },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'activity', label: 'Activity', icon: AlertTriangle },
    ...(isMainAdmin ? [{ id: 'contributions', label: 'Contributions', icon: Award, badge: null }] : []),
    { id: 'profile', label: 'Profile', icon: User, badge: null },
    ...(isMainAdmin ? [{ id: 'settings', label: 'Settings', icon: Settings, badge: null }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none overflow-x-hidden pt-safe pb-safe selection:bg-amber-400 selection:text-slate-950 android-light-theme">
      {/* 1. TOP MOBILE APP BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <Flame className="w-5 h-5 fill-slate-950 stroke-slate-950" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-black tracking-tight text-slate-900 flex items-center gap-1.5 truncate">
              <span>[HOT] ONE FOR ALL</span>
            </h1>
            <div className="text-[10px] text-amber-600 font-mono font-bold tracking-wider truncate">
              KINGDOM #1391
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Cloud Sync Button */}
          <button
            onClick={() => {
              sounds.playClick();
              refreshData();
            }}
            className="h-8 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 text-[11px] font-semibold active:scale-95 transition-all"
            title="Sync Cloud Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline font-mono">{isSyncing ? 'Syncing' : 'Sync'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center active:scale-95 transition-all"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-slate-600" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Officer Profile Badge & Logout */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('profile');
              }}
              className="h-8 px-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold font-mono flex items-center gap-1 active:scale-95 transition-all truncate max-w-[90px]"
              title="View Profile"
            >
              <User className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate">{admin?.username || 'Officer'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center active:scale-95 transition-all"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. SMOOTH HORIZONTAL NAVIGATION BAR (ALIGNED FOR ALL PHONES) */}
      <nav className="sticky top-[53px] z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-2 py-1.5 overflow-x-auto scrollbar-none touch-pan-x shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div ref={navScrollRef} className="flex items-center gap-1.5 min-w-max px-1">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/60 active:scale-95'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'stroke-[2.5px] text-slate-950' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold leading-tight shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. MAIN SECTION CONTENT (PERFECTLY ALIGNED FOR ALL PHONES) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-4 py-3 animate-fade-in overflow-x-hidden">
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

      {/* 4. MODALS (ALL CONNECTED TO API) */}
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

      {/* 5. TOAST NOTIFICATIONS */}
      <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 sm:max-w-sm pointer-events-none">
        {toasts.map(toast => {
          const config = {
            success: {
              border: 'border-emerald-200 bg-white text-emerald-900',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
            },
            warning: {
              border: 'border-amber-200 bg-white text-amber-900',
              icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
            },
            error: {
              border: 'border-rose-200 bg-white text-rose-900',
              icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
            },
            info: {
              border: 'border-sky-200 bg-white text-sky-900',
              icon: <Info className="w-4 h-4 text-sky-600 shrink-0" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`p-3 rounded-2xl border shadow-xl flex items-start justify-between gap-3 pointer-events-auto backdrop-blur-md transition-all ${config.border}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5">{config.icon}</span>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    {toast.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                    {toast.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
