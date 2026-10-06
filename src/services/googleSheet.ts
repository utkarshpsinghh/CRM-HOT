import {
  Member,
  AllianceEvent,
  AttendanceRecord,
  StrikeRecord,
  CommunicationRecord,
  OfficerContribution,
  AllianceRank,
  CommunicationStatus,
  MemberStatus,
  EventType,
  EventStatus,
  VoteStatus,
  AttendanceStatus,
  AdminRole,
  ContributionActionType,
} from '../types/crm';

export const DEFAULT_GOOGLE_SHEET_ID = '1z_oPJgwZ2TE05MNe6DFa7-XBw9o1N-3eaLWEoDFCt8c';

export const GOOGLE_SHEET_TABS = {
  members: '875082368',
  events: '389842387',
  attendance: '537798421',
  contributions: '1635236772',
  strikes: '422766442',
  communications: '409010361',
  settings: '1175141823',
} as const;

export interface SheetSyncSummary {
  members: number;
  events: number;
  attendance: number;
  contributions: number;
  strikes: number;
  communications: number;
}

export interface SheetSyncResult {
  success: boolean;
  message: string;
  counts?: Partial<SheetSyncSummary>;
  errors?: string[];
}

/**
 * Universal CSV row parser handling quotes and commas
 */
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const row: string[] = [];
    let insideQuotes = false;
    let currentField = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    row.push(currentField.trim());
    if (row.length > 0) {
      rows.push(row);
    }
  }

  return rows;
}

export const googleSheetService = {
  extractSheetId(url?: string): string {
    if (!url) return DEFAULT_GOOGLE_SHEET_ID;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : DEFAULT_GOOGLE_SHEET_ID;
  },

  getExportUrl(sheetId: string, gid: string): string {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  },

  async fetchTabCsv(sheetId: string, gid: string): Promise<string> {
    const url = this.getExportUrl(sheetId, gid);
    const response = await fetch(url);
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Google Sheet is restricted. Please set the sheet Sharing permission to "Anyone with the link can view (Viewer)".'
      );
    }
    if (!response.ok) {
      throw new Error(`Google Sheet returned HTTP status ${response.status}.`);
    }
    return await response.text();
  },

  // 1. Members Parser
  parseMembers(csvText: string): Member[] {
    const rows = parseCsvRows(csvText);
    const members: Member[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toLowerCase().includes('id') || row[1]?.toLowerCase().includes('name'))) {
        continue; // Header row
      }
      if (row.length < 2) continue;

      // Schema: Member ID,Name,Current Rank,Former Rank,Strikes,Communication,Status,Created At,Updated At
      const id = row[0] || `mem-${Date.now()}-${i}`;
      const name = row[1] || `Member ${i}`;
      const currentRank = (['R5', 'R4', 'R3', 'R2', 'R1'].includes(row[2]?.toUpperCase())
        ? row[2].toUpperCase()
        : 'R1') as AllianceRank;
      const formerRank = (['R5', 'R4', 'R3', 'R2', 'R1', 'None'].includes(row[3])
        ? row[3]
        : 'None') as AllianceRank | 'None';
      const strikes = Number(row[4]) || 0;
      const communication = (['Good', 'Warning', 'Poor', 'Unreachable', 'Unknown'].includes(row[5])
        ? row[5]
        : 'Good') as CommunicationStatus;
      const status = (['Active', 'Inactive', 'Archived', 'Visitor'].includes(row[6])
        ? row[6]
        : 'Active') as MemberStatus;
      const createdAt = row[7] || now;
      const updatedAt = row[8] || now;

      members.push({
        id,
        name,
        currentRank,
        formerRank,
        strikes,
        communication,
        status,
        createdAt,
        updatedAt,
      });
    }

    return members;
  },

  // 2. Events Parser
  parseEvents(csvText: string): AllianceEvent[] {
    const rows = parseCsvRows(csvText);
    const events: AllianceEvent[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toLowerCase().includes('id') || row[1]?.toLowerCase().includes('type'))) {
        continue;
      }
      if (row.length < 3) continue;

      // Schema: Event ID,Event Type,Event Name,Date,Created At,Status,Notes
      const id = row[0] || `evt-${Date.now()}-${i}`;
      const eventType = (row[1] || 'BT1') as EventType;
      const eventName = row[2] || 'Alliance Event';
      const date = row[3] || now;
      const createdAt = row[4] || now;
      const status = (['Scheduled', 'Live', 'Completed'].includes(row[5])
        ? row[5]
        : 'Completed') as EventStatus;
      const notes = row[6] || undefined;

      events.push({
        id,
        eventType,
        eventName,
        date,
        createdAt,
        status,
        notes,
      });
    }

    return events;
  },

  // 3. Attendance Parser
  parseAttendance(csvText: string): AttendanceRecord[] {
    const rows = parseCsvRows(csvText);
    const byKey = new Map<string, AttendanceRecord>();
    const now = new Date().toISOString();

    const EVENT_ID_ALIASES: Record<string, string> = {
      'evt-1790607589476-kins': 'evt-c233df90', // BT2 Sep 28
      'evt-1791048690819-7icl': 'evt-6f6a9d3a', // BT1 Oct 01 16:00
      'evt-1791048703740-v7b9': 'evt-61922e28', // BT2 Oct 02 16:00
      'evt-1791049152771-k1qw': 'evt-c031d684', // BT1 Oct 03 16:00
      'evt-1791049171203-10e5': 'evt-f9234e34', // BT2 Oct 04 02:00
      'evt-1791223308841-6mkk': 'evt-4eee1101', // BT1 Oct 05 16:00
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toLowerCase().includes('attendance id') || row[1]?.toLowerCase().includes('event id'))) {
        continue;
      }
      if (row.length < 3) continue;

      // Schema: Attendance ID,Event ID,Member ID,Vote Status,Attendance Status,Updated At
      const rawEventId = (row[1] || '').trim();
      const memberId = (row[2] || '').trim();
      if (!rawEventId || !memberId) continue;

      const eventId = EVENT_ID_ALIASES[rawEventId] || rawEventId;
      const id = row[0] || `att-${eventId}-${memberId}`;

      const voteStatus = (['YES', 'NO', 'NO RESPONSE'].includes(row[3]?.toUpperCase())
        ? row[3].toUpperCase()
        : 'NO RESPONSE') as VoteStatus;
      const attendanceStatus = (['JOINED', 'DIDNT_JOIN', 'NOT_APPLICABLE'].includes(row[4]?.toUpperCase())
        ? row[4].toUpperCase()
        : 'NOT_APPLICABLE') as AttendanceStatus;
      const updatedAt = row[5] || now;

      const key = `${eventId}::${memberId}`;
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, {
          id,
          eventId,
          memberId,
          voteStatus,
          attendanceStatus,
          updatedAt,
        });
      } else {
        // Prioritize actual user votes/attendance over default placeholder records
        const hasActiveStatus = attendanceStatus === 'JOINED' || attendanceStatus === 'DIDNT_JOIN';
        const hasActiveVote = voteStatus === 'YES' || voteStatus === 'NO';

        byKey.set(key, {
          id: existing.id || id,
          eventId,
          memberId,
          voteStatus: hasActiveVote ? voteStatus : existing.voteStatus,
          attendanceStatus: hasActiveStatus ? attendanceStatus : existing.attendanceStatus,
          updatedAt: (hasActiveStatus || hasActiveVote) ? updatedAt : existing.updatedAt,
        });
      }
    }

    return Array.from(byKey.values());
  },

  // 4. Officer Contributions Parser
  parseContributions(csvText: string): OfficerContribution[] {
    const rows = parseCsvRows(csvText);
    const contributions: OfficerContribution[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toLowerCase().includes('contribution id') || row[1]?.toLowerCase().includes('admin id'))) {
        continue;
      }
      if (row.length < 5) continue;

      // Schema: Contribution ID,Admin ID,Admin Username,Admin Name,Admin Role,Action Type,Description,Target Name,Count,Timestamp
      const id = row[0] || `cnt-${Date.now()}-${i}`;
      const adminId = row[1] || 'adm-seoyoon';
      const adminUsername = row[2] || 'seoyoon';
      const adminName = row[3] || 'Seoyoon';
      const adminRole = (['MainAdmin', 'SubAdmin'].includes(row[4]) ? row[4] : 'MainAdmin') as AdminRole;
      const action = (row[5] || 'MEMBER_ADDED') as ContributionActionType;
      const description = row[6] || '';
      const targetName = row[7] || undefined;
      const count = Number(row[8]) || 1;
      const timestamp = row[9] || now;

      contributions.push({
        id,
        adminId,
        adminUsername,
        adminName,
        adminRole,
        action,
        description,
        targetName,
        count,
        timestamp,
      });
    }

    return contributions;
  },

  // 5. Strike History Parser
  parseStrikes(csvText: string): StrikeRecord[] {
    const rows = parseCsvRows(csvText);
    const strikes: StrikeRecord[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toLowerCase().includes('strike id') || row[1]?.toLowerCase().includes('member id'))) {
        continue;
      }
      if (row.length < 3) continue;

      // Schema: Strike ID,Member ID,Date,Reason,Added By
      const id = row[0] || `str-${Date.now()}-${i}`;
      const memberId = row[1];
      if (!memberId) continue;
      const date = row[2] || now;
      const reason = row[3] || 'Unexcused Absence';
      const addedBy = row[4] || 'Seoyoon';

      strikes.push({
        id,
        memberId,
        date,
        reason,
        addedBy,
      });
    }

    return strikes;
  },

  // 6. Communications Parser
  parseCommunications(csvText: string): CommunicationRecord[] {
    const rows = parseCsvRows(csvText);
    const comms: CommunicationRecord[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toLowerCase().includes('communication id') || row[1]?.toLowerCase().includes('member id'))) {
        continue;
      }
      if (row.length < 3) continue;

      // Schema: Communication ID,Member ID,Status,Note,Date,Added By
      const id = row[0] || `comm-${Date.now()}-${i}`;
      const memberId = row[1];
      if (!memberId) continue;
      const status = (['Good', 'Warning', 'Poor', 'Unreachable', 'Unknown'].includes(row[2])
        ? row[2]
        : 'Good') as CommunicationStatus;
      const note = row[3] || '';
      const date = row[4] || now;
      const addedBy = row[5] || 'Seoyoon';

      comms.push({
        id,
        memberId,
        status,
        note,
        date,
        addedBy,
      });
    }

    return comms;
  },

  /**
   * Sync all sections concurrently from the Google Sheet
   */
  async syncAllSections(customUrl?: string): Promise<SheetSyncResult & { data?: {
    members: Member[];
    events: AllianceEvent[];
    attendance: AttendanceRecord[];
    contributions: OfficerContribution[];
    strikes: StrikeRecord[];
    communications: CommunicationRecord[];
  } }> {
    const sheetId = this.extractSheetId(customUrl);
    const errors: string[] = [];

    const [
      membersResult,
      eventsResult,
      attendanceResult,
      contributionsResult,
      strikesResult,
      commsResult,
    ] = await Promise.allSettled([
      this.fetchTabCsv(sheetId, GOOGLE_SHEET_TABS.members).then(csv => this.parseMembers(csv)),
      this.fetchTabCsv(sheetId, GOOGLE_SHEET_TABS.events).then(csv => this.parseEvents(csv)),
      this.fetchTabCsv(sheetId, GOOGLE_SHEET_TABS.attendance).then(csv => this.parseAttendance(csv)),
      this.fetchTabCsv(sheetId, GOOGLE_SHEET_TABS.contributions).then(csv => this.parseContributions(csv)),
      this.fetchTabCsv(sheetId, GOOGLE_SHEET_TABS.strikes).then(csv => this.parseStrikes(csv)),
      this.fetchTabCsv(sheetId, GOOGLE_SHEET_TABS.communications).then(csv => this.parseCommunications(csv)),
    ]);

    const members = membersResult.status === 'fulfilled' ? membersResult.value : [];
    if (membersResult.status === 'rejected') errors.push(`Members: ${membersResult.reason.message}`);

    const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
    if (eventsResult.status === 'rejected') errors.push(`Events: ${eventsResult.reason.message}`);

    const attendance = attendanceResult.status === 'fulfilled' ? attendanceResult.value : [];
    if (attendanceResult.status === 'rejected') errors.push(`Attendance: ${attendanceResult.reason.message}`);

    const contributions = contributionsResult.status === 'fulfilled' ? contributionsResult.value : [];
    if (contributionsResult.status === 'rejected') errors.push(`Contributions: ${contributionsResult.reason.message}`);

    const strikes = strikesResult.status === 'fulfilled' ? strikesResult.value : [];
    if (strikesResult.status === 'rejected') errors.push(`Strikes: ${strikesResult.reason.message}`);

    const communications = commsResult.status === 'fulfilled' ? commsResult.value : [];
    if (commsResult.status === 'rejected') errors.push(`Communications: ${commsResult.reason.message}`);

    // 1. Build lookup maps for Member and Event resolution
    const memberByName = new Map<string, string>();
    const memberById = new Set<string>();
    for (const m of members) {
      memberById.add(m.id);
      memberByName.set(m.name.toLowerCase().trim(), m.id);
    }

    const eventByName = new Map<string, string>();
    const eventById = new Set<string>();
    for (const e of events) {
      eventById.add(e.id);
      eventByName.set(e.eventName.toLowerCase().trim(), e.id);
    }

    // 2. Align attendance: resolve names to IDs and satisfy foreign key constraints
    const alignedAttendance: AttendanceRecord[] = [];
    const seenAttIds = new Set<string>();

    for (const att of attendance) {
      let resolvedMemberId = att.memberId;
      if (!memberById.has(resolvedMemberId)) {
        const found = memberByName.get(resolvedMemberId.toLowerCase().trim());
        if (found) resolvedMemberId = found;
      }

      let resolvedEventId = att.eventId;
      if (!eventById.has(resolvedEventId)) {
        const found = eventByName.get(resolvedEventId.toLowerCase().trim());
        if (found) resolvedEventId = found;
      }

      if (memberById.has(resolvedMemberId) && eventById.has(resolvedEventId)) {
        const attId = `att-${resolvedEventId}-${resolvedMemberId}`;
        if (!seenAttIds.has(attId)) {
          seenAttIds.add(attId);
          alignedAttendance.push({
            ...att,
            id: attId,
            memberId: resolvedMemberId,
            eventId: resolvedEventId,
          });
        }
      }
    }

    // 3. Ensure every event has attendance entries for all active members if none exist yet
    for (const evt of events) {
      const existingMembersForEvt = new Set(alignedAttendance.filter(a => a.eventId === evt.id).map(a => a.memberId));
      for (const m of members) {
        if (!existingMembersForEvt.has(m.id) && m.status !== 'Archived') {
          const attId = `att-${evt.id}-${m.id}`;
          if (!seenAttIds.has(attId)) {
            seenAttIds.add(attId);
            alignedAttendance.push({
              id: attId,
              eventId: evt.id,
              memberId: m.id,
              voteStatus: 'NO RESPONSE',
              attendanceStatus: 'NOT_APPLICABLE',
              updatedAt: evt.date || new Date().toISOString(),
            });
          }
        }
      }
    }

    const totalSynced =
      members.length + events.length + alignedAttendance.length + contributions.length + strikes.length + communications.length;

    if (totalSynced === 0 && errors.length > 0) {
      return {
        success: false,
        message: errors[0] || 'Failed to sync Google Sheet.',
        errors,
      };
    }

    return {
      success: true,
      message: `Synchronized ${members.length} members, ${events.length} events, ${alignedAttendance.length} aligned attendance records, and ${contributions.length} officer logs.`,
      counts: {
        members: members.length,
        events: events.length,
        attendance: alignedAttendance.length,
        contributions: contributions.length,
        strikes: strikes.length,
        communications: communications.length,
      },
      data: {
        members,
        events,
        attendance: alignedAttendance,
        contributions,
        strikes,
        communications,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};
