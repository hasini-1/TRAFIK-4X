with open(r"c:\Users\hp\OneDrive\Desktop\EventImpactGenome (3)\EventImpactGenome\src\components\InspectorDashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = re.findall(r"axios\.\w+\(.*?\)", content, re.DOTALL)
print("Found Axios calls:")
for m in matches:
    print(m)
