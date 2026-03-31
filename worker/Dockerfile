FROM python:3.12-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gcc \
    libcairo2-dev pkg-config libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*
COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY worker/ ./worker/
ENV PYTHONPATH=/app

# Copy fonts for server-side Pillow text rendering
COPY worker/fonts/ /app/fonts/
ENV FONTS_DIR=/app/fonts

# No rembg model download needed — background removal via Gemini API
ENV NUMBA_CACHE_DIR=/tmp/numba_cache
CMD ["rq", "worker", "--url", "redis://redis:6379", "--max-jobs", "500"]
