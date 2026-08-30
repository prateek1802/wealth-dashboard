import { describe, it, expect, vi, afterEach } from "vitest";
import { logServerError } from "@/lib/utils/log-error";

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
