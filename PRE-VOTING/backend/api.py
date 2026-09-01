from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from extractor import extract_bursa_notice


app = FastAPI(
    title="MSWG Pre-Voting API"
)

# To run the API server, use the following command in the terminal:
# python -m uvicorn api:app --reload --port 8000  backend folder to run the API server
# python -m http.server 8080 in the main folder to run the front-end server
# Test on http://localhost:8080/Frontend/pre-voting/index.html

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