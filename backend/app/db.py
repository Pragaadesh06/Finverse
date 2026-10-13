from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def ensure_schema_compatibility():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            res = conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()
            col_names = {r[1] for r in res}
            if "customer_account_id" not in col_names:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN customer_account_id VARCHAR(64)")
            if "organization_id" not in col_names:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN organization_id VARCHAR(64)")

            # Check and add missing columns to transactions table
            tx_res = conn.exec_driver_sql("PRAGMA table_info(transactions)").fetchall()
            tx_cols = {r[1] for r in tx_res}
            if "screening_status" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN screening_status VARCHAR(30) DEFAULT 'accepted'")
            if "is_suspicious_label" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN is_suspicious_label BOOLEAN DEFAULT 0")
            if "channel" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN channel VARCHAR(40) DEFAULT 'WIRE'")
            if "ip_country" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN ip_country VARCHAR(10) DEFAULT 'IN'")
            if "merchant_category" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN merchant_category VARCHAR(80)")
            if "import_id" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN import_id VARCHAR(40)")
            if "metadata" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN metadata JSON DEFAULT '{}'")
            conn.commit()
        except Exception:
            pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

