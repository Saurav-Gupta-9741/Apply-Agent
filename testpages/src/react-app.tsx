// A real React application form. Values only count if React's state received them: the confirmation
// prints the submitted state, so a filler that merely changes the DOM is caught.
import { useState } from "react";
import { createRoot } from "react-dom/client";

interface FormState {
  fullName: string;
  email: string;
  degree: string;
  relocate: string;
  consent: boolean;
  resumeName: string;
}

function App() {
  const [state, setState] = useState<FormState>({ fullName: "", email: "", degree: "", relocate: "", consent: false, resumeName: "" });
  const [submitted, setSubmitted] = useState<FormState | null>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState((s) => ({ ...s, [key]: value }));

  if (submitted) {
    return (
      <div>
        <h1>Thank you for applying!</h1>
        <pre id="submitted-state">{JSON.stringify(submitted)}</pre>
      </div>
    );
  }
  return (
    <form id="application-form" onSubmit={(e) => { e.preventDefault(); setSubmitted(state); }}>
      <h1>Frontend Engineer</h1>
      <div className="field"><label htmlFor="fullName">Full name *</label>
        <input id="fullName" required value={state.fullName} onChange={(e) => set("fullName", e.target.value)} /></div>
      <div className="field"><label htmlFor="email">Email *</label>
        <input id="email" type="email" required value={state.email} onChange={(e) => set("email", e.target.value)} /></div>
      <div className="field"><label htmlFor="degree">Degree</label>
        <select id="degree" value={state.degree} onChange={(e) => set("degree", e.target.value)}>
          <option value="">Select...</option><option value="bs">Bachelor's Degree</option><option value="ms">Master's Degree</option>
        </select></div>
      <fieldset><legend>Are you willing to relocate? *</legend>
        <label><input type="radio" name="relocate" value="yes" required checked={state.relocate === "yes"} onChange={() => set("relocate", "yes")} /> Yes</label>
        <label><input type="radio" name="relocate" value="no" checked={state.relocate === "no"} onChange={() => set("relocate", "no")} /> No</label>
      </fieldset>
      <div className="field"><label htmlFor="resume">Resume *</label>
        <input id="resume" type="file" required onChange={(e) => set("resumeName", e.target.files?.[0]?.name ?? "")} /></div>
      <div className="field"><label><input type="checkbox" required checked={state.consent} onChange={(e) => set("consent", e.target.checked)} /> I agree to the privacy policy *</label></div>
      <button type="submit">Submit application</button>
    </form>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
