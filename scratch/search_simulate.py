with open(r"c:\Users\hp\OneDrive\Desktop\EventImpactGenome (3)\EventImpactGenome\app.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "/inspector/simulate" in line:
        print(f"--- Line {idx+1} ---")
        for i in range(max(0, idx - 2), min(len(lines), idx + 80)):
            print(f"{i+1}: {lines[i]}", end="")
