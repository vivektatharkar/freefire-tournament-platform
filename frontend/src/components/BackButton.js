// frontend/src/components/BackButton.js
import React from "react";
import { useNavigate } from "react-router-dom";

const btnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(4px)",
  color: "#e6eef8",
  border: "1px solid rgba(255,255,255,0.18)",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
  transition: "0.2s ease",
};

const iconStyle = {
  fontSize: "16px",
  fontWeight: 700,
};

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      style={btnStyle}
      onClick={() => navigate(-1)}
      onMouseEnter={(e) => {
        e.target.style.background = "rgba(255,255,255,0.16)";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "rgba(255,255,255,0.08)";
      }}
    >
      <span style={iconStyle}>←</span> Back
    </button>
  );
}