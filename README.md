# AI-Powered Resume-Job Matcher

Scores how well a resume matches a job description using two NLP techniques:

1. **Semantic similarity** — `sentence-transformers` embeds the resume and job
   description, then cosine similarity produces a 0-100 match score based on
   *meaning*, not just shared words.
2. **Keyword-gap detection** — TF-IDF ranks the most distinctive terms in the
   job description and flags which ones are missing from the resume, so you
   get concrete, actionable feedback.

## Stack

- **Backend:** FastAPI, sentence-transformers (`all-MiniLM-L6-v2`), scikit-learn
- **Frontend:** React + Vite

## Project structure

```
resume-job-matcher/
├── backend/
│   ├── main.py          # FastAPI app + /match endpoint
│   ├── matcher.py        # Embedding + TF-IDF logic
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx        # UI: text inputs, score gauge, keyword chips
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Running it locally

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The first request will download the `all-MiniLM-L6-v2` model (~90MB) from
Hugging Face — this needs an internet connection once, then it's cached
locally. Confirm it's running at `http://localhost:8000/health`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`), paste in a
resume and a job description, and click **Score my fit**.

## API

`POST /match`

```json
{
  "resume_text": "...",
  "job_text": "..."
}
```

Response:

```json
{
  "match_score": 68.4,
  "missing_keywords": [
    { "term": "computer vision", "importance": 0.117 }
  ],
  "summary": "Moderate match. Consider addressing these gaps: ..."
}
```

## Notes / possible extensions

- Swap `all-MiniLM-L6-v2` for a larger model (e.g. `all-mpnet-base-v2`) for
  higher accuracy at the cost of speed.
- Add PDF upload support (`pypdf`) so users can drop in a resume file
  instead of pasting text.
- Persist match history per user if this becomes a multi-user app.
