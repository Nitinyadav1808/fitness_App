import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import joblib

df = pd.read_csv("training_data.csv")

goal_encoder = LabelEncoder()
df["goal_encoded"] = goal_encoder.fit_transform(df["goal"])

FEATURES = [
    "goal_encoded",
    "adherence_pct",
    "avg_sleep",
    "avg_soreness",
    "workout_completion_pct",
    "weight_change_kg",
    "weeks_since_last_adjustment",
]
TARGET = "label"

X = df[FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = DecisionTreeClassifier(max_depth=6, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}\n")
print("Classification Report:")
print(classification_report(y_test, y_pred))

importances = pd.Series(model.feature_importances_, index=FEATURES).sort_values(ascending=False)
print("Feature Importances:")
print(importances)

joblib.dump(model, "adjustment_model.pkl")
joblib.dump(goal_encoder, "goal_encoder.pkl")
print("\nModel saved -> adjustment_model.pkl")