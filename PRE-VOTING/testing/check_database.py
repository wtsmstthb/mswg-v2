import sqlite3
from pathlib import Path


DATABASE = Path(__file__).resolve().parent / "mswg_test.db"


if not DATABASE.exists():
    print("Database not found:")
    print(DATABASE)
    raise SystemExit(1)


connection = sqlite3.connect(DATABASE)
connection.row_factory = sqlite3.Row

cursor = connection.cursor()


print("\n=== SUBMISSIONS ===\n")

cursor.execute(
    """
    SELECT
        id,
        company_name,
        meeting_type,
        meeting_description,
        meeting_date,
        meeting_time,
        meeting_venue,
        overall_remarks,
        created_at
    FROM pre_voting_submissions
    ORDER BY id
    """
)

for row in cursor.fetchall():
    print(dict(row))


print("\n=== VOTES ===\n")

cursor.execute(
    """
    SELECT
        id,
        submission_id,
        resolution_number,
        description,
        shareholder_action,
        vote,
        remarks
    FROM pre_voting_votes
    ORDER BY
        submission_id,
        resolution_number
    """
)

for row in cursor.fetchall():
    print(dict(row))


connection.close()