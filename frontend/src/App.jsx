import { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./App.css";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

function App() {

  // 🔥 FORMAT FUNCTION (NEW)
  const formatAIResponse = (text) => {
    try {
      const parsed = JSON.parse(text);

      // Convert JSON into readable format
      let formatted = "";

      for (const key in parsed) {
        formatted += `• ${key.toUpperCase()}:\n`;

        if (typeof parsed[key] === "object") {
          for (const sub in parsed[key]) {
            formatted += `   - ${sub}: ${parsed[key][sub]}\n`;
          }
        } else {
          formatted += `   ${parsed[key]}\n`;
        }

        formatted += "\n";
      }

      return formatted;
    } catch {
      return text; // normal text
    }
  };

  const [form, setForm] = useState({
    ppf: "",
    pf: "",
    fd: "",
    equity: "",
    other: "",
    monthly_investment: "",
    target_monthly_income: "",
    increment: 5000,
    risk_profile: "moderate",
    income_preference: "balanced",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [aiAdvice, setAiAdvice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 3;

  const handleChange = (e) => {
    const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setResult(null);
      setAiAdvice("");
      setMessages([]);

      const res = await axios.post(
        "https://fi-planner-z0f6.onrender.com/plan",
        form
      );

      setResult(res.data);
      setPage(1);
    } catch (err) {
      console.error(err);
      alert("Error calling API");
    } finally {
      setLoading(false);
    }
  };

  const handleAIAdvice = async () => {
    try {
      setAiLoading(true);

      const res = await axios.post(
        "https://fi-planner-z0f6.onrender.com/ai-advice",
        {
          messages: [
            {
              role: "user",
              content: `Here is my financial data: ${JSON.stringify(form)}. Give advice.`,
            },
          ],
        }
      );

      setAiAdvice(formatAIResponse(res.data.response));
    } catch (err) {
      console.error(err);
      alert("AI service failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenAI = () => {
    setShowAI(true);

    if (messages.length === 0 && result) {
      setMessages([
        {
          role: "user",
          content: `Here is my financial plan: ${JSON.stringify(result)}. Give insights.`,
        },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessages = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages);
    setUserInput("");
    setChatLoading(true);

    try {
      const res = await axios.post(
        "https://fi-planner-z0f6.onrender.com/ai-advice",
        { messages: newMessages }
      );

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: formatAIResponse(res.data.response),
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Financial Independence Plan", 14, 20);

    let startY = 30;

    result.portfolio.monthly_equity.forEach((monthPlan) => {
      doc.setFontSize(12);
      doc.text(`Month ${monthPlan.month}`, 14, startY);
      startY += 6;

      const rows = monthPlan.stocks.map((s) => [
        s.ticker,
        s.shares || "-",
        s.price || "-",
        s.amount || "-",
        s.dividend_yield !== undefined ? s.dividend_yield + "%" : "-",
        s.comment || "-",
      ]);

      rows.push([
        "Gold", "-", "-", result.portfolio.gold?.amount || 0, "-", result.portfolio.gold?.comment || "-"
      ]);
      rows.push([
        "Debt", "-", "-", result.portfolio.debt?.amount || 0, "-", result.portfolio.debt?.comment || "-"
      ]);

      autoTable(doc, {
        startY,
        head: [["Ticker", "Shares", "Price", "Amount", "Yield %", "Comment"]],
        body: rows,
        theme: "grid",
        styles: { fontSize: 10 },
      });

      startY = doc.lastAutoTable.finalY + 10;
    });

    doc.save("Financial_Independence_Plan.pdf");
  };

  const paginatedData =
    result?.portfolio?.monthly_equity?.slice(
      (page - 1) * ITEMS_PER_PAGE,
      page * ITEMS_PER_PAGE
    ) || [];

  const getPieData = (form) => {
    const labels = ["PPF", "PF", "FD", "Equity/MF", "Other"];
    const rawData = [
      form.ppf || 0,
      form.pf || 0,
      form.fd || 0,
      form.equity || 0,
      form.other || 0,
    ];

    const filteredLabels = labels.filter((_, i) => rawData[i] > 0);
    const filteredData = rawData.filter((v) => v > 0);

    return {
      labels: filteredLabels,
      datasets: [
        {
          data: filteredData,
          backgroundColor: ["#1abc9c", "#3498db", "#f1c40f", "#e74c3c", "#9b59b6"],
        },
      ],
    };
  };

  return (
    <div className="app-container">
      <h1>💰 Financial Independence Planner</h1>

      <div className="disclaimer">
        ⚠️ This tool provides projections only. Consult a financial advisor.
      </div>

      <div style={{ marginTop: "10px", fontSize: "0.75rem", color: "#1abc9c" }}>
        💡 Get personalized insights with our AI Advisor after generating your plan.
      </div>

      <div className="input-card">
        <h2>Enter Your Current Financial Details</h2>

        <div className="input-grid">
          <Input name="ppf" placeholder="PPF (₹)" onChange={handleChange} />
          <Input name="pf" placeholder="PF (₹)" onChange={handleChange} />
          <Input name="fd" placeholder="FD (₹)" onChange={handleChange} />
          <Input name="equity" placeholder="Equity/MF (₹)" onChange={handleChange} />
          <Input name="other" placeholder="Other (₹)" onChange={handleChange} />
          <Input name="monthly_investment" placeholder="Monthly Investment (₹)" onChange={handleChange} />
          <Input name="target_monthly_income" placeholder="Target Income (₹)" onChange={handleChange} />
        </div>

        <div className="dropdowns">
          <select name="risk_profile" onChange={handleChange} value={form.risk_profile}>
            <option value="moderate">Moderate</option>
            <option value="conservative">Conservative</option>
            <option value="aggressive">Aggressive</option>
          </select>

          <select name="income_preference" onChange={handleChange} value={form.income_preference}>
            <option value="balanced">Balanced</option>
            <option value="dividend">Dividend</option>
            <option value="growth">Growth</option>
          </select>
        </div>

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "⏳ Generating..." : "🚀 Generate Plan"}
        </button>
      </div>

      {/* CHAT SIDEBAR */}
      {showAI && (
        <div className="ai-sidebar">
          <div className="ai-header">
            <h3>AI Advisor</h3>
            <button onClick={() => setShowAI(false)}>✖</button>
          </div>

          <div className="chat-box">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                {m.content}
              </div>
            ))}
            {chatLoading && <div className="chat-message assistant">Typing...</div>}
          </div>

          <div className="chat-input">
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask anything..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ name, placeholder, onChange }) {
  return (
    <input
      type="number"
      name={name}
      placeholder={placeholder}
      onChange={onChange}
      className="animated-input"
    />
  );
}

export default App;