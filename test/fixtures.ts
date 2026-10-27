/** Mock application form shaped like typical ATS forms (labels, wrappers, radios in fieldsets, hidden file
 * input behind a styled button, EEO section, consent checkbox). Written for tests; not copied from any site. */

import type { AnswerEntry, Profile } from "../src/shared/types";
import { EMPTY_PROFILE } from "../src/shared/storage";

export const APPLICATION_FORM = `
<h1 class="app-title">Backend Engineer</h1>
<p>Thank you for your interest in Acme. Please complete the form below.</p>
<form id="application-form">
  <div class="field"><label for="first_name">First Name *</label><input id="first_name" name="first_name" required></div>
  <div class="field"><label for="last_name">Last Name *</label><input id="last_name" name="last_name" required></div>
  <div class="field"><label for="email">Email *</label><input id="email" name="email" type="email" required></div>
  <div class="field"><label for="phone">Phone</label><input id="phone" name="phone" type="tel"></div>
  <div class="field"><label for="resume">Resume/CV *</label>
    <button type="button">Attach</button><input id="resume" name="resume" type="file" style="display:none" required></div>
  <div class="field"><label for="linkedin">LinkedIn Profile</label><input id="linkedin" name="urls[LinkedIn]"></div>
  <div class="field"><label for="degree">University degree</label>
    <select id="degree" name="degree"><option value="">Select...</option><option value="1">Bachelor's Degree</option><option value="2">Master's Degree</option><option value="3">PhD</option></select></div>
  <fieldset><legend>Are you legally authorized to work in the United States? *</legend>
    <label><input type="radio" name="auth" value="1" required> Yes</label>
    <label><input type="radio" name="auth" value="0"> No</label></fieldset>
  <div class="field"><label for="sponsor">Will you now or in the future require visa sponsorship? *</label>
    <select id="sponsor" name="sponsor" required><option value="">Select...</option><option value="y">Yes</option><option value="n">No</option></select></div>
  <div class="field"><label for="hear">How did you hear about this job? *</label>
    <select id="hear" name="hear" required><option value="">Select...</option><option>LinkedIn</option><option>Company website</option><option>Referral</option></select></div>
  <div class="field"><label for="cover">Cover letter</label><textarea id="cover" name="cover"></textarea></div>
  <div class="field"><label for="gender">Gender</label>
    <select id="gender" name="gender"><option value="">Select...</option><option>Male</option><option>Female</option><option>Decline to self identify</option></select></div>
  <div class="field"><label><input type="checkbox" id="alerts" name="email_alerts"> Email me about future jobs</label></div>
  <div class="field"><label><input type="checkbox" id="privacy" name="privacy" required> I agree to the privacy policy *</label></div>
  <input type="hidden" name="token" value="abc">
  <div style="display:none"><label for="honeypot">Leave empty</label><input id="honeypot" name="honeypot"></div>
  <button type="submit">Submit Application</button>
</form>`;

export const PROFILE: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Asha",
  lastName: "Verma",
  email: "asha@example.com",
  phone: "+91 90000 00000",
  linkedin: "https://linkedin.com/in/asha",
  degree: "Master's Degree",
  resume: { name: "Asha_Verma_Resume.pdf", type: "application/pdf", dataBase64: btoa("%PDF-1.4 test") },
};

export const SENSITIVE_ANSWERS: AnswerEntry[] = [
  { question: "Are you legally authorized to work in the United States?", answer: "Yes", topic: "work_authorization", updatedAt: "2026-10-25" },
  { question: "Will you now or in the future require visa sponsorship?", answer: "No", topic: "sponsorship", updatedAt: "2026-10-25" },
  { question: "I agree to the privacy policy", answer: "Yes", topic: "consent", updatedAt: "2026-10-25" },
  { question: "How did you hear about this job?", answer: "Company website", updatedAt: "2026-10-25" },
];

/** A small form whose required fields are already complete, for submission tests. */
export const SUBMIT_FORM = `
<h1>Data Analyst</h1>
<form id="application-form">
  <div class="field"><label for="first_name">First Name *</label><input id="first_name" name="first_name" required value="Asha"></div>
  <div class="field"><label for="email">Email *</label><input id="email" name="email" type="email" required value="asha@example.com"></div>
  <button type="submit">Submit Application</button>
</form>`;

/** jsdom cannot attach files, so tests that need a complete form make the resume optional. */
export function dropResumeRequirement(): void {
  document.getElementById("resume")!.removeAttribute("required");
  document.querySelector("label[for='resume']")!.textContent = "Resume/CV";
}

export function mount(html: string = APPLICATION_FORM): Document {
  document.body.innerHTML = html;
  return document;
}
