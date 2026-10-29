import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App.tsx";

afterEach(() => vi.unstubAllGlobals());

it("shows the server status from /api/health", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ status: "ok", service: "rengas-server" }),
      ),
  );
  render(<App />);
  expect(await screen.findByText("Server status: ok")).toBeInTheDocument();
});
