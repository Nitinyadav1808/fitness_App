import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Animated, Pressable, ActivityIndicator } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import * as Haptics from 'expo-haptics';

const API_URL = 'https://fitness-app-backend-z59o.onrender.com';

// ---------- Reusable animated button ----------

function AnimatedButton({ onPress, style, textStyle, children, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };
  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.6 }]}>
        {typeof children === 'string' ? <Text style={textStyle}>{children}</Text> : children}
      </Animated.View>
    </Pressable>
  );
}

// ---------- Reusable animated chip ----------

function AnimatedChip({ active, onPress, label }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };
  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress}>
      <Animated.View style={[styles.chip, active && styles.chipActive, { transform: [{ scale }] }]}>
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ---------- Fade-in wrapper for cards/lists ----------

function FadeInView({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ---------- Screen transition wrapper ----------

function ScreenTransition({ children, screenKey }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateX.setValue(20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [screenKey]);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
}

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
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.age || !form.height_cm) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Missing fields', 'Please fill in name, age, and height.');
      return;
    }
    setSubmitting(true);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete(data.user_id);
      } else {
        Alert.alert('Error', 'Could not create user.');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Could not connect to server. Check your API_URL.');
    }
    setSubmitting(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <FadeInView>
        <Text style={styles.title}>fitness_App</Text>
        <Text style={styles.subtitle}>Let's set up your profile</Text>
      </FadeInView>

      <FadeInView delay={50}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={v => setForm({...form, name: v})} placeholder="Your name" placeholderTextColor="#666" />
      </FadeInView>

      <FadeInView delay={100}>
        <Text style={styles.label}>Age</Text>
        <TextInput style={styles.input} value={form.age} onChangeText={v => setForm({...form, age: v})} placeholder="25" placeholderTextColor="#666" keyboardType="numeric" />
      </FadeInView>

      <FadeInView delay={150}>
        <Text style={styles.label}>Height (cm)</Text>
        <TextInput style={styles.input} value={form.height_cm} onChangeText={v => setForm({...form, height_cm: v})} placeholder="178" placeholderTextColor="#666" keyboardType="numeric" />
      </FadeInView>

      <FadeInView delay={200}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.row}>
          {['male', 'female'].map(g => (
            <AnimatedChip key={g} label={g} active={form.gender === g} onPress={() => setForm({...form, gender: g})} />
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={250}>
        <Text style={styles.label}>Goal</Text>
        <View style={styles.row}>
          {['cut', 'maintain', 'bulk'].map(g => (
            <AnimatedChip key={g} label={g} active={form.goal === g} onPress={() => setForm({...form, goal: g})} />
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={300}>
        <Text style={styles.label}>Activity Level</Text>
        <View style={styles.row}>
          {['sedentary', 'light', 'moderate', 'active', 'very_active'].map(a => (
            <AnimatedChip key={a} label={a} active={form.activity_level === a} onPress={() => setForm({...form, activity_level: a})} />
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={350}>
        <Text style={styles.label}>Equipment</Text>
        <View style={styles.row}>
          {['full_gym', 'dumbbells_only', 'bodyweight_only'].map(e => (
            <AnimatedChip key={e} label={e} active={form.equipment === e} onPress={() => setForm({...form, equipment: e})} />
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={400}>
        <Text style={styles.label}>Days per week</Text>
        <View style={styles.row}>
          {['2', '3', '4', '5', '6'].map(d => (
            <AnimatedChip key={d} label={d} active={form.days_per_week === d} onPress={() => setForm({...form, days_per_week: d})} />
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={450}>
        <AnimatedButton style={styles.button} textStyle={styles.buttonText} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : 'Get My Plan →'}
        </AnimatedButton>
      </FadeInView>
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Error', 'Could not fetch plan.');
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <FadeInView>
        <Text style={styles.title}>Your Plan</Text>
        <Text style={styles.subtitle}>User ID: {userId}</Text>
      </FadeInView>

      <FadeInView delay={50}>
        <AnimatedButton style={styles.button} textStyle={styles.buttonText} onPress={fetchPlan} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : "Generate Today's Workout"}
        </AnimatedButton>
      </FadeInView>

      {plan && plan.weekly_plan && plan.weekly_plan.map((day, i) => (
        <FadeInView key={day.day} delay={i * 100} style={styles.card}>
          <Text style={styles.cardTitle}>Day {day.day} — {day.focus}</Text>
          {day.exercises.map((ex, j) => (
            <Text key={j} style={styles.cardText}>• {ex}</Text>
          ))}
        </FadeInView>
      ))}

      <FadeInView delay={100}>
        <AnimatedButton style={[styles.button, styles.buttonSecondary]} textStyle={styles.buttonText} onPress={onLogDay}>
          Log Today →
        </AnimatedButton>
      </FadeInView>

      <FadeInView delay={150}>
        <AnimatedButton style={[styles.button, styles.buttonGreen]} textStyle={styles.buttonText} onPress={onViewAdjustment}>
          View AI Adjustment →
        </AnimatedButton>
      </FadeInView>
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
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Logged!', 'Your day has been saved.', [{ text: 'OK', onPress: onDone }]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save log.');
    }
    setSubmitting(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <FadeInView><Text style={styles.title}>Log Today</Text></FadeInView>

      <FadeInView delay={50}>
        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput style={styles.input} value={form.weight_kg} onChangeText={v => setForm({...form, weight_kg: v})} placeholder="74.5" placeholderTextColor="#666" keyboardType="numeric" />
      </FadeInView>

      <FadeInView delay={100}>
        <Text style={styles.label}>Sleep (hours)</Text>
        <TextInput style={styles.input} value={form.sleep_hours} onChangeText={v => setForm({...form, sleep_hours: v})} placeholder="7.5" placeholderTextColor="#666" keyboardType="numeric" />
      </FadeInView>

      <FadeInView delay={150}>
        <Text style={styles.label}>Soreness (1-5)</Text>
        <View style={styles.row}>
          {['1', '2', '3', '4', '5'].map(s => (
            <AnimatedChip key={s} label={s} active={form.soreness_rating === s} onPress={() => setForm({...form, soreness_rating: s})} />
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={200}>
        <Text style={styles.label}>Workout Completed?</Text>
        <View style={styles.row}>
          {[true, false].map(v => (
            <AnimatedChip key={String(v)} label={v ? 'Yes' : 'No'} active={form.workout_completed === v} onPress={() => setForm({...form, workout_completed: v})} />
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={250}>
        <Text style={styles.label}>Calories logged (optional)</Text>
        <TextInput style={styles.input} value={form.calories_logged} onChangeText={v => setForm({...form, calories_logged: v})} placeholder="2100" placeholderTextColor="#666" keyboardType="numeric" />
      </FadeInView>

      <FadeInView delay={300}>
        <AnimatedButton style={styles.button} textStyle={styles.buttonText} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : 'Save Log →'}
        </AnimatedButton>
      </FadeInView>

      <FadeInView delay={350}>
        <AnimatedButton style={[styles.button, styles.buttonSecondary]} textStyle={styles.buttonText} onPress={onDone}>
          ← Back
        </AnimatedButton>
      </FadeInView>
    </ScrollView>
  );
}


function AdjustmentScreen({ userId, onBack }) {
  const [mlResult, setMlResult] = useState(null);
  const [llmResult, setLlmResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAdjustments = async () => {
    setLoading(true);
    setMlResult(null);
    setLlmResult(null);
    try {
      const [mlRes, llmRes] = await Promise.all([
        fetch(`${API_URL}/predict-adjustment/${userId}`),
        fetch(`${API_URL}/predict-adjustment-llm/${userId}`),
      ]);
      const ml = await mlRes.json();
      const llm = await llmRes.json();
      setMlResult(ml);
      setLlmResult(llm);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      <FadeInView>
        <Text style={styles.title}>AI Adjustment</Text>
        <Text style={styles.subtitle}>ML model vs Gemini comparison</Text>
      </FadeInView>

      <FadeInView delay={50}>
        <AnimatedButton style={styles.button} textStyle={styles.buttonText} onPress={fetchAdjustments} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : 'Get Recommendations'}
        </AnimatedButton>
      </FadeInView>

      {loading && (
        <FadeInView style={styles.card}>
          <ActivityIndicator color="#4f46e5" size="small" />
          <Text style={[styles.cardText, { marginTop: 8, textAlign: 'center' }]}>Analysing your data...</Text>
        </FadeInView>
      )}

      {mlResult && (
        <FadeInView delay={100} style={styles.card}>
          <Text style={styles.cardTitle}>ML Model</Text>
          {mlResult.error ? (
            <Text style={styles.cardText}>{mlResult.error}</Text>
          ) : (
            <>
              <Text style={styles.cardText}>Recommendation: {mlResult.recommendation}</Text>
              <Text style={styles.cardText}>Confidence: {(mlResult.confidence * 100).toFixed(1)}%</Text>
            </>
          )}
        </FadeInView>
      )}

      {llmResult && (
        <FadeInView delay={250} style={[styles.card, styles.cardGreen]}>
          <Text style={styles.cardTitle}>Gemini LLM</Text>
          {llmResult.error ? (
            <Text style={styles.cardText}>{llmResult.error}</Text>
          ) : (
            <>
              <Text style={styles.cardText}>Recommendation: {parseLLM(llmResult.llm_response).recommendation}</Text>
              <Text style={styles.cardText}>Reasoning: {parseLLM(llmResult.llm_response).reasoning}</Text>
            </>
          )}
        </FadeInView>
      )}

      <FadeInView delay={350}>
        <AnimatedButton style={[styles.button, styles.buttonSecondary]} textStyle={styles.buttonText} onPress={onBack}>
          ← Back
        </AnimatedButton>
      </FadeInView>
    </ScrollView>
  );
}


// ---------- Main App ----------

export default function App() {
  const [screen, setScreen] = useState('onboarding');
  const [userId, setUserId] = useState(null);

  const renderScreen = () => {
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
  };

  return (
    <ScreenTransition screenKey={screen}>
      {renderScreen()}
    </ScreenTransition>
  );
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
    minHeight: 52,
    justifyContent: 'center',
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