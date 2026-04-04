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
      const res = await axios.post("http://127.0.0.1:8000/plan", form);
      setResult(res.data);
      setPage(1);
    } catch (err) {
      console.error(err);
      alert("Error calling API");
    } finally {
      setLoading(false);
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

      // Add gold and debt
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
        headStyles: { fillColor: [22, 160, 133] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
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

  // Pie chart data
  const getPieData = (form) => {
    const labels = ["PPF", "PF", "FD", "Equity/MF", "Other"];
    const rawData = [
      form.ppf || 0,
      form.pf || 0,
      form.fd || 0,
      form.equity || 0,
      form.other || 0,
    ];
    // Filter out 0 values
    const filteredLabels = labels.filter((_, idx) => rawData[idx] > 0);
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
        ⚠️ Disclaimer: This Financial Independence Planner provides simulations and projections only.
        Always consult a qualified financial advisor before making investment decisions.
      </div>

      <div className="input-card">
        <h2>Enter Your Current Financial Details</h2>
        <div className="input-grid">
          <Input name="ppf" placeholder="PPF (₹)" title="Public Provident Fund" onChange={handleChange} />
          <Input name="pf" placeholder="PF (₹)" title="Employee PF" onChange={handleChange} />
          <Input name="fd" placeholder="FD (₹)" title="Fixed Deposits" onChange={handleChange} />
          <Input name="equity" placeholder="Equity / MF (₹)" title="Stocks / Mutual Funds" onChange={handleChange} />
          <Input name="other" placeholder="Other Assets (₹)" title="Gold, crypto etc." onChange={handleChange} />
          <Input name="monthly_investment" placeholder="Monthly Investment (₹)" title="Amount available monthly to invest" onChange={handleChange} />
          <Input name="target_monthly_income" placeholder="Target Monthly Income post retirement (₹)" title="Desired passive income post retirement" onChange={handleChange} />
        </div>

        <div className="dropdowns">
          <select name="risk_profile" onChange={handleChange} value={form.risk_profile}>
            <option value="moderate">Moderate Risk</option>
            <option value="conservative">Conservative</option>
            <option value="aggressive">Aggressive</option>
          </select>

          <select name="income_preference" onChange={handleChange} value={form.income_preference}>
            <option value="balanced">Balanced</option>
            <option value="dividend">Dividend Focused</option>
            <option value="growth">Growth Focused</option>
          </select>
        </div>

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "⏳ Generating..." : "🚀 Generate Plan"}
        </button>

        {loading && <div className="spinner"></div>}
      </div>

      {result && (
        <>
          {/* Pie Chart */}
          <div style={{ maxWidth: "400px", margin: "20px auto" }}>
            <Pie
              data={getPieData(form)}
              options={{
                plugins: {
                  datalabels: {
                    color: "#fff",
                    formatter: (value, context) => {
                      const dataArr = context.chart.data.datasets[0].data;
                      const sum = dataArr.reduce((a, b) => a + b, 0);
                      const percentage = sum ? Math.round((value / sum) * 100) : 0;
                      return percentage + "%";
                    },
                    font: { weight: "bold", size: 14 },
                  },
                  legend: { position: "bottom" },
                },
              }}
            />
          </div>

          {/* Summary card */}
          <div className="summary">
            <Card
              title="Financial Independence"
              value={`Years: ${Math.round(result.years_to_financial_independence)}, Progress: ${Math.round(
                result.financial_independence_progress_percent
              )}%`}
              type="custom"
            />
          </div>

          <button className="pdf-btn" onClick={handleDownloadPDF}>
            📄 Download PDF
          </button>

          {/* Monthly equity table */}
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
                  <tr>
                    <td>Gold</td>
                    <td>-</td>
                    <td>-</td>
                    <td>{result.portfolio.gold?.amount || 0}</td>
                    <td>-</td>
                    <td>{result.portfolio.gold?.comment || "-"}</td>
                  </tr>
                  <tr>
                    <td>FD or Bonds</td>
                    <td>-</td>
                    <td>-</td>
                    <td>{result.portfolio.debt?.amount || 0}</td>
                    <td>-</td>
                    <td>{result.portfolio.debt?.comment || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          <div className="pagination">
            {Array.from(
              { length: Math.ceil(result.portfolio.monthly_equity.length / ITEMS_PER_PAGE) },
              (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={page === i + 1 ? "active" : ""}>
                  {i + 1}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Input({ name, placeholder, title, onChange }) {
  return (
    <input
      type="number"
      name={name}
      placeholder={placeholder}
      title={title}
      onChange={onChange}
      className="animated-input"
    />
  );
}

function Card({ title, value, type }) {
  return (
    <div className="card">
      <h4>{title}</h4>
      <p>{value}</p>
    </div>
  );
}

export default App;