from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)

from backend.database import Base


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    title = Column(
        String(255),
        nullable=False,
        index=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    status = Column(
        String(50),
        nullable=False,
        default="Active",
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    investigation_id = Column(
        Integer,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
    )

    filename = Column(
        String(255),
        nullable=False,
    )

    file_type = Column(
        String(100),
        nullable=True,
    )

    file_size = Column(
        BigInteger,
        nullable=False,
        default=0,
    )

    file_hash = Column(
        String(64),
        nullable=True,
        index=True,
    )

    storage_path = Column(
        String(500),
        nullable=True,
    )

    file_path = Column(
        String(500),
        nullable=True,
    )

    processing_status = Column(
        String(50),
        nullable=False,
        default="pending",
    )

    extracted_text = Column(
        Text,
        nullable=True,
    )

    ai_analysis_result = Column(
        Text,
        nullable=True,
    )

    uploaded_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )