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
    <div className="min-h-screen bg-[#02040a] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden pt-safe pb-28">
      {/* Native App Cyber Top Bar */}
      <header className="sticky top-0 z-30 bg-[#060913]/90 backdrop-blur-xl border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-between shadow-[0_4px_25px_rgba(225,29,72,0.15)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(225,29,72,0.6)] android-float">
            <Flame className="w-5 h-5 fill-white stroke-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white flex items-center gap-1.5 font-mono">
              <span className="android-text-gradient-crimson">[HOT]</span>
              <span className="text-white">WAR MATRIX</span>
            </h1>
            <div className="text-[10px] text-cyan-400 font-mono font-bold tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              S1391 // TACTICAL HUD
            </div>
          </div>
        </div>

        {/* Sync & Refresh Button */}
        <div className="flex items-center gap-2">
          {isSyncing && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              RECON
            </span>
          )}
          <button
            onClick={() => {
              sounds.playClick();
              refreshData();
            }}
            className="w-8.5 h-8.5 rounded-xl bg-[#0b1020] border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:border-cyan-400 active:scale-90 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
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

      {/* MEMBER PROFILE DOSSIER BOTTOM SHEET */}
      <AndroidBottomSheet
        isOpen={Boolean(profileMember)}
        onClose={() => setProfileMember(null)}
        title={profileMember?.name || 'Agent Dossier'}
        subtitle={`HOT AGENT // ${profileMember?.currentRank || 'R1'} // S1391`}
      >
        {profileMember && (
          <div className="space-y-4">
            {/* Holographic Agent Card */}
            <div className="p-4 rounded-2xl bg-[#0b1020]/90 border border-cyan-500/30 space-y-2.5 shadow-[0_4px_20px_rgba(6,182,212,0.15)]">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-cyan-500/20">
                <span className="text-slate-400 uppercase tracking-wider font-mono">Combat Rank</span>
                <span className="font-black text-rose-400 font-mono px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                  {profileMember.currentRank}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-cyan-500/20">
                <span className="text-slate-400 uppercase tracking-wider font-mono">In-Game GID</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {profileMember.communicationNote?.match(/\[GID:([a-zA-Z0-9_-]+)\]/)?.[1] || 'UNLINKED'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-cyan-500/20">
                <span className="text-slate-400 uppercase tracking-wider font-mono">Disciplinary Strikes</span>
                <span className={`font-mono font-black ${
                  (profileMember.strikes || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {profileMember.strikes || 0} / 3 Strikes
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 uppercase tracking-wider font-mono">Duty Status</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {profileMember.status || 'Active'}
                </span>
              </div>
            </div>

            {/* Officer Tactical Actions */}
            {isAuthenticated && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => {
                    const m = profileMember;
                    setProfileMember(null);
                    handleOpenAddStrike(m);
                  }}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-white text-xs font-black uppercase font-mono tracking-wider active:scale-95 transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] cursor-pointer"
                >
                  + Add Strike
                </button>
                <button
                  onClick={() => {
                    const m = profileMember;
                    setProfileMember(null);
                    handleOpenEditMember(m);
                  }}
                  className="py-3 px-3 rounded-xl bg-[#0b1020] border border-cyan-500/40 text-cyan-300 text-xs font-black uppercase font-mono tracking-wider active:scale-95 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer"
                >
                  Edit Agent
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
