import { describe, expect, it } from "vitest";
import { validateContact } from "./validation";

describe("validateContact", () => {
  it("rejects an empty name", () => {
    const result = validateContact({ name: "   ", priority: "high" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toBe("Name is required");
    }
  });

  it("rejects a missing name", () => {
    const result = validateContact({ priority: "medium" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toBeDefined();
    }
  });

  it("rejects an invalid priority value", () => {
    const result = validateContact({ name: "Ada Lovelace", priority: "urgent" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.priority).toBe("Priority must be high, medium, or low");
    }
  });

  it("accepts a fully valid contact", () => {
    const result = validateContact({
      name: "Ada Lovelace",
      company: "Berkeley Robotics Club",
      role: "President",
      met_at: "Career fair",
      notes: "Follow up about the fall hackathon",
      priority: "medium",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Ada Lovelace");
      expect(result.data.priority).toBe("medium");
    }
  });

  it("accepts a contact with only the required fields", () => {
    const result = validateContact({ name: "Grace Hopper", priority: "low" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company).toBe("");
    }
  });
});
