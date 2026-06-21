import inspect
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app

print("Endpoints found:")
for route in app.routes:
    methods = getattr(route, "methods", None)
    methods_str = ",".join(methods) if methods else "None"
    print(f"Path: {route.path} | Methods: {methods_str} | Name: {route.name}")
