"""
Core matching logic for the Resume-Job Matcher.

Two techniques are combined:
1. Semantic similarity - sentence-transformers embeds the resume and job
   description into vectors, then cosine similarity scores how close their
   *meaning* is (this catches paraphrases, e.g. "built REST APIs" vs
   "developed backend services", which keyword matching alone would miss).
2. Keyword-gap detection - TF-IDF pulls out the terms that matter most in
   the job description and checks which ones are missing from the resume,
   so the user gets concrete, actionable feedback (not just a score).
"""

import re
from functools import lru_cache

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

# A small, fast model - good enough for this use case and quick to load.
# Downloaded from Hugging Face on first run (needs internet access once).
MODEL_NAME = "all-MiniLM-L6-v2"

# Generic words that show up in almost every job description and resume
# regardless of role - they add noise to the keyword-gap output, so we
# filter them out before surfacing "missing" terms to the user.
STOP_TERMS = {
    "experience", "work", "team", "role", "job", "years", "year",
    "strong", "ability", "skills", "skill", "knowledge", "including",
    "including", "using", "etc", "looking", "join", "opportunity",
}


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    """
    Load the embedding model once and cache it. Loading is the slow part
    (a few seconds), so every request after the first is fast.
    """
    return SentenceTransformer(MODEL_NAME)


def compute_similarity(resume_text: str, job_text: str) -> float:
    """
    Returns a 0-100 semantic match score between resume and job description.
    """
    model = get_model()
    embeddings = model.encode([resume_text, job_text])
    score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    # Cosine similarity for sentence embeddings is typically in the
    # 0.2-0.9 range in practice rather than the full -1..1 range, so we
    # clip and scale to a friendlier 0-100 display score.
    score = max(0.0, min(1.0, score))
    return round(score * 100, 1)


def _clean_tokens(text: str) -> list[str]:
    """
    Lowercase and strip punctuation. Keep tokens of length >= 2 so that
    meaningful short tech terms (ai, ml, nlp, cv) survive the filter.
    """
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return [t for t in text.split() if len(t) >= 2]


def find_keyword_gaps(resume_text: str, job_text: str, top_n: int = 15) -> list[dict]:
    """
    Uses TF-IDF to rank the most distinctive terms in the job description,
    then reports which of those terms are absent from the resume.

    Returns a list of {"term": str, "importance": float} for missing terms,
    sorted by importance (most important gaps first).
    """
    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),  # capture both single words and short phrases
        max_features=200,
    )

    try:
        tfidf_matrix = vectorizer.fit_transform([job_text, resume_text])
    except ValueError:
        # Happens if input text is empty or has no valid tokens.
        return []

    feature_names = vectorizer.get_feature_names_out()
    job_scores = tfidf_matrix[0].toarray()[0]

    resume_tokens = set(_clean_tokens(resume_text))

    # Rank job-description terms by TF-IDF weight (importance to that JD).
    ranked = sorted(
        zip(feature_names, job_scores), key=lambda x: x[1], reverse=True
    )

    gaps = []
    for term, weight in ranked:
        if weight <= 0:
            continue
        term_words = term.split()
        if any(w in STOP_TERMS for w in term_words):
            continue
        # A term counts as "present" if all its words appear somewhere in
        # the resume (handles multi-word phrases like "machine learning").
        if all(w in resume_tokens for w in term_words):
            continue
        gaps.append({"term": term, "importance": round(float(weight), 3)})
        if len(gaps) >= top_n:
            break

    return gaps


def match(resume_text: str, job_text: str) -> dict:
    """
    Runs the full pipeline and returns a single result object for the API.
    """
    similarity_score = compute_similarity(resume_text, job_text)
    gaps = find_keyword_gaps(resume_text, job_text)

    return {
        "match_score": similarity_score,
        "missing_keywords": gaps,
        "summary": _build_summary(similarity_score, gaps),
    }


def _build_summary(score: float, gaps: list[dict]) -> str:
    if score >= 75:
        band = "Strong match"
    elif score >= 55:
        band = "Moderate match"
    else:
        band = "Weak match"

    if not gaps:
        return f"{band}. No major keyword gaps detected."

    top_terms = ", ".join(g["term"] for g in gaps[:5])
    return f"{band}. Consider addressing these gaps: {top_terms}."
