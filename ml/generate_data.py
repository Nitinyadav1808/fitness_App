import random
import csv

random.seed(42)

def generate_sample():
    """
    Simulates 7 days of user behavior and applies rule-based logic
    to label what adjustment should happen next.
    """
    goal = random.choice(["cut", "maintain", "bulk"])

    adherence_pct = round(random.uniform(40, 100), 1)          # % of days logged/followed plan
    avg_sleep = round(random.uniform(4.5, 9.5), 1)               # hours
    avg_soreness = round(random.uniform(1, 5), 1)                # 1-5 scale
    workout_completion_pct = round(random.uniform(30, 100), 1)   # % of workouts done
    weight_change_kg = round(random.uniform(-1.5, 1.5), 2)       # over the week
    weeks_since_last_adjustment = random.randint(1, 6)

    # ---- Rule-based labeling logic (our "ground truth") ----
    label = "stay_course"

    if avg_sleep < 5.5 or avg_soreness >= 4.2:
        label = "deload_week"
    elif workout_completion_pct > 70 and adherence_pct > 70 and weeks_since_last_adjustment >= 1 and avg_soreness <= 3.0:
        label = "increase_intensity"
    elif goal == "cut":
        if weight_change_kg > -0.1 and weeks_since_last_adjustment >= 2 and adherence_pct > 75:
            label = "reduce_calories"
        elif weight_change_kg < -1.2:
            label = "increase_calories"  # losing too fast
    elif goal == "bulk":
        if weight_change_kg < 0.1 and weeks_since_last_adjustment >= 2 and adherence_pct > 75:
            label = "increase_calories"
        elif weight_change_kg > 1.0:
            label = "reduce_calories"  # gaining too fast (excess fat)
    else:  # maintain
        if abs(weight_change_kg) > 0.8:
            label = "reduce_calories" if weight_change_kg > 0 else "increase_calories"

    return {
        "goal": goal,
        "adherence_pct": adherence_pct,
        "avg_sleep": avg_sleep,
        "avg_soreness": avg_soreness,
        "workout_completion_pct": workout_completion_pct,
        "weight_change_kg": weight_change_kg,
        "weeks_since_last_adjustment": weeks_since_last_adjustment,
        "label": label,
    }


def generate_dataset(n=3000, filename="training_data.csv"):
    rows = [generate_sample() for _ in range(n)]
    fieldnames = list(rows[0].keys())

    with open(filename, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {n} rows -> {filename}")

    # quick label distribution check
    from collections import Counter
    label_counts = Counter(row["label"] for row in rows)
    print("Label distribution:", dict(label_counts))


if __name__ == "__main__":
    generate_dataset(3000)