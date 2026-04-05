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

  // ✅ AI states
  const [aiAdvice, setAiAdvice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
      setAiAdvice(""); // reset AI when new plan generated

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

  // ✅ AI CALL
  const handleAIAdvice = async () => {
    try {
      setAiLoading(true);

      const res = await axios.post(
        "https://fi-planner-z0f6.onrender.com/ai-advice",
        { user_data: form }
      );

      setAiAdvice(res.data.advice);
    } catch (err) {
      console.error(err);
      alert("AI service failed");
    } finally {
      setAiLoading(false);
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

      <div className="disclaimer" style={{ fontSize: "0.6rem" }}>
        ⚠️ This tool provides projections only. Consult a financial advisor.
      </div>

      <div style={{ marginTop: "12px", fontSize: "0.75rem", color: "#444" }}>
        ✨ Unlock deeper insights with <b>AI Advice</b> after generating your plan — tailored recommendations to optimize your path to financial independence.
      </div>

      <div className="input-card">
        <h2>Enter Your Financial Details</h2>

        <div className="input-grid">
          <Input name="ppf" placeholder="PPF (₹)" onChange={handleChange} />
          <Input name="pf" placeholder="PF (₹)" onChange={handleChange} />
          <Input name="fd" placeholder="FD (₹)" onChange={handleChange} />
          <Input name="equity" placeholder="Equity/MF (₹)" onChange={handleChange} />
          <Input name="other" placeholder="Other (₹)" onChange={handleChange} />
          <Input name="monthly_investment" placeholder="Monthly Invest (₹)" onChange={handleChange} />
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

      {result && (
        <>
          {/* Pie Chart */}
          <div className="chart-container">
            <Pie
              data={getPieData(form)}
              options={{
                plugins: {
                  datalabels: {
                    color: "#fff",
                    formatter: (value, ctx) => {
                      const dataArr = ctx.chart.data.datasets[0].data;
                      const sum = dataArr.reduce((a, b) => a + b, 0);
                      return Math.round((value / sum) * 100) + "%";
                    },
                  },
                  legend: { position: "bottom" },
                },
              }}
            />
          </div>

          {/* Summary */}
          <Card
            title="Financial Independence"
            value={`Years: ${Math.round(result.years_to_financial_independence)} | Progress: ${Math.round(result.financial_independence_progress_percent)}%`}
          />

          <button className="pdf-btn" onClick={handleDownloadPDF}>
            📄 Download PDF
          </button>

          {/* ✅ AI BUTTON */}
          <button className="ai-btn" onClick={handleAIAdvice} disabled={aiLoading}>
            {aiLoading ? "⏳ Thinking..." : "🤖 Get AI Advice"}
          </button>

          {/* ✅ AI RESPONSE */}
          {aiAdvice && (
            <div className="ai-card">
              <h3>AI Financial Advice</h3>
              <p>{aiAdvice}</p>
            </div>
          )}

          {/* Monthly Plans */}
          {paginatedData.map((monthPlan, idx) => (
            <div key={idx} className="month-card">
              <h3>Month {monthPlan.month}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th>Shares</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Yield %</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {monthPlan.stocks.map((s, i) => (
                    <tr key={i}>
                      <td>{s.ticker}</td>
                      <td>{s.shares}</td>
                      <td>{s.price}</td>
                      <td>{s.amount}</td>
                      <td>{s.dividend_yield}%</td>
                      <td>{s.comment || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
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

function Card({ title, value }) {
  return (
    <div className="card">
      <h4>{title}</h4>
      <p>{value}</p>
    </div>
  );
}

export default App;