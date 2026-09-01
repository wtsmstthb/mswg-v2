from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from extractor import extract_bursa_notice
from typing import List, Optional, Literal
from sqlalchemy.orm import Session
from database import Base, engine, get_db

from models import (
    PreVotingSubmission,
    PreVotingVote,
)


app = FastAPI(
    title="MSWG Pre-Voting API"
)

Base.metadata.create_all(
    bind=engine
)

# To run the API server, use the following command in the terminal:
# python -m uvicorn api:app --reload --port 8000  backend folder to run the API server
# python -m http.server 8080 in the main folder to run the front-end server
# Test on http://localhost:8080/PRE-VOTING/frontend/index.html

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8080",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BursaRequest(BaseModel):
    url: str


class VoteSubmission(BaseModel):

    number: int

    description: str

    shareholder_action: Optional[str] = None

    vote: Literal["for", "against", "abstain"]

    remarks: Optional[str] = ""


class PreVotingSubmissionRequest(BaseModel):

    company_name: str

    meeting_type: Optional[str] = None

    meeting_description: Optional[str] = None

    meeting_date: Optional[str] = None

    meeting_time: Optional[str] = None

    meeting_venue: Optional[str] = None

    votes: List[VoteSubmission]

    overall_remarks: Optional[str] = ""


@app.get("/")
def root():
    return {
        "message": "MSWG Pre-Voting API is running"
    }


@app.post("/api/pre-voting/extract")
def extract_notice(request: BursaRequest):

    try:

        result = extract_bursa_notice(
            request.url
        )

        if "error" in result:
            raise HTTPException(
                status_code=400,
                detail=result["error"]
            )

        return result

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

@app.post("/api/pre-voting/submit")
def submit_pre_voting(
    request: PreVotingSubmissionRequest,
    db: Session = Depends(get_db)
):

    try:

        # -------------------------------------------------
        # CREATE SUBMISSION
        # -------------------------------------------------

        submission = PreVotingSubmission(
            company_name=request.company_name,
            meeting_type=request.meeting_type,
            meeting_description=request.meeting_description,
            meeting_date=request.meeting_date,
            meeting_time=request.meeting_time,
            meeting_venue=request.meeting_venue,
            overall_remarks=request.overall_remarks,
        )


        db.add(submission)


        # Generates the submission ID before commit
        db.flush()


        # -------------------------------------------------
        # CREATE VOTES
        # -------------------------------------------------

        for vote_data in request.votes:

            if (
                    vote_data.vote in ["against", "abstain"]
                    and not (vote_data.remarks or "").strip()
                ):
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Remarks are required for "
                            f"Resolution {vote_data.number} "
                            f"when voting {vote_data.vote}."
                        )
                    )

            vote = PreVotingVote(
                submission_id=submission.id,
                resolution_number=vote_data.number,
                description=vote_data.description,
                shareholder_action=(
                    vote_data.shareholder_action
                ),
                vote=vote_data.vote,
                remarks=(vote_data.remarks or "").strip(),
            )

            db.add(vote)


        # -------------------------------------------------
        # SAVE EVERYTHING
        # -------------------------------------------------

        db.commit()

        db.refresh(submission)


        return {
            "message":
                "Pre-voting submitted successfully.",

            "submission_id":
                submission.id
        }

    except HTTPException:

        db.rollback()

        raise

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

@app.get("/api/pre-voting/history")
def get_pre_voting_history(
    db: Session = Depends(get_db)
):

    submissions = (
        db.query(PreVotingSubmission)
        .order_by(
            PreVotingSubmission.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": submission.id,
            "company_name":
                submission.company_name,
            "meeting_type":
                submission.meeting_type,
            "meeting_description":
                submission.meeting_description,
            "meeting_date":
                submission.meeting_date,
            "meeting_time":
                submission.meeting_time,
            "created_at":
                submission.created_at,
        }
        for submission in submissions
    ]


@app.get("/api/pre-voting/history/{submission_id}")
def get_pre_voting_submission(
    submission_id: int,
    db: Session = Depends(get_db)
):

    submission = (
        db.query(PreVotingSubmission)
        .filter(
            PreVotingSubmission.id
            == submission_id
        )
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Pre-voting submission not found."
        )

    votes = (
        db.query(PreVotingVote)
        .filter(
            PreVotingVote.submission_id
            == submission.id
        )
        .order_by(
            PreVotingVote.resolution_number
        )
        .all()
    )

    return {
        "id": submission.id,

        "company_name":
            submission.company_name,

        "meeting_type":
            submission.meeting_type,

        "meeting_description":
            submission.meeting_description,

        "meeting_date":
            submission.meeting_date,

        "meeting_time":
            submission.meeting_time,

        "meeting_venue":
            submission.meeting_venue,

        "overall_remarks":
            submission.overall_remarks,

        "created_at":
            submission.created_at,

        "votes": [
            {
                "number":
                    vote.resolution_number,

                "description":
                    vote.description,

                "shareholder_action":
                    vote.shareholder_action,

                "vote":
                    vote.vote,

                "remarks":
                    vote.remarks,
            }
            for vote in votes
        ]
    }
