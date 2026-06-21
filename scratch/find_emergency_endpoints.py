filepath = r"c:\Users\hp\OneDrive\Desktop\EventImpactGenome\EventImpactGenome (2)\EventImpactGenome (3)\EventImpactGenome\app.py"
with open(filepath, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if "def " in line and ("emergency" in line.lower() or "incident" in line.lower() or "assign" in line.lower() or "siren" in line.lower() or "trigger" in line.lower()):
            print(f"{i}: {line.strip()}")
