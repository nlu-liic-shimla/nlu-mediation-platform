import os, sys
from dotenv import load_dotenv
load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")
if not REDIS_URL:
    print("ERROR: REDIS_URL not found in .env")
    sys.exit(1)

import redis
print("[1/3] Connecting to Redis...")
try:
    client = redis.from_url(REDIS_URL, decode_responses=True)
    result = client.ping()
    print(f"[2/3] Ping response: {result}")
    print("[3/3] Redis connection verified. Ready for Celery.")
except Exception as e:
    print(f"[ERROR] {e}")
    sys.exit(1)