import { describe, it, expect, vi, afterEach } from "vitest";
import { logServerError, getErrorMessage } from "@/lib/utils/log-error";

describe("logServerError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs via console.error with the context in brackets, followed by the raw error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");
    logServerError("addTransactionAction", err);
    expect(spy).toHaveBeenCalledWith("[addTransactionAction]", err);
  });

  it("logs whatever was thrown, even a non-Error value", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerError("someAction", "a plain string error");
    expect(spy).toHaveBeenCalledWith("[someAction]", "a plain string error");
  });
});

describe("getErrorMessage", () => {
  it("extracts .message from a real Error instance", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("extracts .message from a plain object shaped like a PostgrestError, even though it's not instanceof Error", () => {
    const fakePostgrestError = { message: "new row violates row-level security policy", code: "42501", details: null, hint: null };
    expect(fakePostgrestError instanceof Error).toBe(false); // the exact case that broke the old `instanceof Error` check
    expect(getErrorMessage(fakePostgrestError)).toBe("new row violates row-level security policy");
  });

  it("returns a plain thrown string as-is", () => {
    expect(getErrorMessage("something broke")).toBe("something broke");
  });

  it("falls back for null/undefined rather than throwing", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong");
    expect(getErrorMessage(undefined)).toBe("Something went wrong");
  });

  it("respects a custom fallback message", () => {
    expect(getErrorMessage(null, "Import failed")).toBe("Import failed");
  });

  it("stringifies an object with no .message rather than losing the detail entirely", () => {
    expect(getErrorMessage({ code: "23502", detail: "not-null violation" })).toContain("23502");
  });
});
