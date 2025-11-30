from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.output_parsers import ResponseSchema, StructuredOutputParser
import os

from app.core.config import settings

# Define the JSON structure we want back from the AI
response_schemas = [
    ResponseSchema(name="mcqs", description="A list of 10 multiple choice questions. Each object has 'question', 'options' (list of 4 strings), and 'answer' (the correct string)."),
    ResponseSchema(name="short_answer", description="A list of 2 short answer questions that require 300-400 words."),
    ResponseSchema(name="long_answer", description="A list of 1 long answer question that requires 1000-3000 words.")
]

output_parser = StructuredOutputParser.from_response_schemas(response_schemas)
format_instructions = output_parser.get_format_instructions()

def clean_json_string(json_str: str) -> str:
    """
    Cleans a JSON string by removing Markdown code blocks and whitespace.
    """
    json_str = json_str.strip()
    if json_str.startswith("```json"):
        json_str = json_str[7:]
    if json_str.startswith("```"):
        json_str = json_str[3:]
    if json_str.endswith("```"):
        json_str = json_str[:-3]
    return json_str.strip()

async def generate_quiz_from_text(text: str):
    import time
    print(f"🧠 [Quiz Gen] Starting generation for text length: {len(text)} chars")
    start_time = time.time()
    
    api_key = settings.GOOGLE_API_KEY
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is not set in environment variables")

    # Initialize Gemini
    # We use 'gemini-1.5-flash' for speed and large context window
    llm = ChatGoogleGenerativeAI(
        model="models/gemini-2.5-flash", 
        google_api_key=api_key,
        temperature=0.7
    )

    template = """
    You are an expert tutor. Analyze the following study material and generate a comprehensive quiz.
    
    Material:
    {text}
    
    {format_instructions}
    
    Ensure the questions cover the most important concepts in the text.
    IMPORTANT: The quiz MUST be generated in ENGLISH, even if the study material is in another language. All questions, options, and answers must be in English.
    IMPORTANT: Return ONLY valid JSON. Do not include Markdown formatting or code blocks.
    """

    prompt = PromptTemplate(
        template=template,
        input_variables=["text"],
        partial_variables={"format_instructions": format_instructions}
    )

    # Create Chain
    chain = prompt | llm

    # Execute with Retry
    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            print(f"🔄 [Quiz Gen] Attempt {attempt + 1}/{max_retries}...")
            response = await chain.ainvoke({"text": text})
            
            # Try to parse using the structured parser first
            try:
                parsed_quiz = output_parser.parse(response.content)
            except Exception:
                # Fallback: Clean the string and parse manually
                print("⚠️ [Quiz Gen] Structured parsing failed, attempting manual cleanup...")
                import json
                cleaned_content = clean_json_string(response.content)
                parsed_quiz = json.loads(cleaned_content)
            
            # FIX: Ensure fields are lists, not strings (common LLM issue)
            import json
            for key in ["mcqs", "short_answer", "long_answer"]:
                if key in parsed_quiz and isinstance(parsed_quiz[key], str):
                    try:
                        parsed_quiz[key] = json.loads(parsed_quiz[key])
                    except:
                        parsed_quiz[key] = []
            
            elapsed = time.time() - start_time
            print(f"✅ [Quiz Gen] Successfully generated quiz in {elapsed:.2f}s")
            return parsed_quiz
            
        except Exception as e:
            print(f"❌ [Quiz Gen] Attempt {attempt + 1} failed: {e}")
            last_error = e
            # If it's the last attempt, raise the error
            if attempt == max_retries - 1:
                raise last_error