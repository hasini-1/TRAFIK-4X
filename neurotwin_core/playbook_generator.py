import json

class NeuroTwinPlaybookGenerator:
    def __init__(self):
        pass
        
    def generate_playbook_text(self, event_id: str, analysis_results: dict):
        explain = analysis_results.get("explainability", {})
        scenarios = analysis_results.get("scenarios", [])
        
        # Build text-based report
        lines = []
        lines.append("=" * 60)
        lines.append(f"TRAFIK - 4X NEUROTWIN - OPERATIONAL TRAFFIC PLAYBOOK")
        lines.append(f"INCIDENT REFERENCE ID: {event_id}")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"Recommended Strategy : {analysis_results.get('recommended_strategy')} ({analysis_results.get('recommended_strategy_label')})")
        lines.append(f"Twin Simulation Confidence : {analysis_results.get('confidence')}%")
        lines.append(f"Historical Matches Count  : {analysis_results.get('historical_matches')} successful cases")
        lines.append(f"Playbook Blueprint Key   : {analysis_results.get('playbook_id')}")
        lines.append("")
        lines.append("DECISION REASONING:")
        lines.append(f"- {explain.get('why_selected')}")
        lines.append("")
        lines.append("ESTIMATED IMPACT MITIGATION:")
        lines.append(f"* Congestion Spillover Reduction : {explain.get('congestion_reduction')}%")
        lines.append(f"* Recovery Time Speedup          : {explain.get('recovery_speedup')} minutes faster")
        lines.append(f"* Resource Optimization Saving   : {explain.get('resource_efficiency_gain')}% fewer resources")
        lines.append("")
        lines.append("CONTRIBUTING FACTORS:")
        for factor in explain.get("contributing_factors", []):
            lines.append(f"  - {factor}")
            
        lines.append("")
        lines.append("TACTICAL INSTRUCTIONS:")
        for idx, action in enumerate(explain.get("actions", []), 1):
            lines.append(f"  {idx}. {action}")
            
        lines.append("")
        lines.append("-" * 60)
        lines.append("SIMULATION COMPARISON (ALL SCENARIOS):")
        for s in scenarios:
            lines.append(f"* {s['name']} - {s['label']}:")
            lines.append(f"  - Congestion Reduct: {s['congestion_reduction_pct']}% | Recovery Speedup: {s['recovery_speedup_mins']}m")
            lines.append(f"  - Officers: {s['officers']} | Barricades: {s['barricades']} | Tows: {s['tows']}")
            
        lines.append("")
        lines.append("=" * 60)
        lines.append("TRAFIK - 4X DIGITAL TWIN COMMAND ROOM | CONFIDENTIAL")
        lines.append("=" * 60)
        
        return "\n".join(lines)
