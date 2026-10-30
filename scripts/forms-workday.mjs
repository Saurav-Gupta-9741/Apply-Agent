// Workday forms with authentic Workday styling, attributes, and structures
export const workdayForms = {
  "workday-salesforce.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Lead Software Engineer - Core Cloud Infrastructure</h1>
<div class="workday-application-container" data-automation-id="applicationPage">
  <form id="wd-apply-form" data-automation-id="applyForm">
    <div class="css-header-block" data-automation-id="legalNameSection">
      <h2 data-automation-id="sectionHeader">My Information</h2>
      <div class="css-row" data-automation-id="formRow-name">
        <div class="css-field" data-automation-id="formField-legalNameSection_firstName">
          <label class="css-label" for="input-1" data-automation-id="formLabel">First Name<span class="css-req">*</span></label>
          <input id="input-1" data-automation-id="legalNameSection_firstName" name="legalNameSection.firstName" class="css-text-input" type="text" required value="" />
        </div>
        <div class="css-field" data-automation-id="formField-legalNameSection_lastName">
          <label class="css-label" for="input-2" data-automation-id="formLabel">Last Name<span class="css-req">*</span></label>
          <input id="input-2" data-automation-id="legalNameSection_lastName" name="legalNameSection.lastName" class="css-text-input" type="text" required value="" />
        </div>
      </div>
      <div class="css-row" data-automation-id="formRow-contact">
        <div class="css-field" data-automation-id="formField-email">
          <label class="css-label" for="input-3" data-automation-id="formLabel">Email Address<span class="css-req">*</span></label>
          <input id="input-3" data-automation-id="email" name="email" class="css-text-input" type="email" required value="" />
        </div>
        <div class="css-field" data-automation-id="formField-phone">
          <label class="css-label" for="input-4" data-automation-id="formLabel">Phone Number<span class="css-req">*</span></label>
          <input id="input-4" data-automation-id="phone-number" name="phoneNumber" class="css-text-input" type="tel" required value="" />
        </div>
      </div>
      <div class="css-row" data-automation-id="formRow-address">
        <div class="css-field" data-automation-id="formField-addressLine1">
          <label class="css-label" for="input-5" data-automation-id="formLabel">Address Line 1<span class="css-req">*</span></label>
          <input id="input-5" data-automation-id="addressSection_addressLine1" name="addressSection.addressLine1" class="css-text-input" type="text" required value="" />
        </div>
        <div class="css-field" data-automation-id="formField-city">
          <label class="css-label" for="input-6" data-automation-id="formLabel">City<span class="css-req">*</span></label>
          <input id="input-6" data-automation-id="addressSection_city" name="addressSection.city" class="css-text-input" type="text" required value="" />
        </div>
        <div class="css-field" data-automation-id="formField-postalCode">
          <label class="css-label" for="input-7" data-automation-id="formLabel">Postal Code<span class="css-req">*</span></label>
          <input id="input-7" data-automation-id="addressSection_postalCode" name="addressSection.postalCode" class="css-text-input" type="text" required value="" />
        </div>
      </div>
    </div>

    <div class="css-resume-section" data-automation-id="resumeSection">
      <h2 data-automation-id="sectionHeader">Resume / CV</h2>
      <div class="css-dropzone" data-automation-id="file-upload-dropzone">
        <label class="css-label" for="input-resume" data-automation-id="formLabel">Attach Resume or CV<span class="css-req">*</span></label>
        <input id="input-resume" data-automation-id="file-upload-input" type="file" name="resume" accept=".pdf,.doc,.docx" required />
      </div>
      <div class="css-field" data-automation-id="formField-linkedin">
        <label class="css-label" for="input-linkedin" data-automation-id="formLabel">LinkedIn Profile</label>
        <input id="input-linkedin" data-automation-id="linkedinQuestion" name="linkedinUrl" class="css-text-input" type="url" placeholder="https://www.linkedin.com/in/..." />
      </div>
    </div>

    <div class="css-work-auth-section" data-automation-id="workAuthSection">
      <h2 data-automation-id="sectionHeader">Work Authorization</h2>
      <fieldset class="css-fieldset" data-automation-id="formField-authorized">
        <legend class="css-legend">Are you legally authorized to work in the United States?<span class="css-req">*</span></legend>
        <label class="css-radio-label"><input type="radio" name="work_auth_us" value="yes" required /> Yes</label>
        <label class="css-radio-label"><input type="radio" name="work_auth_us" value="no" /> No</label>
      </fieldset>
      <fieldset class="css-fieldset" data-automation-id="formField-sponsorship">
        <legend class="css-legend">Will you now or in the future require sponsorship for employment visa status?<span class="css-req">*</span></legend>
        <label class="css-radio-label"><input type="radio" name="visa_sponsorship" value="yes" required /> Yes</label>
        <label class="css-radio-label"><input type="radio" name="visa_sponsorship" value="no" /> No</label>
      </fieldset>
      <div class="css-field" data-automation-id="formField-noticePeriod">
        <label class="css-label" for="input-notice" data-automation-id="formLabel">Earliest date available to start / Notice Period</label>
        <input id="input-notice" data-automation-id="noticePeriodInput" name="noticePeriod" class="css-text-input" type="text" placeholder="e.g. 2 weeks" />
      </div>
    </div>

    <div class="css-eeo-section" data-automation-id="eeoSection">
      <h2 data-automation-id="sectionHeader">Voluntary Self-Identification</h2>
      <div class="css-field" data-automation-id="formField-gender">
        <label class="css-label" for="select-gender" data-automation-id="formLabel">Gender</label>
        <select id="select-gender" name="gender" class="css-select">
          <option value="">Select Gender</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="non_binary">Non-Binary</option>
          <option value="decline">Decline to self-identify</option>
        </select>
      </div>
      <div class="css-field" data-automation-id="formField-veteran">
        <label class="css-label" for="select-veteran" data-automation-id="formLabel">Veteran Status</label>
        <select id="select-veteran" name="veteranStatus" class="css-select">
          <option value="">Select Veteran Status</option>
          <option value="not_veteran">I am not a protected veteran</option>
          <option value="veteran">I identify as one or more of the classifications of protected veteran</option>
          <option value="decline">I decline to self-identify</option>
        </select>
      </div>
      <div class="css-field" data-automation-id="formField-disability">
        <label class="css-label" for="select-disability" data-automation-id="formLabel">Disability Status (Form CC-305)</label>
        <select id="select-disability" name="disabilityStatus" class="css-select">
          <option value="">Select Disability Status</option>
          <option value="yes">Yes, I have a disability, or have had one in the past</option>
          <option value="no">No, I do not have a disability and have not had one in the past</option>
          <option value="decline">I do not wish to answer</option>
        </select>
      </div>
    </div>

    <div class="css-button-group" data-automation-id="bottomNavigation">
      <button type="submit" class="css-btn-primary" data-automation-id="bottom-navigation-next-button">Submit Application</button>
    </div>
  </form>
</div>`,

  "workday-walmart.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Staff Big Data Engineer - Supply Chain Intelligence</h1>
<div class="wd-page-wrapper" data-automation-id="wd-page">
  <form id="walmart-application" data-automation-id="applicationForm">
    <div class="wd-card" data-automation-id="personalInfoSection">
      <h3>Candidate Profile</h3>
      <div class="wd-form-group">
        <label for="wm-first-name" class="wd-label">First Name *</label>
        <input type="text" id="wm-first-name" name="candidate.firstName" data-automation-id="legalName_firstName" required class="wd-input" />
      </div>
      <div class="wd-form-group">
        <label for="wm-last-name" class="wd-label">Last Name *</label>
        <input type="text" id="wm-last-name" name="candidate.lastName" data-automation-id="legalName_lastName" required class="wd-input" />
      </div>
      <div class="wd-form-group">
        <label for="wm-email" class="wd-label">Email Address *</label>
        <input type="email" id="wm-email" name="candidate.email" data-automation-id="contact_email" required class="wd-input" />
      </div>
      <div class="wd-form-group">
        <label for="wm-phone" class="wd-label">Phone Number *</label>
        <input type="tel" id="wm-phone" name="candidate.phone" data-automation-id="contact_phone" required class="wd-input" />
      </div>
      <div class="wd-form-group">
        <label for="wm-street" class="wd-label">Street Address *</label>
        <input type="text" id="wm-street" name="candidate.street" data-automation-id="address_street" required class="wd-input" />
      </div>
      <div class="wd-form-group">
        <label for="wm-city" class="wd-label">City *</label>
        <input type="text" id="wm-city" name="candidate.city" data-automation-id="address_city" required class="wd-input" />
      </div>
      <div class="wd-form-group">
        <label for="wm-zip" class="wd-label">Zip Code *</label>
        <input type="text" id="wm-zip" name="candidate.zip" data-automation-id="address_zip" required class="wd-input" />
      </div>
    </div>

    <div class="wd-card" data-automation-id="resumeCard">
      <h3>Documents</h3>
      <div class="wd-file-section" data-automation-id="dropZoneContainer">
        <label for="wm-resume-file" class="wd-label">Resume / CV *</label>
        <input type="file" id="wm-resume-file" name="resumeFile" data-automation-id="fileUpload" required />
      </div>
    </div>

    <div class="wd-card" data-automation-id="screeningSection">
      <h3>Screening Questions</h3>
      <div class="wd-form-group">
        <label for="wm-desired-salary" class="wd-label">Desired Salary / Compensation Expectations *</label>
        <input type="text" id="wm-desired-salary" name="desired_compensation" placeholder="e.g. $185,000 / year" required class="wd-input" />
      </div>
      <fieldset class="wd-fieldset">
        <legend class="wd-legend">Have you previously worked for Walmart or any of its subsidiaries? *</legend>
        <label><input type="radio" name="prior_walmart_employee" value="yes" required /> Yes</label>
        <label><input type="radio" name="prior_walmart_employee" value="no" /> No</label>
      </fieldset>
      <fieldset class="wd-fieldset">
        <legend class="wd-legend">Are you legally authorized to work in the United States without restriction? *</legend>
        <label><input type="radio" name="authorized_us" value="yes" required /> Yes</label>
        <label><input type="radio" name="authorized_us" value="no" /> No</label>
      </fieldset>
      <fieldset class="wd-fieldset">
        <legend class="wd-legend">Will you now or in the future require visa sponsorship for employment authorization? *</legend>
        <label><input type="radio" name="sponsorship_req" value="yes" required /> Yes</label>
        <label><input type="radio" name="sponsorship_req" value="no" /> No</label>
      </fieldset>
      <div class="wd-form-group">
        <label for="wm-hear-about" class="wd-label">How did you hear about this opportunity? *</label>
        <select id="wm-hear-about" name="source" required class="wd-select">
          <option value="">Select a source</option>
          <option value="careers_site">Walmart Careers Website</option>
          <option value="linkedin">LinkedIn</option>
          <option value="indeed">Indeed</option>
          <option value="referral">Employee Referral</option>
        </select>
      </div>
    </div>

    <div class="wd-actions">
      <button type="submit" data-automation-id="pageSubmitButton" class="wd-btn">Submit Application</button>
    </div>
  </form>
</div>`,

  "workday-target.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Lead AI/ML Infrastructure Engineer</h1>
<div class="tgt-workday-container" data-automation-id="applicationLayout">
  <form id="target-apply" data-automation-id="jobApplication">
    <!-- Anti-bot honeypot field -->
    <div style="display:none;" aria-hidden="true">
      <label for="tgt-honeypot">Leave this field blank</label>
      <input type="text" id="tgt-honeypot" name="hp_bot_check" tabindex="-1" autocomplete="off" />
    </div>

    <div class="tgt-panel" data-automation-id="candidateInfo">
      <h2>Contact Information</h2>
      <div class="tgt-field">
        <label for="tgt-fn" class="tgt-label">First Name *</label>
        <input type="text" id="tgt-fn" name="legalName.firstName" data-automation-id="firstName" required />
      </div>
      <div class="tgt-field">
        <label for="tgt-ln" class="tgt-label">Last Name *</label>
        <input type="text" id="tgt-ln" name="legalName.lastName" data-automation-id="lastName" required />
      </div>
      <div class="tgt-field">
        <label for="tgt-email" class="tgt-label">Email *</label>
        <input type="email" id="tgt-email" name="contact.email" data-automation-id="emailAddress" required />
      </div>
      <div class="tgt-field">
        <label for="tgt-phone-type" class="tgt-label">Phone Device Type</label>
        <select id="tgt-phone-type" name="contact.phoneType">
          <option value="mobile">Mobile</option>
          <option value="home">Home</option>
          <option value="work">Work</option>
        </select>
      </div>
      <div class="tgt-field">
        <label for="tgt-phone" class="tgt-label">Phone Number *</label>
        <input type="tel" id="tgt-phone" name="contact.phone" data-automation-id="primaryPhone" required />
      </div>
      <div class="tgt-field">
        <label for="tgt-addr1" class="tgt-label">Address Line 1 *</label>
        <input type="text" id="tgt-addr1" name="address.line1" data-automation-id="addressLine1" required />
      </div>
      <div class="tgt-field">
        <label for="tgt-addr2" class="tgt-label">Address Line 2</label>
        <input type="text" id="tgt-addr2" name="address.line2" data-automation-id="addressLine2" />
      </div>
      <div class="tgt-field">
        <label for="tgt-city" class="tgt-label">City *</label>
        <input type="text" id="tgt-city" name="address.city" data-automation-id="city" required />
      </div>
      <div class="tgt-field">
        <label for="tgt-state" class="tgt-label">State / Province *</label>
        <input type="text" id="tgt-state" name="address.state" data-automation-id="stateProvince" required />
      </div>
      <div class="tgt-field">
        <label for="tgt-zip" class="tgt-label">Postal Code *</label>
        <input type="text" id="tgt-zip" name="address.postal" data-automation-id="postalCode" required />
      </div>
    </div>

    <div class="tgt-panel" data-automation-id="docsSection">
      <h2>Resume</h2>
      <div class="tgt-field">
        <label for="tgt-resume" class="tgt-label">Resume / CV *</label>
        <input type="file" id="tgt-resume" name="resume" data-automation-id="resumeUpload" required />
      </div>
    </div>

    <div class="tgt-panel" data-automation-id="availabilitySection">
      <h2>Availability & Work Status</h2>
      <div class="tgt-field">
        <label for="tgt-when-start" class="tgt-label">When can you start? (Notice Period) *</label>
        <input type="text" id="tgt-when-start" name="availability" placeholder="e.g. Immediately or 2 weeks" required />
      </div>
      <fieldset class="tgt-fieldset">
        <legend class="tgt-legend">Are you legally authorized to work in the United States? *</legend>
        <label><input type="radio" name="us_auth" value="yes" required /> Yes</label>
        <label><input type="radio" name="us_auth" value="no" /> No</label>
      </fieldset>
      <div class="tgt-field">
        <label class="tgt-checkbox-label">
          <input type="checkbox" id="tgt-privacy" name="agree_privacy_policy" required />
          I certify that all information submitted is true and agree to Target's privacy policy *
        </label>
      </div>
    </div>

    <div class="tgt-submit-area">
      <button type="submit" class="tgt-submit-button" data-automation-id="submit-button">Submit Application</button>
    </div>
  </form>
</div>`,

  "workday-nike.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Senior 3D Digital Product Designer</h1>
<div class="nike-apply-shell" data-automation-id="jobApplicationFlow">
  <form id="nike-form" data-automation-id="flowForm">
    <div class="nike-section" data-automation-id="section-personal">
      <h3 class="nike-h3">Candidate Details</h3>
      <div class="nike-row">
        <div class="nike-col">
          <label for="nk-fn" class="nike-field-label">First Name <span class="req">*</span></label>
          <input type="text" id="nk-fn" name="firstName" data-automation-id="input-firstName" required />
        </div>
        <div class="nike-col">
          <label for="nk-ln" class="nike-field-label">Last Name <span class="req">*</span></label>
          <input type="text" id="nk-ln" name="lastName" data-automation-id="input-lastName" required />
        </div>
      </div>
      <div class="nike-row">
        <div class="nike-col">
          <label for="nk-email" class="nike-field-label">Email <span class="req">*</span></label>
          <input type="email" id="nk-email" name="email" data-automation-id="input-email" required />
        </div>
        <div class="nike-col">
          <label for="nk-phone" class="nike-field-label">Phone <span class="req">*</span></label>
          <input type="tel" id="nk-phone" name="phone" data-automation-id="input-phone" required />
        </div>
      </div>
      <div class="nike-row">
        <div class="nike-col">
          <label for="nk-location" class="nike-field-label">Current Location (City, State / Country) <span class="req">*</span></label>
          <input type="text" id="nk-location" name="location" data-automation-id="input-location" required />
        </div>
      </div>
    </div>

    <div class="nike-section" data-automation-id="section-experience">
      <h3 class="nike-h3">Portfolio & Experience</h3>
      <div class="nike-row">
        <div class="nike-col">
          <label for="nk-portfolio" class="nike-field-label">Portfolio Website URL <span class="req">*</span></label>
          <input type="url" id="nk-portfolio" name="portfolioUrl" placeholder="https://..." data-automation-id="input-portfolio" required />
        </div>
        <div class="nike-col">
          <label for="nk-linkedin" class="nike-field-label">LinkedIn Profile URL</label>
          <input type="url" id="nk-linkedin" name="linkedinUrl" placeholder="https://linkedin.com/in/..." data-automation-id="input-linkedin" />
        </div>
      </div>
      <div class="nike-row">
        <div class="nike-col">
          <label for="nk-resume" class="nike-field-label">Resume / CV File <span class="req">*</span></label>
          <input type="file" id="nk-resume" name="resume" data-automation-id="file-resume" required />
        </div>
      </div>
      <div class="nike-row">
        <div class="nike-col">
          <label for="nk-years-exp" class="nike-field-label">Total years of work experience</label>
          <input type="number" id="nk-years-exp" name="experienceYears" min="0" max="40" data-automation-id="input-exp" />
        </div>
      </div>
    </div>

    <div class="nike-section" data-automation-id="section-questions">
      <h3 class="nike-h3">Work Authorization & Notice</h3>
      <fieldset class="nike-fs">
        <legend class="nike-legend">Are you legally authorized to work in the United States? <span class="req">*</span></legend>
        <label><input type="radio" name="legal_authorization" value="yes" required /> Yes</label>
        <label><input type="radio" name="legal_authorization" value="no" /> No</label>
      </fieldset>
      <fieldset class="nike-fs">
        <legend class="nike-legend">Will you now or in the future require visa sponsorship? <span class="req">*</span></legend>
        <label><input type="radio" name="visa_sponsorship" value="yes" required /> Yes</label>
        <label><input type="radio" name="visa_sponsorship" value="no" /> No</label>
      </fieldset>
      <div class="nike-row">
        <div class="nike-col">
          <label for="nk-notice" class="nike-field-label">What is your notice period / availability to start? <span class="req">*</span></label>
          <input type="text" id="nk-notice" name="noticePeriod" required placeholder="e.g. 1 month notice" />
        </div>
      </div>
    </div>

    <div class="nike-footer">
      <button type="submit" class="nike-submit-btn" data-automation-id="submitApplication">Submit Application</button>
    </div>
  </form>
</div>`,

  "workday-adobe.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Senior Machine Learning Engineer - Firefly & Generative AI</h1>
<div class="adobe-workday-app" data-automation-id="jobApplicationRoot">
  <form id="adobe-form" data-automation-id="applicationForm">
    <div class="adobe-section" data-automation-id="myInfo">
      <h2>Personal Details</h2>
      <div class="adobe-grid">
        <div class="adobe-cell">
          <label for="ad-first" class="adobe-label">First Name *</label>
          <input type="text" id="ad-first" name="firstName" data-automation-id="legalFirstName" required />
        </div>
        <div class="adobe-cell">
          <label for="ad-last" class="adobe-label">Last Name *</label>
          <input type="text" id="ad-last" name="lastName" data-automation-id="legalLastName" required />
        </div>
        <div class="adobe-cell">
          <label for="ad-email" class="adobe-label">Email *</label>
          <input type="email" id="ad-email" name="email" data-automation-id="emailAddress" required />
        </div>
        <div class="adobe-cell">
          <label for="ad-phone" class="adobe-label">Phone *</label>
          <input type="tel" id="ad-phone" name="phone" data-automation-id="mobilePhone" required />
        </div>
      </div>
    </div>

    <div class="adobe-section" data-automation-id="profiles">
      <h2>Professional Links & Profiles</h2>
      <div class="adobe-grid">
        <div class="adobe-cell">
          <label for="ad-github" class="adobe-label">GitHub Profile URL *</label>
          <input type="url" id="ad-github" name="githubUrl" data-automation-id="github" required placeholder="https://github.com/..." />
        </div>
        <div class="adobe-cell">
          <label for="ad-linkedin" class="adobe-label">LinkedIn Profile</label>
          <input type="url" id="ad-linkedin" name="linkedinUrl" data-automation-id="linkedin" placeholder="https://linkedin.com/in/..." />
        </div>
        <div class="adobe-cell">
          <label for="ad-current-company" class="adobe-label">Current Company / Employer</label>
          <input type="text" id="ad-current-company" name="currentCompany" data-automation-id="employer" />
        </div>
        <div class="adobe-cell">
          <label for="ad-education" class="adobe-label">Highest level of education completed</label>
          <select id="ad-education" name="educationLevel" data-automation-id="educationSelect">
            <option value="">Select Level</option>
            <option value="bachelor">Bachelor's Degree</option>
            <option value="master">Master's Degree</option>
            <option value="phd">Doctorate / PhD</option>
          </select>
        </div>
      </div>
      <div class="adobe-cell full-width">
        <label for="ad-resume" class="adobe-label">Resume / CV *</label>
        <input type="file" id="ad-resume" name="resumeFile" data-automation-id="resumeDoc" required />
      </div>
    </div>

    <div class="adobe-section" data-automation-id="legalDisclosures">
      <h2>Legal & Privacy</h2>
      <fieldset class="adobe-fieldset">
        <legend class="adobe-legend">Are you legally authorized to work in the United States? *</legend>
        <label><input type="radio" name="us_work_eligibility" value="yes" required /> Yes</label>
        <label><input type="radio" name="us_work_eligibility" value="no" /> No</label>
      </fieldset>
      <fieldset class="adobe-fieldset">
        <legend class="adobe-legend">Will you now or in the future require visa sponsorship? *</legend>
        <label><input type="radio" name="sponsorship_needed" value="yes" required /> Yes</label>
        <label><input type="radio" name="sponsorship_needed" value="no" /> No</label>
      </fieldset>
      <div class="adobe-consent-box">
        <label>
          <input type="checkbox" id="ad-ccpa" name="ccpa_consent" required />
          I acknowledge and agree to Adobe's Candidate Privacy Policy and California CCPA notice *
        </label>
      </div>
    </div>

    <div class="adobe-submit-bar">
      <button type="submit" class="adobe-submit-button" data-automation-id="submitApp">Submit Application</button>
    </div>
  </form>
</div>`
};
