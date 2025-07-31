import { describe, expect, it } from "vitest";
import worker from "./index";

describe("/fetch", () => {
  it("responds 400 on invalid body", async () => {
    const resp = await worker.fetch(new Request("http://localhost/fetch", { method: "POST", body: "not json" }), {}, {} as any);
    expect(resp.status).toBe(400);
  });
});
