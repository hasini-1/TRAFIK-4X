import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder

class NeuroTwinDataPipeline:
    def __init__(self, filepath="astram_with_impact_score.csv"):
        self.filepath = filepath
        self.df = None
        self.cat_mappers = {}
        self.feature_cols = [
            'event_type', 'event_cause', 'priority', 'zone', 'corridor', 
            'requires_road_closure', 'latitude', 'longitude'
        ]
        
    def load_and_profile(self):
        if not os.path.exists(self.filepath):
            raise FileNotFoundError(f"Dataset not found at {self.filepath}")
        
        self.df = pd.read_csv(self.filepath)
        
        # Profile report logs
        report = {
            "rows": len(self.df),
            "columns": list(self.df.columns),
            "nulls": self.df.isnull().sum().to_dict(),
            "types": {col: str(self.df[col].dtype) for col in self.df.columns}
        }
        return report
        
    def synthesize_targets(self):
        if self.df is None:
            self.load_and_profile()
            
        # 1. Congestion Score (0 to 100)
        # Synthesize based on impact_score and priority density weight
        if 'impact_score' in self.df.columns:
            base_score = self.df['impact_score']
        else:
            base_score = pd.Series(np.random.uniform(5, 80, size=len(self.df)))
            
        priority_add = self.df['priority'].apply(lambda x: 15.0 if str(x).strip().lower() == 'high' else (5.0 if str(x).strip().lower() == 'medium' else 0.0))
        closure_add = self.df['requires_road_closure'].apply(lambda x: 20.0 if str(x).strip().lower() == 'true' or x is True else 0.0)
        
        self.df['congestion_score'] = (base_score * 0.6 + priority_add + closure_add).clip(0.0, 100.0)
        
        # 2. Recovery Time (in minutes)
        # Synthesize from duration_hours or fallback
        if 'duration_hours' in self.df.columns:
            self.df['recovery_time_minutes'] = (self.df['duration_hours'] * 60.0).clip(10, 1440)
        else:
            self.df['recovery_time_minutes'] = (self.df['congestion_score'] * 6.0 + np.random.uniform(10, 120, size=len(self.df))).clip(15, 720)
            
        # 3. Resources Allocation
        # officers, barricades, tow_trucks, inspectors, emergency_units
        self.df['officers'] = self.df['congestion_score'].apply(lambda x: int(max(2, round(x * 0.25))))
        self.df['barricades'] = self.df['congestion_score'].apply(lambda x: int(max(0, round(x * 0.12))))
        self.df['tow_trucks'] = self.df['congestion_score'].apply(lambda x: int(max(1, round(x * 0.03))))
        self.df['inspectors'] = self.df['officers'].apply(lambda x: int(max(1, round(x / 5))))
        
        self.df['emergency_units'] = 0
        high_mask = self.df['priority'].astype(str).str.lower() == 'high'
        critical_mask = self.df['congestion_score'] > 65
        self.df.loc[high_mask | critical_mask, 'emergency_units'] = 1
        
        return self.df
        
    def prepare_features(self):
        if self.df is None:
            self.load_and_profile()
        if 'congestion_score' not in self.df.columns:
            self.synthesize_targets()
            
        # Handle Missing/Null in Feature Cols
        X = self.df[self.feature_cols].copy()
        
        X['event_type'] = X['event_type'].fillna('unplanned').astype(str)
        X['event_cause'] = X['event_cause'].fillna('congestion').astype(str)
        X['priority'] = X['priority'].fillna('Medium').astype(str)
        X['zone'] = X['zone'].fillna('Missing').astype(str)
        X['corridor'] = X['corridor'].fillna('Missing').astype(str)
        
        # Coordinates mapping
        X['latitude'] = X['latitude'].fillna(12.9716).astype(float)
        X['longitude'] = X['longitude'].fillna(77.5946).astype(float)
        
        # Road closures
        X['requires_road_closure'] = X['requires_road_closure'].astype(str).str.upper().eq('TRUE').astype(float)
        
        # Label Encoding Categorical columns for model compatibility
        categorical = ['event_type', 'event_cause', 'priority', 'zone', 'corridor']
        for col in categorical:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col])
            self.cat_mappers[col] = le
            
        # Target variables
        y_congestion = self.df['congestion_score'].astype(float).values
        y_recovery = self.df['recovery_time_minutes'].astype(float).values
        
        y_resources = self.df[['officers', 'barricades', 'tow_trucks', 'inspectors', 'emergency_units']].astype(float).values
        
        return X, y_congestion, y_recovery, y_resources
        
    def get_categorical_mappers(self):
        return self.cat_mappers
