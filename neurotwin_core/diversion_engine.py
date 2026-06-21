import numpy as np

class NeuroTwinDiversionEngine:
    def __init__(self):
        pass
        
    def calculate_boundaries(self, lat: float, lng: float, response_level: str):
        level = str(response_level).strip().lower()
        
        # 3km Critical/Emergency, 2km High/Elevated, 1km Moderate/Normal
        if level in ["emergency", "critical"]:
            radius_km = 3.0
            color = "rgba(239, 68, 68, 0.45)"  # Neon Red
        elif level in ["elevated", "high"]:
            radius_km = 2.0
            color = "rgba(249, 115, 22, 0.45)" # Neon Orange
        else:
            radius_km = 1.0
            color = "rgba(234, 179, 8, 0.45)"  # Neon Yellow
            
        # Synthesize 4 detour nodes surrounding the event coordinates
        # 0.009 degrees of lat/lng is approx 1km
        offset = 0.009 * radius_km
        
        detour_nodes = [
            {"name": "North checkpoint", "lat": lat + offset * 0.7, "lng": lng, "action": "Divert light vehicles East"},
            {"name": "South checkpoint", "lat": lat - offset * 0.7, "lng": lng, "action": "Divert heavy vehicles West"},
            {"name": "East checkpoint", "lat": lat, "lng": lng + offset * 0.7, "action": "Establish manual override signaling"},
            {"name": "West checkpoint", "lat": lat, "lng": lng - offset * 0.7, "action": "Set physical barricades"}
        ]
        
        return {
            "radius_km": radius_km,
            "exclusion_radius_color": color,
            "detour_checkpoints": detour_nodes
        }
