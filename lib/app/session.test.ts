// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAppSession,
  clearPendingClaim,
  loadAppSession,
  loadPendingClaim,
  recallOrg,
  rememberOrg,
  saveAppSession,
  savePendingClaim,
} from "./session";

const HOUR = 3_600_000;
const inAnHour = () => new Date(Date.now() + HOUR).toISOString();
const anHourAgo = () => new Date(Date.now() - HOUR).toISOString();

const SESSION_KEY = "arca.app.session";
const CLAIM_KEY = "arca.app.claim";
const ORG_KEY = "arca.app.org";

// A browser that blocks site data throws on every access, and on the server there is no storage at all.
function blockStorage() {
  const blocked = () => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  };
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(blocked);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("app session", () => {
  it("lives in localStorage, so it survives the tab", () => {
    const session = { token: "app-token", email: "ana@smithlaw.com", expiresAt: inAnHour() };

    saveAppSession(session);

    expect(loadAppSession()).toEqual(session);
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("is no session once it has expired, and the expired token is not kept around", () => {
    saveAppSession({ token: "app-token", email: "ana@smithlaw.com", expiresAt: anHourAgo() });

    expect(loadAppSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("is no session when there is none, or when what is stored is not a session", () => {
    expect(loadAppSession()).toBeNull();

    for (const stored of [
      "{not json",
      "null",
      JSON.stringify({ token: 7, email: "ana@smithlaw.com", expiresAt: inAnHour() }),
      JSON.stringify({ token: "app-token", email: "ana@smithlaw.com" }),
      JSON.stringify({ token: "app-token", email: "ana@smithlaw.com", expiresAt: "not a date" }),
    ]) {
      localStorage.setItem(SESSION_KEY, stored);
      expect(loadAppSession()).toBeNull();
    }
  });

  it("clears the session", () => {
    saveAppSession({ token: "app-token", email: "ana@smithlaw.com", expiresAt: inAnHour() });

    clearAppSession();

    expect(loadAppSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("does not throw when storage is blocked: there is simply no session", () => {
    blockStorage();

    expect(() => saveAppSession({ token: "app-token", email: "ana@smithlaw.com", expiresAt: inAnHour() })).not.toThrow();
    expect(loadAppSession()).toBeNull();
    expect(() => clearAppSession()).not.toThrow();
  });

  it("does not throw when there is no storage at all (server render)", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(() => saveAppSession({ token: "app-token", email: "ana@smithlaw.com", expiresAt: inAnHour() })).not.toThrow();
    expect(loadAppSession()).toBeNull();
    expect(() => clearAppSession()).not.toThrow();
  });
});

describe("pending claim", () => {
  it("lives in sessionStorage, so closing the tab drops it", () => {
    const claim = { claimId: "cl_1", email: "ana@smithlaw.com", expiresAt: inAnHour() };

    savePendingClaim(claim);

    expect(loadPendingClaim()).toEqual(claim);
    expect(sessionStorage.getItem(CLAIM_KEY)).not.toBeNull();
    expect(localStorage.getItem(CLAIM_KEY)).toBeNull();
  });

  it("is no claim once its ticket has expired", () => {
    savePendingClaim({ claimId: "cl_1", email: "ana@smithlaw.com", expiresAt: anHourAgo() });

    expect(loadPendingClaim()).toBeNull();
    expect(sessionStorage.getItem(CLAIM_KEY)).toBeNull();
  });

  it("is no claim when what is stored is not one", () => {
    sessionStorage.setItem(CLAIM_KEY, JSON.stringify({ claimId: "cl_1" }));

    expect(loadPendingClaim()).toBeNull();
  });

  it("clears the claim", () => {
    savePendingClaim({ claimId: "cl_1", email: "ana@smithlaw.com", expiresAt: inAnHour() });

    clearPendingClaim();

    expect(loadPendingClaim()).toBeNull();
  });

  it("does not throw when storage is blocked", () => {
    blockStorage();

    expect(() => savePendingClaim({ claimId: "cl_1", email: "ana@smithlaw.com", expiresAt: inAnHour() })).not.toThrow();
    expect(loadPendingClaim()).toBeNull();
    expect(() => clearPendingClaim()).not.toThrow();
  });
});

describe("remembered organization", () => {
  it("remembers the last organization in localStorage", () => {
    expect(recallOrg()).toBeNull();

    rememberOrg("org_1");

    expect(recallOrg()).toBe("org_1");
    expect(localStorage.getItem(ORG_KEY)).toBe("org_1");
  });

  it("does not throw when storage is blocked", () => {
    blockStorage();

    expect(() => rememberOrg("org_1")).not.toThrow();
    expect(recallOrg()).toBeNull();
  });
});
