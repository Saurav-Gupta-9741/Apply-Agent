// Modern ATS & Startup Forms: Trao.ai, Google Forms, Personio, Recruitee, Teamtailor
export const modernForms = {
  "trao-ai-startup.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Founding Full Stack AI Engineer</h1>
<div class="trao-application-flow">
  <form id="trao-apply-form">
    <div class="trao-section">
      <h3 class="trao-section-title">Candidate Profile</h3>
      <div class="trao-field-group">
        <label for="trao-name" class="trao-label">Full Name *</label>
        <input type="text" id="trao-name" name="fullName" required class="trao-input" />
      </div>
      <div class="trao-field-group">
        <label for="trao-email" class="trao-label">Email Address *</label>
        <input type="email" id="trao-email" name="email" required class="trao-input" />
      </div>
      <div class="trao-field-group">
        <label for="trao-phone" class="trao-label">Phone Number *</label>
        <input type="tel" id="trao-phone" name="phone" required class="trao-input" />
      </div>
      <div class="trao-field-group">
        <label for="trao-city" class="trao-label">Current Location *</label>
        <input type="text" id="trao-city" name="location" required class="trao-input" />
      </div>
      <div class="trao-field-group">
        <label for="trao-cv" class="trao-label">Resume / CV (PDF) *</label>
        <input type="file" id="trao-cv" name="resume" required accept=".pdf" />
      </div>
    </div>

    <div class="trao-section">
      <h3 class="trao-section-title">Code, Proof & Demos</h3>
      <div class="trao-field-group">
        <label for="trao-github" class="trao-label">GitHub Profile *</label>
        <input type="url" id="trao-github" name="githubUrl" required placeholder="https://github.com/..." class="trao-input" />
      </div>
      <div class="trao-field-group">
        <label for="trao-demo" class="trao-label">Live Demo / Project Link *</label>
        <input type="url" id="trao-demo" name="projectUrl" required placeholder="https://mycoolapp.com" class="trao-input" />
      </div>
      <div class="trao-field-group">
        <label for="trao-loom" class="trao-label">Introduction Video Link (Loom / YouTube) *</label>
        <input type="url" id="trao-loom" name="introVideoUrl" required placeholder="https://www.loom.com/share/..." class="trao-input" />
      </div>
    </div>

    <div class="trao-section">
      <h3 class="trao-section-title">Compensation & Notice</h3>
      <div class="trao-ctc-wrapper">
        <div class="trao-field-group">
          <label for="trao-curr-ctc" class="trao-label">Current CTC (in LPA) *</label>
          <input type="text" id="trao-curr-ctc" name="currentCtc" required placeholder="e.g. 25 LPA" class="trao-input" />
        </div>
        <div class="trao-field-group">
          <label for="trao-exp-ctc" class="trao-label">Expected CTC (in LPA) *</label>
          <input type="text" id="trao-exp-ctc" name="expectedCtc" required placeholder="e.g. 35 LPA" class="trao-input" />
        </div>
      </div>
      <div class="trao-field-group">
        <label for="trao-notice" class="trao-label">Notice Period (in days) *</label>
        <input type="number" id="trao-notice" name="noticePeriodDays" required placeholder="30" class="trao-input" />
      </div>
    </div>

    <div class="trao-actions">
      <button type="submit" class="trao-btn-submit">Submit Application</button>
    </div>
  </form>
</div>`,

  "trao-ai-fintech.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Staff Platform Engineer - Real-Time Ledger</h1>
<div class="trao-fintech-container">
  <form id="fintech-apply">
    <div class="trao-card">
      <h2>Candidate Information</h2>
      <div class="trao-row">
        <label for="ft-fn">First Name *</label>
        <input type="text" id="ft-fn" name="firstName" required />
      </div>
      <div class="trao-row">
        <label for="ft-ln">Last Name *</label>
        <input type="text" id="ft-ln" name="lastName" required />
      </div>
      <div class="trao-row">
        <label for="ft-email">Email *</label>
        <input type="email" id="ft-email" name="email" required />
      </div>
      <div class="trao-row">
        <label for="ft-phone">Phone Number *</label>
        <input type="tel" id="ft-phone" name="phone" required />
      </div>
      <div class="trao-row">
        <label for="ft-city">Current City / Location *</label>
        <input type="text" id="ft-city" name="location" required />
      </div>
      <div class="trao-row">
        <label for="ft-resume">Resume / CV *</label>
        <input type="file" id="ft-resume" name="resume" required />
      </div>
    </div>

    <div class="trao-card">
      <h2>Compensation & Identity</h2>
      <div class="trao-row">
        <label for="ft-pan">Permanent Account Number (PAN Card) *</label>
        <input type="text" id="ft-pan" name="panNumber" required placeholder="ABCDE1234F" />
      </div>
      <div class="trao-row">
        <label for="ft-c-ctc">Current CTC (in INR / LPA) *</label>
        <input type="text" id="ft-c-ctc" name="currentCtc" required placeholder="e.g. 40 LPA" />
      </div>
      <div class="trao-row">
        <label for="ft-e-ctc">Expected CTC (in INR / LPA) *</label>
        <input type="text" id="ft-e-ctc" name="expectedCtc" required placeholder="e.g. 55 LPA" />
      </div>
      <div class="trao-row">
        <label for="ft-np">Notice Period *</label>
        <select id="ft-np" name="noticePeriod" required>
          <option value="">Select notice period</option>
          <option value="immediate">Immediate / Serving Notice</option>
          <option value="15_days">15 Days</option>
          <option value="30_days">30 Days</option>
          <option value="60_days">60 Days</option>
          <option value="90_days">90 Days</option>
        </select>
      </div>
      <div class="trao-row">
        <label for="ft-linkedin">LinkedIn Profile URL</label>
        <input type="url" id="ft-linkedin" name="linkedinUrl" />
      </div>
    </div>

    <div class="trao-submit">
      <button type="submit" class="trao-btn">Submit Application</button>
    </div>
  </form>
</div>`,

  "trao-ai-robotics.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Robotics Foundation Model Engineer</h1>
<div class="trao-robotics-wrapper">
  <form id="robotics-form">
    <div class="step-box">
      <h3>Personal Details</h3>
      <div class="field-item">
        <label for="rb-name">Full Name *</label>
        <input type="text" id="rb-name" name="fullName" required />
      </div>
      <div class="field-item">
        <label for="rb-email">Email *</label>
        <input type="email" id="rb-email" name="email" required />
      </div>
      <div class="field-item">
        <label for="rb-phone">Phone *</label>
        <input type="tel" id="rb-phone" name="phone" required />
      </div>
      <div class="field-item">
        <label for="rb-cv">Resume / CV *</label>
        <input type="file" id="rb-cv" name="resume" required />
      </div>
    </div>

    <div class="step-box">
      <h3>Demos & Portfolio</h3>
      <div class="field-item">
        <label for="rb-demo">Live Demo / Project Link *</label>
        <input type="url" id="rb-demo" name="projectUrl" required placeholder="https://..." />
      </div>
      <div class="field-item">
        <label for="rb-video">Intro video recording link (Loom / YouTube) *</label>
        <input type="url" id="rb-video" name="introVideoUrl" required placeholder="https://loom.com/share/..." />
      </div>
      <div class="field-item">
        <label for="rb-exp">Total years of work experience *</label>
        <input type="number" id="rb-exp" name="experienceYears" required min="0" />
      </div>
      <div class="field-item">
        <label for="rb-salary">Expected compensation (Annual CTC) *</label>
        <input type="text" id="rb-salary" name="expectedSalary" required />
      </div>
      <div class="field-item">
        <label for="rb-notice">Notice period *</label>
        <input type="text" id="rb-notice" name="noticePeriod" required placeholder="e.g. 1 month" />
      </div>
    </div>

    <div class="submit-box">
      <button type="submit" class="submit-btn">Submit Application</button>
    </div>
  </form>
</div>`,

  "google-forms-deepmind.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Research Scientist - Frontier AI Models</h1>
<div class="freebirdFormviewerViewFormCard">
  <form id="deepmind-form">
    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Full Name *</div>
      <label for="dm-fullname" class="sr-only">Full Name</label>
      <input type="text" id="dm-fullname" name="entry.1001" class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Email Address *</div>
      <label for="dm-email" class="sr-only">Email Address</label>
      <input type="email" id="dm-email" name="entry.1002" class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Phone Number *</div>
      <label for="dm-phone" class="sr-only">Phone Number</label>
      <input type="tel" id="dm-phone" name="entry.1003" class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Link to Google Drive / Web Resume *</div>
      <label for="dm-resume-link" class="sr-only">Link to Google Drive / Web Resume</label>
      <input type="url" id="dm-resume-link" name="entry.1004" placeholder="https://drive.google.com/..." class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">GitHub Profile *</div>
      <label for="dm-github" class="sr-only">GitHub Profile</label>
      <input type="url" id="dm-github" name="entry.1005" placeholder="https://github.com/..." class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Highest level of education completed *</div>
      <label for="dm-degree" class="sr-only">Highest level of education completed</label>
      <select id="dm-degree" name="entry.1006" class="quantumWizSelect" required>
        <option value="">Select option</option>
        <option value="PhD">PhD / Doctorate</option>
        <option value="Master">Master's Degree</option>
        <option value="Bachelor">Bachelor's Degree</option>
      </select>
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Earliest date available to start (Notice Period) *</div>
      <label for="dm-start" class="sr-only">Earliest date available to start</label>
      <input type="text" id="dm-start" name="entry.1007" placeholder="e.g. 1 month notice" class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Brief summary of key research contributions *</div>
      <label for="dm-summary" class="sr-only">Brief summary of key research contributions</label>
      <textarea id="dm-summary" name="entry.1008" class="quantumWizTextinputPapertextareaInput" rows="4" required></textarea>
    </div>

    <div class="freebirdFormviewerViewNavigationButtons">
      <button type="submit" class="appsMaterialWizButtonPaperbuttonFilled">Submit</button>
    </div>
  </form>
</div>`,

  "google-forms-open-source.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Open Source AI Research Fellow</h1>
<div class="freebirdFormviewerViewFormCard">
  <form id="opensource-ai-form">
    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Your Name *</div>
      <label for="os-name" class="sr-only">Your Name</label>
      <input type="text" id="os-name" name="entry.2001" class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Email *</div>
      <label for="os-email" class="sr-only">Email</label>
      <input type="email" id="os-email" name="entry.2002" class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Phone *</div>
      <label for="os-phone" class="sr-only">Phone</label>
      <input type="tel" id="os-phone" name="entry.2003" class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Resume (Google Drive link) *</div>
      <label for="os-resume" class="sr-only">Resume (Google Drive link)</label>
      <input type="url" id="os-resume" name="entry.2004" placeholder="https://..." class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">GitHub Profile *</div>
      <label for="os-github" class="sr-only">GitHub Profile</label>
      <input type="url" id="os-github" name="entry.2005" placeholder="https://github.com/..." class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Personal Website URL</div>
      <label for="os-site" class="sr-only">Personal Website URL</label>
      <input type="url" id="os-site" name="entry.2006" placeholder="https://..." class="quantumWizTextinputPaperinputInput" />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Notice period / When can you begin? *</div>
      <label for="os-notice" class="sr-only">Notice period</label>
      <input type="text" id="os-notice" name="entry.2007" placeholder="e.g. Immediately" class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNumberedItemContainer">
      <div class="freebirdFormviewerComponentsQuestionBaseTitle">Expected monthly stipend / compensation *</div>
      <label for="os-stipend" class="sr-only">Expected monthly stipend</label>
      <input type="text" id="os-stipend" name="entry.2008" class="quantumWizTextinputPaperinputInput" required />
    </div>

    <div class="freebirdFormviewerViewNavigationButtons">
      <button type="submit" class="appsMaterialWizButtonPaperbuttonFilled">Submit</button>
    </div>
  </form>
</div>`,

  "personio-zalando.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Principal Frontend Engineer - Fashion Store Experience</h1>
<form class="DynamicForm_formContainer__PHnT_">
  <fieldset class="DynamicForm_fieldset__Ti4mU">
    <div class="DynamicForm_fieldRow__JaOBt">
      <div class="DynamicForm_nameGroupInputsContainer__bjoUs" role="group" aria-labelledby="zal-name-label">
        <span id="zal-name-label" class="DynamicForm_formLabel__aTROQ">Name *</span>
        <div class="DynamicForm_nameGroupInputs__cCgoN">
          <div><label for="zal-fn">First</label><input id="zal-fn" name="first_name" type="text" required placeholder="First" /></div>
          <div><label for="zal-ln">Last</label><input id="zal-ln" name="last_name" type="text" required placeholder="Last" /></div>
        </div>
      </div>
      <div class="DynamicForm_fullWidth__vAHrb">
        <label for="zal-email" class="DynamicForm_formLabel__aTROQ">Email *</label>
        <input id="zal-email" type="email" name="email" required placeholder="name@domain.com" />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="zal-phone" class="DynamicForm_formLabel__aTROQ">Phone *</label>
        <input id="zal-phone" type="tel" name="phone" required placeholder="+49..." />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="zal-loc" class="DynamicForm_formLabel__aTROQ">Location *</label>
        <input id="zal-loc" type="text" name="location" required placeholder="Berlin, Germany" />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="zal-salary" class="DynamicForm_formLabel__aTROQ">Expected salary (EUR gross/year) *</label>
        <input id="zal-salary" type="text" name="salary_expectations" required placeholder="e.g. 105000" />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="zal-avail" class="DynamicForm_formLabel__aTROQ">Available from / Kündigungsfrist *</label>
        <input id="zal-avail" type="text" name="available_from" required placeholder="e.g. 3 months" />
      </div>
      <div class="DynamicForm_fullWidth__vAHrb">
        <label for="zal-visa" class="DynamicForm_formLabel__aTROQ">Visa situation / Work authorization in Germany *</label>
        <select id="zal-visa" name="visa_status" required>
          <option value="">Please select</option>
          <option value="eu_citizen">EU Citizen</option>
          <option value="blue_card">Valid German Blue Card / Work Permit</option>
          <option value="requires_sponsorship">Requires Visa Sponsorship</option>
        </select>
      </div>
    </div>

    <div class="DynamicForm_documentContainer__CL7Te">
      <h3>Documents</h3>
      <div class="document-field-wrapper">
        <label for="zal-cv">CV / Resume *</label>
        <input id="zal-cv" type="file" name="documents.cv" required accept=".pdf,.doc,.docx" />
      </div>
      <div class="document-field-wrapper">
        <label for="zal-cover">Cover letter</label>
        <input id="zal-cover" type="file" name="documents.cover_letter" accept=".pdf,.doc,.docx" />
      </div>
    </div>

    <div class="DynamicForm_sectionSpacing__fNn9P">
      <button class="career-submit-application-btn" type="submit">Submit Application</button>
    </div>
  </fieldset>
</form>`,

  "personio-flixbus.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Senior Go Backend Developer - Booking Platform</h1>
<form class="DynamicForm_formContainer__PHnT_">
  <fieldset class="DynamicForm_fieldset__Ti4mU">
    <div class="DynamicForm_fieldRow__JaOBt">
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="flix-fn" class="DynamicForm_formLabel__aTROQ">First Name *</label>
        <input id="flix-fn" type="text" name="first_name" required />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="flix-ln" class="DynamicForm_formLabel__aTROQ">Last Name *</label>
        <input id="flix-ln" type="text" name="last_name" required />
      </div>
      <div class="DynamicForm_fullWidth__vAHrb">
        <label for="flix-email" class="DynamicForm_formLabel__aTROQ">Email *</label>
        <input id="flix-email" type="email" name="email" required />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="flix-phone" class="DynamicForm_formLabel__aTROQ">Phone *</label>
        <input id="flix-phone" type="tel" name="phone" required />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="flix-salary" class="DynamicForm_formLabel__aTROQ">Desired Salary (Annual gross EUR) *</label>
        <input id="flix-salary" type="text" name="salary_expectations" required />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="flix-start" class="DynamicForm_formLabel__aTROQ">Available from / Notice period *</label>
        <input id="flix-start" type="text" name="available_from" required />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="flix-auth" class="DynamicForm_formLabel__aTROQ">Work authorization in Germany *</label>
        <select id="flix-auth" name="work_permit" required>
          <option value="">Select option</option>
          <option value="yes">Yes, authorized to work</option>
          <option value="no">No, need sponsorship</option>
        </select>
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="flix-eng" class="DynamicForm_formLabel__aTROQ">English language proficiency</label>
        <select id="flix-eng" name="english_level">
          <option value="fluent">Fluent</option>
          <option value="intermediate">Intermediate</option>
          <option value="basic">Basic</option>
        </select>
      </div>
      <div class="DynamicForm_fullWidth__vAHrb">
        <label for="flix-cv" class="DynamicForm_formLabel__aTROQ">CV / Resume *</label>
        <input id="flix-cv" type="file" name="documents.cv" required />
      </div>
    </div>

    <div class="DynamicForm_sectionSpacing__fNn9P">
      <button class="career-submit-application-btn" type="submit">Submit Application</button>
    </div>
  </fieldset>
</form>`,

  "personio-celonis.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Senior Process Mining Systems Consultant</h1>
<form class="DynamicForm_formContainer__PHnT_">
  <fieldset class="DynamicForm_fieldset__Ti4mU">
    <div class="DynamicForm_fieldRow__JaOBt">
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="cel-fn" class="DynamicForm_formLabel__aTROQ">First Name *</label>
        <input id="cel-fn" type="text" name="first_name" required />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="cel-ln" class="DynamicForm_formLabel__aTROQ">Last Name *</label>
        <input id="cel-ln" type="text" name="last_name" required />
      </div>
      <div class="DynamicForm_fullWidth__vAHrb">
        <label for="cel-email" class="DynamicForm_formLabel__aTROQ">Email *</label>
        <input id="cel-email" type="email" name="email" required />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="cel-phone" class="DynamicForm_formLabel__aTROQ">Phone *</label>
        <input id="cel-phone" type="tel" name="phone" required />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="cel-linkedin" class="DynamicForm_formLabel__aTROQ">LinkedIn Profile</label>
        <input id="cel-linkedin" type="url" name="linkedin" />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="cel-salary" class="DynamicForm_formLabel__aTROQ">Expected salary (€ EUR) *</label>
        <input id="cel-salary" type="text" name="salary_expectations" required />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="cel-start" class="DynamicForm_formLabel__aTROQ">Earliest joining date / Kündigungsfrist *</label>
        <input id="cel-start" type="text" name="available_from" required />
      </div>
      <div class="DynamicForm_halfWidth__qgqPh">
        <label for="cel-degree" class="DynamicForm_formLabel__aTROQ">University degree</label>
        <input id="cel-degree" type="text" name="degree" />
      </div>
      <div class="DynamicForm_fullWidth__vAHrb">
        <label for="cel-cv" class="DynamicForm_formLabel__aTROQ">CV upload *</label>
        <input id="cel-cv" type="file" name="documents.cv" required />
      </div>
    </div>

    <div class="DynamicForm_sectionSpacing__fNn9P">
      <button class="career-submit-application-btn" type="submit">Submit Application</button>
    </div>
  </fieldset>
</form>`,

  "recruitee-bunq.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Senior Android Engineer - Core Banking App</h1>
<div class="recruitee-form-container">
  <form id="bunq-apply">
    <div class="field-wrapper">
      <label for="bq-name">Full Name *</label>
      <input type="text" id="bq-name" name="candidate[name]" required />
    </div>
    <div class="field-wrapper">
      <label for="bq-email">Email *</label>
      <input type="email" id="bq-email" name="candidate[email]" required />
    </div>
    <div class="field-wrapper">
      <label for="bq-phone">Phone *</label>
      <input type="tel" id="bq-phone" name="candidate[phone]" required />
    </div>
    <div class="field-wrapper">
      <label for="bq-city">Current City *</label>
      <input type="text" id="bq-city" name="candidate[city]" required />
    </div>
    <div class="field-wrapper">
      <label for="bq-cv">Resume / CV *</label>
      <input type="file" id="bq-cv" name="candidate[resume]" required />
    </div>
    <div class="field-wrapper">
      <label for="bq-bsn">Burgerservicenummer (BSN) or Tax ID (Identity) *</label>
      <input type="text" id="bq-bsn" name="candidate[bsn]" required placeholder="Optional if applying from abroad" />
    </div>
    <div class="field-wrapper">
      <label for="bq-auth">Do you hold a valid EU passport or Dutch work permit? *</label>
      <select id="bq-auth" name="candidate[work_permit]" required>
        <option value="">Select option</option>
        <option value="yes">Yes, EU citizen or have valid Dutch permit</option>
        <option value="sponsorship">No, I need visa sponsorship</option>
      </select>
    </div>
    <div class="field-wrapper">
      <label for="bq-notice">What is your notice period? *</label>
      <input type="text" id="bq-notice" name="candidate[notice_period]" required placeholder="e.g. 1 month" />
    </div>
    <div class="field-wrapper">
      <label for="bq-salary">What is your gross annual salary expectation in EUR? *</label>
      <input type="text" id="bq-salary" name="candidate[salary_expectation]" required placeholder="e.g. €85,000" />
    </div>
    <div class="field-wrapper">
      <label for="bq-pitch">Motivation: Why bunq? *</label>
      <textarea id="bq-pitch" name="candidate[cover_letter]" required rows="3"></textarea>
    </div>
    <div class="submit-wrapper">
      <button type="submit" class="btn-recruitee">Send Application</button>
    </div>
  </form>
</div>`,

  "recruitee-sendcloud.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Senior Full Stack Engineer - Shipping API</h1>
<div class="sendcloud-app-box">
  <form id="sendcloud-form">
    <div class="form-row">
      <label for="sc-name">Full Name *</label>
      <input type="text" id="sc-name" name="name" required />
    </div>
    <div class="form-row">
      <label for="sc-email">Email Address *</label>
      <input type="email" id="sc-email" name="email" required />
    </div>
    <div class="form-row">
      <label for="sc-phone">Phone *</label>
      <input type="tel" id="sc-phone" name="phone" required />
    </div>
    <div class="form-row">
      <label for="sc-resume">Resume upload *</label>
      <input type="file" id="sc-resume" name="resume" required />
    </div>
    <div class="form-row">
      <label for="sc-linkedin">LinkedIn Profile</label>
      <input type="url" id="sc-linkedin" name="linkedin" />
    </div>
    <div class="form-row">
      <label for="sc-github">GitHub Profile *</label>
      <input type="url" id="sc-github" name="github" required />
    </div>
    <div class="form-row">
      <label for="sc-salary">Gross annual salary expectation (€ EUR) *</label>
      <input type="text" id="sc-salary" name="salary" required />
    </div>
    <div class="form-row">
      <label for="sc-notice">Notice period (opzegtermijn) *</label>
      <input type="text" id="sc-notice" name="noticePeriod" required placeholder="e.g. 1 month" />
    </div>
    <div class="form-row">
      <label for="sc-auth">Right to work in the Netherlands *</label>
      <select id="sc-auth" name="work_auth" required>
        <option value="">Select...</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
    <div class="form-row">
      <label>
        <input type="checkbox" id="sc-consent" name="privacy_consent" required />
        I consent to the collection and processing of my personal data *
      </label>
    </div>
    <div class="form-submit">
      <button type="submit" class="sc-btn">Apply Now</button>
    </div>
  </form>
</div>`,

  "teamtailor-nordic-health.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Lead Data Platform Engineer</h1>
<div class="teamtailor-container">
  <form id="teamtailor-apply">
    <div class="tt-field">
      <label for="tt-fn">First Name *</label>
      <input type="text" id="tt-fn" name="candidate[first_name]" required />
    </div>
    <div class="tt-field">
      <label for="tt-ln">Last Name *</label>
      <input type="text" id="tt-ln" name="candidate[last_name]" required />
    </div>
    <div class="tt-field">
      <label for="tt-email">Email *</label>
      <input type="email" id="tt-email" name="candidate[email]" required />
    </div>
    <div class="tt-field">
      <label for="tt-phone">Phone *</label>
      <input type="tel" id="tt-phone" name="candidate[phone]" required />
    </div>
    <div class="tt-field">
      <label for="tt-cv">CV / Resume upload *</label>
      <input type="file" id="tt-cv" name="candidate[resume]" required />
    </div>
    <div class="tt-field">
      <label for="tt-pnr">Swedish Personal Identity Number (Personnummer / Identity)</label>
      <input type="text" id="tt-pnr" name="candidate[personnummer]" placeholder="YYYYMMDD-XXXX" />
    </div>
    <div class="tt-field">
      <label for="tt-notice">Notice period (uppsägningstid) *</label>
      <input type="text" id="tt-notice" name="candidate[notice_period]" required placeholder="e.g. 3 månader" />
    </div>
    <div class="tt-field">
      <label for="tt-salary">Desired monthly salary (SEK) *</label>
      <input type="text" id="tt-salary" name="candidate[salary]" required />
    </div>
    <div class="tt-field">
      <label for="tt-auth">Are you eligible to work in Sweden? *</label>
      <select id="tt-auth" name="candidate[work_eligibility]" required>
        <option value="">Select...</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
    <div class="tt-field">
      <label>
        <input type="checkbox" id="tt-terms" name="candidate[agree_privacy]" required />
        I agree to the processing of personal data according to GDPR *
      </label>
    </div>
    <div class="tt-submit">
      <button type="submit" class="tt-btn">Submit Application</button>
    </div>
  </form>
</div>`
};
