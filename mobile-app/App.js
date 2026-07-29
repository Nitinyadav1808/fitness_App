import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';

const API_URL = 'https://fitness-app-backend-z59o.onrender.com';

// ---------- Screens ----------

function OnboardingScreen({ onComplete }) {
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'male',
    height_cm: '',
    goal: 'cut',
    activity_level: 'moderate',
    equipment: 'dumbbells_only',
    days_per_week: '4',
  });

  const handleSubmit = async () => {
    if (!form.name || !form.age || !form.height_cm) {
      Alert.alert('Missing fields', 'Please fill in name, age, and height.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          age: parseInt(form.age),
          height_cm: parseFloat(form.height_cm),
          days_per_week: parseInt(form.days_per_week),
        }),
      });
      const data = await res.json();
      if (data.user_id) {
        onComplete(data.user_id);
      } else {
        Alert.alert('Error', 'Could not create user.');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Could not connect to server. Check your API_URL.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>fitness_App</Text>
      <Text style={styles.subtitle}>Let's set up your profile</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={form.name} onChangeText={v => setForm({...form, name: v})} placeholder="Your name" />

      <Text style={styles.label}>Age</Text>
      <TextInput style={styles.input} value={form.age} onChangeText={v => setForm({...form, age: v})} placeholder="25" keyboardType="numeric" />

      <Text style={styles.label}>Height (cm)</Text>
      <TextInput style={styles.input} value={form.height_cm} onChangeText={v => setForm({...form, height_cm: v})} placeholder="178" keyboardType="numeric" />

      <Text style={styles.label}>Gender</Text>
      <View style={styles.row}>
        {['male', 'female'].map(g => (
          <TouchableOpacity key={g} style={[styles.chip, form.gender === g && styles.chipActive]} onPress={() => setForm({...form, gender: g})}>
            <Text style={[styles.chipText, form.gender === g && styles.chipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Goal</Text>
      <View style={styles.row}>
        {['cut', 'maintain', 'bulk'].map(g => (
          <TouchableOpacity key={g} style={[styles.chip, form.goal === g && styles.chipActive]} onPress={() => setForm({...form, goal: g})}>
            <Text style={[styles.chipText, form.goal === g && styles.chipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Activity Level</Text>
      <View style={styles.row}>
        {['sedentary', 'light', 'moderate', 'active', 'very_active'].map(a => (
          <TouchableOpacity key={a} style={[styles.chip, form.activity_level === a && styles.chipActive]} onPress={() => setForm({...form, activity_level: a})}>
            <Text style={[styles.chipText, form.activity_level === a && styles.chipTextActive]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Equipment</Text>
      <View style={styles.row}>
        {['full_gym', 'dumbbells_only', 'bodyweight_only'].map(e => (
          <TouchableOpacity key={e} style={[styles.chip, form.equipment === e && styles.chipActive]} onPress={() => setForm({...form, equipment: e})}>
            <Text style={[styles.chipText, form.equipment === e && styles.chipTextActive]}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Days per week</Text>
      <View style={styles.row}>
        {['2', '3', '4', '5', '6'].map(d => (
          <TouchableOpacity key={d} style={[styles.chip, form.days_per_week === d && styles.chipActive]} onPress={() => setForm({...form, days_per_week: d})}>
            <Text style={[styles.chipText, form.days_per_week === d && styles.chipTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Get My Plan →</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </ScrollView>
  );
}


function DashboardScreen({ userId, onLogDay, onViewAdjustment }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate-workout-split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, days_per_week: 4, equipment: 'dumbbells_only', goal: 'cut' }),
      });
      const data = await res.json();
      setPlan(data);
    } catch (e) {
      Alert.alert('Error', 'Could not fetch plan.');
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Your Plan</Text>
      <Text style={styles.subtitle}>User ID: {userId}</Text>

      <TouchableOpacity style={styles.button} onPress={fetchPlan}>
        <Text style={styles.buttonText}>{loading ? 'Loading...' : "Generate Today's Workout"}</Text>
      </TouchableOpacity>

      {plan && plan.weekly_plan && plan.weekly_plan.map((day) => (
        <View key={day.day} style={styles.card}>
          <Text style={styles.cardTitle}>Day {day.day} — {day.focus}</Text>
          {day.exercises.map((ex, i) => (
            <Text key={i} style={styles.cardText}>• {ex}</Text>
          ))}
        </View>
      ))}

      <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onLogDay}>
        <Text style={styles.buttonText}>Log Today →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.buttonGreen]} onPress={onViewAdjustment}>
        <Text style={styles.buttonText}>View AI Adjustment →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


function LogDayScreen({ userId, onDone }) {
  const [form, setForm] = useState({
    weight_kg: '',
    sleep_hours: '',
    soreness_rating: '2',
    workout_completed: true,
    calories_logged: '',
  });

  const handleSubmit = async () => {
    try {
      const res = await fetch(`${API_URL}/log-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          weight_kg: parseFloat(form.weight_kg),
          sleep_hours: parseFloat(form.sleep_hours),
          soreness_rating: parseInt(form.soreness_rating),
          workout_completed: form.workout_completed,
          calories_logged: form.calories_logged ? parseFloat(form.calories_logged) : null,
        }),
      });
      const data = await res.json();
      if (data.log_id) {
        Alert.alert('Logged!', 'Your day has been saved.', [{ text: 'OK', onPress: onDone }]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save log.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Log Today</Text>

      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput style={styles.input} value={form.weight_kg} onChangeText={v => setForm({...form, weight_kg: v})} placeholder="74.5" keyboardType="numeric" />

      <Text style={styles.label}>Sleep (hours)</Text>
      <TextInput style={styles.input} value={form.sleep_hours} onChangeText={v => setForm({...form, sleep_hours: v})} placeholder="7.5" keyboardType="numeric" />

      <Text style={styles.label}>Soreness (1-5)</Text>
      <View style={styles.row}>
        {['1', '2', '3', '4', '5'].map(s => (
          <TouchableOpacity key={s} style={[styles.chip, form.soreness_rating === s && styles.chipActive]} onPress={() => setForm({...form, soreness_rating: s})}>
            <Text style={[styles.chipText, form.soreness_rating === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Workout Completed?</Text>
      <View style={styles.row}>
        {[true, false].map(v => (
          <TouchableOpacity key={String(v)} style={[styles.chip, form.workout_completed === v && styles.chipActive]} onPress={() => setForm({...form, workout_completed: v})}>
            <Text style={[styles.chipText, form.workout_completed === v && styles.chipTextActive]}>{v ? 'Yes' : 'No'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Calories logged (optional)</Text>
      <TextInput style={styles.input} value={form.calories_logged} onChangeText={v => setForm({...form, calories_logged: v})} placeholder="2100" keyboardType="numeric" />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Save Log →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onDone}>
        <Text style={styles.buttonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


function AdjustmentScreen({ userId, onBack }) {
  const [mlResult, setMlResult] = useState(null);
  const [llmResult, setLlmResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const [mlRes, llmRes] = await Promise.all([
        fetch(`${API_URL}/predict-adjustment/${userId}`),
        fetch(`${API_URL}/predict-adjustment-llm/${userId}`),
      ]);
      const ml = await mlRes.json();
      const llm = await llmRes.json();
      setMlResult(ml);
      setLlmResult(llm);
    } catch (e) {
      Alert.alert('Error', 'Could not fetch adjustments.');
    }
    setLoading(false);
  };

  const parseLLM = (raw) => {
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { recommendation: raw, reasoning: '' };
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>AI Adjustment</Text>
      <Text style={styles.subtitle}>ML model vs Gemini comparison</Text>

      <TouchableOpacity style={styles.button} onPress={fetchAdjustments}>
        <Text style={styles.buttonText}>{loading ? 'Analysing...' : 'Get Recommendations'}</Text>
      </TouchableOpacity>

      {mlResult && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ML Model</Text>
          {mlResult.error ? (
            <Text style={styles.cardText}>{mlResult.error}</Text>
          ) : (
            <>
              <Text style={styles.cardText}>Recommendation: {mlResult.recommendation}</Text>
              <Text style={styles.cardText}>Confidence: {(mlResult.confidence * 100).toFixed(1)}%</Text>
            </>
          )}
        </View>
      )}

      {llmResult && (
        <View style={[styles.card, styles.cardGreen]}>
          <Text style={styles.cardTitle}>Gemini LLM</Text>
          {llmResult.error ? (
            <Text style={styles.cardText}>{llmResult.error}</Text>
          ) : (
            <>
              <Text style={styles.cardText}>Recommendation: {parseLLM(llmResult.llm_response).recommendation}</Text>
              <Text style={styles.cardText}>Reasoning: {parseLLM(llmResult.llm_response).reasoning}</Text>
            </>
          )}
        </View>
      )}

      <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onBack}>
        <Text style={styles.buttonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


// ---------- Main App ----------

export default function App() {
  const [screen, setScreen] = useState('onboarding');
  const [userId, setUserId] = useState(null);

  if (screen === 'onboarding') {
    return <OnboardingScreen onComplete={(id) => { setUserId(id); setScreen('dashboard'); }} />;
  }
  if (screen === 'dashboard') {
    return <DashboardScreen userId={userId} onLogDay={() => setScreen('log')} onViewAdjustment={() => setScreen('adjustment')} />;
  }
  if (screen === 'log') {
    return <LogDayScreen userId={userId} onDone={() => setScreen('dashboard')} />;
  }
  if (screen === 'adjustment') {
    return <AdjustmentScreen userId={userId} onBack={() => setScreen('dashboard')} />;
  }
}


// ---------- Styles ----------

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#0f0f0f',
    minHeight: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  chipText: {
    color: '#888',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonSecondary: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonGreen: {
    backgroundColor: '#16a34a',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardGreen: {
    borderColor: '#16a34a',
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  cardText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 4,
  },
});