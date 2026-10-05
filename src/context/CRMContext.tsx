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
import { supabaseService, normalizeSupabaseUrl } from '../services/supabase';
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
  activeDbProvider: 'supabase' | 'sheets' | 'local';
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
  connectSupabase: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  disconnectSupabase: () => void;
  testSupabaseConnection: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  migrateToSupabase: () => Promise<{ success: boolean; message: string; counts?: Record<string, number> }>;
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
  const [members, setMembers] = useState<Member[]>(() => storageService.getMembers());
  const [events, setEvents] = useState<AllianceEvent[]>(() => storageService.getEvents());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => storageService.getAttendance());
  const [strikes, setStrikes] = useState<StrikeRecord[]>(() => storageService.getStrikes());
  const [communications, setCommunications] = useState<CommunicationRecord[]>(() => storageService.getCommunications());
  const [admins, setAdmins] = useState<AdminAccount[]>(() => storageService.getAdminAccounts());
  const [contributions, setContributions] = useState<OfficerContribution[]>(() => storageService.getContributions());
  const [settings, setSettings] = useState<AllianceSettings>(() => storageService.getSettings());
  const [syncStatus, setSyncStatus] = useState<'connected' | 'demo' | 'syncing' | 'error'>('demo');
  const [syncMessage, setSyncMessage] = useState<string>('Local Demo Mode');
  const [isLoading, setIsLoading] = useState<boolean>(() => storageService.getMembers().length === 0);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  // Navigation and cross-page state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<Member | null>(null);
  const [selectedEventIdForAttendance, setSelectedEventIdForAttendance] = useState<string | null>(null);

  // Security guard: Non-MainAdmin cannot view Settings or Contributions
  useEffect(() => {
    if (admin && admin.role !== 'MainAdmin' && (activeTab === 'settings' || activeTab === 'contributions')) {
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
    const currentSettings = storageService.getSettings();
    setSettings(currentSettings);

    // Only show blocking loading state if there are zero cached records
    if (storageService.getMembers().length === 0) {
      setIsLoading(true);
    }

    try {
      const activeProvider = apiService.getActiveProvider(currentSettings);

      if (activeProvider === 'supabase') {
        setIsSyncingSheets(true);
        setSyncStatus('syncing');
        setSyncMessage('Updating from Supabase PostgreSQL...');
        try {
          const allData = await apiService.getAllData(currentSettings);
          if (allData && typeof allData === 'object') {
            storageService.saveAllData(allData);

            if (Array.isArray(allData.members)) setMembers(allData.members);
            if (Array.isArray(allData.events)) setEvents(allData.events);
            if (Array.isArray(allData.attendance)) setAttendance(allData.attendance);
            if (Array.isArray(allData.strikes)) setStrikes(allData.strikes);
            if (Array.isArray(allData.communications)) setCommunications(allData.communications);
            if (Array.isArray(allData.admins) && allData.admins.length > 0) setAdmins(allData.admins);
            if (Array.isArray(allData.contributions)) setContributions(allData.contributions);

            setSyncStatus('connected');
            setSyncMessage('Supabase PostgreSQL Live Connected');
            setLastSyncTime(new Date().toLocaleTimeString());
          }
        } catch (err) {
          console.warn('Supabase sync warning:', err);
          setSyncStatus('error');
          setSyncMessage('Supabase unreachable. Using cached roster.');
          setMembers(storageService.getMembers());
          setEvents(storageService.getEvents());
          setAttendance(storageService.getAttendance());
          setStrikes(storageService.getStrikes());
          setCommunications(storageService.getCommunications());
        } finally {
          setIsSyncingSheets(false);
        }
      } else if (activeProvider === 'sheets') {
        setIsSyncingSheets(true);
        setSyncStatus('syncing');
        setSyncMessage('Updating from Google Sheets...');
        try {
          // Fast-path: single request to get all sheets data at once
          const allData = await apiService.getAllData(currentSettings);

          let mList, eList, aList, sList, cList, admList, cntList;
          if (allData && typeof allData === 'object') {
            mList = allData.members;
            eList = allData.events;
            aList = allData.attendance;
            sList = allData.strikes;
            cList = allData.communications;
            admList = allData.admins;
            cntList = allData.contributions;
          } else {
            // Fallback to separate endpoints if backend hasn't been re-deployed yet
            [mList, eList, aList, sList, cList, admList, cntList] = await Promise.all([
              apiService.getMembers(currentSettings),
              apiService.getEvents(currentSettings),
              apiService.getAttendance(undefined, currentSettings),
              apiService.getStrikes(currentSettings),
              apiService.getCommunications(currentSettings),
              apiService.getAdmins(currentSettings),
              apiService.getContributions(currentSettings),
            ]);
          }

          // Single batch storage save to minimize disk I/O latency
          storageService.saveAllData({
            members: mList,
            events: eList,
            attendance: aList,
            strikes: sList,
            communications: cList,
            admins: admList,
            contributions: cntList,
          });

          // Valid responses from Google Sheets are accepted (including clean empty roster)
          if (Array.isArray(mList)) setMembers(mList);
          if (Array.isArray(eList)) setEvents(eList);
          if (Array.isArray(aList)) setAttendance(aList);
          if (Array.isArray(sList)) setStrikes(sList);
          if (Array.isArray(cList)) setCommunications(cList);
          if (Array.isArray(admList) && admList.length > 0) setAdmins(admList);
          if (Array.isArray(cntList)) setContributions(cntList);

          setSyncStatus('connected');
          setSyncMessage('Google Sheets Live Connected');
          setLastSyncTime(new Date().toLocaleTimeString());
        } catch (err) {
          console.warn('Google Sheets sync warning:', err);
          setSyncStatus('error');
          setSyncMessage('Google Sheets offline. Using cached roster.');
          // Use cached storage data
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
        setSyncMessage('Connect Supabase or Sheets to sync cloud data');
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
    const visitor = members.filter(m => m.status === 'Visitor').length;
    const inactive = members.filter(m => m.status === 'Inactive').length;
    const strikesTotal = members.filter(m => m.strikes > 0).length;
    const needsAttention = inactiveInsights.length;

    // Fast O(N) calculation across completed events using Set lookup
    const completedEventIds = new Set(events.filter(e => e.status === 'Completed').map(e => e.id));
    let totalJoined = 0;
    let totalExpected = 0;
    let totalVotes = 0;

    for (let i = 0; i < attendance.length; i++) {
      const r = attendance[i];
      if (completedEventIds.has(r.eventId)) {
        totalExpected++;
        if (r.attendanceStatus === 'JOINED') totalJoined++;
        if (r.voteStatus === 'YES' || r.voteStatus === 'NO') totalVotes++;
      }
    }

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
      visitorMembers: visitor,
      inactiveMembers: inactive,
      needsAttentionMembers: needsAttention,
      membersWithStrikes: strikesTotal,
      averageAttendanceRate: avgAttendance,
      averageVoteRate: avgVote,
      latestEventSummary: latestSummary,
    };
  }, [members, events, attendance, inactiveInsights]);

  // Contribution and Officer Tracking Helper (Instant local + background cloud sync)
  const logContribution = useCallback(
    async (
      action: ContributionActionType,
      desc: string,
      targetName?: string,
      count: number = 1
    ) => {
      if (!admin) return;
      const now = new Date().toISOString();
      const entry: OfficerContribution = {
        id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        adminId: admin.id,
        adminUsername: admin.username,
        adminName: admin.name || admin.username,
        adminRole: admin.role,
        action,
        description: desc,
        targetName,
        count,
        timestamp: now,
      };

      // Instant local persistence & UI update
      const current = storageService.getContributions();
      storageService.setContributions([entry, ...current]);
      setContributions(prev => [entry, ...prev]);

      // Non-blocking background sync
      if (apiService.isSupabase(settings)) {
        apiService.recordContribution(entry, settings).catch(err => console.warn('Supabase contribution sync:', err));
      } else if (apiService.isLiveSheets(settings)) {
        fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'recordContribution', contribution: entry }),
        }).catch(err => console.warn('Background contribution sync:', err));
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

  // Instant Optimistic Operations with Non-blocking Cloud Sync
  const createMember = async (data: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'strikes'>) => {
    try {
      const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const fullMember: Member = {
        ...data,
        id,
        strikes: 0,
        status: 'Active',
        createdAt: now,
        updatedAt: now,
      };

      // 1. INSTANT LOCAL & STATE UPDATE (0ms)
      const current = storageService.getMembers();
      storageService.setMembers([fullMember, ...current]);
      setMembers(prev => [fullMember, ...prev]);

      // Provision attendance in existing active events instantly
      const allEvents = storageService.getEvents();
      const currentAttendance = storageService.getAttendance();
      const newAttendanceRows = allEvents.map(evt => ({
        id: `att-${evt.id}-${fullMember.id}`,
        eventId: evt.id,
        memberId: fullMember.id,
        voteStatus: 'NO RESPONSE' as const,
        attendanceStatus: 'NOT_APPLICABLE' as const,
        updatedAt: now,
      }));
      storageService.setAttendance([...newAttendanceRows, ...currentAttendance]);
      setAttendance(storageService.getAttendance());

      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'New Member Inducted',
        message: `${fullMember.name} (${fullMember.currentRank}) has joined the HOT Alliance roster!`,
      });

      // 2. NON-BLOCKING BACKGROUND SYNC
      if (apiService.isSupabase(settings)) {
        apiService.createMember(fullMember, settings).catch(err => console.warn('Supabase member create error:', err));
      } else if (apiService.isLiveSheets(settings)) {
        fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'createMember', member: fullMember }),
        }).catch(err => console.warn('Background member sync error:', err));
      }

      logContribution('MEMBER_ADDED', `Enrolled member ${fullMember.name} (${fullMember.currentRank})`, fullMember.name, 1);
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
      const updated = { ...member, updatedAt: new Date().toISOString() };
      // 1. INSTANT LOCAL & STATE UPDATE (0ms)
      const current = storageService.getMembers();
      const list = current.map(m => (m.id === member.id ? updated : m));
      storageService.setMembers(list);
      setMembers(list);

      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'Member Details Updated',
        message: `${member.name} details have been recorded.`,
      });

      // 2. NON-BLOCKING BACKGROUND SYNC
      if (apiService.isSupabase(settings)) {
        apiService.updateMember(updated, settings).catch(err => console.warn('Supabase member update error:', err));
      } else if (apiService.isLiveSheets(settings)) {
        fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateMember', member: updated }),
        }).catch(err => console.warn('Background member update error:', err));
      }

      logContribution('MEMBER_UPDATED', `Updated profile for ${member.name}`, member.name, 1);
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
      // 1. INSTANT LOCAL & STATE UPDATE (0ms)
      const current = storageService.getMembers();
      const updated = current.map(m => (m.id === memberId ? { ...m, status: 'Archived' as const } : m));
      storageService.setMembers(updated);
      setMembers(updated);

      sounds.playClick();
      addToast({
        type: 'warning',
        title: 'Member Archived',
        message: 'Member moved to alliance archive.',
      });

      // 2. NON-BLOCKING BACKGROUND SYNC
      if (apiService.isSupabase(settings)) {
        apiService.archiveMember(memberId, settings).catch(err => console.warn('Supabase archive error:', err));
      } else if (apiService.isLiveSheets(settings)) {
        fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'archiveMember', memberId }),
        }).catch(err => console.warn('Background archive error:', err));
      }

      logContribution('MEMBER_ARCHIVED', `Archived member ${target?.name || memberId}`, target?.name, 1);
      return true;
    } catch {
      sounds.playAlert();
      return false;
    }
  };

  const createEvent = async (data: Omit<AllianceEvent, 'id' | 'createdAt'>) => {
    try {
      const id = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const fullEvent: AllianceEvent = {
        ...data,
        id,
        createdAt: now,
      };

      // 1. INSTANT LOCAL & STATE UPDATE (0ms)
      const current = storageService.getEvents();
      storageService.setEvents([fullEvent, ...current]);
      setEvents(prev => [fullEvent, ...prev]);

      // Provision attendance for active members
      const activeMembers = storageService.getMembers().filter(m => m.status !== 'Archived');
      const currentAtt = storageService.getAttendance();
      const newAttRecords: AttendanceRecord[] = activeMembers.map(m => ({
        id: `att-${fullEvent.id}-${m.id}`,
        eventId: fullEvent.id,
        memberId: m.id,
        voteStatus: 'NO RESPONSE' as const,
        attendanceStatus: 'NOT_APPLICABLE' as const,
        updatedAt: now,
      }));
      storageService.setAttendance([...newAttRecords, ...currentAtt]);
      setAttendance([...newAttRecords, ...currentAtt]);

      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'War Event Summoned',
        message: `${fullEvent.eventName} created! Attendance initialized for all active members.`,
      });

      // 2. NON-BLOCKING BACKGROUND SYNC
      if (apiService.isSupabase(settings)) {
        apiService.createEvent(fullEvent, activeMembers, settings).catch(err => console.warn('Background event sync error:', err));
      } else if (apiService.isLiveSheets(settings)) {
        fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'createEvent', event: fullEvent, members: activeMembers }),
        }).catch(err => console.warn('Background event sync error:', err));
      }

      logContribution('EVENT_CREATED', `Scheduled battle event: ${fullEvent.eventName} (${fullEvent.eventType})`, fullEvent.eventName, 1);
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
    const now = new Date().toISOString();
    // 1. INSTANT LOCAL UPDATE (Upsert)
    const current = storageService.getAttendance();
    let matched = false;
    const updated = current.map(a => {
      if (a.eventId === eventId && a.memberId === memberId) {
        matched = true;
        return { ...a, voteStatus: vote, updatedAt: now };
      }
      return a;
    });

    if (!matched) {
      updated.unshift({
        id: `att-${eventId}-${memberId}`,
        eventId,
        memberId,
        voteStatus: vote,
        attendanceStatus: 'NOT_APPLICABLE',
        updatedAt: now,
      });
    }

    storageService.setAttendance(updated);
    setAttendance(updated);

    // 2. NON-BLOCKING BACKGROUND SYNC
    if (apiService.isSupabase(settings)) {
      apiService.updateVote(eventId, memberId, vote, settings).catch(err => console.warn('Background vote sync:', err));
    } else if (apiService.isLiveSheets(settings)) {
      fetch(settings.gasWebAppUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateVote', eventId, memberId, voteStatus: vote }),
      }).catch(err => console.warn('Background vote sync:', err));
    }

    const targetEvt = events.find(e => e.id === eventId);
    const targetMem = members.find(m => m.id === memberId);
    logContribution('ATTENDANCE_MARKED', `Updated vote to ${vote} for ${targetMem?.name || 'member'} in ${targetEvt?.eventName || 'event'}`, targetEvt?.eventName, 1);
  };

  const updateAttendance = async (eventId: string, memberId: string, att: AttendanceStatus) => {
    sounds.playClick();
    const now = new Date().toISOString();
    // 1. INSTANT LOCAL UPDATE (Upsert)
    const current = storageService.getAttendance();
    let matched = false;
    const updated = current.map(a => {
      if (a.eventId === eventId && a.memberId === memberId) {
        matched = true;
        return { ...a, attendanceStatus: att, updatedAt: now };
      }
      return a;
    });

    if (!matched) {
      updated.unshift({
        id: `att-${eventId}-${memberId}`,
        eventId,
        memberId,
        voteStatus: 'NO RESPONSE',
        attendanceStatus: att,
        updatedAt: now,
      });
    }

    storageService.setAttendance(updated);
    setAttendance(updated);

    // 2. NON-BLOCKING BACKGROUND SYNC
    if (apiService.isSupabase(settings)) {
      apiService.updateAttendance(eventId, memberId, att, settings).catch(err => console.warn('Background attendance sync:', err));
    } else if (apiService.isLiveSheets(settings)) {
      fetch(settings.gasWebAppUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateAttendance', eventId, memberId, attendanceStatus: att }),
      }).catch(err => console.warn('Background attendance sync:', err));
    }

    const targetEvt = events.find(e => e.id === eventId);
    const targetMem = members.find(m => m.id === memberId);
    logContribution('ATTENDANCE_MARKED', `Marked attendance (${att}) for ${targetMem?.name || 'member'} in ${targetEvt?.eventName || 'event'}`, targetEvt?.eventName, 1);
  };

  const bulkUpdateAttendance = async (
    eventId: string,
    updates: Array<{ memberId: string; voteStatus?: VoteStatus; attendanceStatus?: AttendanceStatus }>
  ) => {
    sounds.playSuccess();
    const now = new Date().toISOString();
    const current = storageService.getAttendance();
    const updateMap = new Map(updates.map(u => [u.memberId, u]));
    const matchedMembers = new Set<string>();

    const updated = current.map(a => {
      if (a.eventId === eventId && updateMap.has(a.memberId)) {
        matchedMembers.add(a.memberId);
        const u = updateMap.get(a.memberId)!;
        return {
          ...a,
          ...(u.voteStatus ? { voteStatus: u.voteStatus } : {}),
          ...(u.attendanceStatus ? { attendanceStatus: u.attendanceStatus } : {}),
          updatedAt: now,
        };
      }
      return a;
    });

    // Add missing records
    updates.forEach(u => {
      if (!matchedMembers.has(u.memberId)) {
        updated.unshift({
          id: `att-${eventId}-${u.memberId}`,
          eventId,
          memberId: u.memberId,
          voteStatus: u.voteStatus || 'NO RESPONSE',
          attendanceStatus: u.attendanceStatus || 'NOT_APPLICABLE',
          updatedAt: now,
        });
      }
    });

    storageService.setAttendance(updated);
    setAttendance(updated);

    if (apiService.isSupabase(settings)) {
      apiService.bulkUpdateAttendance(eventId, updates, settings).catch(err => console.warn('Background bulk att sync:', err));
    } else if (apiService.isLiveSheets(settings)) {
      fetch(settings.gasWebAppUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'bulkUpdateAttendance', eventId, updates }),
      }).catch(err => console.warn('Background bulk attendance sync:', err));
    }

    const targetEvt = events.find(e => e.id === eventId);
    logContribution('ATTENDANCE_BULK', `Bulk recorded attendance checks for ${updates.length} members`, targetEvt?.eventName, updates.length);
    addToast({
      type: 'success',
      title: 'Bulk Roster Updated',
      message: `${updates.length} member records updated in war logs.`,
    });
  };

  const addStrike = async (memberId: string, reason: string) => {
    try {
      sounds.playStrike();
      const adminName = admin?.name || admin?.username || 'HOT Officer';
      const now = new Date().toISOString();
      const record: StrikeRecord = {
        id: `str-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        memberId,
        date: now,
        reason,
        addedBy: adminName,
      };

      // 1. INSTANT LOCAL UPDATE
      const currentStrikes = storageService.getStrikes();
      storageService.setStrikes([record, ...currentStrikes]);
      setStrikes(prev => [record, ...prev]);

      const currentMembers = storageService.getMembers();
      const updatedMembers = currentMembers.map(m =>
        m.id === memberId ? { ...m, strikes: m.strikes + 1 } : m
      );
      storageService.setMembers(updatedMembers);
      setMembers(updatedMembers);

      const targetMem = currentMembers.find(m => m.id === memberId);
      addToast({
        type: 'warning',
        title: '⚠️ Strike Issued',
        message: `Strike logged: "${reason}"`,
      });

      // 2. NON-BLOCKING BACKGROUND SYNC
      if (apiService.isSupabase(settings)) {
        apiService.addStrike(memberId, reason, adminName, settings).catch(err => console.warn('Background strike sync:', err));
      } else if (apiService.isLiveSheets(settings)) {
        fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'addStrike', strike: record }),
        }).catch(err => console.warn('Background strike sync:', err));
      }

      logContribution('STRIKE_ADDED', `Issued strike to ${targetMem?.name || 'member'}: "${reason}"`, targetMem?.name, 1);
      return true;
    } catch {
      return false;
    }
  };

  const removeStrike = async (strikeId: string, memberId: string) => {
    try {
      sounds.playClick();
      // 1. INSTANT LOCAL UPDATE
      const currentStrikes = storageService.getStrikes();
      const updatedStrikes = currentStrikes.filter(s => s.id !== strikeId);
      storageService.setStrikes(updatedStrikes);
      setStrikes(updatedStrikes);

      const currentMembers = storageService.getMembers();
      const updatedMembers = currentMembers.map(m =>
        m.id === memberId ? { ...m, strikes: Math.max(0, m.strikes - 1) } : m
      );
      storageService.setMembers(updatedMembers);
      setMembers(updatedMembers);

      const targetMem = currentMembers.find(m => m.id === memberId);
      addToast({
        type: 'info',
        title: 'Strike Pardoned',
        message: 'Member strike counter decremented.',
      });

      // 2. NON-BLOCKING BACKGROUND SYNC
      if (apiService.isSupabase(settings)) {
        apiService.removeStrike(strikeId, memberId, settings).catch(err => console.warn('Background strike removal sync:', err));
      } else if (apiService.isLiveSheets(settings)) {
        fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'removeStrike', strikeId, memberId }),
        }).catch(err => console.warn('Background strike removal sync:', err));
      }

      logContribution('STRIKE_REMOVED', `Pardoned strike for ${targetMem?.name || 'member'}`, targetMem?.name, 1);
      return true;
    } catch {
      return false;
    }
  };

  const addCommunication = async (memberId: string, status: Member['communication'], note: string) => {
    try {
      sounds.playSuccess();
      const adminName = admin?.name || admin?.username || 'HOT Officer';
      const now = new Date().toISOString();
      const record: CommunicationRecord = {
        id: `com-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        memberId,
        date: now,
        status,
        note,
        addedBy: adminName,
      };

      // 1. INSTANT LOCAL UPDATE
      const currentComms = storageService.getCommunications();
      storageService.setCommunications([record, ...currentComms]);
      setCommunications(prev => [record, ...prev]);

      const currentMembers = storageService.getMembers();
      const updatedMembers = currentMembers.map(m =>
        m.id === memberId ? { ...m, communication: status, communicationNote: note } : m
      );
      storageService.setMembers(updatedMembers);
      setMembers(updatedMembers);

      const targetMem = currentMembers.find(m => m.id === memberId);
      addToast({
        type: 'success',
        title: 'Communication Dispatched',
        message: `Status updated to ${status}.`,
      });

      // 2. NON-BLOCKING BACKGROUND SYNC
      if (apiService.isSupabase(settings)) {
        apiService.addCommunication(memberId, status, note, adminName, settings).catch(err => console.warn('Background comm sync:', err));
      } else if (apiService.isLiveSheets(settings)) {
        fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'addCommunication', record }),
        }).catch(err => console.warn('Background comm sync:', err));
      }

      logContribution('COMMUNICATION_LOGGED', `Recorded ${status} communication note for ${targetMem?.name || 'member'}`, targetMem?.name, 1);
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

  const connectSupabase = async (url: string, key: string): Promise<{ success: boolean; message: string }> => {
    const cleanUrl = (url || '').trim();
    const cleanKey = (key || '').trim();
    if (!cleanUrl.startsWith('http')) {
      return { success: false, message: 'Invalid Supabase Project URL. Must start with https://' };
    }
    if (!cleanKey) {
      return { success: false, message: 'Supabase Anon Public API Key is required.' };
    }

    setIsLoading(true);
    setIsSyncingSheets(true);
    try {
      const testRes = await apiService.testSupabaseConnection(cleanUrl, cleanKey);
      if (!testRes.success) {
        return testRes;
      }

      // Save permanently to storage
      const normalized = normalizeSupabaseUrl(cleanUrl);
      const newSettings: AllianceSettings = {
        ...settings,
        supabaseUrl: testRes.normalizedUrl || normalized,
        supabaseAnonKey: cleanKey,
        dbProvider: 'supabase',
        demoMode: false,
      };
      storageService.setSettings(newSettings);
      setSettings(newSettings);

      // Refresh data from Supabase
      await refreshData();

      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'Supabase PostgreSQL Connected',
        message: 'Saved permanently. High-performance PostgreSQL backend active!',
      });

      return { success: true, message: 'Connected & synchronized with Supabase PostgreSQL successfully!' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Connection error: ${msg}` };
    } finally {
      setIsLoading(false);
      setIsSyncingSheets(false);
    }
  };

  const disconnectSupabase = () => {
    sounds.playClick();
    const newSettings: AllianceSettings = {
      ...settings,
      supabaseUrl: '',
      supabaseAnonKey: '',
      dbProvider: settings.gasWebAppUrl ? 'sheets' : 'local',
      demoMode: !settings.gasWebAppUrl,
    };
    storageService.setSettings(newSettings);
    setSettings(newSettings);
    setSyncStatus('demo');
    setSyncMessage('Local Demo Mode');
    addToast({
      type: 'info',
      title: 'Supabase Disconnected',
      message: 'Switched back to local / fallback database mode.',
    });
    refreshData();
  };

  const testSupabaseConnection = async (url: string, key: string) => {
    sounds.playClick();
    return await apiService.testSupabaseConnection(url, key);
  };

  const migrateToSupabase = async (): Promise<{ success: boolean; message: string; counts?: Record<string, number> }> => {
    if (!supabaseService.isConfigured(settings)) {
      addToast({
        type: 'error',
        title: 'Supabase Not Configured',
        message: 'Please connect Supabase first with your Project URL & Anon Key.',
      });
      return { success: false, message: 'Supabase is not configured in settings.' };
    }

    sounds.playClick();
    setIsLoading(true);
    try {
      const bundle = {
        members: storageService.getMembers(),
        events: storageService.getEvents(),
        attendance: storageService.getAttendance(),
        strikes: storageService.getStrikes(),
        communications: storageService.getCommunications(),
        admins: storageService.getAdminAccounts(),
        contributions: storageService.getContributions(),
      };

      const result = await supabaseService.migrateAllToSupabase(bundle, settings);
      if (result.success) {
        sounds.playSuccess();
        addToast({
          type: 'success',
          title: 'PostgreSQL Migration Complete',
          message: `Uploaded ${result.counts.members || 0} members, ${result.counts.events || 0} events to Supabase!`,
        });
        await refreshData();
      } else {
        sounds.playAlert();
        addToast({
          type: 'error',
          title: 'Migration Failed',
          message: result.message,
        });
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sounds.playAlert();
      addToast({ type: 'error', title: 'Migration Error', message: msg });
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
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
        activeDbProvider: apiService.getActiveProvider(settings),
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
        connectSupabase,
        disconnectSupabase,
        testSupabaseConnection,
        migrateToSupabase,
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
