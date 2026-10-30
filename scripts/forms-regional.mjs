// Regional & Statutory Diversity Forms: APAC, LATAM, DACH, France, India, Spain, UK
export const regionalForms = {
  "workable-apac-tokyo.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Staff Site Reliability Engineer (バイリンガル SRE)</h1>
<div class="workable-japan-container">
  <form id="workable-tokyo-form">
    <div class="wk-field">
      <label for="jp-name">氏名 (Full Name) *</label>
      <input type="text" id="jp-name" name="name" required placeholder="山田 太郎 / Taro Yamada" />
    </div>
    <div class="wk-field">
      <label for="jp-email">メールアドレス (Email) *</label>
      <input type="email" id="jp-email" name="email" required placeholder="taro@example.com" />
    </div>
    <div class="wk-field">
      <label for="jp-phone">電話番号 (Phone) *</label>
      <input type="tel" id="jp-phone" name="phone" required placeholder="090-1234-5678" />
    </div>
    <div class="wk-field">
      <label for="jp-location">現住所 (Current Location) *</label>
      <input type="text" id="jp-location" name="location" required placeholder="東京都渋谷区 / Tokyo" />
    </div>
    <div class="wk-field">
      <label for="jp-resume">履歴書 (Resume / CV) *</label>
      <input type="file" id="jp-resume" name="resume" required accept=".pdf" />
    </div>
    <div class="wk-field">
      <label for="jp-work-history">職務経歴書 (Detailed Work History)</label>
      <input type="file" id="jp-work-history" name="work_history" accept=".pdf" />
    </div>
    <div class="wk-field">
      <label for="jp-salary">希望年収 (万円) / Expected Annual Salary (10,000 JPY) *</label>
      <input type="text" id="jp-salary" name="desired_salary" required placeholder="e.g. 1200万円" />
    </div>
    <div class="wk-field">
      <label for="jp-notice">入社可能時期 (Earliest Start Date / Notice Period) *</label>
      <input type="text" id="jp-notice" name="notice_period" required placeholder="e.g. 1ヶ月後 / 1 month" />
    </div>
    <div class="wk-field">
      <label for="jp-lang">日本語能力 (Japanese Language Proficiency) *</label>
      <select id="jp-lang" name="japanese_proficiency" required>
        <option value="">選択してください</option>
        <option value="native">ネイティブ (Native)</option>
        <option value="n1">JLPT N1</option>
        <option value="n2">JLPT N2</option>
        <option value="business">ビジネスレベル (Business)</option>
      </select>
    </div>
    <div class="wk-field">
      <label for="jp-visa">日本での就労資格 (Valid Work Permit in Japan) *</label>
      <select id="jp-visa" name="japan_work_permit" required>
        <option value="">選択してください</option>
        <option value="citizen_or_pr">日本国籍・永住権</option>
        <option value="work_visa">技術・人文知識・国際業務ビザ</option>
        <option value="need_sponsorship">ビザサポート希望 (Need Sponsorship)</option>
      </select>
    </div>
    <div class="wk-actions">
      <button type="submit" class="wk-submit-btn">応募する / Submit Application</button>
    </div>
  </form>
</div>`,

  "lever-brazil-nubank.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Software Engineer - Core Banking Ledger</h1>
<div class="lever-brazil-container">
  <form id="lever-nubank-apply">
    <div class="application-section">
      <h3>Informações Pessoais</h3>
      <div class="application-field">
        <label for="br-name">Nome completo *</label>
        <input type="text" id="br-name" name="name" required placeholder="Seu nome completo" />
      </div>
      <div class="application-field">
        <label for="br-email">E-mail *</label>
        <input type="email" id="br-email" name="email" required placeholder="seuemail@exemplo.com" />
      </div>
      <div class="application-field">
        <label for="br-phone">Telefone / Celular *</label>
        <input type="tel" id="br-phone" name="phone" required placeholder="(11) 98765-4321" />
      </div>
      <div class="application-field">
        <label for="br-city">Cidade / Estado *</label>
        <input type="text" id="br-city" name="location" required placeholder="São Paulo, SP" />
      </div>
      <div class="application-field">
        <label for="br-resume">Currículo (PDF ou DOCX) *</label>
        <input type="file" id="br-resume" name="resume" required accept=".pdf,.docx,.doc" />
      </div>
    </div>

    <div class="application-section">
      <h3>Identificação & Perguntas Específicas</h3>
      <div class="application-field">
        <label for="br-cpf">CPF (Cadastro de Pessoas Físicas) *</label>
        <input type="text" id="br-cpf" name="cpf" required placeholder="000.000.000-00" />
      </div>
      <div class="application-field">
        <label for="br-salary">Pretensão salarial (BRL / mês ou ano) *</label>
        <input type="text" id="br-salary" name="pretensao_salarial" required placeholder="Ex: R$ 18.000/mês" />
      </div>
      <div class="application-field">
        <label for="br-notice">Prazo de aviso prévio (Notice period) *</label>
        <input type="text" id="br-notice" name="aviso_previo" required placeholder="Ex: 30 dias" />
      </div>
      <div class="application-field">
        <label for="br-work-auth">Autorização para trabalhar no Brasil *</label>
        <select id="br-work-auth" name="autorizacao_trabalho" required>
          <option value="">Selecione...</option>
          <option value="sim">Sim, sou cidadão brasileiro ou possuo visto permanente</option>
          <option value="nao">Não, preciso de patrocínio de visto</option>
        </select>
      </div>
      <div class="application-field">
        <label for="br-linkedin">Perfil do LinkedIn</label>
        <input type="url" id="br-linkedin" name="urls[LinkedIn]" placeholder="https://www.linkedin.com/in/..." />
      </div>
      <div class="application-field">
        <label>
          <input type="checkbox" id="br-lgpd" name="lgpd_consent" required />
          Concordo com os termos de privacidade e autorizo o processamento dos meus dados conforme a LGPD *
        </label>
      </div>
    </div>

    <div class="application-submit">
      <button type="submit" class="lever-submit-btn">Enviar Candidatura</button>
    </div>
  </form>
</div>`,

  "greenhouse-germany-n26.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Senior Security Operations Engineer - Banking Infrastructure</h1>
<div class="greenhouse-germany-wrapper">
  <form id="n26-apply-form">
    <div class="field-block">
      <label for="n26-fn">Vorname (First Name) *</label>
      <input type="text" id="n26-fn" name="first_name" required autocomplete="given-name" />
    </div>
    <div class="field-block">
      <label for="n26-ln">Nachname (Last Name) *</label>
      <input type="text" id="n26-ln" name="last_name" required autocomplete="family-name" />
    </div>
    <div class="field-block">
      <label for="n26-email">E-Mail *</label>
      <input type="email" id="n26-email" name="email" required autocomplete="email" />
    </div>
    <div class="field-block">
      <label for="n26-phone">Telefon *</label>
      <input type="tel" id="n26-phone" name="phone" required autocomplete="tel" />
    </div>
    <div class="field-block">
      <label for="n26-resume">Lebenslauf (CV / Resume) *</label>
      <input type="file" id="n26-resume" name="resume" required accept=".pdf,.doc,.docx" />
    </div>
    <div class="field-block">
      <label for="n26-cover">Anschreiben (Cover Letter)</label>
      <textarea id="n26-cover" name="cover_letter" rows="3"></textarea>
    </div>
    <div class="field-block">
      <label for="n26-salary">Gehaltsvorstellung (Bruttojahresgehalt in Euro) *</label>
      <input type="text" id="n26-salary" name="salary_expectation" required placeholder="z.B. 90.000 €" />
    </div>
    <div class="field-block">
      <label for="n26-notice">Kündigungsfrist / Verfügbarkeit *</label>
      <input type="text" id="n26-notice" name="notice_period" required placeholder="z.B. 3 Monate zum Monatsende" />
    </div>
    <div class="field-block">
      <label for="n26-auth">Haben Sie eine gültige Arbeitserlaubnis für Deutschland / EU Blue Card? *</label>
      <select id="n26-auth" name="work_permit_germany" required>
        <option value="">Bitte auswählen</option>
        <option value="yes">Ja, ich bin EU-Bürger oder besitze einen gültigen Aufenthaltstitel</option>
        <option value="blue_card">Ja, Berechtigung für EU Blue Card</option>
        <option value="sponsorship">Nein, Visumsunterstützung erforderlich</option>
      </select>
    </div>
    <div class="field-block">
      <label>
        <input type="checkbox" id="n26-dsgvo" name="dsgvo_consent" required />
        Ich willige in die Verarbeitung meiner personenbezogenen Daten gemäß der Datenschutzerklärung (DSGVO) ein *
      </label>
    </div>
    <div class="button-row">
      <button type="submit" class="submit-button">Bewerbung absenden</button>
    </div>
  </form>
</div>`,

  "ashby-france-datadog.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Staff Distributed Systems Engineer - Tracing Infrastructure</h1>
<div class="ashby-france-container">
  <form id="datadog-apply">
    <div class="ashby-field-entry">
      <label for="dd-fn" class="ashby-label">Prénom (First Name) *</label>
      <input type="text" id="dd-fn" name="first_name" required />
    </div>
    <div class="ashby-field-entry">
      <label for="dd-ln" class="ashby-label">Nom (Last Name) *</label>
      <input type="text" id="dd-ln" name="last_name" required />
    </div>
    <div class="ashby-field-entry">
      <label for="dd-email" class="ashby-label">Email *</label>
      <input type="email" id="dd-email" name="email" required />
    </div>
    <div class="ashby-field-entry">
      <label for="dd-phone" class="ashby-label">Téléphone *</label>
      <input type="tel" id="dd-phone" name="phone" required />
    </div>
    <div class="ashby-field-entry">
      <label for="dd-cv" class="ashby-label">CV (Curriculum Vitae) *</label>
      <input type="file" id="dd-cv" name="resume" required accept=".pdf" />
    </div>
    <div class="ashby-field-entry">
      <label for="dd-linkedin" class="ashby-label">Profil LinkedIn</label>
      <input type="url" id="dd-linkedin" name="linkedin" placeholder="https://www.linkedin.com/in/..." />
    </div>
    <div class="ashby-field-entry">
      <label for="dd-github" class="ashby-label">Profil GitHub *</label>
      <input type="url" id="dd-github" name="github" required placeholder="https://github.com/..." />
    </div>
    <div class="ashby-field-entry">
      <label for="dd-salary" class="ashby-label">Salaire brut annuel souhaité (€) *</label>
      <input type="text" id="dd-salary" name="salaire_brut" required placeholder="Ex: 110 000 €" />
    </div>
    <div class="ashby-field-entry">
      <label for="dd-notice" class="ashby-label">Délai de préavis (Notice period) *</label>
      <input type="text" id="dd-notice" name="preavis" required placeholder="Ex: 3 mois" />
    </div>
    <div class="ashby-field-entry">
      <label for="dd-auth" class="ashby-label">Avez-vous une autorisation légale de travail en France ? *</label>
      <select id="dd-auth" name="autorisation_travail" required>
        <option value="">Veuillez choisir...</option>
        <option value="yes">Oui (citoyen français, UE ou titre de séjour autorisant le travail)</option>
        <option value="no">Non (besoin d'un parrainage de visa)</option>
      </select>
    </div>
    <div class="ashby-actions">
      <button type="submit" class="ashby-submit-btn">Postuler / Submit Application</button>
    </div>
  </form>
</div>`,

  "lever-india-swiggy.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Principal Machine Learning Engineer - Logistics AI</h1>
<div class="lever-india-wrapper">
  <form id="swiggy-apply">
    <div class="lever-section">
      <h4>Basic Info</h4>
      <div class="lever-input-row">
        <label for="sw-name">Full Name *</label>
        <input type="text" id="sw-name" name="name" required />
      </div>
      <div class="lever-input-row">
        <label for="sw-email">Email Address *</label>
        <input type="email" id="sw-email" name="email" required />
      </div>
      <div class="lever-input-row">
        <label for="sw-phone">Phone Number *</label>
        <input type="tel" id="sw-phone" name="phone" required placeholder="+91..." />
      </div>
      <div class="lever-input-row">
        <label for="sw-city">Current City / Location *</label>
        <input type="text" id="sw-city" name="location" required placeholder="Bengaluru, Karnataka" />
      </div>
      <div class="lever-input-row">
        <label for="sw-cv">Resume / CV *</label>
        <input type="file" id="sw-cv" name="resume" required accept=".pdf" />
      </div>
    </div>

    <div class="lever-section">
      <h4>Compensation & Statutory</h4>
      <div class="lever-input-row">
        <label for="sw-cctc">Current CTC (in LPA) *</label>
        <input type="text" id="sw-cctc" name="current_ctc" required placeholder="e.g. 45 LPA" />
      </div>
      <div class="lever-input-row">
        <label for="sw-ectc">Expected CTC (in LPA) *</label>
        <input type="text" id="sw-ectc" name="expected_ctc" required placeholder="e.g. 60 LPA" />
      </div>
      <div class="lever-input-row">
        <label for="sw-notice">Notice Period (in days) *</label>
        <input type="number" id="sw-notice" name="notice_period_days" required placeholder="30" />
      </div>
      <div class="lever-input-row">
        <label for="sw-pan">Permanent Account Number (PAN) / Identity Verification</label>
        <input type="text" id="sw-pan" name="pan_number" placeholder="ABCDE1234F" />
      </div>
      <div class="lever-input-row">
        <label for="sw-gh">GitHub Profile URL *</label>
        <input type="url" id="sw-gh" name="urls[GitHub]" required placeholder="https://github.com/..." />
      </div>
      <div class="lever-input-row">
        <label for="sw-reloc">Are you comfortable working from Bengaluru office (Hybrid)? *</label>
        <select id="sw-reloc" name="relocation_blore" required>
          <option value="">Select option</option>
          <option value="yes">Yes, currently based in Bengaluru or willing to relocate</option>
          <option value="no">No</option>
        </select>
      </div>
    </div>

    <div class="lever-submit-area">
      <button type="submit" class="lever-btn">Submit Application</button>
    </div>
  </form>
</div>`,

  "workable-spain-glovo.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Senior Backend Engineer - Delivery Platform</h1>
<div class="workable-spain-box">
  <form id="glovo-form">
    <div class="wk-row">
      <label for="glv-fn">Nombre (First Name) *</label>
      <input type="text" id="glv-fn" name="firstname" required />
    </div>
    <div class="wk-row">
      <label for="glv-ln">Apellidos (Last Name) *</label>
      <input type="text" id="glv-ln" name="lastname" required />
    </div>
    <div class="wk-row">
      <label for="glv-email">Correo electrónico (Email) *</label>
      <input type="email" id="glv-email" name="email" required />
    </div>
    <div class="wk-row">
      <label for="glv-phone">Teléfono *</label>
      <input type="tel" id="glv-phone" name="phone" required />
    </div>
    <div class="wk-row">
      <label for="glv-cv">Currículum Vitae (CV) *</label>
      <input type="file" id="glv-cv" name="resume" required accept=".pdf" />
    </div>
    <div class="wk-row">
      <label for="glv-dni">DNI o NIE (Documento de Identidad) *</label>
      <input type="text" id="glv-dni" name="dni_nie" required placeholder="12345678A" />
    </div>
    <div class="wk-row">
      <label for="glv-notice">Plazo de preaviso / Fecha de incorporación *</label>
      <input type="text" id="glv-notice" name="preaviso" required placeholder="Ej: 1 mes" />
    </div>
    <div class="wk-row">
      <label for="glv-salary">Pretensión salarial bruta anual (€) *</label>
      <input type="text" id="glv-salary" name="sueldo_esperado" required placeholder="Ej: 75.000 €" />
    </div>
    <div class="wk-row">
      <label for="glv-auth">¿Tienes autorización legal para trabajar en España? *</label>
      <select id="glv-auth" name="permiso_trabajo" required>
        <option value="">Selecciona...</option>
        <option value="yes">Sí, soy ciudadano de la UE o dispongo de permiso de trabajo</option>
        <option value="no">No, necesito patrocinio de visado</option>
      </select>
    </div>
    <div class="wk-row">
      <label for="glv-linkedin">Perfil de LinkedIn</label>
      <input type="url" id="glv-linkedin" name="linkedin" />
    </div>
    <div class="wk-row">
      <label>
        <input type="checkbox" id="glv-consent" name="privacidad_consent" required />
        Acepto los términos de privacidad y procesamiento de datos conforme al RGPD *
      </label>
    </div>
    <div class="wk-submit">
      <button type="submit" class="wk-button">Enviar solicitud</button>
    </div>
  </form>
</div>`,

  "greenhouse-uk-monzo.html": `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->
<h1>Staff Infrastructure Security Engineer</h1>
<div class="greenhouse-uk-portal">
  <form id="monzo-apply">
    <div class="field">
      <label for="mz-fn">First Name *</label>
      <input type="text" id="mz-fn" name="first_name" required autocomplete="given-name" />
    </div>
    <div class="field">
      <label for="mz-ln">Last Name *</label>
      <input type="text" id="mz-ln" name="last_name" required autocomplete="family-name" />
    </div>
    <div class="field">
      <label for="mz-email">Email Address *</label>
      <input type="email" id="mz-email" name="email" required autocomplete="email" />
    </div>
    <div class="field">
      <label for="mz-phone">Phone Number *</label>
      <input type="tel" id="mz-phone" name="phone" required autocomplete="tel" />
    </div>
    <div class="field">
      <label for="mz-cv">Resume / CV *</label>
      <input type="file" id="mz-cv" name="resume" required accept=".pdf,.doc,.docx" />
    </div>
    <div class="field">
      <label for="mz-linkedin">LinkedIn Profile</label>
      <input type="url" id="mz-linkedin" name="urls[LinkedIn]" />
    </div>
    <div class="field">
      <label for="mz-ni">National Insurance Number (NI Number)</label>
      <input type="text" id="mz-ni" name="national_insurance" placeholder="QQ 12 34 56 A" />
    </div>
    <div class="field">
      <label for="mz-rtw">Do you have the legal right to work in the United Kingdom? *</label>
      <select id="mz-rtw" name="right_to_work_uk" required>
        <option value="">Please select</option>
        <option value="uk_citizen">Yes (UK/Irish Citizen)</option>
        <option value="settled_status">Yes (EU Settled/Pre-Settled Status or Indefinite Leave to Remain)</option>
        <option value="work_visa">Yes (Skilled Worker or Graduate Visa)</option>
        <option value="need_sponsorship">No (Require Visa Sponsorship)</option>
      </select>
    </div>
    <div class="field">
      <label for="mz-notice">What is your notice period with your current employer? *</label>
      <input type="text" id="mz-notice" name="notice_period" required placeholder="e.g. 3 months" />
    </div>
    <div class="field">
      <label for="mz-salary">Expected gross annual salary (£ GBP) *</label>
      <input type="text" id="mz-salary" name="salary_expectation_gbp" required placeholder="e.g. £130,000" />
    </div>
    <div class="field">
      <label for="mz-disability">Equal Opportunities: Disability status</label>
      <select id="mz-disability" name="disability">
        <option value="">Prefer not to say</option>
        <option value="no">No known disability</option>
        <option value="yes">Yes, I have a physical or mental health condition</option>
      </select>
    </div>
    <div class="submit-section">
      <button type="submit" class="btn-monzo">Submit Application</button>
    </div>
  </form>
</div>`
};
