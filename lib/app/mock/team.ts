// Sample data for the /app preview. Not connected to the API (see spec 2026-10-29).

export type SampleTeammate = { id: string; name: string; title: string };

// Fictional people, used only as assignees and actors in the preview. The real member list lives on /app/members.
export const SAMPLE_TEAM: SampleTeammate[] = [
  { id: "tm_dana", name: "Dana Whitfield", title: "Managing partner" },
  { id: "tm_luis", name: "Luis Ortega", title: "Director of operations" },
  { id: "tm_priya", name: "Priya Raman", title: "IT manager" },
  { id: "tm_sam", name: "Sam Becker", title: "Associate" },
];

export const teammate = (id: string | null) => SAMPLE_TEAM.find(person => person.id === id) ?? null;
