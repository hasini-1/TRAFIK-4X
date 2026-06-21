with open('src/components/ConstableDashboard.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("--- CONSTABLE DASHBOARD EMERGENCY/DECLARE/OPERATOR ---")
for i, line in enumerate(lines):
    if 'emergency' in line.lower() or 'declare' in line.lower() or 'operator' in line.lower():
        print(f"Line {i+1}: {line.strip()}")
