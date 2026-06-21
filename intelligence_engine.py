import pandas as pd
import numpy as np
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics.pairwise import cosine_similarity

class WeightedEventDNAEngine:
    def __init__(self):
        self.feature_weights = {
            'priority': 3.0,
            'requires_road_closure': 2.5,
            'event_cause': 2.0,
            'event_type': 1.5,
            'zone': 1.0,
            'corridor': 1.0
        }
        self.feature_cols = ['event_type', 'event_cause', 'priority', 'zone', 'corridor', 'requires_road_closure']
        self.categorical_cols = ['event_type', 'event_cause', 'priority', 'zone', 'corridor']
        
        self.encoders = {}
        self.event_ids = None
        self.event_vectors = None
        self.event_causes = None
        self.event_zones = None
        self.event_impact_scores = None

    def fit(self, df):
        X = df[self.feature_cols].copy()
        for col in self.categorical_cols:
            X[col] = X[col].fillna('Missing').astype(str)
        X['requires_road_closure'] = X['requires_road_closure'].astype(str).str.upper().eq('TRUE').astype(float)
        
        weighted_vectors_list = []
        for col in self.categorical_cols:
            encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
            encoded = encoder.fit_transform(X[[col]])
            weighted_encoded = encoded * self.feature_weights[col]
            self.encoders[col] = encoder
            weighted_vectors_list.append(weighted_encoded)
            
        road_closure_val = X[['requires_road_closure']].values * self.feature_weights['requires_road_closure']
        weighted_vectors_list.append(road_closure_val)
        
        self.event_vectors = np.hstack(weighted_vectors_list)
        self.event_ids = df['id'].astype(str).values
        self.event_causes = df['event_cause'].fillna('Unknown').astype(str).values
        self.event_zones = df['zone'].fillna('Unknown').astype(str).values
        self.event_impact_scores = df['impact_score'].astype(float).values

    def query(self, new_event, top_n=5):
        if isinstance(new_event, dict):
            new_event_df = pd.DataFrame([new_event])
        else:
            new_event_df = new_event.copy()
            
        for col in self.categorical_cols:
            if col not in new_event_df.columns:
                new_event_df[col] = 'Missing'
            else:
                new_event_df[col] = new_event_df[col].fillna('Missing').astype(str)
                
        if 'requires_road_closure' not in new_event_df.columns:
            new_event_df['requires_road_closure'] = 0.0
        else:
            new_event_df['requires_road_closure'] = new_event_df['requires_road_closure'].astype(str).str.upper().eq('TRUE').astype(float)
            
        weighted_new_list = []
        for col in self.categorical_cols:
            encoder = self.encoders[col]
            encoded = encoder.transform(new_event_df[[col]])
            weighted_encoded = encoded * self.feature_weights[col]
            weighted_new_list.append(weighted_encoded)
            
        road_closure_val = new_event_df[['requires_road_closure']].values * self.feature_weights['requires_road_closure']
        weighted_new_list.append(road_closure_val)
        
        new_vector = np.hstack(weighted_new_list)
        similarities = cosine_similarity(new_vector, self.event_vectors)[0]
        top_indices = np.argsort(similarities)[::-1][:top_n]
        
        similar_events = []
        historical_scores = []
        similarity_scores = []
        for idx in top_indices:
            score = float(self.event_impact_scores[idx])
            sim_score = float(similarities[idx])
            historical_scores.append(score)
            similarity_scores.append(sim_score)
            similar_events.append({
                "event_id": self.event_ids[idx],
                "similarity_score": round(sim_score, 6),
                "historical_impact_score": round(score, 6),
                "event_cause": self.event_causes[idx],
                "zone": self.event_zones[idx]
            })
            
        avg_score = float(np.mean(historical_scores))
        max_score = float(np.max(historical_scores))
        confidence_score = float(np.mean(similarity_scores)) * 100.0
        
        if avg_score <= 25.0:
            risk_band = "Low"
        elif avg_score <= 50.0:
            risk_band = "Moderate"
        elif avg_score <= 75.0:
            risk_band = "High"
        else:
            risk_band = "Critical"
            
        return {
            "similar_events": similar_events,
            "average_historical_impact_score": round(avg_score, 6),
            "max_historical_impact_score": round(max_score, 6),
            "risk_band": risk_band,
            "confidence_score": round(confidence_score, 6)
        }

class ResourceIntelligenceEngine:
    def __init__(self):
        pass

    def allocate(self, impact_score):
        impact_score = float(impact_score)
        officers = int(max(2, round(impact_score * 0.25)))
        barricades = int(max(0, round(impact_score * 0.10)))
        tow_vehicles = int(max(1, round(impact_score * 0.03)))
        
        if impact_score <= 25.0:
            response_level = "Normal"
        elif impact_score <= 50.0:
            response_level = "Elevated"
        elif impact_score <= 75.0:
            response_level = "Critical"
        else:
            response_level = "Emergency"
            
        return {
            "officers": officers,
            "barricades": barricades,
            "tow_vehicles": tow_vehicles,
            "response_level": response_level
        }
