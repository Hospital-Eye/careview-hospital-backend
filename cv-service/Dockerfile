FROM python:3.11-slim
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
COPY cv-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy app files
COPY cv-service/ .

# Use the port Cloud Run provides
ENV PORT=8080
EXPOSE $PORT

# Run Uvicorn on that port
CMD exec uvicorn app:app --host 0.0.0.0 --port $PORT
