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
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeMode, setResumeMode] = useState("file"); // "file" | "text"
  const [isDragActive, setIsDragActive] = useState(false);

  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split(".").pop().toLowerCase();
      if (["pdf", "docx", "txt"].includes(ext)) {
        setResumeFile(file);
        setError(null);
      } else {
        setError("Unsupported file format. Please upload PDF, DOCX, or TXT.");
      }
    }
  }

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split(".").pop().toLowerCase();
      if (["pdf", "docx", "txt"].includes(ext)) {
        setResumeFile(file);
        setError(null);
      } else {
        setError("Unsupported file format. Please upload PDF, DOCX, or TXT.");
      }
    }
  }

  async function handleMatch() {
    const hasResume = resumeMode === "file" ? !!resumeFile : !!resumeText.trim();
    if (!hasResume || !jobText.trim()) {
      setError(
        resumeMode === "file"
          ? "Please upload a resume file and paste the job description first."
          : "Please paste both your resume and the job description first."
      );
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("job_text", jobText);

      if (resumeMode === "file") {
        formData.append("resume_file", resumeFile);
      } else {
        formData.append("resume_text", resumeText);
      }

      const res = await fetch(`${API_URL}/match`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(
        err.message ||
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
          Upload your resume file or paste it along with the job description.
          Get a semantic match score and identify critical keyword gaps.
        </p>
      </header>

      <main className="layout">
        <section className="input-panel">
          <label>Resume</label>
          <div className="tabs">
            <button
              type="button"
              className={`tab-btn ${resumeMode === "file" ? "active" : ""}`}
              onClick={() => {
                setResumeMode("file");
                setError(null);
              }}
            >
              Upload File
            </button>
            <button
              type="button"
              className={`tab-btn ${resumeMode === "text" ? "active" : ""}`}
              onClick={() => {
                setResumeMode("text");
                setError(null);
              }}
            >
              Paste Text
            </button>
          </div>

          {resumeMode === "file" ? (
            <div
              className={`dropzone ${isDragActive ? "dragover" : ""} ${
                resumeFile ? "has-file" : ""
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {!resumeFile ? (
                <label htmlFor="file-upload" className="dropzone-label">
                  <div className="upload-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="36"
                      height="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <span className="upload-text">
                    Drag & drop your resume, or <strong>browse</strong>
                  </span>
                  <span className="upload-subtext">Supports PDF, DOCX, TXT</span>
                </label>
              ) : (
                <div className="file-info">
                  <div className="file-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="32"
                      height="32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className="file-details">
                    <span className="file-name">{resumeFile.name}</span>
                    <span className="file-size">
                      {(resumeFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={() => setResumeFile(null)}
                    title="Remove file"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <textarea
              id="resume"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here..."
              rows={14}
            />
          )}
        </section>

        <section className="input-panel">
          <label htmlFor="job">Job description</label>
          <textarea
            id="job"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Paste the target job description here..."
            rows={17}
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

