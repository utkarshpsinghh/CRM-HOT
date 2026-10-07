import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import {
  User,
  Shield,
  Award,
  Key,
  Lock,
  CheckCircle2,
  Swords,
  Flame,
  MessageSquare,
  Clock,
  ShieldCheck,
  Edit2,
  AlertCircle,
  X,
  UserPlus,
  Users,
  Eye,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDateTime } from '../../utils/date';

export const AdminProfileView: React.FC = () => {
  const { admin, isMainAdmin } = useAuth();
  const { contributions, updateMyPassword, updateMyProfileName } = useCRM();

  // Filter contributions to show strictly this admin's contributions
  const myContributions = useMemo(() => {
    if (!admin) return [];
    return contributions.filter(
      c => c.adminUsername.toLowerCase() === admin.username.toLowerCase()
    );
  }, [admin, contributions]);

  // Compute personal metrics
  const myStats = useMemo(() => {
    let attendanceSum = 0;
    let eventsSum = 0;
    let strikesSum = 0;
    let membersAdded = 0;
    let membersUpdated = 0;
    let commsSum = 0;

    myContributions.forEach(c => {
      if (c.action === 'ATTENDANCE_MARKED' || c.action === 'ATTENDANCE_BULK') {
        attendanceSum += c.count || 1;
      } else if (c.action === 'EVENT_CREATED' || c.action === 'EVENT_COMPLETED') {
        eventsSum += 1;
      } else if (c.action === 'STRIKE_ADDED' || c.action === 'STRIKE_REMOVED') {
        strikesSum += 1;
      } else if (c.action === 'MEMBER_ADDED') {
        membersAdded += 1;
      } else if (c.action === 'MEMBER_UPDATED') {
        membersUpdated += 1;
      } else if (c.action === 'COMMUNICATION_LOGGED') {
        commsSum += 1;
      }
    });

    return {
      totalActions: myContributions.length,
      attendanceSum,
      eventsSum,
      strikesSum,
      membersAdded,
      membersUpdated,
      commsSum,
      rosterTotal: membersAdded + membersUpdated + commsSum,
    };
  }, [myContributions]);

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(admin?.name || admin?.username || '');
  const [isSavingName, setIsSavingName] = useState(false);

  // Sync displayName whenever admin profile updates
  useEffect(() => {
    if (admin) {
      setDisplayName(admin.name || admin.username || '');
    }
  }, [admin?.name, admin?.username]);

  // Change Password State
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [isSavingPass, setIsSavingPass] = useState(false);

  if (!admin) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
        Session not found. Please log in again.
      </div>
    );
  }

  const handleSaveName = async () => {
    const clean = displayName.trim();
    if (!clean) return;
    setIsSavingName(true);
    const ok = await updateMyProfileName(clean);
    setIsSavingName(false);
    if (ok) {
      setIsEditingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      sounds.playAlert();
      return;
    }

    if (newPass !== confirmPass) {
      setPassError('New passwords do not match.');
      sounds.playAlert();
      return;
    }

    setIsSavingPass(true);
    const ok = await updateMyPassword(newPass);
    setIsSavingPass(false);

    if (ok) {
      setPassSuccess('Your password has been securely updated!');
      setNewPass('');
      setConfirmPass('');
    } else {
      setPassError('Failed to update password. Try again.');
      sounds.playAlert();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Officer Personal Profile Header Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden w-full max-w-full">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 w-full min-w-0">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shrink-0 mt-0.5 sm:mt-0">
              <User className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveName();
                  }}
                  className="flex items-center gap-1.5 flex-wrap w-full max-w-full"
                >
                  <input
                    type="text"
                    value={displayName}
                    autoFocus
                    disabled={isSavingName}
                    onChange={e => setDisplayName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setIsEditingName(false);
                        setDisplayName(admin.name || admin.username);
                      }
                    }}
                    placeholder="Enter display name..."
                    className="flex-1 min-w-[130px] max-w-[200px] sm:max-w-[240px] px-3 py-1.5 rounded-lg bg-slate-950 border border-amber-500/50 text-slate-100 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="submit"
                      disabled={isSavingName || !displayName.trim()}
                      className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-sm disabled:opacity-50"
                      title="Save Name"
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isSavingName ? 'animate-spin' : ''}`} />
                      <span>{isSavingName ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSavingName}
                      onClick={() => {
                        sounds.playClick();
                        setIsEditingName(false);
                        setDisplayName(admin.name || admin.username);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h1 className="font-bold text-xl sm:text-2xl text-slate-100 tracking-tight truncate">
                      {admin.name || admin.username}
                    </h1>
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setIsEditingName(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      title="Edit Display Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${
                      isMainAdmin
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {isMainAdmin ? 'Main Admin' : 'Officer'}
                  </span>
                </div>
              )}

              <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2 flex-wrap">
                <span>@{admin.username}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <div className="text-xl font-bold font-mono text-amber-400">
                {myStats.totalActions}
              </div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">
                {isMainAdmin ? 'My Contributions' : 'Officer Actions'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Admin Duties & Role Scope Ribbon */}
      {/* Sub-Admin Duties & Role Scope Ribbon */}
      {!isMainAdmin && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                Officer Responsibilities & Access
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold uppercase tracking-wider">
              Operational Scope
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
              <UserPlus className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">Members Management</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Recruit new members, update ranks, status, and communication logs.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
              <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">Discipline Enforcement</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Issue penalty strikes to members who voted YES but flaked event attendance.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
              <Eye className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">Event Turnout Intel</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Search & monitor attendance turnout, polls, and inactivity alerts in view mode.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Statistics Cards (Tailored per Role) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{isMainAdmin ? 'My Contribution Statistics' : 'Officer Activity Metrics'}</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {isMainAdmin ? 'Leadership Activity' : 'Your Actions'}
          </span>
        </div>

        {isMainAdmin ? (
          /* MainAdmin 4 Metrics Cards */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Attendances Marked</span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {myStats.attendanceSum}
              </div>
              <div className="text-[10px] text-slate-500">Checks marked by you</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-blue-400" />
                <span>Events Created</span>
              </div>
              <div className="text-2xl font-bold font-mono text-blue-400">
                {myStats.eventsSum}
              </div>
              <div className="text-[10px] text-slate-500">Events scheduled by you</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Strikes Managed</span>
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400">
                {myStats.strikesSum}
              </div>
              <div className="text-[10px] text-slate-500">Disciplines handled by you</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Notes & Members</span>
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400">
                {myStats.commsSum + myStats.membersAdded + myStats.membersUpdated}
              </div>
              <div className="text-[10px] text-slate-500">Player notes logged</div>
            </div>
          </div>
        ) : (
          /* SubAdmin / R4 4 Metrics Cards */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Strikes Enforced</span>
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400">
                {myStats.strikesSum}
              </div>
              <div className="text-[10px] text-slate-500">Penalties issued by you</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Recruits Added</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {myStats.membersAdded}
              </div>
              <div className="text-[10px] text-slate-500">New warriors enrolled</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Member Updates</span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {myStats.membersUpdated}
              </div>
              <div className="text-[10px] text-slate-500">Rank & status edits</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Comms & Notes</span>
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400">
                {myStats.commsSum}
              </div>
              <div className="text-[10px] text-slate-500">Activity notes logged</div>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Left Column = My Activity Log, Right Column = Account & Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: My Specific Activity Log (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>My Activity Timeline</span>
            </h2>
            <span className="text-xs text-slate-400">
              {myContributions.length} actions recorded
            </span>
          </div>

          <div className="space-y-2.5">
            {myContributions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1.5">
                <p className="font-semibold text-slate-300">
                  No tracking actions recorded yet.
                </p>
                <p className="text-xs text-slate-500">
                  {isMainAdmin
                    ? 'Start by scheduling battle events, recording turnout, or logging notes!'
                    : 'Your officer activity will be tracked when you recruit members, update member records, or enforce battle strikes!'}
                </p>
              </div>
            ) : (
              myContributions.map(c => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-amber-400">
                      {c.targetName || c.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {safeFormatDateTime(c.timestamp)}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs">{c.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Security & Credentials Card */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Update My Password</span>
            </h3>

            {passError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  required
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  required
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingPass}
                className="btn-primary w-full py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSavingPass ? 'Updating...' : 'Change Password'}</span>
              </button>
            </form>
          </div>

          {/* Session Security Overview */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Session Security</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span>Officer Role:</span>
              <span className="font-mono text-slate-200">
                {isMainAdmin ? 'Main Admin (R5)' : 'R4 Officer'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Authority Level:</span>
              <span className="font-mono text-amber-400">
                {isMainAdmin ? 'Full Alliance Authority' : 'Operational Scope'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Login Status:</span>
              <span className="font-mono text-emerald-400">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Account Protection:</span>
              <span className="font-mono text-amber-400">Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
