/** E2E tests for Resume Import: paste text -> review -> save -> profile updated.
 * Verifies that an existing profile value is NOT overwritten unless replace is ticked.
 */

import type { Profile } from "../src/shared/types";
import { expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

test.describe("Resume Import", () => {
  test("paste text -> review -> save -> profile updated; existing value NOT overwritten unless ticked", async ({ ext }) => {
    // Set initial profile with known existing values
    const initialProfile: Profile = {
      ...PROFILE,
      firstName: "Asha",
      lastName: "Verma",
      school: "", // Empty to verify new fill
      degree: "",
    };

    await setStorage(ext, { profile: initialProfile });
    await ext.reload();
    await goTo(ext, "profile");

    // Click "Paste resume text" button to open modal
    const pasteBtn = ext.locator("#paste-resume-btn");
    await expect(pasteBtn).toBeVisible();
    await pasteBtn.click();

    // Verify modal is open
    const pasteDialog = ext.locator("#paste-resume-dialog");
    await expect(pasteDialog).toBeVisible();

    // Paste resume text with different name and new education
    const resumeText = `
Neha Patel
neha.patel@example.com
+91 98765 43210
Pune, Maharashtra, India

EDUCATION
BITS Pilani
B.Tech in Computer Science | 2024

EXPERIENCE
Software Engineer at TechCorp | 2024 – Present
• Developing web applications in React and Node.js.
    `;

    await ext.locator("#paste-resume-text").fill(resumeText);
    await ext.locator("#paste-resume-parse").click();

    // Review modal should open
    const reviewDialog = ext.locator("#resume-review-dialog");
    await expect(reviewDialog).toBeVisible();
    await expect(reviewDialog.getByText("Review suggestions from resume")).toBeVisible();

    // Find the row for First name (which already has existing value "Asha")
    const firstNameRow = reviewDialog.locator(".resume-review-item", { hasText: "First name" });
    await expect(firstNameRow).toBeVisible();
    await expect(firstNameRow.locator("input[type='checkbox']")).not.toBeChecked(); // Unticked because existing value

    // Find the row for School (which was empty in initial profile)
    const schoolRow = reviewDialog.locator(".resume-review-item", { hasText: "School / university" });
    await expect(schoolRow).toBeVisible();
    await expect(schoolRow.locator("input[type='checkbox']")).toBeChecked(); // Pre-checked because empty

    // Save selected without ticking First name replacement
    await reviewDialog.getByRole("button", { name: "Save selected" }).click();
    await expect(reviewDialog).not.toBeVisible();

    // Verify in storage: firstName was NOT overwritten; school WAS updated
    await expect.poll(async () => {
      const p = await getStorage<Profile>(ext, "profile");
      return p?.firstName;
    }).toBe("Asha");

    const savedProfile = await getStorage<Profile>(ext, "profile");
    expect(savedProfile?.school).toContain("BITS Pilani");

    // Now test second flow: explicitly ticking replace on existing value
    await pasteBtn.click();
    await ext.locator("#paste-resume-text").fill(resumeText);
    await ext.locator("#paste-resume-parse").click();
    await expect(reviewDialog).toBeVisible();

    // Tick the checkbox to replace First name
    const firstNameCheckbox = reviewDialog.locator(".resume-review-item", { hasText: "First name" }).locator("input[type='checkbox']");
    await firstNameCheckbox.check();
    await expect(firstNameCheckbox).toBeChecked();

    // Save selected
    await reviewDialog.getByRole("button", { name: "Save selected" }).click();
    await expect(reviewDialog).not.toBeVisible();

    // Verify in storage: firstName is now overwritten with "Neha"
    await expect.poll(async () => {
      const p = await getStorage<Profile>(ext, "profile");
      return p?.firstName;
    }).toBe("Neha");
  });
});
