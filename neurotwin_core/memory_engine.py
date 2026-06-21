import os

class NeuroTwinMemoryEngine:
    def __init__(self):
        # Preset playbooks for common city-scale recurring events
        self.preset_playbooks = {
            "marathon": {
                "playbook_name": "PB-CITY-MARATHON",
                "strategy": "Scenario B",
                "recommended_actions": [
                    "Implement pre-planned 3km outer cordon diversion routing.",
                    "Close central marathon path, setup physical barricades at intersections.",
                    "Deploy personnel (15+ officers) at crossing nodes.",
                    "Co-ordinate with ambulance hubs for standby medical units."
                ],
                "expected_reduction": 0.45,  # 45% reduction
                "expected_recovery": 35      # 35 minutes faster recovery
            },
            "procession": {
                "playbook_name": "PB-LOCAL-PROCESSION",
                "strategy": "Scenario C",
                "recommended_actions": [
                    "Deploy rolling escort officers (5 officers) to guide procession.",
                    "Initiate dynamic 1.5km radial detours at peak times.",
                    "Clear tow-away zones along the movement corridor.",
                    "Keep nearest cross-streets free of parking."
                ],
                "expected_reduction": 0.35,
                "expected_recovery": 20
            },
            "vip_movement": {
                "playbook_name": "PB-VIP-SECURE",
                "strategy": "Scenario D",
                "recommended_actions": [
                    "Enforce zero-stopping policy on VIP route.",
                    "Establish temporary road closures at high-priority intersections (3-5 mins max).",
                    "Deploy 10+ officers for manual signals overriding.",
                    "Active tow vehicle sweeping 30 mins prior."
                ],
                "expected_reduction": 0.40,
                "expected_recovery": 15
            },
            "protest": {
                "playbook_name": "PB-CIVIL-PROTEST",
                "strategy": "Scenario D",
                "recommended_actions": [
                    "Deploy heavy physical barricading at entry gates.",
                    "Divert heavy vehicles 2km away from assembly zone.",
                    "Deploy emergency response units on perimeter.",
                    "Monitor crowding via CCTV feeds and adjust signal timings."
                ],
                "expected_reduction": 0.30,
                "expected_recovery": 25
            },
            "waterlogging": {
                "playbook_name": "PB-MONSOON-FLOOD",
                "strategy": "Scenario C",
                "recommended_actions": [
                    "Broadcast immediate detour alert via digital signs.",
                    "Deploy tow vehicles to clear stalled vehicles from waterlogged spots.",
                    "Open drain blocks manually using local civic teams.",
                    "Reduce signal green times on affected approaches."
                ],
                "expected_reduction": 0.25,
                "expected_recovery": 40
            }
        }
        
    def lookup(self, event_cause: str, event_type: str = ""):
        cause_clean = str(event_cause).strip().lower()
        
        # Check direct or substring matches
        for key, playbook in self.preset_playbooks.items():
            if key in cause_clean:
                return playbook
                
        # Default playbook for other events
        return {
            "playbook_name": "PB-DEFAULT-INCIDENT",
            "strategy": "Scenario C",
            "recommended_actions": [
                "Deploy standard zone-level traffic inspectors.",
                "Monitor spillover congestion queues at adjacent junctions.",
                "Verify resource requirements and adjust if needed."
            ],
            "expected_reduction": 0.20,
            "expected_recovery": 12
        }
