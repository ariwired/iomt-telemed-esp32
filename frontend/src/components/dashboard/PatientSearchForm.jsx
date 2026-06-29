import React, { useEffect, useRef, useState } from "react";

export function PatientSearchForm({
  onSearch,
  currentId,
  status,
}) {
  const [value, setValue] = useState(currentId ?? "");

  // Sem paciente -> aberto
  // Com paciente -> recolhido
  const [expanded, setExpanded] = useState(!currentId);

  const inputRef = useRef(null);

  const isLoading = status === "loading";

  useEffect(() => {
    if (!currentId) {
      setExpanded(true);
    } else {
      setExpanded(false);
      setValue(currentId);
    }
  }, [currentId]);

  useEffect(() => {
    if (expanded) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [expanded]);

  function handleSubmit(e) {
    e.preventDefault();

    const patientId = value.trim();

    if (!patientId) return;

    onSearch(patientId);

    // após selecionar paciente recolhe
    setExpanded(false);
  }

  function handleBlur() {
    if (!currentId) return;

    if (value.trim() === "") {
      setExpanded(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
      }}
    >
      {/* Botão minimizado */}

      {!expanded && (
        <button
          type="button"
          title="Trocar paciente"
          onClick={() => setExpanded(true)}
          style={{
            width: 44,
            height: 44,

            borderRadius: 14,

            border: "1px solid #353534",

            background: "#2a2a2a",

            color: "#bdcabd",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            transition: ".2s",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20 }}
          >
            search
          </span>
        </button>
      )}

      {/* Barra expandida */}

      {expanded && (
        <form
          onSubmit={handleSubmit}
          style={{
            width: 360,

            display: "flex",

            gap: 10,

            animation: "fadeIn .18s ease",
          }}
        >
          <div
            style={{
              position: "relative",

              flex: 1,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                position: "absolute",

                left: 14,

                top: "50%",

                transform: "translateY(-50%)",

                color: "#889488",

                fontSize: 20,
              }}
            >
              search
            </span>

            <input
              ref={inputRef}
              type="text"
              disabled={isLoading}
              value={value}
              onBlur={handleBlur}
              onChange={(e) => setValue(e.target.value)}
              placeholder="ID do paciente"
              style={{
                width: "100%",

                height: 44,

                paddingLeft: 42,

                paddingRight: 16,

                borderRadius: 14,

                border: "1px solid #3e4a40",

                outline: "none",

                background: "#201f1f",

                color: "#e5e2e1",

                fontSize: 14,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || value.trim() === ""}
            style={{
              height: 44,

              padding: "0 18px",

              borderRadius: 14,

              border: "none",

              background: "#7BE29D",

              color: "#00391c",

              fontWeight: 600,

              cursor: "pointer",

              opacity:
                isLoading || value.trim() === ""
                  ? 0.45
                  : 1,

              transition: ".2s",
            }}
          >
            {isLoading ? "..." : "Buscar"}
          </button>
        </form>
      )}
    </div>
  );
}