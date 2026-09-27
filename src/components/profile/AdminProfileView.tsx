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
  Sparkles,
  ShieldCheck,
  Edit2,
  Save,
  AlertCircle,
  X,
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

  // Compute this admin's personal metrics
  const myStats = useMemo(() => {
    let attendanceSum = 0;
    let eventsSum = 0;
    let strikesSum = 0;
    let commsSum = 0;

    myContributions.forEach(c => {
      if (c.action === 'ATTENDANCE_MARKED' || c.action === 'ATTENDANCE_BULK') {
        attendanceSum += c.count || 1;
      } else if (c.action === 'EVENT_CREATED' || c.action === 'EVENT_COMPLETED') {
        eventsSum += 1;
      } else if (c.action === 'STRIKE_ADDED' || c.action === 'STRIKE_REMOVED') {
        strikesSum += 1;
      } else if (c.action === 'COMMUNICATION_LOGGED' || c.action === 'MEMBER_ADDED' || c.action === 'MEMBER_UPDATED') {
        commsSum += 1;
      }
    });

    return {
      totalActions: myContributions.length,
      attendanceSum,
      eventsSum,
      strikesSum,
      commsSum,
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
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [isSavingPass, setIsSavingPass] = useState(false);

  if (!admin) {
    return (
      <div className="p-8 text-center text-stone-400 bg-[#20150f] rounded-2xl border border-[#4d2b14]">
        Session not found. Please log in again.
      </div>
    );
  }

  const getOfficerRankTitle = (actions: number) => {
    if (actions >= 50) return { title: 'Master Scribe', badge: 'bg-amber-950 text-amber-300 border-amber-500' };
    if (actions >= 25) return { title: 'War Chronicler', badge: 'bg-yellow-950 text-yellow-300 border-yellow-600' };
    if (actions >= 10) return { title: 'Battle Scribe', badge: 'bg-emerald-950 text-emerald-300 border-emerald-600' };
    return { title: 'Vanguard Scout', badge: 'bg-stone-900 text-stone-300 border-stone-600' };
  };

  const rankInfo = getOfficerRankTitle(myStats.totalActions);

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
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      setPassError('Failed to update password. Try again.');
      sounds.playAlert();
    }
  };

  return (
    <div className="space-y-6">
      {/* Officer Personal Profile Header Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#221610] to-[#1a110c] border-2 border-[#522d14] shadow-xl relative overflow-hidden w-full max-w-full">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 w-full min-w-0">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-[#801418] to-[#450a0a] border-2 border-[#ca8a04] flex items-center justify-center text-amber-300 shadow-lg shrink-0 mt-0.5 sm:mt-0">
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
                    className="flex-1 min-w-[130px] max-w-[200px] sm:max-w-[240px] px-2.5 py-1.5 rounded-xl bg-[#140c08] border-2 border-[#d97706] text-amber-200 text-base sm:text-sm font-fantasy font-black focus:outline-none focus:ring-1 focus:ring-[#f59e0b] shadow-inner"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="submit"
                      disabled={isSavingName || !displayName.trim()}
                      className="btn-kingshot-gold px-2.5 py-1.5 rounded-xl text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1 cursor-pointer shadow-sm disabled:opacity-50"
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
                      className="p-1.5 rounded-xl bg-[#1c120b] border border-[#3e2716] text-stone-400 hover:text-white cursor-pointer transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h1 className="font-fantasy font-black text-xl sm:text-2xl text-[#fffbeb] tracking-wide truncate">
                      {admin.name || admin.username}
                    </h1>
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setIsEditingName(true);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-[#2e180c] transition-colors cursor-pointer shrink-0"
                      title="Edit Display Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0 ${
                      isMainAdmin
                        ? 'bg-amber-950/90 text-amber-300 border-amber-600/70'
                        : 'bg-stone-800 text-stone-300 border-stone-600/70'
                    }`}
                  >
                    {isMainAdmin ? '👑 Main Admin' : '⚔️ R4'}
                  </span>
                </div>
              )}

              <div className="text-xs text-stone-400 font-mono mt-1 flex items-center gap-2 flex-wrap">
                <span>@{admin.username}</span>
                <span>•</span>
                <span className={`text-[10px] px-2 py-0.2 rounded font-bold border ${rankInfo.badge}`}>
                  {rankInfo.title}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="px-3 py-2 rounded-xl bg-[#140c08] border border-[#3e2716] text-right">
              <div className="text-xl font-fantasy font-black text-amber-300">
                {myStats.totalActions}
              </div>
              <div className="text-[9px] uppercase font-bold text-stone-400">My Contributions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Contributions Breakdown (ONLY Their Contributions) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-fantasy font-black text-[#fffbeb] uppercase tracking-wide flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>My Contribution Statistics</span>
          </h2>
          <span className="text-xs text-stone-400 font-mono">Your Activity</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-4 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-1">
            <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Attendances Marked</span>
            </div>
            <div className="text-2xl font-fantasy font-black text-amber-300">
              {myStats.attendanceSum}
            </div>
            <div className="text-[10px] text-stone-400">Checks marked by you</div>
          </div>

          <div className="p-4 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-1">
            <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-blue-400" />
              <span>Events Created</span>
            </div>
            <div className="text-2xl font-fantasy font-black text-blue-300">
              {myStats.eventsSum}
            </div>
            <div className="text-[10px] text-stone-400">Battles scheduled by you</div>
          </div>

          <div className="p-4 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-1">
            <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>Strikes Managed</span>
            </div>
            <div className="text-2xl font-fantasy font-black text-red-300">
              {myStats.strikesSum}
            </div>
            <div className="text-[10px] text-stone-400">Disciplines handled by you</div>
          </div>

          <div className="p-4 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-1">
            <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Notes & Roster</span>
            </div>
            <div className="text-2xl font-fantasy font-black text-purple-300">
              {myStats.commsSum}
            </div>
            <div className="text-[10px] text-stone-400">Player notes logged</div>
          </div>
        </div>
      </div>

      {/* Grid: Left Column = My Activity Log, Right Column = Account & Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: My Specific Activity Log (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-fantasy font-black text-[#fffbeb] uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>My Activity Timeline</span>
            </h2>
            <span className="text-xs text-stone-400">
              {myContributions.length} actions recorded
            </span>
          </div>

          <div className="space-y-2.5">
            {myContributions.length === 0 ? (
              <div className="p-8 text-center text-stone-400 bg-[#20150f] rounded-2xl border border-[#4d2b14]">
                You haven&apos;t recorded any tracking actions yet. Start by taking attendance or scheduling a war event!
              </div>
            ) : (
              myContributions.map(c => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-1.5 hover:border-amber-600/40 transition-colors text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-300 font-fantasy">
                      {c.targetName || c.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {safeFormatDateTime(c.timestamp)}
                    </span>
                  </div>

                  <p className="text-stone-300 text-xs">{c.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Security & Credentials Card */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#20150f] border-2 border-[#4d2b14] space-y-4 shadow-sm">
            <h3 className="font-fantasy font-black text-sm text-[#fffbeb] uppercase tracking-wide flex items-center gap-2">
              <Key className="w-4 h-4 text-[#ca8a04]" />
              <span>Update My Password</span>
            </h3>

            {passError && (
              <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  required
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  required
                  placeholder="Re-enter password"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingPass}
                className="btn-kingshot-gold w-full py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSavingPass ? 'Updating...' : 'Change Password'}</span>
              </button>
            </form>
          </div>

          {/* Session Security Overview */}
          <div className="p-4 rounded-2xl bg-[#170e0a] border border-[#3d200e] space-y-2 text-xs text-stone-400">
            <div className="font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Session Security</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#29150b]">
              <span>Officer Role:</span>
              <span className="font-mono text-stone-200">{admin.role === 'MainAdmin' ? 'Main Admin' : 'R4'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Login Status:</span>
              <span className="font-mono text-emerald-400">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Account Protection:</span>
              <span className="font-mono text-amber-300">Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
