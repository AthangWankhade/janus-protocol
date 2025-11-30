FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (none for now)

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port (FastAPI default)
EXPOSE 8000

# Start the application
# We listen on 0.0.0.0 to allow external access
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]