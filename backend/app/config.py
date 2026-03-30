from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "postgresql://marketfoto:password@postgres:5432/marketfoto"

    # Redis
    redis_url: str = "redis://redis:6379"

    # MinIO
    s3_endpoint: str = "http://minio:9000"
    s3_access_key: str = "marketfoto"
    s3_secret_key: str = "changeme"

    # Auth
    jwt_secret: str = "changeme"
    jwt_algorithm: str = "HS256"
    jwt_expires_hours: int = 168

    # YooKassa
    yookassa_shop_id: str = ""
    yookassa_secret_key: str = ""

    # AI Image Generation (Nano Banana 2 / Gemini 3.1 Flash Image)
    gemini_api_key: str = ""

    # App
    app_url: str = "https://marketfoto.ru"
    cors_origins: str = "https://marketfoto.ru,http://localhost:3000"


settings = Settings()
