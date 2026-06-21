with open(r"c:\Users\hp\OneDrive\Desktop\EventImpactGenome (3)\EventImpactGenome\app.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

found = []
for idx, line in enumerate(lines):
    if "/inspector" in line or "ingest" in line or "/events/outcome" in line:
        found.append(idx)

# Print lines around the match
for f_idx in found:
    print(f"--- Line {f_idx+1} ---")
    start = max(0, f_idx - 5)
    end = min(len(lines), f_idx + 35)
    for i in range(start, end):
        print(f"{i+1}: {lines[i]}", end="")
