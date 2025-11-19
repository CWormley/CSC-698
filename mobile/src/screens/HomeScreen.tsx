import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { SERVICE_URL } from "@env";

type HomeScreenProps = StackScreenProps<RootStackParamList, "Home">;

const { width } = Dimensions.get("window");

interface Goal {
  id: string;
  text: string;
  completed: boolean;
  priority: string;
  category: string;
}

interface CalendarEvent {
  id: string;
  text: string;
  type: string;
  createdAt: string;
  date?: string;
  title?: string;
  description?: string;
  time?: string;
}

interface DayEvents {
  [key: number]: CalendarEvent[];
}

const milesData = [
  { day: 1, miles: 5.2 },
  { day: 2, miles: 3.1 },
  { day: 3, miles: 6.5 },
  { day: 4, miles: 4.3 },
  { day: 5, miles: 7.2 },
  { day: 6, miles: 2.8 },
  { day: 7, miles: 5.9 },
  { day: 8, miles: 6.1 },
  { day: 9, miles: 4.5 },
  { day: 10, miles: 7.8 },
  { day: 11, miles: 3.2 },
  { day: 12, miles: 5.5 },
  { day: 13, miles: 6.8 },
  { day: 14, miles: 4.1 },
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  const userInitial = user?.name?.charAt(0).toUpperCase() || "U";
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<DayEvents>({});
  
  // Get actual current date information
  const now = new Date();
  const todayDate = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[currentMonth];
  
  // Calculate number of days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const [selectedDay, setSelectedDay] = useState(todayDate); // Default to today

  useEffect(() => {
    fetchGoals();
    fetchEvents();
  }, [user?.id]);

  const fetchGoals = async () => {
    if (!user?.id) {
      console.log("No user ID available");
      return;
    }
    
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("@user_token");
      const url = `${SERVICE_URL}/api/goals`;
      console.log("Fetching goals from:", url);
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      console.log("Goals response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Goals response data:", data);
        
        if (data.success && data.data) {
          // Sort goals: incomplete first, then by priority
          const sortedGoals = data.data.sort((a: Goal, b: Goal) => {
            // Prioritize incomplete goals
            if (a.completed !== b.completed) {
              return a.completed ? 1 : -1;
            }
            // Then by priority (high > medium > low)
            const priorityOrder: { [key: string]: number } = {
              high: 0,
              medium: 1,
              low: 2,
            };
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
          });
          // Only show first 5 goals
          console.log("Sorted goals:", sortedGoals);
          setGoals(sortedGoals.slice(0, 5));
        } else {
          console.log("No success or data in response");
          setGoals([]);
        }
      } else {
        const errorData = await response.text();
        console.error("Goals fetch failed:", response.status, errorData);
        setGoals([]);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!user?.id) {
      console.log("No user ID available");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("@user_token");
      
      if (!token) {
        console.warn("No authentication token found");
        return;
      }
      
      const url = `${SERVICE_URL}/api/calendar`;
      console.log("Fetching events from:", url);
      console.log("Token available:", !!token);

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      console.log("Events response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Events response data:", data);

        if (data.success && data.data) {
          // Organize events by day
          const eventsByDay: DayEvents = {};
          data.data.forEach((event: CalendarEvent) => {
            // Extract day from the event's date field (format: "2025-11-20T00:00:00.000Z")
            let day: number;
            
            if (event.date) {
              // Parse the date string directly to get the day
              const dateString = event.date.split('T')[0]; // "2025-11-20"
              day = parseInt(dateString.split('-')[2], 10); // Extract "20"
            } else {
              // Fallback to createdAt
              const eventDate = new Date(event.createdAt);
              day = eventDate.getDate();
            }
            
            if (!eventsByDay[day]) {
              eventsByDay[day] = [];
            }
            eventsByDay[day].push(event);
          });

          setEvents(eventsByDay);
          console.log("Events by day:", eventsByDay);
        }
      } else {
        const errorData = await response.text();
        console.error("Events fetch failed:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const toggleGoalCompletion = async (goalId: string, currentStatus: boolean) => {
    try {
      const token = await AsyncStorage.getItem("@user_token");
      const response = await fetch(`${SERVICE_URL}/api/goals/${goalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: !currentStatus }),
      });

      if (response.ok) {
        // Update local state
        setGoals(
          goals.map((goal) =>
            goal.id === goalId ? { ...goal, completed: !currentStatus } : goal
          )
        );
      }
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <View style={styles.profilePlaceholder}>
            <Text style={styles.profileInitial}>{userInitial}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Daily Goals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily goals</Text>

        {isLoading ? (
          <ActivityIndicator size="small" color="#0066cc" style={{ marginVertical: 16 }} />
        ) : goals.length === 0 ? (
          <Text style={styles.emptyStateText}>No goals yet. Add one to get started!</Text>
        ) : (
          goals.map((goal) => (
            <View key={goal.id} style={styles.goalItem}>
              <View style={styles.goalRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleGoalCompletion(goal.id, goal.completed)}
                >
                  {goal.completed && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text
                  style={[
                    styles.goalTitle,
                    goal.completed && styles.goalTitleCompleted,
                  ]}
                >
                  {goal.text}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Analytics - Miles Run Graph */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Miles Run</Text>
        <Text style={styles.monthTitle}>Last 2 Weeks</Text>
        
        {/* Graph */}
        <View style={styles.graphContainer}>
          <View style={styles.graphYAxis}>
            <Text style={styles.yAxisLabel}>8mi</Text>
            <Text style={styles.yAxisLabel}>4mi</Text>
            <Text style={styles.yAxisLabel}>0mi</Text>
          </View>

          <View style={styles.graph}>
            {milesData.map((data) => {
              const maxMiles = 8;
              const barHeight = (data.miles / maxMiles) * 150;
              return (
                <View key={data.day} style={styles.barColumn}>
                  <View
                    style={[
                      styles.bar,
                      { height: barHeight },
                    ]}
                  />
                  <Text style={styles.barLabel}>{data.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>75.8 mi</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>5.4 mi</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Best Day</Text>
            <Text style={styles.statValue}>7.8 mi</Text>
          </View>
        </View>
      </View>

      {/* Calendar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Calendar</Text>
        <Text style={styles.monthTitle}>{currentMonthName} {currentYear}</Text>
        
        <View style={styles.dayLabels}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <Text key={`dayLabel-${index}`} style={styles.dayLabel}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const isToday = day === todayDate;
            const isSelected = day === selectedDay;
            const hasEvents = events[day] && events[day].length > 0;
            
            return (
              <TouchableOpacity
                key={`day-${day}`}
                style={[
                  styles.dayCell,
                  isToday && styles.todayCell,
                  isSelected && !isToday && styles.selectedDayCell,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && styles.todayText,
                    isSelected && !isToday && styles.selectedDayText,
                  ]}
                >
                  {day}
                </Text>
                {hasEvents && <View style={styles.eventIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>
            {selectedDay === todayDate ? "Today's Schedule" : `${currentMonthName} ${selectedDay}`}
          </Text>
          {events[selectedDay] && events[selectedDay].length > 0 ? (
            <View>
              {events[selectedDay].map((event) => (
                <View key={event.id} style={styles.eventItem}>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventText}>{event.title}</Text>
                    <Text style={styles.eventType}>{event.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noEventsText}>
              {selectedDay === todayDate ? "Nothing on today's schedule" : "No events this day"}
            </Text>
          )}
        </View>
      </View>

      {/* Spacer to prevent content overlap with button */}
      <View style={{ height: 100 }} />
      </ScrollView>

      {/* Chat Button - Fixed at bottom */}
      <TouchableOpacity 
        style={styles.chatButton}
        onPress={() => navigation.navigate("Chat")}
      >
        <Text style={styles.chatButtonText}>Open chat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: "hidden",
  },
  profilePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0066cc",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  profileInitial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  dayLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dayLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#666",
    fontSize: 12,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayCell: {
    width: `${100 / 7 - 2}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
    borderRadius: 8,
  },
  todayCell: {
    backgroundColor: "#0066cc",
  },
  dayText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "600",
  },
  todayText: {
    color: "#fff",
    fontWeight: "bold",
  },
  goalItem: {
    marginBottom: 16,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0066cc",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  checkmark: {
    color: "#0066cc",
    fontSize: 16,
    fontWeight: "bold",
  },
  goalTitle: {
    color: "#ccc",
    fontSize: 14,
    flex: 1,
  },
  goalTitleCompleted: {
    color: "#666",
    textDecorationLine: "line-through",
  },
  emptyStateText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 16,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 30,
  },
  graphContainer: {
    flexDirection: "row",
    marginVertical: 16,
    height: 180,
  },
  graphYAxis: {
    width: 35,
    justifyContent: "space-between",
    paddingRight: 8,
  },
  yAxisLabel: {
    color: "#666",
    fontSize: 10,
    textAlign: "right",
  },
  graph: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    height: "100%",
  },
  bar: {
    width: "70%",
    backgroundColor: "#0066cc",
    borderRadius: 4,
  },
  barLabel: {
    color: "#666",
    fontSize: 9,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  stat: {
    alignItems: "center",
  },
  statLabel: {
    color: "#666",
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    color: "#0066cc",
    fontSize: 14,
    fontWeight: "600",
  },
  analyticsCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  analyticsNumber: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 8,
  },
  analyticsLabel: {
    color: "#666",
    fontSize: 12,
  },
  chatButton: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#0066cc",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    paddingVertical: 16,
    zIndex: 10,
  },
  chatButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  selectedDayCell: {
    borderWidth: 2,
    borderColor: "#0066cc",
  },
  selectedDayText: {
    color: "#0066cc",
    fontWeight: "bold",
  },
  eventIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00ff00",
    marginTop: 4,
  },
  eventsSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  eventsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0066cc",
    marginRight: 12,
    marginTop: 6,
    flexShrink: 0,
  },
  eventContent: {
    flex: 1,
  },
  eventText: {
    color: "#fff",
    fontSize: 13,
    marginBottom: 2,
  },
  eventType: {
    color: "#999",
    fontSize: 11,
  },
  noEventsText: {
    color: "#666",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
});