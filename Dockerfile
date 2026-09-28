# Multi-stage production container for ASTREVA Full Enclave
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies needed for rasterio, GDAL and OpenMP
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy complete project code, datasets, and indexed weights
COPY backend/ ./backend/
COPY configs/ ./configs/
COPY SIH-2PGITB&U2/ ./SIH-2PGITB&U2/

ENV PORT=8000
ENV HOST=0.0.0.0
EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
