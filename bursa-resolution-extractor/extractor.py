from playwright.sync_api import sync_playwright
from pathlib import Path


def extract_bursa_notice(url):

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False) # Set to False to see the browser window
        page = browser.new_page()

        #print("Opening Bursa Saham webpage...")

        page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=60000
        )

        # Next can be changed according to the website time load
        page.wait_for_timeout(5000)

        #print("\n--- FRAMES FOUND ---")

        # For debugging purpose, can be removed later
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

        # Find the html <body> tag
        text = announcement_frame.locator("body").inner_text()
        html = announcement_frame.content()

        output_path = Path(__file__).parent / "generatedpage.html"

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)

        print("HTML saved here:")
        print(output_path.resolve())

        print("\n--- ANNOUNCEMENT CONTENT ---\n")
        print(text)

        browser.close()

        return text