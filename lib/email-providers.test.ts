import { describe, expect, it } from "vitest";

import { isEmailProviderDomain, isEmailProviderAddress } from "./email-providers";

describe("email providers", () => {
  it("recognises a provider typed as a website, however it is written", () => {
    for (const input of ["gmail.com", "Gmail.com", "https://www.gmail.com/", "www.outlook.com/inbox", " proton.me "]) {
      expect(isEmailProviderDomain(input)).toBe(true);
    }
  });

  it("does not mistake a firm's site for a provider", () => {
    for (const input of ["smithlaw.com", "gmailfirm.com", "law.gmail.com.example", ""]) {
      expect(isEmailProviderDomain(input)).toBe(false);
    }
  });

  it("tells a personal mailbox from a firm mailbox", () => {
    expect(isEmailProviderAddress("jane@hotmail.com")).toBe(true);
    expect(isEmailProviderAddress("jane@ICLOUD.com")).toBe(true);
    expect(isEmailProviderAddress("jane@smithlaw.com")).toBe(false);
    expect(isEmailProviderAddress("not an email")).toBe(false);
  });
});
