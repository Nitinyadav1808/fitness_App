from datetime import date, datetime, timedelta
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from enum import Enum
import joblib
import os
from google import genai
import pandas as pd

from database import engine, Base, get_db
import models

app = FastAPI(title="Fitness App API", version="0.1.0")

# Create tables on startup
Base.metadata.create_all(bind=engine)

# Load ML model + encoder once at startup
adjustment_model = joblib.load("adjustment_model.pkl")
goal_encoder = joblib.load("goal_encoder.pkl")

# Gemini client
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# ---------- Enums ----------

class Gender(str, Enum):
    male = "male"
    female = "female"

class ActivityLevel(str, Enum):
    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    active = "active"
    very_active = "very_active"

class Goal(str, Enum):
    cut = "cut"
    maintain = "maintain"
    bulk = "bulk"

class Equipment(str, Enum):
    full_gym = "full_gym"
    dumbbells_only = "dumbbells_only"
    bodyweight_only = "bodyweight_only"


# ---------- Request schemas ----------

class CreateUserRequest(BaseModel):
    name: str
    age: int
    gender: Gender
    height_cm: float
    goal: Goal
    activity_level: ActivityLevel
    equipment: Equipment
    days_per_week: int

class UserStats(BaseModel):
    user_id: int
    age: int
    gender: Gender
    weight_kg: float
    height_cm: float
    activity_level: ActivityLevel
    goal: Goal

class WorkoutRequest(BaseModel):
    user_id: int
    days_per_week: int
    equipment: Equipment
    goal: Goal

class DailyLogRequest(BaseModel):
    user_id: int
    weight_kg: float
    sleep_hours: float
    soreness_rating: int       # 1-5 scale
    workout_completed: bool
    calories_logged: float | None = None


# ---------- Constants ----------

ACTIVITY_MULTIPLIERS = {
    ActivityLevel.sedentary: 1.2,
    ActivityLevel.light: 1.375,
    ActivityLevel.moderate: 1.55,
    ActivityLevel.active: 1.725,
    ActivityLevel.very_active: 1.9,
}

GOAL_ADJUSTMENTS = {
    Goal.cut: -500,
    Goal.maintain: 0,
    Goal.bulk: 300,
}

EXERCISE_LIBRARY = {
    "full_gym": {
        "push": ["Bench Press", "Overhead Press", "Incline Dumbbell Press", "Tricep Pushdown", "Lateral Raises"],
        "pull": ["Deadlift", "Barbell Row", "Lat Pulldown", "Face Pull", "Bicep Curl"],
        "legs": ["Squat", "Leg Press", "Romanian Deadlift", "Leg Curl", "Calf Raise"],
        "upper": ["Bench Press", "Barbell Row", "Overhead Press", "Lat Pulldown", "Bicep Curl", "Tricep Pushdown"],
        "lower": ["Squat", "Deadlift", "Leg Press", "Leg Curl", "Calf Raise"],
        "full_body": ["Squat", "Bench Press", "Barbell Row", "Overhead Press", "Deadlift"],
    },
    "dumbbells_only": {
        "push": ["DB Bench Press", "DB Shoulder Press", "DB Incline Press", "Tricep Kickback", "Lateral Raises"],
        "pull": ["DB Row", "DB Deadlift", "DB Pullover", "Rear Delt Fly", "DB Bicep Curl"],
        "legs": ["Goblet Squat", "DB Romanian Deadlift", "DB Lunges", "DB Step Up", "Calf Raise"],
        "upper": ["DB Bench Press", "DB Row", "DB Shoulder Press", "DB Bicep Curl", "Tricep Kickback"],
        "lower": ["Goblet Squat", "DB Romanian Deadlift", "DB Lunges", "Calf Raise"],
        "full_body": ["Goblet Squat", "DB Bench Press", "DB Row", "DB Shoulder Press", "DB Deadlift"],
    },
    "bodyweight_only": {
        "push": ["Push Ups", "Pike Push Ups", "Dips", "Diamond Push Ups"],
        "pull": ["Pull Ups", "Inverted Rows", "Superman Hold"],
        "legs": ["Bodyweight Squat", "Lunges", "Glute Bridge", "Calf Raise"],
        "upper": ["Push Ups", "Pull Ups", "Dips", "Inverted Rows"],
        "lower": ["Bodyweight Squat", "Lunges", "Glute Bridge", "Calf Raise"],
        "full_body": ["Bodyweight Squat", "Push Ups", "Pull Ups", "Lunges"],
    },
}


# ---------- Helpers ----------

def get_split_structure(days_per_week: int) -> list[str]:
    if days_per_week <= 2:
        return ["full_body"] * days_per_week
    elif days_per_week == 3:
        return ["full_body", "full_body", "full_body"]
    elif days_per_week == 4:
        return ["upper", "lower", "upper", "lower"]
    else:  # 5 or 6 days
        base = ["push", "pull", "legs"]
        return (base * 2)[:days_per_week]


def compute_user_features(user_id: int, db: Session):
    """Shared feature computation used by both the ML model and Gemini endpoints."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None, None

    recent_logs = (
        db.query(models.DailyLog)
        .filter(models.DailyLog.user_id == user_id)
        .order_by(models.DailyLog.log_date.desc())
        .limit(7)
        .all()
    )

    if len(recent_logs) < 2:
        return user, None

    total_logs = len(recent_logs)
    workout_completed_logs = [l for l in recent_logs if l.workout_completed is not None]
    sleep_logs = [l.sleep_hours for l in recent_logs if l.sleep_hours is not None]
    soreness_logs = [l.soreness_rating for l in recent_logs if l.soreness_rating is not None]
    weights = [l.weight_kg for l in recent_logs if l.weight_kg is not None]

    features = {
        "adherence_pct": round((total_logs / 7) * 100, 1),
        "avg_sleep": round(sum(sleep_logs) / len(sleep_logs), 1) if sleep_logs else 7.0,
        "avg_soreness": round(sum(soreness_logs) / len(soreness_logs), 1) if soreness_logs else 2.5,
        "workout_completion_pct": round(
            (sum(l.workout_completed for l in workout_completed_logs) / len(workout_completed_logs)) * 100, 1
        ) if workout_completed_logs else 50.0,
        "weight_change_kg": round((weights[0] - weights[-1]), 2) if len(weights) >= 2 else 0.0,
        "days_logged": total_logs,
    }

    return user, features


# ---------- Routes ----------

@app.get("/")
def read_root():
    return {"message": "Fitness App backend is running"}


@app.post("/create-user")
def create_user(request: CreateUserRequest, db: Session = Depends(get_db)):
    new_user = models.User(
        name=request.name,
        age=request.age,
        gender=request.gender.value,
        height_cm=request.height_cm,
        goal=request.goal.value,
        activity_level=request.activity_level.value,
        equipment=request.equipment.value,
        days_per_week=request.days_per_week,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "user_id": new_user.id}


@app.post("/calculate-plan")
def calculate_plan(user: UserStats, db: Session = Depends(get_db)):
    if user.gender == Gender.male:
        bmr = (10 * user.weight_kg) + (6.25 * user.height_cm) - (5 * user.age) + 5
    else:
        bmr = (10 * user.weight_kg) + (6.25 * user.height_cm) - (5 * user.age) - 161

    tdee = bmr * ACTIVITY_MULTIPLIERS[user.activity_level]
    target_calories = tdee + GOAL_ADJUSTMENTS[user.goal]

    protein_g = user.weight_kg * 2
    protein_cal = protein_g * 4
    fat_cal = target_calories * 0.25
    fat_g = fat_cal / 9
    carb_cal = target_calories - protein_cal - fat_cal
    carb_g = carb_cal / 4

    result = {
        "bmr": round(bmr, 1),
        "tdee": round(tdee, 1),
        "target_calories": round(target_calories, 1),
        "macros": {
            "protein_g": round(protein_g, 1),
            "fat_g": round(fat_g, 1),
            "carbs_g": round(carb_g, 1),
        }
    }

    log_entry = models.DailyLog(
        user_id=user.user_id,
        weight_kg=user.weight_kg,
    )
    db.add(log_entry)
    db.commit()

    return result


@app.post("/generate-workout-split")
def generate_workout_split(request: WorkoutRequest, db: Session = Depends(get_db)):
    split_structure = get_split_structure(request.days_per_week)
    equipment_key = request.equipment.value
    weekly_plan = []

    for day_num, day_type in enumerate(split_structure, start=1):
        exercises = EXERCISE_LIBRARY[equipment_key][day_type]
        weekly_plan.append({
            "day": day_num,
            "focus": day_type.replace("_", " ").title(),
            "exercises": exercises
        })

    result = {
        "days_per_week": request.days_per_week,
        "equipment": request.equipment,
        "goal": request.goal,
        "weekly_plan": weekly_plan
    }

    plan_entry = models.WorkoutPlan(
        user_id=request.user_id,
        plan_data=result,
    )
    db.add(plan_entry)
    db.commit()

    return result


@app.post("/log-day")
def log_day(request: DailyLogRequest, db: Session = Depends(get_db)):
    log_entry = models.DailyLog(
        user_id=request.user_id,
        weight_kg=request.weight_kg,
        sleep_hours=request.sleep_hours,
        soreness_rating=request.soreness_rating,
        workout_completed=int(request.workout_completed),
        calories_logged=request.calories_logged,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return {"message": "Log saved", "log_id": log_entry.id}


@app.get("/logs/{user_id}")
def get_logs(user_id: int, db: Session = Depends(get_db)):
    logs = (
        db.query(models.DailyLog)
        .filter(models.DailyLog.user_id == user_id)
        .order_by(models.DailyLog.log_date.desc())
        .all()
    )
    return [
        {
            "id": log.id,
            "log_date": log.log_date,
            "weight_kg": log.weight_kg,
            "sleep_hours": log.sleep_hours,
            "soreness_rating": log.soreness_rating,
            "workout_completed": log.workout_completed,
            "calories_logged": log.calories_logged,
        }
        for log in logs
    ]


@app.get("/predict-adjustment/{user_id}")
def predict_adjustment(user_id: int, db: Session = Depends(get_db)):
    user, features = compute_user_features(user_id, db)

    if user is None:
        return {"error": "User not found"}
    if features is None:
        return {"error": "Not enough log history yet. Log at least a few days first."}

    goal_encoded = goal_encoder.transform([user.goal])[0]

    model_input = pd.DataFrame([{
        "goal_encoded": goal_encoded,
        "adherence_pct": features["adherence_pct"],
        "avg_sleep": features["avg_sleep"],
        "avg_soreness": features["avg_soreness"],
        "workout_completion_pct": features["workout_completion_pct"],
        "weight_change_kg": features["weight_change_kg"],
        "weeks_since_last_adjustment": 2,  # placeholder until adjustment history is tracked
    }])

    prediction = adjustment_model.predict(model_input)[0]
    probabilities = adjustment_model.predict_proba(model_input)[0]
    confidence = max(probabilities)

    return {
        "user_id": user_id,
        "recommendation": prediction,
        "confidence": round(float(confidence), 3),
        "based_on": features,
    }


@app.get("/predict-adjustment-llm/{user_id}")
def predict_adjustment_llm(user_id: int, db: Session = Depends(get_db)):
    user, features = compute_user_features(user_id, db)

    if user is None:
        return {"error": "User not found"}
    if features is None:
        return {"error": "Not enough log history yet. Log at least a few days first."}

    prompt = f"""You are a fitness coach AI. Based on this user's recent data, recommend ONE adjustment
from this exact list: stay_course, reduce_calories, increase_calories, deload_week, increase_intensity.

User goal: {user.goal}
Days logged (last 7): {features['days_logged']}
Adherence: {features['adherence_pct']}%
Average sleep: {features['avg_sleep']} hours
Average soreness (1-5 scale): {features['avg_soreness']}
Workout completion rate: {features['workout_completion_pct']}%
Weight change this week: {features['weight_change_kg']} kg

Respond in this exact JSON format, nothing else:
{{"recommendation": "<one_of_the_five_options>", "reasoning": "<one sentence explanation>"}}
"""

    response = gemini_client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
    )

    return {
        "user_id": user_id,
        "llm_response": response.text,
        "based_on": features,
    }