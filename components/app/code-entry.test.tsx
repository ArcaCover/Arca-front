// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CodeEntry, { CODE_SENDER, RESEND_COOLDOWN_S } from "@/components/app/CodeEntry";
import { createFakeSupabase, type FakeSupabase } from "@/lib/test-fixtures/supabase";

// The six-box code of every sign-in on the real accounts (DN-13 §4.1, §19): typing, paste, Backspace, the sixth digit verifying,
// a wrong code kept for a fix, and the resend cooldown.
const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => supabase.current }));

let fake: FakeSupabase;
const group = () => screen.getByRole("group", { name: "Verification code, 6 digits" });
const boxes = () => within(group()).getAllByRole<HTMLInputElement>("textbox");
const values = () => boxes().map(box => box.value).join("");

function renderCode(props: { neutral?: boolean } = {}) {
  const onVerified = vi.fn();
  render(<CodeEntry email="ana@smithlaw.com" next="/app/signup?claim=cl_1" onVerified={onVerified} {...props} />);
  return onVerified;
}

beforeEach(() => {
  fake = createFakeSupabase();
  supabase.current = fake;
  fake.acceptCode("ana@smithlaw.com", "246810");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CodeEntry", () => {
  it("is one labelled group of six numeric boxes, the first ready for the code the phone offers", () => {
    renderCode();
    expect(boxes()).toHaveLength(6);
    expect(boxes().map(box => box.getAttribute("aria-label"))).toEqual(["Digit 1 of 6", "Digit 2 of 6", "Digit 3 of 6", "Digit 4 of 6",
      "Digit 5 of 6", "Digit 6 of 6"]);
    for (const box of boxes()) expect(box.getAttribute("inputmode")).toBe("numeric");
    expect(boxes()[0]!.getAttribute("autocomplete")).toBe("one-time-code");
    expect(document.activeElement).toBe(boxes()[0]);
    expect(screen.getByText(/We sent a 6-digit code to/).textContent).toContain("ana@smithlaw.com");
    expect(screen.getByText("It expires in 10 minutes.")).toBeTruthy();
    expect(screen.getByText(new RegExp(`spam or junk folder: the email comes from ${CODE_SENDER}`))).toBeTruthy();
  });

  it("moves on with each digit, ignores letters, and verifies on the sixth", async () => {
    const onVerified = renderCode();
    await userEvent.type(boxes()[0]!, "2a4");
    expect(values()).toBe("24");
    expect(document.activeElement).toBe(boxes()[2]);
    expect(fake.auth.verifyOtp).not.toHaveBeenCalled();
    await userEvent.keyboard("6810");
    await waitFor(() => expect(onVerified).toHaveBeenCalledOnce());
    expect(fake.auth.verifyOtp).toHaveBeenCalledExactlyOnceWith({ email: "ana@smithlaw.com", token: "246810", type: "email" });
    expect(screen.getByText("Verified. One moment…")).toBeTruthy();
    expect(boxes().every(box => box.disabled)).toBe(true);
  });

  it("fills every box from a pasted code, whatever box it lands in, spaces and dashes aside", async () => {
    const onVerified = renderCode();
    await userEvent.click(boxes()[3]!);
    await userEvent.paste("246 810");
    expect(values()).toBe("246810");
    await waitFor(() => expect(onVerified).toHaveBeenCalledOnce());
  });

  it("takes a code the browser autofills into the first box", async () => {
    const onVerified = renderCode();
    fireEvent.change(boxes()[0]!, { target: { value: "246810" } });
    expect(values()).toBe("246810");
    await waitFor(() => expect(onVerified).toHaveBeenCalledOnce());
  });

  it("goes back with Backspace from an empty box, clearing the digit before it", async () => {
    renderCode();
    await userEvent.type(boxes()[0]!, "246");
    await userEvent.keyboard("{Backspace}");
    expect(values()).toBe("24");
    expect(document.activeElement).toBe(boxes()[2]);
    await userEvent.keyboard("{Backspace}");
    expect(values()).toBe("2");
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it("keeps a wrong code in the boxes with the error, and verifies the fixed one", async () => {
    const onVerified = renderCode();
    await userEvent.type(boxes()[0]!, "246811");
    expect((await screen.findByRole("alert")).textContent).toBe("That code is not valid or has expired. Check the latest email, or send a new code.");
    expect(values()).toBe("246811");
    expect(boxes()[0]!.getAttribute("aria-invalid")).toBe("true");
    expect(group().getAttribute("aria-describedby")).toContain(screen.getByRole("alert").id);
    expect(onVerified).not.toHaveBeenCalled();
    // One typo, one fix: the last box is where the focus went.
    expect(document.activeElement).toBe(boxes()[5]);
    await userEvent.keyboard("0");
    await waitFor(() => expect(onVerified).toHaveBeenCalledOnce());
    expect(fake.auth.verifyOtp).toHaveBeenLastCalledWith({ email: "ana@smithlaw.com", token: "246810", type: "email" });
  });

  it("lets a new code be asked for only after the cooldown, and starts it again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderCode();
    const resend = () => screen.getByRole<HTMLButtonElement>("button", { name: /Send a new code/ });
    expect(resend().textContent).toBe(`Send a new code in 0:${RESEND_COOLDOWN_S}`);
    expect(resend().disabled).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(resend().textContent).toBe("Send a new code in 0:20");
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(resend().disabled).toBe(false);
    expect(resend().textContent).toBe("Send a new code");
    await userEvent.click(resend());
    expect(fake.auth.signInWithOtp).toHaveBeenCalledExactlyOnceWith({ email: "ana@smithlaw.com",
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/app/auth/confirm?next=%2Fapp%2Fsignup%3Fclaim%3Dcl_1` } });
    expect(await screen.findByText("We sent a new code to ana@smithlaw.com.")).toBeTruthy();
    expect(resend().disabled).toBe(true);
  });

  it("says the same whether an account exists or not on the login", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fake.auth.signInWithOtp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Signups not allowed for otp", status: 422 } });
    renderCode({ neutral: true });
    expect(screen.getByText(/If an account exists for/).textContent).toContain("ana@smithlaw.com");
    await act(() => vi.advanceTimersByTimeAsync(RESEND_COOLDOWN_S * 1000));
    await userEvent.click(screen.getByRole("button", { name: "Send a new code" }));
    expect(await screen.findByText("If an account exists for ana@smithlaw.com, we sent it a new code.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
