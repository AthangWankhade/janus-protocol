from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.output_parsers import ResponseSchema, StructuredOutputParser
from app.core.config import settings

# Define the JSON structure for the grading response
response_schemas = [
    ResponseSchema(name="score", description="A score from 0 to 10 based on accuracy and completeness."),
    ResponseSchema(name="feedback", description="Detailed feedback on what was right and what was wrong."),
    ResponseSchema(name="improvement_tips", description="Specific advice on how to answer better next time.")
]

output_parser = StructuredOutputParser.from_response_schemas(response_schemas)
format_instructions = output_parser.get_format_instructions()

async def grade_subjective_answer(question: str, user_answer: str, context_or_rubric: str = ""):
    """
    Grades a short or long answer using AI.
    """
    print(f"📝 [Grader] Grading answer for: {question[:30]}...")
    if not settings.GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is not set")

    llm = ChatGoogleGenerativeAI(
        model="models/gemini-2.5-flash", 
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.3 # Lower temperature for more consistent grading
    )

    template = """
    You are a strict but fair academic grader. Grade the following student answer based on the question.
    
    Question: {question}
    Student Answer: {user_answer}
    Context/Correct Key Concepts: {context}
    
    {format_instructions}
    
    GRADING RULES:
    1. If the student's answer is at least 60% correct or covers the main key points, award FULL MARKS (10/10).
    2. If the answer is mostly incorrect, grade proportionally.
    3. Be generous but accurate.
    
    Provide a fair score and constructive feedback.
    """

    prompt = PromptTemplate(
        template=template,
        input_variables=["question", "user_answer", "context"],
        partial_variables={"format_instructions": format_instructions}
    )

    chain = prompt | llm

    try:
        response = await chain.ainvoke({
            "question": question, 
            "user_answer": user_answer,
            "context": context_or_rubric
        })
        
        result = output_parser.parse(response.content)
        
        # Sanitize score
        try:
            score_val = result.get('score', 0)
            if isinstance(score_val, str):
                # Handle "8/10" or "8"
                if "/" in score_val:
                    score_val = score_val.split("/")[0]
                score_val = float(score_val)
            result['score'] = score_val
        except:
            result['score'] = 0

        print(f"✅ [Grader] Grading complete. Score: {result['score']}/10")
        return result
    except Exception as e:
        print(f"❌ [Grader] Error grading answer: {e}")
        return {
            "score": 0, 
            "feedback": "Error during grading process.", 
            "improvement_tips": "Please try again."
        }

def grade_mcq(user_option: str, correct_option: str):
    """
    Simple string comparison for MCQs.
    """
    is_correct = user_option.lower().strip() == correct_option.lower().strip()
    return {
        "score": 10 if is_correct else 0,
        "feedback": "Correct!" if is_correct else f"Incorrect. The correct answer was {correct_option}.",
        "improvement_tips": ""
    }