from fastapi import FastAPI
from pydantic import BaseModel
from enum import Enum

app = FastAPI(title="Fitness App API", version="0.1.0")

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

class UserStats(BaseModel):
    age: int
    gender: Gender
    weight_kg: float
    height_cm: float
    activity_level: ActivityLevel
    goal: Goal

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

@app.get("/")
def read_root():
    return {"message": "Fitness App backend is running"}

@app.post("/calculate-plan")
def calculate_plan(user: UserStats):
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

    return {
        "bmr": round(bmr, 1),
        "tdee": round(tdee, 1),
        "target_calories": round(target_calories, 1),
        "macros": {
            "protein_g": round(protein_g, 1),
            "fat_g": round(fat_g, 1),
            "carbs_g": round(carb_g, 1),
        }
    }
class Equipment(str, Enum):
    full_gym = "full_gym"
    dumbbells_only = "dumbbells_only"
    bodyweight_only = "bodyweight_only"

class WorkoutRequest(BaseModel):
    days_per_week: int
    equipment: Equipment
    goal: Goal

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

@app.post("/generate-workout-split")
def generate_workout_split(request: WorkoutRequest):
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

    return {
        "days_per_week": request.days_per_week,
        "equipment": request.equipment,
        "goal": request.goal,
        "weekly_plan": weekly_plan
    }