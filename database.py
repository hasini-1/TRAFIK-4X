import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configurable database URL via environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/astram")

# Fallback mechanism to SQLite if PostgreSQL fails to connect or is not active
# We try to create an engine with the default DATABASE_URL. If connection checks fail, 
# or if SQLite is explicitly configured, we fall back to SQLite automatically.
engine = None
try:
    if DATABASE_URL.startswith("postgresql"):
        # We set a short connection timeout so it falls back quickly if the port is closed
        engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 2})
        # Force a test connection
        with engine.connect() as conn:
            pass
        print("Successfully connected to PostgreSQL database.")
    else:
        raise ValueError("Non-PostgreSQL URL detected, defaulting to SQLite.")
except Exception as e:
    print(f"Warning: PostgreSQL connection failed ({e}). Falling back to SQLite local database.")
    SQLITE_URL = "sqlite:///./astram.db"
    # sqlite requires check_same_thread=False for FastAPI multithreading
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
