import { ACTION_STATUSES, AUDIT_ACTOR_KINDS } from "@arca/contracts";
import { describe, expect, it } from "vitest";

import { ACTION_STATUS_LABEL, ACTOR_KIND_LABEL } from "./labels";

// The typecheck already refuses a contract value without words; these pin the words, which the Action plan, the activity
// and ARCA's panel show today.

describe("labels", () => {
  it("words each action status as the Action plan does", () => {
    expect(Object.keys(ACTION_STATUS_LABEL)).toEqual([...ACTION_STATUSES]);
    expect(ACTION_STATUS_LABEL).toEqual({ todo: "To do", in_progress: "In progress", done: "Done" });
  });

  it("names who wrote an audit row by kind, as the activity and ARCA's audit do", () => {
    expect(Object.keys(ACTOR_KIND_LABEL)).toEqual([...AUDIT_ACTOR_KINDS]);
    expect(ACTOR_KIND_LABEL).toEqual({ member: "Member", platform: "ARCA staff", system: "System" });
  });
});
