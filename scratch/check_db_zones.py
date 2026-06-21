import sqlite3

conn = sqlite3.connect("astram.db")
cursor = conn.cursor()

cursor.execute("SELECT DISTINCT zone FROM events")
zones = cursor.fetchall()
print("Distinct zones in events table:")
for z in zones:
    print(z[0])

cursor.execute("SELECT DISTINCT role, zone FROM users")
users = cursor.fetchall()
print("\nUsers and their roles/zones:")
for u in users:
    print(u)

conn.close()
