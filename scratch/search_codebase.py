import os
import sys

root_dir = r"c:\Users\hp\OneDrive\Desktop\EventImpactGenome\EventImpactGenome (2)\EventImpactGenome (3)\EventImpactGenome"
query = sys.argv[1] if len(sys.argv) > 1 else ""
output_file = os.path.join(root_dir, "scratch", "search_output.txt")

if not query:
    print("No query provided.")
    sys.exit(1)

results = []
for dirpath, _, filenames in os.walk(root_dir):
    if "node_modules" in dirpath or ".git" in dirpath or "dist" in dirpath:
        continue
    for filename in filenames:
        if filename.endswith(('.js', '.jsx', '.py', '.html', '.css')):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f, 1):
                        if query.lower() in line.lower():
                            results.append(f"{filepath}:{i}: {line.strip()}")
            except Exception as e:
                pass

with open(output_file, 'w', encoding='utf-8') as f:
    for r in results:
        f.write(r + "\n")
print(f"Search for '{query}' found {len(results)} matches.")
