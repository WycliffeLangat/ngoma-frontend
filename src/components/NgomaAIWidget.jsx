import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { answerNgomaQuestion, NGOMA_ANALYST_PERIOD } from "../utils/ngomaAnalyst";
import { API_BASE } from "../api/config.js";

const STORAGE_KEY = "ngoma-analyst-conversations-v2";
const MAX_CONVERSATIONS = 10;
const STARTER_PROMPTS = [
  "Tell me the biggest story in the current chart",
  "Compare Finale with Pawa and graph their journeys",
  "Predict next month's Top 10",
  "Explain which platforms contributed most to the Combined chart",
];
const THINKING_STAGES = [
  "Reviewing the Ngoma dataset...",
  "Checking ranks, points, and artist credits...",
  "Comparing months and platforms...",
  "Preparing the chart story...",
];

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const welcomeMessage = () => ({
  id: uid(),
  role: "assistant",
  content: `Ask me anything about Ngoma Charts from ${NGOMA_ANALYST_PERIOD}. I can investigate the full dataset, compare releases and artists, explain trends, generate graphs, and make clearly labeled forecasts.`,
  mode: "welcome",
  follow_up_questions: STARTER_PROMPTS,
});
const createConversation = () => ({
  id: uid(),
  title: "New chart analysis",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [welcomeMessage()],
});

function loadConversations() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) && parsed.length ? parsed : [createConversation()];
  } catch {
    return [createConversation()];
  }
}

const INITIAL_CONVERSATIONS = typeof window !== "undefined" ? loadConversations() : [createConversation()];

function inlineParts(text) {
  return String(text || "").split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <span key={index}>{part}</span>,
  );
}

function RichText({ text }) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let bullets = [];
  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(<ul key={`ul-${blocks.length}`} style={styles.answerList}>{bullets}</ul>);
    bullets = [];
  };
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      bullets.push(<li key={index}>{inlineParts(trimmed.slice(2))}</li>);
      return;
    }
    flushBullets();
    if (!trimmed) {
      blocks.push(<div key={`space-${index}`} style={{ height: 7 }} />);
    } else {
      blocks.push(<div key={index} style={styles.answerParagraph}>{inlineParts(trimmed)}</div>);
    }
  });
  flushBullets();
  return blocks;
}

function ChartCard({ chart }) {
  const hasChart = chart && chart.type !== "none" && chart.series?.some((series) => series.points?.length);
  const data = useMemo(() => {
    if (!hasChart) return [];
    const labels = [];
    const rows = new Map();
    chart.series.forEach((series) => {
      series.points.forEach((point) => {
        if (!rows.has(point.label)) {
          rows.set(point.label, { label: point.label });
          labels.push(point.label);
        }
        rows.get(point.label)[series.name] = point.value;
      });
    });
    return labels.map((label) => rows.get(label));
  }, [chart, hasChart]);

  if (!hasChart) return null;
  const isRank = /rank/i.test(`${chart.y_label} ${chart.title}`);
  const Chart = chart.type === "bar" ? BarChart : LineChart;
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTitleRow}>
        <div>
          <div style={styles.chartTitle}>{chart.title}</div>
          <div style={styles.chartSubtitle}>{chart.subtitle}</div>
        </div>
        {chart.is_prediction && <span style={styles.predictionTag}>ESTIMATE</span>}
      </div>
      <div style={styles.chartFrame}>
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DC" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#69716B" }} interval="preserveStartEnd" />
            <YAxis reversed={isRank} allowDecimals={false} tick={{ fontSize: 9, fill: "#69716B" }} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #DDD7C9", fontSize: 11 }} />
            {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {chart.series.map((series) => chart.type === "bar" ? (
              <Bar key={series.name} dataKey={series.name} fill={series.color || "#B8860B"} radius={[4, 4, 0, 0]} />
            ) : (
              <Line key={series.name} type="monotone" dataKey={series.name} stroke={series.color || "#B8860B"} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            ))}
          </Chart>
        </ResponsiveContainer>
      </div>
      <div style={styles.axisNote}>{chart.x_label}{chart.y_label ? ` | ${chart.y_label}` : ""}</div>
    </div>
  );
}

function MessageActions({ message, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div style={styles.messageActions}>
      <button type="button" onClick={copy} style={styles.textAction}>{copied ? "Copied" : "Copy"}</button>
      <button type="button" onClick={onRegenerate} style={styles.textAction}>Regenerate</button>
    </div>
  );
}

export default function NgomaAIWidget() {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState(INITIAL_CONVERSATIONS[0].id);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const messagesRef = useRef(null);
  const requestRef = useRef(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId) || conversations[0];
  const messages = activeConversation?.messages || [];
  const latestAssistantId = [...messages].reverse().find((message) => message.role === "assistant" && message.mode !== "welcome")?.id;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS)));
  }, [conversations]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!loading) return undefined;
    const interval = window.setInterval(() => setStageIndex((index) => (index + 1) % THINKING_STAGES.length), 1800);
    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const updateActiveMessages = (nextMessages, titleQuestion = "") => {
    setConversations((current) => {
      const next = current.map((conversation) => conversation.id === activeId ? {
        ...conversation,
        title: conversation.title === "New chart analysis" && titleQuestion
          ? titleQuestion.slice(0, 46)
          : conversation.title,
        messages: nextMessages,
        updatedAt: Date.now(),
      } : conversation);
      return [...next].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
    });
  };

  const newChat = () => {
    if (loading) requestRef.current?.abort();
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current].slice(0, MAX_CONVERSATIONS));
    setActiveId(conversation.id);
    setQuestion("");
    setLoading(false);
    setShowHistory(false);
  };

  const removeConversation = (conversationId) => {
    setConversations((current) => {
      const remaining = current.filter((conversation) => conversation.id !== conversationId);
      if (remaining.length) {
        if (activeId === conversationId) setActiveId(remaining[0].id);
        return remaining;
      }
      const replacement = createConversation();
      setActiveId(replacement.id);
      return [replacement];
    });
  };

  async function requestAnswer(cleanQuestion, baseMessages, regenerate = false) {
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setStageIndex(0);

    let payload;
    try {
      if (!API_BASE) throw new Error("No generative backend configured");
      const response = await fetch(`${API_BASE}/ai/analyst/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question: cleanQuestion,
          regenerate,
          messages: baseMessages
            .filter((message) => message.mode !== "welcome")
            .slice(-16)
            .map((message) => ({ role: message.role, content: message.content })),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.answer) throw new Error(data.error || "Generative analyst unavailable");
      payload = data;
    } catch (error) {
      if (error.name === "AbortError") {
        setLoading(false);
        return;
      }
      payload = {
        answer: answerNgomaQuestion(cleanQuestion),
        analysis_summary: "Generated by the deterministic in-app fallback because the generative analyst could not be reached.",
        confidence: "medium",
        sources: [`Ngoma Charts backend API, ${NGOMA_ANALYST_PERIOD}`],
        follow_up_questions: STARTER_PROMPTS.slice(0, 3),
        chart: { type: "none", title: "", subtitle: "", x_label: "", y_label: "", is_prediction: false, series: [] },
        mode: "local",
        model: "In-app fallback",
      };
    }

    const assistantMessage = {
      id: uid(),
      role: "assistant",
      content: payload.answer,
      analysis_summary: payload.analysis_summary,
      confidence: payload.confidence,
      sources: payload.sources || [],
      follow_up_questions: payload.follow_up_questions || [],
      chart: payload.chart,
      mode: payload.mode || "generative",
      model: payload.model || "Ngoma model",
    };
    updateActiveMessages([...baseMessages, assistantMessage], cleanQuestion);
    setLoading(false);
    requestRef.current = null;
  }

  function ask(prompt = question) {
    const cleanQuestion = String(prompt || "").trim();
    if (!cleanQuestion || loading) return;
    const userMessage = { id: uid(), role: "user", content: cleanQuestion };
    const baseMessages = [...messages, userMessage];
    updateActiveMessages(baseMessages, cleanQuestion);
    setQuestion("");
    requestAnswer(cleanQuestion, baseMessages, false);
  }

  function regenerate() {
    if (loading) return;
    const lastAssistantIndex = messages.map((message) => message.role).lastIndexOf("assistant");
    const lastUserIndex = messages.map((message) => message.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    const cleanQuestion = messages[lastUserIndex].content;
    const baseMessages = messages.filter((_, index) => index !== lastAssistantIndex);
    updateActiveMessages(baseMessages);
    requestAnswer(cleanQuestion, baseMessages, true);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask();
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
          <div className={`ngoma-ai-sidebar${showHistory ? " is-open" : ""}`} style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <strong>Chats</strong>
              <button type="button" onClick={newChat} style={styles.newChatButton}>+ New</button>
            </div>
            <div style={styles.conversationList}>
              {conversations.map((conversation) => (
                <div key={conversation.id} style={{ ...styles.conversationRow, ...(conversation.id === activeId ? styles.activeConversation : {}) }}>
                  <button type="button" onClick={() => { setActiveId(conversation.id); setShowHistory(false); }} style={styles.conversationButton}>
                    <span style={styles.conversationTitle}>{conversation.title}</span>
                    <span style={styles.conversationDate}>{new Date(conversation.updatedAt).toLocaleDateString()}</span>
                  </button>
                  <button type="button" onClick={() => removeConversation(conversation.id)} aria-label="Delete chat" style={styles.deleteChat}>x</button>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.mainChat}>
            <div style={styles.header}>
              <div style={styles.headerLeft}>
                <button type="button" onClick={() => setShowHistory((current) => !current)} style={styles.historyButton} aria-label="Show chat history">HIST</button>
                <div>
                  <div style={styles.title}>Ngoma AI Analyst</div>
                  <div style={styles.subtitle}>
                    <span style={styles.statusDot} /> GROUNDED GENERATIVE ANALYSIS
                  </div>
                </div>
              </div>
              <div style={styles.headerActions}>
                <button type="button" onClick={newChat} style={styles.headerNewChat}>New chat</button>
                <button type="button" onClick={() => setOpen(false)} style={styles.closeButton} aria-label="Close Ngoma AI Analyst">&times;</button>
              </div>
            </div>

            <div ref={messagesRef} style={styles.messages}>
              {messages.map((message) => (
                <div key={message.id} style={{ ...styles.messageWrap, alignItems: message.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ ...styles.message, ...(message.role === "user" ? styles.userMessage : styles.assistantMessage) }}>
                    {message.role === "assistant" && <div style={styles.assistantLabel}>NGOMA ANALYST</div>}
                    <RichText text={message.content} />
                    {message.role === "assistant" && <ChartCard chart={message.chart} />}
                    {message.role === "assistant" && message.analysis_summary && (
                      <details style={styles.details}>
                        <summary style={styles.detailsSummary}>How this was assessed</summary>
                        <div style={styles.detailsText}>{message.analysis_summary}</div>
                      </details>
                    )}
                    {message.role === "assistant" && message.sources?.length > 0 && (
                      <div style={styles.sources}>
                        {message.sources.map((source) => <span key={source} style={styles.sourceChip}>{source}</span>)}
                      </div>
                    )}
                    {message.role === "assistant" && message.mode !== "welcome" && (
                      <div style={styles.modelLine}>
                        {message.mode === "generative" ? `Generative | ${message.model}` : "Local fallback"}
                        {message.confidence ? ` | ${message.confidence} confidence` : ""}
                      </div>
                    )}
                  </div>
                  {message.role === "assistant" && message.id === latestAssistantId && <MessageActions message={message} onRegenerate={regenerate} />}
                  {message.role === "assistant" && message.follow_up_questions?.length > 0 && message.id === messages[messages.length - 1]?.id && (
                    <div style={styles.followUps}>
                      {message.follow_up_questions.slice(0, 4).map((prompt) => (
                        <button key={prompt} type="button" onClick={() => ask(prompt)} style={styles.followUpButton}>{prompt}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ ...styles.messageWrap, alignItems: "flex-start" }}>
                  <div style={{ ...styles.message, ...styles.assistantMessage, minWidth: 245 }}>
                    <div style={styles.assistantLabel}>NGOMA ANALYST</div>
                    <div style={styles.thinkingRow}><span style={styles.thinkingDot} />{THINKING_STAGES[stageIndex]}</div>
                    <div style={styles.thinkingNote}>Reviewing app data before answering</div>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.composerWrap}>
              {messages.length <= 1 && (
                <div style={styles.starters}>
                  {STARTER_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => ask(prompt)} style={styles.starterButton}>{prompt}</button>)}
                </div>
              )}
              <div style={styles.inputArea}>
                <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask a follow-up, request a graph, or make a prediction..." style={styles.textarea} rows={2} />
                {loading ? (
                  <button type="button" onClick={() => requestRef.current?.abort()} style={styles.stopButton}>Stop</button>
                ) : (
                  <button type="button" onClick={() => ask()} disabled={!question.trim()} style={{ ...styles.sendButton, opacity: question.trim() ? 1 : 0.42 }}>Send</button>
                )}
              </div>
              <div style={styles.disclaimer}>Grounded in Ngoma Charts app data. Forecasts are estimates, not future facts.</div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}

const styles = {
  floatingButton: { position: "fixed", right: "clamp(14px,2.4vw,28px)", bottom: "clamp(14px,2.4vw,28px)", zIndex: 9999, minWidth: 54, height: 54, padding: "0 17px 0 8px", borderRadius: 999, border: "1px solid rgba(184,134,11,.45)", background: "#11130f", color: "#fff", cursor: "pointer", boxShadow: "0 12px 32px rgba(0,0,0,.22)", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" },
  spark: { width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", background: "#B8860B", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif", fontWeight: 900, fontSize: 19 },
  floatingLabel: { fontSize: 10, fontWeight: 900, letterSpacing: 1.2, whiteSpace: "nowrap" },
  panel: { position: "fixed", right: "clamp(8px,1.5vw,20px)", bottom: "clamp(76px,8vw,92px)", width: "min(780px,calc(100vw - 16px))", height: "min(760px,calc(100vh - 92px))", background: "#fff", color: "#171914", borderRadius: 18, boxShadow: "0 24px 70px rgba(0,0,0,.28)", display: "flex", overflow: "hidden", zIndex: 10000, border: "1px solid #E7E3D8", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" },
  sidebar: { width: 190, flex: "0 0 190px", background: "#171914", color: "#fff", display: "flex", flexDirection: "column", minWidth: 0 },
  sidebarHeader: { padding: "16px 13px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.09)", fontSize: 12 },
  newChatButton: { border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, background: "transparent", color: "#fff", padding: "6px 8px", fontSize: 9, fontWeight: 800, cursor: "pointer" },
  conversationList: { padding: 8, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 },
  conversationRow: { display: "flex", alignItems: "center", borderRadius: 9, border: "1px solid transparent" },
  activeConversation: { background: "rgba(184,134,11,.2)", borderColor: "rgba(184,134,11,.38)" },
  conversationButton: { flex: 1, minWidth: 0, border: 0, background: "transparent", color: "inherit", padding: "9px 6px 9px 9px", cursor: "pointer", textAlign: "left" },
  conversationTitle: { display: "block", fontSize: 10, fontWeight: 750, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  conversationDate: { display: "block", color: "#A9AEA8", fontSize: 8, marginTop: 3 },
  deleteChat: { border: 0, background: "transparent", color: "#9EA49E", cursor: "pointer", fontSize: 11, padding: 8 },
  mainChat: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#F7F5EF" },
  header: { flex: "0 0 auto", padding: "14px 16px", background: "#fff", borderBottom: "1px solid #E5E0D4", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerLeft: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  historyButton: { display: "none", border: 0, background: "#F3F0E8", borderRadius: 8, width: 34, height: 34, cursor: "pointer" },
  title: { fontSize: 17, fontWeight: 850 },
  subtitle: { display: "flex", alignItems: "center", gap: 5, fontSize: 8, letterSpacing: .75, fontWeight: 850, color: "#6B7169", marginTop: 3 },
  statusDot: { display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#2F9E44" },
  headerActions: { display: "flex", alignItems: "center", gap: 5 },
  headerNewChat: { border: "1px solid #DED8C9", background: "#fff", borderRadius: 8, padding: "7px 9px", fontSize: 9, fontWeight: 800, cursor: "pointer" },
  closeButton: { border: 0, background: "transparent", fontSize: 26, cursor: "pointer", color: "#37413A", lineHeight: 1 },
  messages: { flex: 1, minHeight: 0, padding: "18px clamp(12px,3vw,24px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 },
  messageWrap: { display: "flex", flexDirection: "column", width: "100%", gap: 5 },
  message: { padding: "13px 15px", borderRadius: 15, fontSize: 13, lineHeight: 1.58, maxWidth: "92%", boxSizing: "border-box" },
  userMessage: { background: "#171914", color: "#fff", borderBottomRightRadius: 4, maxWidth: "82%" },
  assistantMessage: { background: "#fff", border: "1px solid #E5E0D4", color: "#171914", borderBottomLeftRadius: 4 },
  assistantLabel: { fontSize: 8, letterSpacing: 1.15, fontWeight: 900, color: "#B8860B", marginBottom: 7 },
  answerParagraph: { margin: "2px 0" },
  answerList: { margin: "6px 0 6px 18px", padding: 0 },
  chartCard: { marginTop: 14, borderRadius: 12, border: "1px solid #E3DED2", padding: "12px 10px 8px", background: "#FCFBF8" },
  chartTitleRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, padding: "0 3px 8px" },
  chartTitle: { fontSize: 12, fontWeight: 850 },
  chartSubtitle: { marginTop: 3, fontSize: 9, color: "#69716B", lineHeight: 1.4 },
  predictionTag: { borderRadius: 999, background: "#FFF3CD", border: "1px solid #E7C75C", color: "#785D00", padding: "4px 7px", fontSize: 7, fontWeight: 900, letterSpacing: .8 },
  chartFrame: { width: "100%", height: 235 },
  axisNote: { textAlign: "center", fontSize: 8, color: "#8A908A", marginTop: 3 },
  details: { marginTop: 12, borderTop: "1px solid #EEEAE1", paddingTop: 9 },
  detailsSummary: { cursor: "pointer", fontSize: 9, fontWeight: 850, color: "#59645D" },
  detailsText: { fontSize: 10, color: "#626A63", lineHeight: 1.55, marginTop: 7 },
  sources: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 },
  sourceChip: { padding: "4px 7px", borderRadius: 999, background: "#F3F0E8", color: "#626962", fontSize: 8, fontWeight: 700 },
  modelLine: { marginTop: 9, color: "#969B95", fontSize: 8 },
  messageActions: { display: "flex", gap: 10, paddingLeft: 5 },
  textAction: { border: 0, background: "transparent", color: "#727972", fontSize: 9, fontWeight: 750, cursor: "pointer", padding: "2px 0" },
  followUps: { display: "flex", gap: 6, flexWrap: "wrap", maxWidth: "94%", marginTop: 2 },
  followUpButton: { border: "1px solid #DAD4C7", background: "#fff", color: "#505850", borderRadius: 999, padding: "7px 10px", fontSize: 9, fontWeight: 700, cursor: "pointer", textAlign: "left" },
  thinkingRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700 },
  thinkingDot: { width: 8, height: 8, borderRadius: "50%", background: "#B8860B", boxShadow: "0 0 0 4px rgba(184,134,11,.14)" },
  thinkingNote: { fontSize: 9, color: "#858B85", marginTop: 7 },
  composerWrap: { flex: "0 0 auto", background: "#fff", borderTop: "1px solid #E5E0D4", padding: "9px 13px 10px" },
  starters: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 },
  starterButton: { border: "1px solid #DED8C9", background: "#FAF9F5", color: "#4F574F", borderRadius: 10, padding: "8px 9px", fontSize: 9, lineHeight: 1.35, textAlign: "left", cursor: "pointer" },
  inputArea: { display: "flex", gap: 8, alignItems: "flex-end" },
  textarea: { flex: 1, resize: "none", border: "1px solid #D8D2C5", borderRadius: 12, padding: "10px 12px", fontSize: 12, outline: "none", fontFamily: "inherit", maxHeight: 100 },
  sendButton: { width: 58, height: 40, borderRadius: 10, border: 0, background: "#B8860B", color: "#fff", fontSize: 9, fontWeight: 900, cursor: "pointer" },
  stopButton: { width: 58, height: 40, borderRadius: 10, border: "1px solid #B94747", background: "#fff", color: "#A13232", fontSize: 9, fontWeight: 900, cursor: "pointer" },
  disclaimer: { paddingTop: 7, color: "#8A908A", fontSize: 8, textAlign: "center" },
};

if (typeof document !== "undefined") {
  const styleId = "ngoma-ai-responsive";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media (max-width: 680px) {
        aside[aria-label="Ngoma AI Analyst"] { inset: 8px !important; width: auto !important; height: auto !important; border-radius: 14px !important; }
        aside[aria-label="Ngoma AI Analyst"] .ngoma-ai-sidebar { position: absolute !important; inset: 0 auto 0 0 !important; width: min(78vw, 280px) !important; z-index: 4 !important; transform: translateX(-105%); transition: transform .2s ease; box-shadow: 12px 0 28px rgba(0,0,0,.2); }
        aside[aria-label="Ngoma AI Analyst"] .ngoma-ai-sidebar.is-open { transform: translateX(0); }
        aside[aria-label="Ngoma AI Analyst"] button[aria-label="Show chat history"] { display: inline-grid !important; place-items: center; }
      }
    `;
    document.head.appendChild(style);
  }
}
