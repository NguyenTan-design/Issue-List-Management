import pandas as pd
import json

# Đọc Excel
df = pd.read_excel(
    r"D:\SOFTWARE\GIT HUB\Issue-List-Management\FILTER.xlsx"
)

# ===== BU11 =====

bu11 = (
    df["BU11"]
    .dropna()
    .tolist()
)

with open(
    "BU11.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        bu11,
        f,
        indent=4,
        ensure_ascii=False
    )

# ===== D7 =====

d7 = (
    df["D7"]
    .dropna()
    .tolist()
)

with open(
    "D7.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        d7,
        f,
        indent=4,
        ensure_ascii=False
    )

# ===== VISION =====

vision = (
    df["VISION"]
    .dropna()
    .tolist()
)

with open(
    "VISION.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        vision,
        f,
        indent=4,
        ensure_ascii=False
    )


# ===== BU4 =====

bu4 = (
    df["BU4"]
    .dropna()
    .tolist()
)

with open(
    "BU4.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        bu4,
        f,
        indent=4,
        ensure_ascii=False
    )

# ===== LEADER TECH =====

ldt = (
    df["LDT"]
    .dropna()
    .tolist()
)

with open(
    "LDT.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        ldt,
        f,
        indent=4,
        ensure_ascii=False
    )

# ===== GOE MICRON =====

micron = (
    df["MICRON"]
    .dropna()
    .tolist()
)

with open(
    "MICRON.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        micron,
        f,
        indent=4,
        ensure_ascii=False
    )

# ===== E5 =====

e5 = (
    df["E5"]
    .dropna()
    .tolist()
)

with open(
    "E5.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        e5,
        f,
        indent=4,
        ensure_ascii=False
    )

print("DONE")