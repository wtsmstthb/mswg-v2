import json
from extractor import extract_bursa_notice


# Hardcoded only for local testing. Later the URL will come from the Pre-Voting page.
url = "https://www.bursamalaysia.com/market_information/announcements/company_announcement/announcement_details?ann_id=3697144"

result = extract_bursa_notice(url)

print("\n--- EXTRACTED BURSA DATA ---\n")
print(json.dumps(result, indent=2, ensure_ascii=False))
