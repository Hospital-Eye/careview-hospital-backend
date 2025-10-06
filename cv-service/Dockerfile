FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
COPY cv-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY cv-service/ .
EXPOSE 8001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
