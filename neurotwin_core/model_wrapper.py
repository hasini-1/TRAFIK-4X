import numpy as np
import pandas as pd
from datetime import datetime

class AdvancedModelWrapper:
    def __init__(self, model, feature_names, label_encoders):
        self.model = model
        self.feature_names = feature_names
        self.label_encoders = label_encoders

    def predict(self, X):
        # 1. Handle if X is not a DataFrame
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        X_clean = X.copy()
        
        # 2. Add defaults for missing latitude/longitude
        if 'latitude' not in X_clean.columns:
            X_clean['latitude'] = 12.9716
        if 'longitude' not in X_clean.columns:
            X_clean['longitude'] = 77.5946
            
        # 3. Add temporal features
        now = datetime.now()
        hours, weekdays, weekends, months, days = [], [], [], [], []
        
        for idx in range(len(X_clean)):
            dt = now
            if 'start_datetime' in X_clean.columns and pd.notna(X_clean.iloc[idx]['start_datetime']):
                try:
                    dt_str = str(X_clean.iloc[idx]['start_datetime'])
                    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
                        try:
                            dt = datetime.strptime(dt_str.split('.')[0], fmt)
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass
            hours.append(dt.hour)
            weekdays.append(dt.weekday())
            weekends.append(1.0 if dt.weekday() >= 5 else 0.0)
            months.append(dt.month)
            days.append(dt.day)

        X_clean['hour'] = hours
        X_clean['day_of_week'] = weekdays
        X_clean['is_weekend'] = weekends
        X_clean['month'] = months
        X_clean['day_of_month'] = days
        
        # 4. Add spatial features
        X_clean['dist_from_center'] = np.sqrt((X_clean['latitude'].astype(float) - 12.9716)**2 + (X_clean['longitude'].astype(float) - 77.5946)**2)
        
        # 5. Add similarity features
        X_clean['similarity_score'] = 0.85
        X_clean['historical_match_count'] = 15
        
        # 6. Encode categorical columns
        categorical_cols = ['event_type', 'event_cause', 'priority', 'zone', 'corridor']
        for col in categorical_cols:
            if col in X_clean.columns:
                if not np.issubdtype(X_clean[col].dtype, np.number):
                    le = self.label_encoders.get(col)
                    if le:
                        vals = X_clean[col].astype(str).values
                        encoded_vals = []
                        for val in vals:
                            if val in le.classes_:
                                encoded_vals.append(le.transform([val])[0])
                            else:
                                encoded_vals.append(le.transform([le.classes_[0]])[0])
                        X_clean[col] = encoded_vals
                    else:
                        X_clean[col] = 0
            else:
                X_clean[col] = 0

        # 7. Re-order features to match training feature_names
        for col in self.feature_names:
            if col not in X_clean.columns:
                X_clean[col] = 0.0
                
        X_final = X_clean[self.feature_names]
        return self.model.predict(X_final)
