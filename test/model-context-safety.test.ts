// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  contextInput,
  decideWithMeaning,
  whoseDetail,
  actThreshold,
  CALIBRATED_THRESHOLDS,
  SAFE_ACT_CONFIDENCE,
} from "../src/content/meaning";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const MOCK_PROFILE: Profile = {
  ...PROFILE,
  firstName: "Asha",
  lastName: "Sharma",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  currentTitle: "Software Engineer",
  currentCompany: "Acme Corp",
};

describe("Lane 2: Context Input & Two-Step Decision Safety", () => {
  describe("1. Context Construction", () => {
    it("joins label, section, help text, and nearest neighbour with [SEP]", () => {
      const field: FieldDescriptor = {
        key: "f1",
        label: "Full Name",
        section: "Professional References",
        control: "text",
        required: true,
        options: [],
        name: "ref_name",
        autocomplete: "",
        placeholder: "",
      };

      const ctx = contextInput(field, "Referee Relationship", "Please provide 2 references");
      expect(ctx).toBe(
        "Full Name [SEP] Section: Professional References [SEP] Help: Please provide 2 references [SEP] Near: Referee Relationship"
      );
    });

    it("handles fields without section or help text cleanly", () => {
      const field: FieldDescriptor = {
        key: "f2",
        label: "Email Address",
        control: "text",
        required: true,
        options: [],
        name: "email",
        autocomplete: "email",
        placeholder: "",
      };

      const ctx = contextInput(field);
      expect(ctx).toBe("Email Address");
    });
  });

  describe("2. Two-Step Decision: Whose Detail", () => {
    it("identifies reference and emergency contact fields as another_person and strictly ASKS", () => {
      const refField: FieldDescriptor = {
        key: "ref_1",
        label: "Full Name",
        section: "References",
        control: "text",
        required: true,
        options: [],
        name: "reference_name",
        autocomplete: "",
        placeholder: "",
      };

      expect(whoseDetail(refField)).toBe("another_person");

      const d = decideWithMeaning(refField, MOCK_PROFILE, []);
      // Must NOT fill candidate's name! Must ask!
      expect(d.kind).toBe("ask");
      expect(d).not.toHaveProperty("value", "Asha Sharma");
    });

    it("identifies emergency contact phone as another_person and strictly ASKS", () => {
      const emergencyField: FieldDescriptor = {
        key: "em_phone",
        label: "Phone Number",
        section: "Emergency Contact",
        control: "tel",
        required: true,
        options: [],
        name: "em_phone",
        autocomplete: "",
        placeholder: "",
      };

      expect(whoseDetail(emergencyField)).toBe("another_person");

      const d = decideWithMeaning(emergencyField, MOCK_PROFILE, []);
      expect(d.kind).toBe("ask");
      expect(d).not.toHaveProperty("value", "+91 98765 43210");
    });

    it("identifies statutory legal and consent fields as legal and strictly ASKS", () => {
      const legalField: FieldDescriptor = {
        key: "leg_1",
        label: "I certify that all statements made in this application are true and correct",
        section: "Declaration and Signature",
        control: "checkbox",
        required: true,
        options: [],
        name: "declaration",
        autocomplete: "",
        placeholder: "",
      };

      expect(whoseDetail(legalField)).toBe("legal");

      const d = decideWithMeaning(legalField, MOCK_PROFILE, []);
      expect(d.kind).toBe("ask");
    });

    it("identifies self profile fields and fills them safely", () => {
      const selfField: FieldDescriptor = {
        key: "self_email",
        label: "Email Address",
        section: "Personal Information",
        control: "email",
        required: true,
        options: [],
        name: "email",
        autocomplete: "email",
        placeholder: "",
      };

      expect(whoseDetail(selfField)).toBe("self");

      const d = decideWithMeaning(selfField, MOCK_PROFILE, []);
      expect(d.kind).toBe("profile");
      if (d.kind === "profile") {
        expect(d.value).toBe("asha@example.com");
      }
    });
  });

  describe("3. Per-Meaning Calibrated Thresholds", () => {
    it("enforces higher bars on risky meanings and lower bars on safe profile intents", () => {
      expect(actThreshold("work_authorization")).toBeGreaterThanOrEqual(0.95);
      expect(actThreshold("sponsorship")).toBeGreaterThanOrEqual(0.95);
      expect(actThreshold("email")).toBeLessThanOrEqual(SAFE_ACT_CONFIDENCE);
      expect(actThreshold("phone")).toBeLessThanOrEqual(SAFE_ACT_CONFIDENCE);
    });
  });
});
