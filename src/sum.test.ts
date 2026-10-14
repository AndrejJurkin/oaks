import { describe, expect, it } from "vitest";
import { sum } from "./sum.js";

describe("sum", () => {
  it("adds two numbers", () => {
    expect(sum(1, 2)).toBe(3);
  });
});
