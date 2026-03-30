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

# Copy fonts for server-side Pillow text rendering (14 Cyrillic font families)
COPY worker/fonts/ /app/fonts/
ENV FONTS_DIR=/app/fonts

# Pre-download u2net model (~176MB, works on 4GB VPS)
# For 8GB+ VPS, switch to birefnet-general for better quality
RUN python -c "from rembg import new_session; new_session('u2net')"

ENV NUMBA_CACHE_DIR=/tmp/numba_cache
CMD ["rq", "worker", "--url", "redis://redis:6379", "--max-jobs", "100"]
