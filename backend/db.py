import logging
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)


def get_conn():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            port=os.getenv("DB_PORT"),
            sslmode="require"
        )
        return conn
    except Exception as e:
        logger.error("Database connection failed | error=%s", e)
        raise


def release_conn(conn):
    try:
        conn.close()
    except Exception as e:
        logger.warning("Error closing database connection | error=%s", e)