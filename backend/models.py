from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    gender = Column(String)
    height_cm = Column(Float)
    goal = Column(String)
    activity_level = Column(String)
    equipment = Column(String)
    days_per_week = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    log_date = Column(Date, server_default=func.current_date())
    weight_kg = Column(Float)
    sleep_hours = Column(Float)
    soreness_rating = Column(Integer)   # 1-5 scale
    workout_completed = Column(Integer) # 0 or 1
    calories_logged = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    plan_date = Column(Date, server_default=func.current_date())
    plan_data = Column(JSON)   # stores the generated weekly_plan JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())