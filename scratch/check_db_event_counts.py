import sqlite3

conn = sqlite3.connect("astram.db")
cursor = conn.cursor()

cursor.execute("SELECT zone, COUNT(*) FROM events GROUP BY zone")
rows = cursor.fetchall()
print("Event counts by zone:")
for r in rows:
    print(f"{r[0]}: {r[1]}")

conn.close()
