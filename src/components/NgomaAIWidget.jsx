import { useEffect, useRef, useState } from "react";
import { answerNgomaQuestion, NGOMA_ANALYST_PERIOD } from "../utils/ngomaAnalyst";

const STARTER_PROMPTS = [
  "Who is #1 in May 2026?",
  "Top 5 artists",
  "Which song rose fastest in May 2026?",
  "Certification breakdown",
];

export default function NgomaAIWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `I answer only from Ngoma Charts data (${NGOMA_ANALYST_PERIOD}). Ask about charts, artists, releases, platforms, movements, coverage, or certifications.`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  function askAI(prompt = question) {
    const cleanQuestion = String(prompt || "").trim();
    if (!cleanQuestion || loading) return;

    setMessages((previous) => [...previous, { role: "user", text: cleanQuestion }]);
    setQuestion("");
    setLoading(true);

    window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: answerNgomaQuestion(cleanQuestion) },
      ]);
      setLoading(false);
    }, 80);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askAI();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={styles.floatingButton}
        aria-label="Open Ngoma AI Analyst"
        aria-expanded={open}
        title="Ngoma AI Analyst"
      >
        <span style={styles.spark}>N</span>
        <span style={styles.floatingLabel}>ASK NGOMA</span>
      </button>

      {open && (
        <aside style={styles.panel} aria-label="Ngoma AI Analyst">
          <div style={styles.header}>
            <div>
              <div style={styles.title}>Ngoma AI Analyst</div>
              <div style={styles.subtitle}>
                APP DATA ONLY <span style={styles.statusDot} /> NO INTERNET REQUIRED
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={styles.closeButton}
              aria-label="Close Ngoma AI Analyst"
            >
              &times;
            </button>
          </div>

          <div ref={messagesRef} style={styles.messages}>
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  ...styles.message,
                  ...(message.role === "user" ? styles.userMessage : styles.assistantMessage),
                }}
              >
                {message.text}
              </div>
            ))}

            {loading && <div style={{ ...styles.message, ...styles.assistantMessage }}>Checking the charts...</div>}
          </div>

          <div style={styles.prompts}>
            {STARTER_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => askAI(prompt)} style={styles.promptButton}>
                {prompt}
              </button>
            ))}
          </div>

          <div style={styles.inputArea}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the charts..."
              style={styles.textarea}
              rows={2}
            />

            <button
              type="button"
              onClick={() => askAI()}
              disabled={loading || !question.trim()}
              style={{ ...styles.sendButton, opacity: loading || !question.trim() ? 0.45 : 1 }}
            >
              ASK
            </button>
          </div>

          <div style={styles.disclaimer}>
            Answers are calculated from chart data stored in this app. No web search or external AI service is used.
          </div>
        </aside>
      )}
    </>
  );
}

const styles = {
  floatingButton: {
    position: "fixed",
    right: "clamp(14px, 2.4vw, 28px)",
    bottom: "clamp(14px, 2.4vw, 28px)",
    zIndex: 9999,
    minWidth: "54px",
    height: "54px",
    padding: "0 17px 0 8px",
    borderRadius: "999px",
    border: "1px solid rgba(184,134,11,0.45)",
    background: "#11130f",
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    fontFamily: "'Instrument Sans', Helvetica, sans-serif",
  },
  spark: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#b8860b",
    color: "#fff",
    fontFamily: "Georgia, serif",
    fontWeight: 900,
    fontSize: "19px",
  },
  floatingLabel: {
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "1.2px",
    whiteSpace: "nowrap",
  },
  panel: {
    position: "fixed",
    right: "clamp(10px, 2vw, 24px)",
    bottom: "clamp(78px, 9vw, 94px)",
    width: "min(430px, calc(100vw - 20px))",
    height: "min(680px, calc(100vh - 100px))",
    background: "#ffffff",
    color: "#171914",
    borderRadius: "18px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 10000,
    border: "1px solid #e7e3d8",
    fontFamily: "'Instrument Sans', Helvetica, sans-serif",
  },
  header: {
    padding: "17px 18px",
    borderBottom: "1px solid #e5e0d4",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: "18px", fontWeight: 850 },
  subtitle: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "8px",
    letterSpacing: "0.8px",
    fontWeight: 850,
    color: "#6b7169",
    marginTop: "4px",
  },
  statusDot: {
    display: "inline-block",
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    background: "#2f9e44",
  },
  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: "26px",
    cursor: "pointer",
    color: "#37413a",
  },
  messages: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    background: "#f7f5ef",
  },
  message: {
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "13px",
    lineHeight: 1.58,
    whiteSpace: "pre-wrap",
  },
  userMessage: {
    alignSelf: "flex-end",
    background: "#171914",
    color: "#ffffff",
    maxWidth: "85%",
  },
  assistantMessage: {
    alignSelf: "flex-start",
    background: "#ffffff",
    border: "1px solid #e5e0d4",
    color: "#171914",
    maxWidth: "92%",
  },
  prompts: {
    padding: "10px 14px 4px",
    display: "flex",
    gap: "6px",
    overflowX: "auto",
    background: "#ffffff",
  },
  promptButton: {
    border: "1px solid #ded8c9",
    background: "#fff",
    color: "#5c625b",
    borderRadius: "999px",
    padding: "7px 10px",
    fontFamily: "inherit",
    fontSize: "9px",
    fontWeight: 750,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  inputArea: {
    padding: "10px 14px 12px",
    borderTop: "1px solid #e5e0d4",
    display: "flex",
    gap: "9px",
    alignItems: "flex-end",
    background: "#ffffff",
  },
  textarea: {
    flex: 1,
    resize: "none",
    border: "1px solid #d8d2c5",
    borderRadius: "12px",
    padding: "11px 12px",
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
  },
  sendButton: {
    width: "54px",
    height: "42px",
    borderRadius: "11px",
    border: "none",
    background: "#b8860b",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: 900,
    cursor: "pointer",
  },
  disclaimer: {
    padding: "0 15px 12px",
    background: "#ffffff",
    color: "#858a84",
    fontSize: "8.5px",
    lineHeight: 1.4,
    textAlign: "center",
  },
};
