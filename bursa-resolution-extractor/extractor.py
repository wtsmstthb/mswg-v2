from playwright.sync_api import sync_playwright


def extract_bursa_notice(url):

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print("Opening Bursa page...")

        page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=60000
        )

        page.wait_for_timeout(5000)

        print("\n--- FRAMES FOUND ---")

        for frame in page.frames:
            print(frame.url)

        # Find Bursa announcement iframe
        announcement_frame = None

        for frame in page.frames:
            if "disclosure.bursamalaysia.com" in frame.url:
                announcement_frame = frame
                break

        if announcement_frame is None:
            browser.close()
            return {
                "error": "Announcement iframe not found"
            }

        print("\nAnnouncement iframe found:")
        print(announcement_frame.url)

        # Give iframe time to finish loading
        announcement_frame.wait_for_load_state("domcontentloaded")
        page.wait_for_timeout(3000)

        text = announcement_frame.locator("body").inner_text()

        print("\n--- ANNOUNCEMENT CONTENT ---\n")
        print(text)

        browser.close()

        return text