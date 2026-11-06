// Sample data for the /app preview. Not connected to the API (see spec 2026-10-29).

export type SampleTeammate = { id: string; name: string; title: string };

// Fictional people. They only feed the Overview's Team members count; the real member list lives on /app/members.
export const SAMPLE_TEAM: SampleTeammate[] = [
  { id: "tm_dana", name: "Dana Whitfield", title: "Managing partner" },
  { id: "tm_luis", name: "Luis Ortega", title: "Director of operations" },
  { id: "tm_priya", name: "Priya Raman", title: "IT manager" },
  { id: "tm_sam", name: "Sam Becker", title: "Associate" },
];
