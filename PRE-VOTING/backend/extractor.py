import re

from urllib.parse import urlparse
from playwright.sync_api import sync_playwright


def _remove_label(text, labels):
    """
    Remove the first matching Bursa field label
    from the beginning of a row.
    """
    value = text.strip()

    for label in labels:

        if value.lower().startswith(
            label.lower()
        ):

            return value[
                len(label):
            ].strip()

    return value


def _is_bursa_url(url):
    """
    Check that the supplied URL belongs
    to bursamalaysia.com.
    """
    try:

        host = (
            urlparse(url).hostname or ""
        ).lower()

        return (
            host == "bursamalaysia.com"
            or
            host.endswith(
                ".bursamalaysia.com"
            )
        )

    except Exception:

        return False


def extract_bursa_notice(url):
    """
    Extract meeting details and Ordinary
    Resolutions from a Bursa Malaysia
    Company Announcement page.
    """

    if not _is_bursa_url(url):

        return {
            "error":
                "Please provide a valid Bursa Malaysia URL."
        }


    with sync_playwright() as p:

        browser = p.chromium.launch(
            headless=False #for now True doesn't work with the iframe, need to debug
        )

        try:

            page = browser.new_page()


            print(
                "Opening Bursa announcement..."
            )


            page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=60000
            )


            # Give Bursa's dynamic page time to load.
            page.wait_for_timeout(
                5000
            )


            print(
                "\nFrames found:"
            )

            for frame in page.frames:

                print(
                    frame.url
                )


            # -----------------------------------------
            # FIND ANNOUNCEMENT IFRAME
            # -----------------------------------------

            announcement_frame = None


            try:

                iframe_element = (
                    page.locator(
                        'iframe[src*="disclosure.bursamalaysia.com"]'
                    )
                )


                iframe_element.wait_for(
                    state="attached",
                    timeout=20000
                )


                announcement_frame = (
                    iframe_element
                    .content_frame()
                )


            except Exception as iframe_error:

                print(
                    "Direct iframe lookup failed:",
                    iframe_error
                )


            # Fallback: inspect Playwright's loaded frames
            if announcement_frame is None:

                for frame in page.frames:

                    if (
                        "disclosure.bursamalaysia.com"
                        in frame.url
                    ):

                        announcement_frame = frame

                        break


            if announcement_frame is None:

                return {
                    "error":
                        "Announcement iframe not found."
                }


            print(
                "\nAnnouncement iframe found:"
            )

            print(
                announcement_frame.url
            )


            announcement_frame.wait_for_load_state(
                "domcontentloaded"
            )


            page.wait_for_timeout(
                2000
            )


            # -----------------------------------------
            # GET TABLE ROWS
            # -----------------------------------------

            rows = (
                announcement_frame
                .locator("tr")
            )


            print(
                "Number of rows found:",
                rows.count()
            )


            row_texts = []


            for i in range(
                rows.count()
            ):

                row_text = (
                    rows
                    .nth(i)
                    .inner_text()
                    .strip()
                )


                if row_text:

                    row_texts.append(
                        row_text
                    )


            if not row_texts:

                return {
                    "error":
                        "No announcement data was found."
                }


            # -----------------------------------------
            # MEETING INFORMATION
            # -----------------------------------------

            company_name = (
                row_texts[0]
                if row_texts
                else ""
            )


            meeting_type = ""
            meeting_description = ""
            meeting_date = ""
            meeting_time = ""
            meeting_venue = ""


            resolution_section_index = (
                len(row_texts)
            )


            for i, text in enumerate(
                row_texts
            ):

                normalized = (
                    " ".join(
                        text.split()
                    )
                )


                if (
                    normalized.lower()
                    == "resolutions"
                ):

                    resolution_section_index = i

                    break


                if (
                    normalized
                    .lower()
                    .startswith(
                        "type of meeting"
                    )
                ):

                    meeting_type = (
                        _remove_label(
                            text,
                            [
                                "Type of Meeting"
                            ]
                        )
                    )


                elif (
                    normalized
                    .lower()
                    .startswith(
                        "description"
                    )
                ):

                    meeting_description = (
                        _remove_label(
                            text,
                            [
                                "Description"
                            ]
                        )
                    )


                elif (
                    normalized
                    .lower()
                    .startswith(
                        "date of meeting"
                    )
                ):

                    meeting_date = (
                        _remove_label(
                            text,
                            [
                                "Date of Meeting"
                            ]
                        )
                    )


                elif (
                    normalized
                    .lower()
                    .startswith(
                        "time"
                    )
                ):

                    meeting_time = (
                        _remove_label(
                            text,
                            [
                                "Time"
                            ]
                        )
                    )


                elif (
                    normalized
                    .lower()
                    .startswith(
                        "venue(s)"
                    )
                ):

                    meeting_venue = (
                        _remove_label(
                            text,
                            [
                                "Venue(s)"
                            ]
                        )
                    )


            # -----------------------------------------
            # ORDINARY RESOLUTIONS
            # -----------------------------------------

            resolutions = []

            # Used to prevent the same Ordinary Resolution number from being added multiple times.
            seen_resolution_numbers = set()
        

            for i in range(
                resolution_section_index + 1,
                len(row_texts)
            ):

                text = (
                    row_texts[i]
                )

                normalized = " ".join(
                    text.split()
                )

                match = re.match(
                r"^\d+\.\s+Ordinary\s+Resolution\s+(\d+)\s*$",
                normalized,
                re.IGNORECASE
                )   

                if not match:

                    continue


                resolution_number = (
                    int(
                        match.group(1)
                    )
                )

                # Prevent duplicates.
                if resolution_number in seen_resolution_numbers:
                    continue


                seen_resolution_numbers.add(
                    resolution_number
                )


                description = ""
                shareholder_action = ""


                # Look forward until the
                # next numbered item.
                for j in range(
                    i + 1,
                    len(row_texts)
                ):

                    next_text = (
                        row_texts[j]
                    )


                    next_normalized = (
                        " ".join(
                            next_text.split()
                        )
                    )


                    # Example:
                    # 3. Ordinary Resolution 2
                    if re.match(
                        r"^\d+\.\s+",
                        next_normalized
                    ):

                        break


                    if (
                        next_normalized
                        .lower()
                        .startswith(
                            "description"
                        )
                    ):

                        description = (
                            _remove_label(
                                next_text,
                                [
                                    "Description"
                                ]
                            )
                        )


                    elif (
                        next_normalized
                        .lower()
                        .startswith(
                            "shareholder’s action"
                        )
                        or
                        next_normalized
                        .lower()
                        .startswith(
                            "shareholder's action"
                        )
                    ):

                        shareholder_action = (
                            _remove_label(
                                next_text,
                                [
                                    "Shareholder’s Action",
                                    "Shareholder's Action"
                                ]
                            )
                        )


                # Do not send empty/false resolution rows
                # to the frontend.
                if description or shareholder_action:

                    resolutions.append(
                        {
                            "number":
                                resolution_number,

                            "description":
                                description,

                            "shareholder_action":
                                shareholder_action
                        }
                    )


            # -----------------------------------------
            # FINAL RESULT
            # -----------------------------------------

            return {

                "company_name":
                    company_name,

                "meeting_type":
                    meeting_type,

                "meeting_description":
                    meeting_description,

                "meeting_date":
                    meeting_date,

                "meeting_time":
                    meeting_time,

                "meeting_venue":
                    meeting_venue,

                "resolutions":
                    resolutions
            }


        except Exception as exc:

            return {
                "error":
                    f"Failed to extract Bursa announcement: {exc}"
            }


        finally:

            browser.close()