import re
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright


def _remove_label(text, labels):
    """Remove the first matching Bursa field label from the beginning of a row."""
    value = text.strip()
    for label in labels:
        if value.lower().startswith(label.lower()):
            return value[len(label):].strip()
    return value


def _is_bursa_url(url):
    try:
        host = (urlparse(url).hostname or "").lower()
        return host == "bursamalaysia.com" or host.endswith(".bursamalaysia.com")
    except Exception:
        return False


def extract_bursa_notice(url):
    """
    Extract the meeting details and Ordinary Resolutions shown in a Bursa Malaysia
    Company Announcement page.

    Returns a dictionary shaped for the Pre-Voting frontend, for example:
    {
        "company_name": "COMPANY NAME BHD",
        "meeting_type": "General",
        "meeting_description": "Notice of 112th Annual General Meeting ...",
        "meeting_date": "25 Sep 2026",
        "meeting_time": "11:30 AM",
        "meeting_venue": "...",
        "record_of_depositors": "18 Sep 2026",
        "resolutions": [
            {
                "number": 1,
                "description": "To approve ...",
                "shareholder_action": "For Voting"
            }
        ]
    }
    """

    if not _is_bursa_url(url):
        return {"error": "Please provide a valid Bursa Malaysia URL."}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        try:
            page = browser.new_page()

            page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=60000,
            )

            # Wait for Bursa's disclosure iframe to be loaded.
            page.wait_for_timeout(3000)

            announcement_frame = None
            for frame in page.frames:
                if "disclosure.bursamalaysia.com" in frame.url:
                    announcement_frame = frame
                    break

            if announcement_frame is None:
                return {"error": "Announcement iframe not found."}

            announcement_frame.wait_for_load_state(
                "domcontentloaded",
                timeout=30000,
            )
            page.wait_for_timeout(1500)

            rows = announcement_frame.locator("tr")

            row_texts = []
            for i in range(rows.count()):
                row_text = rows.nth(i).inner_text().strip()
                if row_text:
                    row_texts.append(row_text)

            if not row_texts:
                return {"error": "No announcement data was found."}

            # Meeting section information
        
            company_name = row_texts[0]
            meeting_type = ""
            meeting_description = ""
            meeting_date = ""
            meeting_time = ""
            meeting_venue = ""
            record_of_depositors = ""

            resolution_section_index = len(row_texts)

            for i, text in enumerate(row_texts):
                normalized = " ".join(text.split())

                if normalized.lower() == "resolutions":
                    resolution_section_index = i
                    break

                if normalized.lower().startswith("type of meeting"):
                    meeting_type = _remove_label(
                        text,
                        ["Type of Meeting"],
                    )

                elif normalized.lower().startswith("description"):
                    # Before the Resolutions heading, Bursa's Description row is the meeting description.
                    meeting_description = _remove_label(
                        text,
                        ["Description"],
                    )

                elif normalized.lower().startswith("date of meeting"):
                    meeting_date = _remove_label(
                        text,
                        ["Date of Meeting"],
                    )

                elif normalized.lower().startswith("time"):
                    meeting_time = _remove_label(
                        text,
                        ["Time"],
                    )

                elif normalized.lower().startswith("venue(s)"):
                    meeting_venue = _remove_label(
                        text,
                        ["Venue(s)"],
                    )

                elif normalized.lower().startswith(
                    "date of general meeting record of depositors"
                ):
                    record_of_depositors = _remove_label(
                        text,
                        ["Date of General Meeting Record of Depositors"],
                    )

            # Ordinary Resolution data

            resolutions = []

            for i in range(resolution_section_index + 1, len(row_texts)):
                text = row_texts[i]

                match = re.search(
                    r"\bOrdinary\s+Resolution\s+(\d+)\b",
                    text,
                    re.IGNORECASE,
                )

                if not match:
                    continue

                resolution_number = int(match.group(1))
                description = ""
                shareholder_action = ""

                # Search until the next numbered resolution item.
                for j in range(i + 1, len(row_texts)):
                    next_text = row_texts[j]
                    next_normalized = " ".join(next_text.split())

                    if re.match(r"^\d+\.\s+", next_normalized):
                        break

                    if next_normalized.lower().startswith("description"):
                        description = _remove_label(
                            next_text,
                            ["Description"],
                        )

                    elif (
                        next_normalized.lower().startswith("shareholder’s action")
                        or next_normalized.lower().startswith("shareholder's action")
                    ):
                        shareholder_action = _remove_label(
                            next_text,
                            ["Shareholder’s Action", "Shareholder's Action"],
                        )

                resolutions.append(
                    {
                        "number": resolution_number,
                        "description": description,
                        "shareholder_action": shareholder_action,
                    }
                )

            return {
                "company_name": company_name,
                "meeting_type": meeting_type,
                "meeting_description": meeting_description,
                "meeting_date": meeting_date,
                "meeting_time": meeting_time,
                "meeting_venue": meeting_venue,
                "record_of_depositors": record_of_depositors,
                "resolutions": resolutions,
            }

        except Exception as exc:
            return {"error": f"Failed to extract Bursa announcement: {exc}"}

        finally:
            browser.close()
