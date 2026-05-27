import sys
try:
    from app.worker.celery_app import hello_task
except Exception as e:
    print(f"[ERROR] Could not import Celery app: {e}")
    sys.exit(1)

print("[1/3] Sending hello_task to Celery worker...")
try:
    result = hello_task.delay()
    print(f"[2/3] Task sent. Task ID: {result.id}")
    task_result = result.get(timeout=10)
    print(f"[3/3] Result: {task_result}")
    print("Smoke test PASSED.")
except Exception as e:
    print(f"[ERROR] {e}")
    sys.exit(1)