import os
import sys

# Set up Python path so backend modules and services can be imported seamlessly
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

for p in [BACKEND_DIR, ROOT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.main import app
except ImportError:
    from main import app

# Export app for Vercel Serverless Function runtime
__all__ = ["app"]
