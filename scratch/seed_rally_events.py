import sqlite3
from datetime import datetime

conn = sqlite3.connect("astram.db")
cursor = conn.cursor()

# Check if tables exist
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
if not cursor.fetchone():
    print("Events table does not exist yet. Please run app.py first.")
    conn.close()
    exit()

# Get a valid user ID
cursor.execute("SELECT id FROM users LIMIT 1")
user_row = cursor.fetchone()
if not user_row:
    print("No users found. Creating a default user first.")
    cursor.execute("""
        INSERT INTO users (name, email, password_hash, role, status)
        VALUES ('System', 'system@astram.gov.in', 'dummy', 'COMMAND_CENTER', 'ACTIVE')
    """)
    conn.commit()
    cursor.execute("SELECT id FROM users LIMIT 1")
    user_row = cursor.fetchone()

created_by = user_row[0]
print(f"Using created_by user ID: {created_by}")

rallies = [
    {
        "event_id": "RALLY_NORTH",
        "event_type": "planned",
        "event_cause": "political_rally",
        "priority": "High",
        "zone": "North Zone",
        "corridor": "Mekhri Circle Corridor",
        "requires_road_closure": 1,
        "impact_score": 88.0,
        "risk_band": "High",
        "confidence_score": 91.0,
        "status": "APPROVED",
        "latitude": 12.9984,
        "longitude": 77.5926,
        "ai_officers": 25,
        "ai_barricades": 10,
        "ai_tow_vehicles": 2,
        "ai_response_level": "Elevated",
        "expected_attendance": 50000,
        "start_time": "16:00",
        "end_time": "21:00",
        "duration_minutes": 300,
        "event_date": "2026-06-19"
    },
    {
        "event_id": "RALLY_SOUTH",
        "event_type": "planned",
        "event_cause": "political_rally",
        "priority": "High",
        "zone": "South Zone",
        "corridor": "Silk Board Corridor",
        "requires_road_closure": 1,
        "impact_score": 88.0,
        "risk_band": "High",
        "confidence_score": 91.0,
        "status": "APPROVED",
        "latitude": 12.9304,
        "longitude": 77.6226,
        "ai_officers": 25,
        "ai_barricades": 10,
        "ai_tow_vehicles": 2,
        "ai_response_level": "Elevated",
        "expected_attendance": 50000,
        "start_time": "16:00",
        "end_time": "21:00",
        "duration_minutes": 300,
        "event_date": "2026-06-19"
    },
    {
        "event_id": "RALLY_WEST",
        "event_type": "planned",
        "event_cause": "political_rally",
        "priority": "High",
        "zone": "West Zone",
        "corridor": "Toll Gate Corridor",
        "requires_road_closure": 1,
        "impact_score": 88.0,
        "risk_band": "High",
        "confidence_score": 91.0,
        "status": "APPROVED",
        "latitude": 12.9604,
        "longitude": 77.5326,
        "ai_officers": 25,
        "ai_barricades": 10,
        "ai_tow_vehicles": 2,
        "ai_response_level": "Elevated",
        "expected_attendance": 50000,
        "start_time": "16:00",
        "end_time": "21:00",
        "duration_minutes": 300,
        "event_date": "2026-06-19"
    },
    {
        "event_id": "RALLY_EAST",
        "event_type": "planned",
        "event_cause": "political_rally",
        "priority": "High",
        "zone": "East Zone",
        "corridor": "KRM Corridor",
        "requires_road_closure": 1,
        "impact_score": 88.0,
        "risk_band": "High",
        "confidence_score": 91.0,
        "status": "APPROVED",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "ai_officers": 25,
        "ai_barricades": 10,
        "ai_tow_vehicles": 2,
        "ai_response_level": "Elevated",
        "expected_attendance": 50000,
        "start_time": "16:00",
        "end_time": "21:00",
        "duration_minutes": 300,
        "event_date": "2026-06-19"
    },
    {
        "event_id": "RALLY_CENTRAL",
        "event_type": "planned",
        "event_cause": "political_rally",
        "priority": "High",
        "zone": "Central Zone",
        "corridor": "MG Road Corridor",
        "requires_road_closure": 1,
        "impact_score": 88.0,
        "risk_band": "High",
        "confidence_score": 91.0,
        "status": "APPROVED",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "ai_officers": 25,
        "ai_barricades": 10,
        "ai_tow_vehicles": 2,
        "ai_response_level": "Elevated",
        "expected_attendance": 50000,
        "start_time": "16:00",
        "end_time": "21:00",
        "duration_minutes": 300,
        "event_date": "2026-06-19"
    }
]

for r in rallies:
    # Check if already exists
    cursor.execute("SELECT event_id FROM events WHERE event_id=?", (r["event_id"],))
    if cursor.fetchone():
        # Update
        print(f"Rally {r['event_id']} already exists, updating...")
        cursor.execute("""
            UPDATE events SET
                event_type=?, event_cause=?, priority=?, zone=?, corridor=?, requires_road_closure=?,
                impact_score=?, risk_band=?, confidence_score=?, status=?, latitude=?, longitude=?,
                ai_officers=?, ai_barricades=?, ai_tow_vehicles=?, ai_response_level=?, expected_attendance=?,
                start_time=?, end_time=?, duration_minutes=?, event_date=?, created_by=?
            WHERE event_id=?
        """, (
            r["event_type"], r["event_cause"], r["priority"], r["zone"], r["corridor"], r["requires_road_closure"],
            r["impact_score"], r["risk_band"], r["confidence_score"], r["status"], r["latitude"], r["longitude"],
            r["ai_officers"], r["ai_barricades"], r["ai_tow_vehicles"], r["ai_response_level"], r["expected_attendance"],
            r["start_time"], r["end_time"], r["duration_minutes"], r["event_date"], created_by, r["event_id"]
        ))
    else:
        # Insert
        print(f"Inserting new Rally {r['event_id']}...")
        cursor.execute("""
            INSERT INTO events (
                event_id, event_type, event_cause, priority, zone, corridor, requires_road_closure,
                impact_score, risk_band, confidence_score, status, latitude, longitude,
                ai_officers, ai_barricades, ai_tow_vehicles, ai_response_level, expected_attendance,
                start_time, end_time, duration_minutes, event_date, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            r["event_id"], r["event_type"], r["event_cause"], r["priority"], r["zone"], r["corridor"], r["requires_road_closure"],
            r["impact_score"], r["risk_band"], r["confidence_score"], r["status"], r["latitude"], r["longitude"],
            r["ai_officers"], r["ai_barricades"], r["ai_tow_vehicles"], r["ai_response_level"], r["expected_attendance"],
            r["start_time"], r["end_time"], r["duration_minutes"], r["event_date"], created_by, datetime.utcnow().isoformat()
        ))

conn.commit()
conn.close()
print("Rally events seeding complete.")
