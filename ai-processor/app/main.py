from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.services.quiz_gen import generate_quiz_from_text
from app.services.grader import grade_subjective_answer, grade_mcq
from app.utils.pdf_parser import extract_text_from_pdf
import os
from app.core.config import settings

# load_dotenv() is handled by app.core.config now

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Janus AI Processor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuizRequest(BaseModel):
    text: str

class GradeRequest(BaseModel):
    question_type: str  # 'mcq', 'short', 'long'
    question: str
    user_answer: str
    correct_answer_or_context: str

@app.get("/")
def health_check():
    return {"status": "active", "service": "Janus AI Processor"}

@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """
    Receives raw text and generates a quiz using Gemini.
    """
    try:
        quiz_data = await generate_quiz_from_text(request.text)
        return quiz_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/grade-answer")
async def grade_answer(request: GradeRequest):
    """
    Grades a single answer.
    """
    try:
        if request.question_type == 'mcq':
            return grade_mcq(request.user_answer, request.correct_answer_or_context)
        else:
            # Subjective grading (Short/Long answer)
            return await grade_subjective_answer(
                request.question, 
                request.user_answer, 
                request.correct_answer_or_context
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Receives a PDF, extracts text, and generates a quiz.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Save temporarily to parse
    temp_filename = f"temp_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        buffer.write(await file.read())
    
    try:
        # Extract text
        text = extract_text_from_pdf(temp_filename)
        
        # clean up file
        os.remove(temp_filename)
        
        if not text:
             raise HTTPException(status_code=400, detail="Could not extract text from PDF. Please ensure the PDF contains selectable text, not scanned images.")

        # Generate Quiz
        quiz_data = await generate_quiz_from_text(text)
        return quiz_data

    except HTTPException as he:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=str(e))