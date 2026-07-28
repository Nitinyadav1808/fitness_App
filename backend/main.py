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