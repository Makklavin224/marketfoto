FROM python:3.12-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gcc \
    libcairo2-dev pkg-config libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*
COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app

# Copy fonts for server-side Pillow text rendering (14 Cyrillic font families)
COPY worker/fonts/ /app/fonts/
ENV FONTS_DIR=/app/fonts

# Pre-download model file only (no ONNX loading — saves RAM during build)
# Model loads into memory at worker startup, not at build time
RUN mkdir -p /root/.u2net && \
    curl -L -o /root/.u2net/birefnet-general.onnx \
    https://github.com/danielgatis/rembg/releases/download/v0.0.0/BiRefNet-general-epoch_244.onnx

ENV NUMBA_CACHE_DIR=/tmp/numba_cache
CMD ["rq", "worker", "--url", "redis://redis:6379", "--max-jobs", "100"]
