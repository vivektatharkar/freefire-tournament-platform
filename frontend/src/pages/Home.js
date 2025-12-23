// frontend/src/pages/Home.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";

const pageStyle = {
  minHeight: "100vh",
  margin: 0,
  padding: "40px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundImage: `linear-gradient(180deg, rgba(7,16,29,0.7), rgba(4,6,14,0.95)), url(${bg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  color: "#e5e7eb",
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
};

const wrapperStyle = {
  width: "1100px",
  maxWidth: "100%",
};

const headingStyle = {
  fontSize: 32,
  fontWeight: 700,
  margin: 0,
  marginBottom: 6,
};

const subHeadingStyle = {
  margin: 0,
  marginBottom: 22,
  fontSize: 14,
  color: "#9ca3af",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
};

const cardStyle = {
  background: "rgba(15, 23, 42, 0.96)",
  borderRadius: 20,
  padding: "18px 18px 20px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.75)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  transition: "transform .18s ease, box-shadow .18s ease",
};

const cardHover = {
  transform: "translateY(-4px)",
  boxShadow: "0 24px 50px rgba(0,0,0,0.9)",
};

const cardTitle = {
  fontSize: 18,
  fontWeight: 700,
  margin: 0,
  marginBottom: 6,
};

const cardTag = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "#a5b4fc",
  marginBottom: 6,
};

const cardText = {
  fontSize: 13,
  color: "#9ca3af",
  marginBottom: 10,
};

const pillList = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 12,
};

const pill = {
  fontSize: 11,
  padding: "3px 9px",
  borderRadius: 999,
  background: "rgba(15,23,42,0.8)",
  border: "1px solid rgba(148,163,184,0.4)",
};

const buttonStyle = {
  marginTop: "auto",
  alignSelf: "flex-start",
  padding: "8px 14px",
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#f97316,#fb923c)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

export default function Home() {
  const navigate = useNavigate();
  const [hoverIndex, setHoverIndex] = useState(null);

  const cards = [
    {
      title: "B2B – 3 Matches, 3 Maps",
      tag: "Mode: Battle Royale",
      desc: "Play back-to-back BR matches on three different maps. Perfect for squads that love long sessions.",
      pills: ["3 matches", "Different maps", "Squad / Duo"],
      path: "/tournaments-b2b",
    },
    {
      title: "BR – Single Map",
      tag: "Mode: Battle Royale",
      desc: "Classic one-match BR. Simple entry, high intensity – join and push for the Booyah in one go.",
      pills: ["1 match", "Standard rules", "Fast rewards"],
      path: "/tournaments",
    },
    {
      title: "CS – Single Map",
      tag: "Mode: Clash Squad",
      desc: "Face off in a single Clash Squad map. Short, action-packed rounds for quick competitive play.",
      pills: ["Clash Squad", "Short matches", "Team vs Team"],
      path: "/tournaments-cs",
    },
    {
      title: "Headshot CS",
      tag: "Mode: Headshot Only",
      desc: "Headshot-only Clash Squad for players who love pure aim battles and insane one-taps.",
      pills: ["Headshot only", "High skill", "CS format"],
      path: "/tournaments-headshot",
    },
  ];

  return (
    <div style={pageStyle}>
      <div style={wrapperStyle}>
        <h1 style={headingStyle}>Choose your match type</h1>
        <p style={subHeadingStyle}>
          Select a mode to see tournaments and join the matches you like.
        </p>

        <div style={gridStyle}>
          {cards.map((card, idx) => (
            <div
              key={card.title}
              style={{
                ...cardStyle,
                ...(hoverIndex === idx ? cardHover : {}),
              }}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div>
                <div style={cardTag}>{card.tag}</div>
                <h2 style={cardTitle}>{card.title}</h2>
                <p style={cardText}>{card.desc}</p>

                <div style={pillList}>
                  {card.pills.map((p) => (
                    <span key={p} style={pill}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <button style={buttonStyle} onClick={() => navigate(card.path)}>
                View tournaments
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}