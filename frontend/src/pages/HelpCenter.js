import React from "react";
import { useNavigate } from "react-router-dom";

export default function HelpCenter() {
  const navigate = useNavigate();

  const handleBack = () => {
    // Go back if possible, otherwise go to home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/home");
    }
  };

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "900px",
        margin: "0 auto",
        color: "#e5e7eb",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        style={{
          marginBottom: 16,
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid #4b5563",
          background: "#020617",
          color: "#e5e7eb",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: 26, marginBottom: 10 }}>
        Help Center &amp; Customer Support
      </h1>

      <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.9 }}>
        Welcome to the Help Center of <strong>Free Fire Tournament Platform</strong>.
        We are committed to providing transparent support for all users regarding
        tournaments, registrations, wallet transactions, and account-related queries.
      </p>

      <hr style={{ margin: "20px 0", borderColor: "#374151" }} />

      {/* CONTACT */}
      <h2 style={{ fontSize: 20 }}>Contact Us</h2>
      <ul style={{ fontSize: 14, lineHeight: 1.8, paddingLeft: 18 }}>
        <li>
          <strong>Email:</strong> freefiretournamentbot@gmail.com
        </li>
        <li>
          <strong>Phone / WhatsApp:</strong> +91-9860803102
        </li>
        <li>
          <strong>Support Hours:</strong> 10:00 AM – 8:00 PM (IST), Monday to Saturday
        </li>
      </ul>

      <p style={{ fontSize: 13, opacity: 0.8 }}>
        We aim to respond to all support queries within 24–48 business hours.
      </p>

      <hr style={{ margin: "20px 0", borderColor: "#374151" }} />

      {/* POLICY / LEGAL */}
      <h2 style={{ fontSize: 20 }}>Legal &amp; Policy Information</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7 }}>
        Detailed policies such as Privacy Policy, Terms &amp; Conditions and Refund /
        Cancellation Policy are available from the footer or main menu of this
        application. Please review them carefully before participating in any paid
        tournaments.
      </p>

      <hr style={{ margin: "20px 0", borderColor: "#374151" }} />

      {/* PAYMENTS & WALLET */}
      <h2 style={{ fontSize: 20 }}>Payments &amp; Wallet Information</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7 }}>
        All payments on this platform are processed securely using trusted payment
        gateways such as <strong>Razorpay</strong>. Applicable payment gateway charges,
        taxes (including GST), and service fees may be deducted as per the payment
        provider’s policies.
      </p>

      <p style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.9 }}>
        Wallet balances are non-transferable and can only be used for tournament
        participation on this platform.
      </p>

      <hr style={{ margin: "20px 0", borderColor: "#374151" }} />

      {/* REFUND POLICY SUMMARY */}
      <h2 style={{ fontSize: 20 }}>Refund &amp; Cancellation Summary</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7 }}>
        Tournament entry fees and wallet top-ups are generally
        <strong> non-refundable</strong>, except in cases where a tournament is cancelled
        by the platform or due to verified technical issues.
      </p>

      <p style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.9 }}>
        Any eligible refunds, if applicable, will be processed back to the original
        payment source or wallet within a reasonable timeframe as per Razorpay
        settlement norms.
      </p>

      <hr style={{ margin: "20px 0", borderColor: "#374151" }} />

      {/* SKILL-BASED DISCLAIMER */}
      <h2 style={{ fontSize: 20 }}>Skill-Based Game Disclaimer</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7 }}>
        This platform hosts only <strong>skill-based online gaming tournaments</strong>.
        The outcome of each match is determined solely by the skill, strategy, and
        performance of participants.
      </p>

      <p style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.9 }}>
        No gambling, betting, lottery, or chance-based games are offered. This platform
        is intended for entertainment for eligible users and does not promote or support
        illegal activities.
      </p>

      <hr style={{ margin: "20px 0", borderColor: "#374151" }} />

      {/* COMPLIANCE */}
      <h2 style={{ fontSize: 20 }}>Compliance &amp; Legal Jurisdiction</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7 }}>
        This application is intended to comply with applicable Indian IT laws and
        payment regulations. Users must be 18 years or older to participate in paid
        tournaments.
      </p>

      <p style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.9 }}>
        Any disputes shall be governed by the laws of India, with jurisdiction resting
        with the appropriate courts in India.
      </p>

      <p style={{ fontSize: 12, marginTop: 30, opacity: 0.6 }}>
        © {new Date().getFullYear()} Free Fire Tournament Platform. All rights reserved.
      </p>
    </div>
  );
}