"""
FastAPI backend for the AI-Powered Resume-Job Matcher.

Run locally with:
    uvicorn main:app --reload --port 8000

Then the frontend (see ../frontend) talks to http://localhost:8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from matcher import match

app = FastAPI(
    title="Resume-Job Matcher API",
    description="Scores resume-to-job-description fit using sentence embeddings and TF-IDF keyword-gap analysis.",
    version="1.0.0",
)

# Allow the local React dev server to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class MatchRequest(BaseModel):
    resume_text: str = Field(..., min_length=1, description="Full resume text")
    job_text: str = Field(..., min_length=1, description="Full job description text")


class MatchResponse(BaseModel):
    match_score: float
    missing_keywords: list[dict]
    summary: str


@app.get("/health")
def health():
    """Simple check to confirm the API is up (and let the model warm up)."""
    return {"status": "ok"}


@app.post("/match", response_model=MatchResponse)
def match_resume(payload: MatchRequest):
    if not payload.resume_text.strip() or not payload.job_text.strip():
        raise HTTPException(status_code=400, detail="Both resume_text and job_text are required.")

    result = match(payload.resume_text, payload.job_text)
    return result
