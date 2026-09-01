from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


# database.py is inside PRE-VOTING/backend
BACKEND_DIR = Path(__file__).resolve().parent

# Go up one level to PRE-VOTING
PROJECT_ROOT = BACKEND_DIR.parent

# PRE-VOTING/testing
TESTING_DIR = PROJECT_ROOT / "testing"

# PRE-VOTING/testing/mswg_test.db
DATABASE_FILE = TESTING_DIR / "mswg_test.db"


# Create testing folder if it does not exist
TESTING_DIR.mkdir(
    parents=True,
    exist_ok=True
)


DATABASE_URL = (
    f"sqlite:///{DATABASE_FILE.as_posix()}"
)


engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False
    }
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


Base = declarative_base()


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()