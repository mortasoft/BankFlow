import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import time

load_dotenv()

DB_USER = os.getenv("DB_USER", "sa")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "BankFlowDB")
DB_PORT = os.getenv("DB_PORT", "1433")

# URL to connect to master to ensure DB exists
MASTER_URL = (
    f"mssql+pyodbc://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/master?"
    "driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
)

# Function to ensure database exists with retries
def ensure_db_exists():
    retries = 5
    while retries > 0:
        try:
            master_engine = create_engine(MASTER_URL, isolation_level="AUTOCOMMIT")
            with master_engine.connect() as conn:
                # Check if DB exists
                result = conn.execute(text(f"SELECT name FROM sys.databases WHERE name = '{DB_NAME}'"))
                if not result.fetchone():
                    print(f"DEBUG: Creating database {DB_NAME}...")
                    conn.execute(text(f"CREATE DATABASE [{DB_NAME}]"))
                else:
                    print(f"DEBUG: Database {DB_NAME} already exists.")
            master_engine.dispose()
            return
        except Exception as e:
            print(f"DEBUG: Waiting for SQL Server... ({retries} retries left) - Error: {e}")
            retries -= 1
            time.sleep(5)
    raise Exception("Could not connect to SQL Server to ensure database existence.")

# Run check
ensure_db_exists()

# Connection string for the actual bank database
SQLALCHEMY_DATABASE_URL = (
    f"mssql+pyodbc://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?"
    "driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
