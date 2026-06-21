import os

filepath = r"c:\Users\hp\OneDrive\Desktop\EventImpactGenome\EventImpactGenome (2)\EventImpactGenome (3)\EventImpactGenome\src\components\EventPlannerForm.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if "useState(" in line:
            print(f"{i}: {line.strip()}")
