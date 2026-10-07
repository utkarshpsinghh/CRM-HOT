import { handleCors, extractApiKey } from '../_lib';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  const key = extractApiKey(req);

  return res.status(200).json({
    name: "Kingdom #1391 HOT Alliance CRM Public API",
    version: "v1",
    status: "online",
    authenticated: Boolean(key),
    baseUrl: "https://crm.1391.online/api/v1",
    authentication: {
      type: "API Key",
      methods: [
        "Header: 'x-api-key: YOUR_KEY'",
        "Header: 'Authorization: Bearer YOUR_KEY'",
        "Query Param: '?api_key=YOUR_KEY'"
      ],
      description: "Generate and manage keys inside CRM -> Settings -> External API & Integrations"
    },
    endpoints: [
      {
        path: "/api/v1/members",
        method: "GET",
        description: "Public member roster with power, town center, rank, status, and activity",
        queryParams: {
          rank: "Filter by rank (e.g. R4, R3, R2, R1)",
          status: "Filter by status (Active, Inactive, Visitor, Archived)",
          search: "Search by member name or gameId",
          limit: "Maximum records to return (default 200, max 1000)",
          offset: "Pagination offset"
        },
        example: "/api/v1/members?rank=R4"
      },
      {
        path: "/api/v1/leaderboard",
        method: "GET",
        description: "Ranked leaderboard showing attendance rates, events attended, and reliability scores",
        queryParams: {
          limit: "Maximum records to return (default 100)",
          status: "Filter by status (default: Active)",
          sortBy: "Sort order: 'attendanceRate' (default) or 'attended' or 'name'"
        },
        example: "/api/v1/leaderboard?limit=25&sortBy=attendanceRate"
      },
      {
        path: "/api/v1/events",
        method: "GET",
        description: "Alliance battle events (Bear Trap, Swordsland, Tri Alliance), slot times, and turnout stats",
        queryParams: {
          status: "Filter by event status (Completed, Scheduled, Live)",
          type: "Filter by event type (Bear Trap, Swordsland, Tri Alliance)",
          limit: "Maximum records to return (default 50)"
        },
        example: "/api/v1/events?status=Completed&type=Bear+Trap"
      },
      {
        path: "/api/v1/attendance",
        method: "GET",
        description: "Event attendance ledger showing which members voted and attended each event/slot",
        queryParams: {
          eventId: "Filter by specific event ID",
          memberId: "Filter by specific member ID",
          status: "Filter by attendance status ('ATTENDED' or 'ABSENT')",
          limit: "Maximum records to return (default 200)"
        },
        example: "/api/v1/attendance?status=ATTENDED&limit=100"
      }
    ]
  });
}
