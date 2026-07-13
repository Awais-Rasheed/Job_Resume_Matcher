"""
FastAPI backend for the AI-Powered Resume-Job Matcher.

Run locally with:
    uvicorn main:app --reload --port 8000

Then the frontend (see ../frontend) talks to http://localhost:8000
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from matcher import match, parse_pdf, parse_docx

app = FastAPI(
    title="Resume-Job Matcher API",
    description="Scores resume-to-job-description fit using sentence embeddings and TF-IDF keyword-gap analysis.",
    version="1.0.0",
)

# Allow the local React dev server to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
def match_resume(
    resume_file: UploadFile = File(None),
    resume_text: str = Form(None),
    job_text: str = Form(...)
):
    extracted_resume_text = ""

    if resume_file is not None and resume_file.filename:
        filename = resume_file.filename.lower()
        try:
            content = resume_file.file.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {str(e)}")

        if filename.endswith(".pdf"):
            try:
                extracted_resume_text = parse_pdf(content)
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))
        elif filename.endswith(".docx"):
            try:
                extracted_resume_text = parse_docx(content)
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))
        elif filename.endswith(".txt"):
            try:
                extracted_resume_text = content.decode("utf-8")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to decode text file: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, or TXT.")
    elif resume_text:
        extracted_resume_text = resume_text

    if not extracted_resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Resume content is required. Please upload a PDF/DOCX file or paste text."
        )

    if not job_text.strip():
        raise HTTPException(status_code=400, detail="Job description text is required.")

    result = match(extracted_resume_text, job_text)
    return result

