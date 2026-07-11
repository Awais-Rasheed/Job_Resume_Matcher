import { useState } from "react";

const API_URL = "http://localhost:8000";

function ScoreGauge({ score }) {
  // Semicircle gauge: 0-100 mapped across 180 degrees.
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 180;
  const radius = 80;
  const cx = 100;
  const cy = 100;
  const rad = (Math.PI / 180) * (180 - angle);
  const x = cx - radius * Math.cos(rad);
  const y = cy - radius * Math.sin(rad);

  const band =
    clamped >= 75 ? "strong" : clamped >= 55 ? "moderate" : "weak";

  return (
    <div className="gauge">
      <svg viewBox="0 0 200 110" width="220" height="121">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--track)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M 20 100 A 80 80 0 0 1 ${x} ${y}`}
          fill="none"
          stroke={`var(--${band})`}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </svg>
      <div className="gauge-value">
        <span className="gauge-number">{clamped}</span>
        <span className="gauge-unit">/ 100</span>
      </div>
    </div>
  );
}

export default function App() {
  const [resumeText, setResumeText] = useState("");
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleMatch() {
    if (!resumeText.trim() || !jobText.trim()) {
      setError("Paste both your resume and the job description first.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, job_text: jobText }),
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(
        "Couldn't reach the matching API. Make sure the backend is running on localhost:8000."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <span className="eyebrow">NLP · Sentence Embeddings · TF-IDF</span>
        <h1>Resume-Job Matcher</h1>
        <p className="subhead">
          Paste your resume and a job description. Get a semantic match
          score and the specific keywords you're missing.
        </p>
      </header>

      <main className="layout">
        <section className="input-panel">
          <label htmlFor="resume">Resume</label>
          <textarea
            id="resume"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..."
            rows={14}
          />
        </section>

        <section className="input-panel">
          <label htmlFor="job">Job description</label>
          <textarea
            id="job"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Paste the target job description here..."
            rows={14}
          />
        </section>
      </main>

      <div className="action-row">
        <button onClick={handleMatch} disabled={loading}>
          {loading ? "Scoring..." : "Score my fit"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {result && (
        <section className="results">
          <div className="results-top">
            <ScoreGauge score={result.match_score} />
            <p className="summary">{result.summary}</p>
          </div>

          {result.missing_keywords.length > 0 && (
            <div className="gaps">
              <h2>Terms in the job description you're missing</h2>
              <ul className="chip-list">
                {result.missing_keywords.map((g) => (
                  <li className="chip" key={g.term}>
                    {g.term}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
