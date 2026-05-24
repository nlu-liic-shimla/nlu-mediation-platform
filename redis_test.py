import redis

r = redis.Redis(
    host="mighty-cicada-94724.upstash.io",
    port=6379,
    password="gQAAAAAAAXIEAAIgcDIwMmUzZTUyZTM5NWE0Nzc4OGU1ODk5NDc1NTkzMDI2MA",
    ssl=True
)

print(r.ping())