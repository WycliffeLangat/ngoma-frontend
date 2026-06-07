import { useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api/v1";

export default function NgomaAIWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I’m Ngoma AI Analyst. Ask me about chart data, artists, releases, platforms, or Q4 2024 performance.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function askAI() {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: cleanQuestion },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/ai/analyst/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: cleanQuestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI request failed.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "I could not find an answer.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I could not connect to Ngoma AI Analyst right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
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
        onClick={() => setOpen(true)}
        style={styles.floatingButton}
        aria-label="Open Ngoma AI Analyst"
        title="Ngoma AI Analyst"
      >
        <span style={styles.bulbIcon}>💡</span>
      </button>

      {open && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <div>
              <div style={styles.title}>Ngoma AI Analyst</div>
              <div style={styles.subtitle}>Ask about live chart data</div>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={styles.closeButton}
              aria-label="Close Ngoma AI Analyst"
            >
              ×
            </button>
          </div>

          <div style={styles.messages}>
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(message.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage),
                }}
              >
                {message.text}
              </div>
            ))}

            {loading && (
              <div style={{ ...styles.message, ...styles.assistantMessage }}>
                Thinking...
              </div>
            )}
          </div>

          <div style={styles.inputArea}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Ngoma AI..."
              style={styles.textarea}
              rows={2}
            />

            <button
              onClick={askAI}
              disabled={loading || !question.trim()}
              style={{
                ...styles.sendButton,
                opacity: loading || !question.trim() ? 0.5 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  floatingButton: {
    position: "fixed",
    right: "24px",
    top: "68px",
    zIndex: 9999,
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    fontSize: "26px",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  bulbIcon: {
    display: "inline-block",
  },

  panel: {
    position: "fixed",
    top: "20px",
    right: "20px",
    width: "390px",
    maxWidth: "calc(100vw - 40px)",
    height: "calc(100vh - 40px)",
    background: "#ffffff",
    color: "#111827",
    borderRadius: "24px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 10000,
  },

  header: {
    padding: "20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: "20px",
    fontWeight: 700,
  },

  subtitle: {
    fontSize: "13px",
    color: "#6b7280",
    marginTop: "4px",
  },

  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: "28px",
    cursor: "pointer",
    color: "#374151",
  },

  messages: {
    flex: 1,
    padding: "18px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    background: "#f9fafb",
  },

  message: {
    padding: "12px 14px",
    borderRadius: "16px",
    fontSize: "14px",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },

  userMessage: {
    alignSelf: "flex-end",
    background: "#111827",
    color: "#ffffff",
    maxWidth: "85%",
  },

  assistantMessage: {
    alignSelf: "flex-start",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    color: "#111827",
    maxWidth: "90%",
  },

  inputArea: {
    padding: "14px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
    background: "#ffffff",
  },

  textarea: {
    flex: 1,
    resize: "none",
    border: "1px solid #d1d5db",
    borderRadius: "16px",
    padding: "12px",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },

  sendButton: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "none",
    background: "#111827",
    color: "#ffffff",
    fontSize: "20px",
    cursor: "pointer",
  },
};