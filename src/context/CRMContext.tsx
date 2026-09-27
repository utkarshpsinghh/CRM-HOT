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
  VoteStatus,
  AttendanceStatus,
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
  syncStatus: 'connected' | 'demo' | 'syncing' | 'error';
  syncMessage: string;
  isLoading: boolean;
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
  testSheetsConnection: (url: string) => Promise<{ success: boolean; message: string }>;
  resetDatabase: () => void;
  exportDatabase: () => string;
  importDatabase: (json: string) => boolean;
  addToast: (toast: Omit<ToastNotice, 'id'>) => void;
  removeToast: (id: string) => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<AllianceEvent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [strikes, setStrikes] = useState<StrikeRecord[]>([]);
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [settings, setSettings] = useState<AllianceSettings>(storageService.getSettings());
  const [syncStatus, setSyncStatus] = useState<'connected' | 'demo' | 'syncing' | 'error'>('demo');
  const [syncMessage, setSyncMessage] = useState<string>('Local Demo Mode');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  // Navigation and cross-page state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<Member | null>(null);
  const [selectedEventIdForAttendance, setSelectedEventIdForAttendance] = useState<string | null>(null);

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

  // Load all data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentSettings = storageService.getSettings();
      setSettings(currentSettings);

      if (apiService.isLiveSheets(currentSettings)) {
        setSyncStatus('syncing');
        setSyncMessage('Syncing with Google Sheets...');
        try {
          const [mList, eList, aList, sList, cList] = await Promise.all([
            apiService.getMembers(currentSettings),
            apiService.getEvents(currentSettings),
            apiService.getAttendance(undefined, currentSettings),
            storageService.getStrikes(),
            storageService.getCommunications(),
          ]);
          setMembers(mList);
          setEvents(eList);
          setAttendance(aList);
          setStrikes(sList);
          setCommunications(cList);
          setSyncStatus('connected');
          setSyncMessage('Google Sheets Live Connected');
        } catch (err) {
          setSyncStatus('error');
          setSyncMessage('Google Sheets unreachable. Falling back to local data.');
          setMembers(storageService.getMembers());
          setEvents(storageService.getEvents());
          setAttendance(storageService.getAttendance());
          setStrikes(storageService.getStrikes());
          setCommunications(storageService.getCommunications());
        }
      } else {
        setSyncStatus('demo');
        setSyncMessage('Demo / Local Storage Mode');
        setMembers(storageService.getMembers());
        setEvents(storageService.getEvents());
        setAttendance(storageService.getAttendance());
        setStrikes(storageService.getStrikes());
        setCommunications(storageService.getCommunications());
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      sounds.playSuccess();
      addToast({
        type: 'success',
        title: 'Member Dossier Updated',
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
      await apiService.archiveMember(memberId, settings);
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? { ...m, status: 'Archived' as const } : m))
      );
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
      // refresh local attendance state
      setAttendance(storageService.getAttendance());
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
  };

  const updateAttendance = async (eventId: string, memberId: string, att: AttendanceStatus) => {
    sounds.playClick();
    await apiService.updateAttendance(eventId, memberId, att, settings);
    setAttendance(storageService.getAttendance());
  };

  const bulkUpdateAttendance = async (
    eventId: string,
    updates: Array<{ memberId: string; voteStatus?: VoteStatus; attendanceStatus?: AttendanceStatus }>
  ) => {
    sounds.playSuccess();
    await apiService.bulkUpdateAttendance(eventId, updates, settings);
    setAttendance(storageService.getAttendance());
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
        syncStatus,
        syncMessage,
        isLoading,
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
