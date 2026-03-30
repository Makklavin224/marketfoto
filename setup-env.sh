#!/bin/bash
# Запусти на VPS из /opt/marketfoto:
# bash setup-env.sh

cd /opt/marketfoto

DB_PASS=$(openssl rand -hex 16)
MINIO_PASS=$(openssl rand -hex 16)
JWT_SEC=$(openssl rand -hex 32)

cat > .env << EOF
# Database
DB_PASSWORD=$DB_PASS
DATABASE_URL=postgresql://marketfoto:${DB_PASS}@postgres:5432/marketfoto

# Redis
REDIS_URL=redis://redis:6379

# MinIO / S3
MINIO_USER=marketfoto
MINIO_PASSWORD=$MINIO_PASS
S3_ENDPOINT=http://minio:9000
S3_BUCKET=marketfoto
S3_ACCESS_KEY=marketfoto
S3_SECRET_KEY=$MINIO_PASS

# Auth
JWT_SECRET=$JWT_SEC
JWT_ALGORITHM=HS256
JWT_EXPIRES_HOURS=168

# YooKassa (заглушки — заполнить позже)
YOOKASSA_SHOP_ID=test_shop_id
YOOKASSA_SECRET_KEY=test_secret_key
YOOKASSA_WEBHOOK_SECRET=test_webhook_secret

# App
APP_URL=http://94.103.85.145
CORS_ORIGINS=http://94.103.85.145,http://localhost:3000
EOF

echo "=== .env created ==="
cat .env
echo ""
echo "=== Next: docker compose up --build ==="
