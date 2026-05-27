from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24
    redis_url: str = "redis://localhost:6379"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()