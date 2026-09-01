from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


# =========================================================
# PRE-VOTING SUBMISSION
# =========================================================

class PreVotingSubmission(Base):

    __tablename__ = "pre_voting_submissions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    company_name = Column(
        String(255),
        nullable=False
    )

    meeting_type = Column(
        String(255)
    )

    meeting_description = Column(
        Text
    )

    meeting_date = Column(
        String(100)
    )

    meeting_time = Column(
        String(100)
    )

    meeting_venue = Column(
        Text
    )

    overall_remarks = Column(
        Text
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    votes = relationship(
    "PreVotingVote",
    back_populates="submission",
    cascade="all, delete-orphan",
    order_by="PreVotingVote.resolution_number"
)


# =========================================================
# PRE-VOTING VOTES
# =========================================================

class PreVotingVote(Base):

    __tablename__ = "pre_voting_votes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    submission_id = Column(
        Integer,
        ForeignKey(
            "pre_voting_submissions.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    resolution_number = Column(
        Integer,
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    shareholder_action = Column(
        Text
    )

    vote = Column(
        String(20),
        nullable=False
    )

    remarks = Column(
        Text
    )

    submission = relationship(
        "PreVotingSubmission",
        back_populates="votes"
    )