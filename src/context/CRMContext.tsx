import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Member,
  AllianceEvent,
  AttendanceRecord,
  StrikeRecord,
  CommunicationRecord,
  AllianceSettings,
  DashboardStats,
  InactiveMemberInsight,
  AdminAccount,
  VoteStatus,
  AttendanceStatus,
  OfficerContribution,
  ContributionActionType,
} from '../types/crm';
import { storageService } from '../services/storage';
import { apiService } from '../services/api';
import { sounds } from '../utils/sound';
import { useAuth } from './AuthContext';

export interface ToastNotice {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

interface CRMContextType {
  members: Member[];
  events: AllianceEvent[];
  attendance: AttendanceRecord[];
  strikes: StrikeRecord[];
  communications: CommunicationRecord[];
  settings: AllianceSettings;
  inactiveInsights: InactiveMemberInsight[];
  stats: DashboardStats;
  admins: AdminAccount[];
  contributions: OfficerContribution[];
  syncStatus: 'connected' | 'demo' | 'syncing' | 'error';
  syncMessage: string;
  isLoading: boolean;
  isSyncingSheets: boolean;
  lastSyncTime: string | null;
  toasts: ToastNotice[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedMemberForProfile: Member | null;
  setSelectedMemberForProfile: (member: Member | null) => void;
  selectedEventIdForAttendance: string | null;
  setSelectedEventIdForAttendance: (id: string | null) => void;
  memberFilter: {
    search: string;
    rank: string;
    comm: string;
    status: string;
    strikeMin: number;
  };
  setMemberFilter: React.Dispatch<React.SetStateAction<{
    search: string;
    rank: string;
    comm: string;
    status: string;
    strikeMin: number;
  }>>;
  // Operations
  refreshData: () => Promise<void>;
  syncWithGoogleSheets: () => Promise<boolean>;
  logContribution: (action: ContributionActionType, desc: string, targetName?: string, count?: number) => Promise<void>;
  updateMyPassword: (newPass: string) => Promise<boolean>;
  updateMyProfileName: (newName: string) => Promise<boolean>;
  createMember: (data: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'strikes'>) => Promise<boolean>;
  updateMember: (member: Member) => Promise<boolean>;
  archiveMember: (memberId: string) => Promise<boolean>;
  createEvent: (data: Omit<AllianceEvent, 'id' | 'createdAt'>) => Promise<boolean>;
  updateVote: (eventId: string, memberId: string, vote: VoteStatus) => Promise<void>;
  updateAttendance: (eventId: string, memberId: string, att: AttendanceStatus) => Promise<void>;
  bulkUpdateAttendance: (eventId: string, updates: Array<{ memberId: string; voteStatus?: VoteStatus; attendanceStatus?: AttendanceStatus }>) => Promise<void>;
  addStrike: (memberId: string, reason: string) => Promise<boolean>;
  removeStrike: (strikeId: string, memberId: string) => Promise<boolean>;
  addCommunication: (memberId: string, status: Member['communication'], note: string) => Promise<boolean>;
  updateSettings: (newSettings: AllianceSettings) => Promise<boolean>;
  connectGoogleSheets: (url: string) => Promise<{ success: boolean; message: string }>;
  disconnectGoogleSheets: () => void;
  clearLocalData: () => void;
  createAdminUser: (username: string, pass: string, name?: string) => Promise<boolean>;
  deleteAdminUser: (adminId: string) => Promise<boolean>;
  testSheetsConnection: (url: string) => Promise<{ success: boolean; message: string }>;
  resetDatabase: () => void;
  exportDatabase: () => string;
  importDatabase: (json: string) => boolean;
  addToast: (toast: Omit<ToastNotice, 'id'>) => void;
  removeToast: (id: string) => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, updateCurrentAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<AllianceEvent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [strikes, setStrikes] = useState<StrikeRecord[]>([]);
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [contributions, setContributions] = useState<OfficerContribution[]>([]);
  const [settings, setSettings] = useState<AllianceSettings>(storageService.getSettings());
  const [syncStatus, setSyncStatus] = useState<'connected' | 'demo' | 'syncing' | 'error'>('demo');
  const [syncMessage, setSyncMessage] = useState<string>('Local Demo Mode');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  // Navigation and cross-page state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<Member | null>(null);
  const [selectedEventIdForAttendance, setSelectedEventIdForAttendance] = useState<string | null>(null);

  // Security guard: Non-MainAdmin cannot view Settings
  useEffect(() => {
    if (admin && admin.role !== 'MainAdmin' && activeTab === 'settings') {
      setActiveTab('dashboard');
    }
  }, [admin, activeTab]);

  const [memberFilter, setMemberFilter] = useState({
    search: '',
    rank: 'ALL',
    comm: 'ALL',
    status: 'ALL',
    strikeMin: 0,
  });

  const addToast = useCallback((toast: Omit<ToastNotice, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Sync sound settings with sound utility
  useEffect(() => {
    sounds.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Load all data with safety against showing uninitialized/junk data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentSettings = storageService.getSettings();
      setSettings(currentSettings);

      if (apiService.isLiveSheets(currentSettings)) {
        setIsSyncingSheets(true);
        setSyncStatus('syncing');
        setSyncMessage('Updating from Google Sheets...');
        try {
          const [mList, eList, aList, sList, cList, admList, cntList] = await Promise.all([
            apiService.getMembers(currentSettings),
            apiService.getEvents(currentSettings),
            apiService.getAttendance(undefined, currentSettings),
            apiService.getStrikes(currentSettings),
            apiService.getCommunications(currentSettings),
            apiService.getAdmins(currentSettings),
            apiService.getContributions(currentSettings),
          ]);

          // Valid responses from Google Sheets are accepted (including clean empty roster)
          if (Array.isArray(mList)) {
            setMembers(mList);
            storageService.setMembers(mList);
          }
          if (Array.isArray(eList)) {
            setEvents(eList);
            storageService.setEvents(eList);
          }
          if (Array.isArray(aList)) {
            setAttendance(aList);
            storageService.setAttendance(aList);
          }
          if (Array.isArray(sList)) {
            setStrikes(sList);
            storageService.setStrikes(sList);
          }
          if (Array.isArray(cList)) {
            setCommunications(cList);
            storageService.setCommunications(cList);
          }
          if (Array.isArray(admList) && admList.length > 0) {
            setAdmins(admList);
            storageService.setAdminAccounts(admList);
          }
          if (Array.isArray(cntList)) {
            setContributions(cntList);
            storageService.setContributions(cntList);
          }

          setSyncStatus('connected');
          setSyncMessage('Google Sheets Live Connected');
          setLastSyncTime(new Date().toLocaleTimeString());
        } catch (err) {
          console.warn('Google Sheets sync warning:', err);
          setSyncStatus('error');
          setSyncMessage('Google Sheets offline. Using cached roster.');
          // Use cached storage data (which only contains sheet data, not 92 fake members)
          setMembers(storageService.getMembers());
          setEvents(storageService.getEvents());
          setAttendance(storageService.getAttendance());
          setStrikes(storageService.getStrikes());
          setCommunications(storageService.getCommunications());
        } finally {
          setIsSyncingSheets(false);
        }
      } else {
        setSyncStatus('demo');
        setSyncMessage('Demo Mode (Local Data)');
        setMembers(storageService.getMembers());
        setEvents(storageService.getEvents());
        setAttendance(storageService.getAttendance());
        setStrikes(storageService.getStrikes());
        setCommunications(storageService.getCommunications());
        setAdmins(storageService.getAdminAccounts());
        setContributions(storageService.getContributions());
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncWithGoogleSheets = useCallback(async (): Promise<boolean> => {
    const currentSettings = storageService.getSettings();
    if (!apiService.isLiveSheets(currentSettings)) {
      addToast({
        type: 'info',
        title: 'Demo Database Mode',
        message: 'Google Sheets URL not configured. Go to Settings to link your spreadsheet.',
      });
      return false;
    }

    sounds.playClick();
    setIsLoading(true);
    setIsSyncingSheets(true);
    try {
      await refreshData();
      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'Google Sheets Synchronized',
        message: `Updated records from Google Sheets at ${new Date().toLocaleTimeString()}.`,
      });
      return true;
    } catch {
      sounds.playAlert();
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Could not fetch latest rows from Google Sheets. Checked local cache.',
      });
      return false;
    } finally {
      setIsLoading(false);
      setIsSyncingSheets(false);
    }
  }, [addToast, refreshData]);

  useEffect(() => {
    storageService.init();
    refreshData();
  }, [refreshData]);

  // Calculate Inactive Member Insights
  const inactiveInsights = useMemo(() => {
    return apiService.calculateInactivity(members, events, attendance, settings);
  }, [members, events, attendance, settings]);

  // Calculate Dashboard Statistics
  const stats: DashboardStats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => m.status === 'Active').length;
    const inactive = members.filter(m => m.status === 'Inactive').length;
    const strikesTotal = members.filter(m => m.strikes > 0).length;
    const needsAttention = inactiveInsights.length;

    // Calculate average attendance across completed events
    const completedEvents = events.filter(e => e.status === 'Completed');
    let totalJoined = 0;
    let totalExpected = 0;
    let totalVotes = 0;

    completedEvents.forEach(evt => {
      const records = attendance.filter(a => a.eventId === evt.id);
      records.forEach(r => {
        totalExpected++;
        if (r.attendanceStatus === 'JOINED') totalJoined++;
        if (r.voteStatus === 'YES' || r.voteStatus === 'NO') totalVotes++;
      });
    });

    const avgAttendance = totalExpected > 0 ? (totalJoined / totalExpected) * 100 : 0;
    const avgVote = totalExpected > 0 ? (totalVotes / totalExpected) * 100 : 0;

    // Most recent event summary
    const latestEvent = events[events.length - 1];
    let latestSummary = undefined;
    if (latestEvent) {
      const records = attendance.filter(a => a.eventId === latestEvent.id);
      const totalInEvt = records.length;
      const joinedCount = records.filter(r => r.attendanceStatus === 'JOINED').length;
      const votedCount = records.filter(r => r.voteStatus === 'YES' || r.voteStatus === 'NO').length;
      const didNotJoinCount = records.filter(r => r.voteStatus === 'YES' && r.attendanceStatus === 'DIDNT_JOIN').length;
      const noVoteCount = records.filter(r => r.voteStatus === 'NO RESPONSE').length;

      latestSummary = {
        ...latestEvent,
        eventId: latestEvent.id,
        totalMembers: totalInEvt,
        voted: votedCount,
        joined: joinedCount,
        didNotJoin: didNotJoinCount,
        noVote: noVoteCount,
        attendancePercentage: totalInEvt > 0 ? (joinedCount / totalInEvt) * 100 : 0,
        votePercentage: totalInEvt > 0 ? (votedCount / totalInEvt) * 100 : 0,
      };
    }

    return {
      totalMembers: total,
      activeMembers: active,
      inactiveMembers: inactive,
      needsAttentionMembers: needsAttention,
      membersWithStrikes: strikesTotal,
      averageAttendanceRate: avgAttendance,
      averageVoteRate: avgVote,
      latestEventSummary: latestSummary,
    };
  }, [members, events, attendance, inactiveInsights]);

  // Contribution and Officer Tracking Helper
  const logContribution = useCallback(
    async (
      action: ContributionActionType,
      desc: string,
      targetName?: string,
      count: number = 1
    ) => {
      if (!admin) return;
      try {
        const entry = await apiService.recordContribution(
          {
            adminId: admin.id,
            adminUsername: admin.username,
            adminName: admin.name || admin.username,
            adminRole: admin.role,
            action,
            description: desc,
            targetName,
            count,
          },
          settings
        );
        setContributions(prev => [entry, ...prev]);
      } catch (err) {
        console.error('Failed to log contribution:', err);
      }
    },
    [admin, settings]
  );

  const updateMyPassword = async (newPass: string): Promise<boolean> => {
    if (!admin) return false;
    try {
      const ok = await apiService.updateAdminPassword(admin.id, newPass, settings);
      if (ok) {
        sounds.playSuccess();
        addToast({
          type: 'success',
          title: 'Password Updated',
          message: 'Your administrator password has been updated securely.',
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updateMyProfileName = async (newName: string): Promise<boolean> => {
    if (!admin) return false;
    const cleanName = newName.trim();
    if (!cleanName) return false;
    try {
      await apiService.updateAdminProfile(admin.id, cleanName, settings, admin.username);
      updateCurrentAdmin({ name: cleanName });
      setAdmins(prev => prev.map(a => 
        (a.id === admin.id || (admin.username && a.username.toLowerCase() === admin.username.toLowerCase()))
          ? { ...a, name: cleanName }
          : a
      ));
      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: `Your officer display name is now "${cleanName}".`,
      });
      return true;
    } catch {
      updateCurrentAdmin({ name: cleanName });
      return true;
    }
  };

  // Operations
  const createMember = async (data: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'strikes'>) => {
    try {
      const created = await apiService.createMember(data, settings);
      setMembers(prev => [created, ...prev]);
      // Also provision attendance in existing active events
      const allEvents = storageService.getEvents();
      const currentAttendance = storageService.getAttendance();
      const newAttendanceRows = allEvents.map(evt => ({
        id: `att-${evt.id}-${created.id}`,
        eventId: evt.id,
        memberId: created.id,
        voteStatus: 'NO RESPONSE' as const,
        attendanceStatus: 'NOT_APPLICABLE' as const,
        updatedAt: new Date().toISOString(),
      }));
      storageService.setAttendance([...newAttendanceRows, ...currentAttendance]);
      setAttendance(storageService.getAttendance());

      await logContribution('MEMBER_ADDED', `Enrolled member ${created.name} (${created.currentRank})`, created.name, 1);
      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'New Member Inducted',
        message: `${created.name} (${created.currentRank}) has joined the HOT Alliance roster!`,
      });
      return true;
    } catch {
      sounds.playAlert();
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: 'Could not enroll alliance member.',
      });
      return false;
    }
  };

  const updateMember = async (member: Member) => {
    try {
      await apiService.updateMember(member, settings);
      setMembers(prev => prev.map(m => (m.id === member.id ? member : m)));
      await logContribution('MEMBER_UPDATED', `Updated profile for ${member.name}`, member.name, 1);
      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'Member Details Updated',
        message: `${member.name} details have been recorded.`,
      });
      return true;
    } catch {
      sounds.playAlert();
      addToast({
        type: 'error',
        title: 'Update Error',
        message: 'Failed to update member records.',
      });
      return false;
    }
  };

  const archiveMember = async (memberId: string) => {
    try {
      const target = members.find(m => m.id === memberId);
      await apiService.archiveMember(memberId, settings);
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? { ...m, status: 'Archived' as const } : m))
      );
      await logContribution('MEMBER_ARCHIVED', `Archived member ${target?.name || memberId}`, target?.name, 1);
      sounds.playClick();
      addToast({
        type: 'warning',
        title: 'Member Archived',
        message: 'Member soft-deleted. Historical war records preserved.',
      });
      return true;
    } catch {
      sounds.playAlert();
      return false;
    }
  };

  const createEvent = async (data: Omit<AllianceEvent, 'id' | 'createdAt'>) => {
    try {
      const created = await apiService.createEvent(data, members, settings);
      setEvents(prev => [created, ...prev]);
      setAttendance(storageService.getAttendance());
      await logContribution('EVENT_CREATED', `Scheduled battle event: ${created.eventName} (${created.eventType})`, created.eventName, 1);
      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'War Event Summoned',
        message: `${created.eventName} created! Attendance initialized for all active members.`,
      });
      return true;
    } catch {
      sounds.playAlert();
      addToast({
        type: 'error',
        title: 'Event Creation Failed',
        message: 'Unable to schedule alliance event.',
      });
      return false;
    }
  };

  const updateVote = async (eventId: string, memberId: string, vote: VoteStatus) => {
    sounds.playClick();
    await apiService.updateVote(eventId, memberId, vote, settings);
    setAttendance(storageService.getAttendance());
    const targetEvt = events.find(e => e.id === eventId);
    const targetMem = members.find(m => m.id === memberId);
    await logContribution('ATTENDANCE_MARKED', `Updated vote to ${vote} for ${targetMem?.name || 'member'} in ${targetEvt?.eventName || 'event'}`, targetEvt?.eventName, 1);
  };

  const updateAttendance = async (eventId: string, memberId: string, att: AttendanceStatus) => {
    sounds.playClick();
    await apiService.updateAttendance(eventId, memberId, att, settings);
    setAttendance(storageService.getAttendance());
    const targetEvt = events.find(e => e.id === eventId);
    const targetMem = members.find(m => m.id === memberId);
    await logContribution('ATTENDANCE_MARKED', `Marked attendance (${att}) for ${targetMem?.name || 'member'} in ${targetEvt?.eventName || 'event'}`, targetEvt?.eventName, 1);
  };

  const bulkUpdateAttendance = async (
    eventId: string,
    updates: Array<{ memberId: string; voteStatus?: VoteStatus; attendanceStatus?: AttendanceStatus }>
  ) => {
    sounds.playSuccess();
    await apiService.bulkUpdateAttendance(eventId, updates, settings);
    setAttendance(storageService.getAttendance());
    const targetEvt = events.find(e => e.id === eventId);
    await logContribution('ATTENDANCE_BULK', `Bulk recorded attendance checks for ${updates.length} members`, targetEvt?.eventName, updates.length);
    addToast({
      type: 'success',
      title: 'Bulk Roster Updated',
      message: `${updates.length} member records updated in war logs.`,
    });
  };

  const addStrike = async (memberId: string, reason: string) => {
    try {
      sounds.playStrike();
      const adminName = admin?.username || 'HOT Officer';
      const record = await apiService.addStrike(memberId, reason, adminName, settings);
      setStrikes(prev => [record, ...prev]);
      setMembers(storageService.getMembers());
      const targetMem = members.find(m => m.id === memberId);
      await logContribution('STRIKE_ADDED', `Issued strike to ${targetMem?.name || 'member'}: "${reason}"`, targetMem?.name, 1);
      addToast({
        type: 'warning',
        title: '⚠️ Strike Issued',
        message: `Strike logged: "${reason}"`,
      });
      return true;
    } catch {
      return false;
    }
  };

  const removeStrike = async (strikeId: string, memberId: string) => {
    try {
      sounds.playClick();
      await apiService.removeStrike(strikeId, memberId, settings);
      setStrikes(prev => prev.filter(s => s.id !== strikeId));
      setMembers(storageService.getMembers());
      const targetMem = members.find(m => m.id === memberId);
      await logContribution('STRIKE_REMOVED', `Pardoned strike for ${targetMem?.name || 'member'}`, targetMem?.name, 1);
      addToast({
        type: 'info',
        title: 'Strike Pardoned',
        message: 'Member strike counter decremented.',
      });
      return true;
    } catch {
      return false;
    }
  };

  const addCommunication = async (memberId: string, status: Member['communication'], note: string) => {
    try {
      sounds.playSuccess();
      const adminName = admin?.username || 'HOT Officer';
      const record = await apiService.addCommunication(memberId, status, note, adminName, settings);
      setCommunications(prev => [record, ...prev]);
      setMembers(storageService.getMembers());
      const targetMem = members.find(m => m.id === memberId);
      await logContribution('COMMUNICATION_LOGGED', `Recorded ${status} communication note for ${targetMem?.name || 'member'}`, targetMem?.name, 1);
      addToast({
        type: 'success',
        title: 'Communication Dispatched',
        message: `Status updated to ${status}.`,
      });
      return true;
    } catch {
      return false;
    }
  };

  const updateSettings = async (newSettings: AllianceSettings) => {
    storageService.setSettings(newSettings);
    setSettings(newSettings);
    sounds.playSuccess();
    addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Alliance command center parameters updated.',
    });
    refreshData();
    return true;
  };

  const connectGoogleSheets = async (url: string): Promise<{ success: boolean; message: string }> => {
    const cleanUrl = (url || '').trim();
    if (!cleanUrl) {
      return { success: false, message: 'Please enter a Google Apps Script Web App URL.' };
    }
    if (cleanUrl.includes('docs.google.com/spreadsheets')) {
      return {
        success: false,
        message: 'You entered a Google Sheet document link. Please enter the deployed Apps Script Web App URL (starts with https://script.google.com/macros/s/.../exec).',
      };
    }

    setIsLoading(true);
    setIsSyncingSheets(true);
    try {
      const testRes = await apiService.testConnection(cleanUrl);
      if (!testRes.success) {
        return testRes;
      }

      // Save permanently to storage with demoMode false
      const newSettings: AllianceSettings = {
        ...settings,
        gasWebAppUrl: testRes.normalizedUrl || cleanUrl,
        demoMode: false,
      };
      storageService.setSettings(newSettings);
      setSettings(newSettings);

      // Clear local mock data so ONLY sheet data is loaded!
      storageService.clearLocalMockData();

      // Refresh from live sheet
      await refreshData();

      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'Google Sheet Connected',
        message: 'Saved permanently. Synced with Google Sheets!',
      });

      return { success: true, message: 'Connected & synchronized with Google Sheets successfully!' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Connection error: ${msg}` };
    } finally {
      setIsLoading(false);
      setIsSyncingSheets(false);
    }
  };

  const disconnectGoogleSheets = () => {
    sounds.playClick();
    const newSettings: AllianceSettings = {
      ...settings,
      gasWebAppUrl: '',
      demoMode: true,
    };
    storageService.setSettings(newSettings);
    setSettings(newSettings);
    setSyncStatus('demo');
    setSyncMessage('Local Demo Mode');
    addToast({
      type: 'info',
      title: 'Google Sheet Disconnected',
      message: 'Switched back to local demo mode.',
    });
    refreshData();
  };

  const clearLocalData = () => {
    sounds.playAlert();
    storageService.clearLocalMockData();
    setMembers([]);
    setEvents([]);
    setAttendance([]);
    setStrikes([]);
    setCommunications([]);
    setContributions([]);
    addToast({
      type: 'info',
      title: 'Local Demo Data Removed',
      message: 'All local demo players, events, and mock dates have been wiped.',
    });
    refreshData();
  };

  const testSheetsConnection = async (url: string) => {
    sounds.playClick();
    return await apiService.testConnection(url);
  };

  const resetDatabase = () => {
    sounds.playAlert();
    storageService.resetToDefaults();
    refreshData();
    addToast({
      type: 'info',
      title: 'Database Re-seeded',
      message: 'Restored default HOT Alliance roster and event data.',
    });
  };

  const exportDatabase = () => {
    sounds.playSuccess();
    return storageService.exportDatabaseJSON();
  };

  const importDatabase = (json: string) => {
    const success = storageService.importDatabaseJSON(json);
    if (success) {
      sounds.playSuccess();
      refreshData();
      addToast({
        type: 'success',
        title: 'Database Restored',
        message: 'Successfully imported alliance database.',
      });
      return true;
    } else {
      sounds.playAlert();
      addToast({
        type: 'error',
        title: 'Import Failed',
        message: 'Invalid JSON backup format.',
      });
      return false;
    }
  };

  const createAdminUser = async (username: string, pass: string, name?: string): Promise<boolean> => {
    if (!username.trim() || !pass.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Details',
        message: 'Username and password are required to create an officer account.',
      });
      return false;
    }

    const norm = username.trim().toLowerCase();
    const existing = admins.find(a => a.username.toLowerCase() === norm);
    if (existing) {
      addToast({
        type: 'error',
        title: 'Username Exists',
        message: `An admin account with username "${username}" already exists.`,
      });
      return false;
    }

    try {
      const created = await apiService.createAdmin(
        {
          username: username.trim(),
          password: pass.trim(),
          role: 'SubAdmin',
          name: name?.trim() || username.trim(),
        },
        settings
      );
      setAdmins(prev => [...prev.filter(a => a.id !== created.id), created]);
      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'Officer Admin Created',
        message: `Admin account "${username}" created. (Cannot view Settings or create admins).`,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast({ type: 'error', title: 'Error Creating Admin', message: msg });
      return false;
    }
  };

  const deleteAdminUser = async (adminId: string): Promise<boolean> => {
    try {
      const success = await apiService.deleteAdmin(adminId, settings);
      if (success) {
        setAdmins(prev => prev.filter(a => a.id !== adminId));
        sounds.playSuccess();
        addToast({
          type: 'success',
          title: 'Officer Admin Removed',
          message: 'Officer access has been revoked.',
        });
        return true;
      } else {
        addToast({
          type: 'error',
          title: 'Action Prohibited',
          message: 'Cannot delete the Main Admin account.',
        });
        return false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast({ type: 'error', title: 'Error Deleting Admin', message: msg });
      return false;
    }
  };

  return (
    <CRMContext.Provider
      value={{
        members,
        events,
        attendance,
        strikes,
        communications,
        settings,
        inactiveInsights,
        stats,
        admins,
        contributions,
        syncStatus,
        syncMessage,
        isLoading,
        isSyncingSheets,
        lastSyncTime,
        toasts,
        activeTab,
        setActiveTab,
        selectedMemberForProfile,
        setSelectedMemberForProfile,
        selectedEventIdForAttendance,
        setSelectedEventIdForAttendance,
        memberFilter,
        setMemberFilter,
        refreshData,
        syncWithGoogleSheets,
        logContribution,
        updateMyPassword,
        updateMyProfileName,
        createMember,
        updateMember,
        archiveMember,
        createEvent,
        updateVote,
        updateAttendance,
        bulkUpdateAttendance,
        addStrike,
        removeStrike,
        addCommunication,
        updateSettings,
        connectGoogleSheets,
        disconnectGoogleSheets,
        clearLocalData,
        createAdminUser,
        deleteAdminUser,
        testSheetsConnection,
        resetDatabase,
        exportDatabase,
        importDatabase,
        addToast,
        removeToast,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
