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
# Pre-download birefnet-general model (~1.5GB baked into image layer) per D-02
RUN python -c "from rembg import new_session; new_session('birefnet-general')"
# Pre-warm numba JIT compilation to avoid first-request latency
ENV NUMBA_CACHE_DIR=/tmp/numba_cache
RUN python -c "\
from rembg import remove, new_session; \
from PIL import Image; \
import io; \
session = new_session('birefnet-general'); \
img = Image.new('RGB', (100, 100), 'white'); \
buf = io.BytesIO(); \
img.save(buf, 'PNG'); \
buf.seek(0); \
remove(buf.getvalue(), session=session); \
print('Model pre-warmed successfully')"
CMD ["rq", "worker", "--url", "redis://redis:6379", "--max-jobs", "100"]
