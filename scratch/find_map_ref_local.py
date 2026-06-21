import os

root_dir = r"c:\Users\hp\OneDrive\Desktop\EventImpactGenome\EventImpactGenome (2)\EventImpactGenome (3)\EventImpactGenome"
query = "MapCommandCenter"
output_file = os.path.join(root_dir, "scratch", "map_ref_output.txt")

results = []
for dirpath, _, filenames in os.walk(root_dir):
    # Exclude node_modules and .git
    if "node_modules" in dirpath or ".git" in dirpath:
        continue
    for filename in filenames:
        if filename.endswith(('.js', '.jsx', '.py')):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if query in content:
                        results.append(filepath)
            except Exception as e:
                pass

with open(output_file, 'w', encoding='utf-8') as f:
    for r in results:
        f.write(r + "\n")
print(f"Done. Wrote {len(results)} matches.")
