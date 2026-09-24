import pandas as pd
import json

# Đọc Excel
df = pd.read_excel(r"C:\Users\quoct\OneDrive - Fuji Machine Asia Pte Ltd\ISSUE LIST SUMMARY.xlsx")

# Chỉ lấy các cột cần
df = df[["DATE", "SITE", "ISSUE AND REQUEST", "STATUS", "LOG", "CC LINK"]]

# Format ngày
df["Release date"] = df["DATE"].dt.strftime("%m-%d-%Y")

# Convert JSON
data = json.loads(
    df.to_json(
        orient="records",
        force_ascii=False,
        date_format="iso"
    )
)
# Xuất JSON
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print("DONE")