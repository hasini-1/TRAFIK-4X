filepath = r"c:\Users\hp\OneDrive\Desktop\EventImpactGenome\EventImpactGenome (2)\EventImpactGenome (3)\EventImpactGenome\src\components\ConstableDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if "incident" in line.lower():
            print(f"{i}: {line.strip()}")
