from extractor import extract_bursa_notice


url = "https://www.bursamalaysia.com/market_information/announcements/company_announcement/announcement_details?ann_id=3697144"

result = extract_bursa_notice(url)

print("\n--- TEST FINISHED ---")
print("Characters returned:", len(result))