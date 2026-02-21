import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv
import os

load_dotenv()

connection_pool = psycopg2.pool.SimpleConnectionPool(
    1,
    10,
    host=os.getenv("DB_HOST"),
    database=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    port=os.getenv("DB_PORT"),
    sslmode="require"  
)

def get_conn():
    return connection_pool.getconn()

def release_conn(conn):
    connection_pool.putconn(conn)
