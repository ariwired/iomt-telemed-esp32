import { useState } from "react";

export default function PatientSelector({ patientId, onSubmit }) {
  const [draft, setDraft] = useState(patientId);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form className="patient-selector" onSubmit={handleSubmit}>
      <label htmlFor="patient-id-input">ID do paciente</label>
      <div className="patient-selector__row">
        <input
          id="patient-id-input"
          name="patientId"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="ex: 12345"
          autoComplete="off"
          spellCheck="false"
        />
        <button type="submit">Buscar</button>
      </div>
    </form>
  );
}
