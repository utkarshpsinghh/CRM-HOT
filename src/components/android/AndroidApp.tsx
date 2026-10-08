import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { Member } from '../../types/crm';
import { AndroidBottomNav, AndroidTab } from './components/AndroidBottomNav';
import { AndroidBottomSheet } from './components/AndroidBottomSheet';
import { AndroidWarRoomView } from './views/AndroidWarRoomView';
import { AndroidLeaderboardView } from './views/AndroidLeaderboardView';
import { AndroidRosterView } from './views/AndroidRosterView';
import { AndroidOfficerOpsView } from './views/AndroidOfficerOpsView';
import { AndroidSettingsView } from './views/AndroidSettingsView';

// Modals
import { CreateEventModal } from '../events/CreateEventModal';
import { MemberFormModal } from '../members/MemberFormModal';
import { AddStrikeModal } from '../members/AddStrikeModal';

import { Shield, Flame, RefreshCw, AlertTriangle, Check, X, Award, User, Volume2, VolumeX } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface AndroidAppProps {
  onToggleForceWeb?: () => void;
  isForceWeb?: boolean;
}

export const AndroidApp: React.FC<AndroidAppProps> = ({
  onToggleForceWeb = () => {},
  isForceWeb = false,
}) => {
  const { isMainAdmin, isAuthenticated } = useAuth();
  const {
    members,
    events,
    isSyncing,
    refreshData,
    settings,
    updateSettings,
    selectedMemberForProfile,
    setSelectedMemberForProfile,
  } = useCRM();

  const [currentTab, setCurrentTab] = useState<AndroidTab>('warroom');

  // Modals state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [isAddStrikeOpen, setIsAddStrikeOpen] = useState(false);
  const [strikeMember, setStrikeMember] = useState<Member | null>(null);

  // Bottom Sheet for Member Profile
  const [profileMember, setProfileMember] = useState<Member | null>(null);

  const handleOpenAddMember = () => {
    setMemberToEdit(null);
    setIsMemberFormOpen(true);
  };

  const handleOpenEditMember = (member: Member) => {
    setMemberToEdit(member);
    setIsMemberFormOpen(true);
  };

  const handleOpenAddStrike = (member: Member) => {
    setStrikeMember(member);
    setIsAddStrikeOpen(true);
  };

  const handleSelectMember = (member: Member) => {
    setProfileMember(member);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden pt-safe pb-24">
      {/* Native App Top Bar */}
      <header className="sticky top-0 z-30 bg-[#0d1322]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Flame className="w-5 h-5 fill-slate-950 stroke-slate-950" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              <span>[HOT] ONE FOR ALL</span>
            </h1>
            <div className="text-[10px] text-amber-400 font-mono font-bold tracking-wider">
              KINGDOM #1391
            </div>
          </div>
        </div>

        {/* Sync & Refresh Button */}
        <div className="flex items-center gap-2">
          {isSyncing && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Syncing
            </span>
          )}
          <button
            onClick={() => {
              sounds.playClick();
              refreshData();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 active:scale-95 transition-all"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 px-3.5 pt-3 max-w-lg mx-auto w-full">
        {currentTab === 'warroom' && <AndroidWarRoomView />}
        {currentTab === 'leaderboard' && (
          <AndroidLeaderboardView onSelectMember={handleSelectMember} />
        )}
        {currentTab === 'roster' && (
          <AndroidRosterView
            onSelectMember={handleSelectMember}
            onOpenAddMember={handleOpenAddMember}
          />
        )}
        {currentTab === 'ops' && (
          <AndroidOfficerOpsView
            onOpenCreateEvent={() => setIsCreateEventOpen(true)}
            onOpenAddStrikePrompt={() => {
              if (members.length > 0) handleOpenAddStrike(members[0]);
            }}
          />
        )}
        {currentTab === 'settings' && (
          <AndroidSettingsView
            onToggleForceWeb={onToggleForceWeb}
            isForceWeb={isForceWeb}
          />
        )}
      </main>

      {/* Native Bottom Navigation */}
      <AndroidBottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        isMainAdmin={isMainAdmin}
        upcomingEventCount={events.filter(e => e.status === 'Scheduled').length}
      />

      {/* MEMBER PROFILE BOTTOM SHEET */}
      <AndroidBottomSheet
        isOpen={Boolean(profileMember)}
        onClose={() => setProfileMember(null)}
        title={profileMember?.name || 'Member Profile'}
        subtitle={`Alliance Rank: ${profileMember?.currentRank || 'R1'} • Kingdom #1391`}
      >
        {profileMember && (
          <div className="space-y-4">
            {/* Player Info Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Alliance Rank</span>
                <span className="font-bold text-amber-400 font-mono">
                  {profileMember.currentRank}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">In-Game Player ID</span>
                <span className="font-mono text-slate-200">
                  {profileMember.communicationNote?.match(/\[GID:([a-zA-Z0-9_-]+)\]/)?.[1] || 'Not linked'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Strikes</span>
                <span className={`font-mono font-bold ${
                  (profileMember.strikes || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {profileMember.strikes || 0} / 3
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Status</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {profileMember.status || 'Active'}
                </span>
              </div>
            </div>

            {/* Officer Quick Actions */}
            {isAuthenticated && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    const m = profileMember;
                    setProfileMember(null);
                    handleOpenAddStrike(m);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold active:scale-95 transition-transform"
                >
                  + Add Strike
                </button>
                <button
                  onClick={() => {
                    const m = profileMember;
                    setProfileMember(null);
                    handleOpenEditMember(m);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold active:scale-95 transition-transform"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        )}
      </AndroidBottomSheet>

      {/* Global Modals for Events and Members */}
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
      />
    </div>
  );
};
