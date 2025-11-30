import time

def extract_text_from_pdf(filepath: str) -> str:
    print(f"📄 [PDF Parser] Starting extraction for: {filepath}")
    start_time = time.time()
    text = ""
    
    try:
        # Try using PyMuPDF (fitz) first as it is much faster
        import fitz  # PyMuPDF
        print("⚡ [PDF Parser] Using PyMuPDF (fast mode)")
        with fitz.open(filepath) as doc:
            for page in doc:
                text += page.get_text() + "\n"
                
    except ImportError:
        # Fallback to pypdf
        print("🐢 [PDF Parser] PyMuPDF not found, falling back to pypdf (slow mode)")
        try:
            import pypdf
            with open(filepath, 'rb') as file:
                reader = pypdf.PdfReader(file)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"❌ [PDF Parser] Error reading PDF with pypdf: {e}")
            return ""

    except Exception as e:
        print(f"❌ [PDF Parser] Error reading PDF: {e}")
        return ""
    
    elapsed = time.time() - start_time
    print(f"✅ [PDF Parser] Extracted {len(text)} characters in {elapsed:.2f}s")
    return text.strip()