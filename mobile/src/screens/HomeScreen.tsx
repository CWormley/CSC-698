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
import { useFocusEffect } from "@react-navigation/native";
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
  type: 'daily' | 'longterm';
  lastCompletedDate?: string;
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
  recurring?: string | null; // 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
  recurringDays?: string | null; // JSON array string like "[1,3,5]"
  recurringEndDate?: string | null;
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
  const [intentions, setIntentions] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
  
  // Get the starting day of the week for the first day of the month (0 = Sunday, 6 = Saturday)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const [selectedDay, setSelectedDay] = useState(todayDate); // Default to today

  const checkAndResetDailyGoals = () => {
    const today = new Date().toISOString().split('T')[0];
    
    setGoals(currentGoals =>
      currentGoals.map(goal => {
        // If it's a daily goal and it wasn't completed today, reset it
        if (goal.type === 'daily' && goal.lastCompletedDate !== today) {
          return { ...goal, completed: false };
        }
        return goal;
      })
    );
  };

  const fetchGoals = async () => {
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

      const response = await fetch(`${SERVICE_URL}/api/goals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch goals:", response.status);
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Separate goals by type
        const dailyGoals = result.data.filter((goal: Goal) => goal.type === 'daily');
        const longtermGoals = result.data.filter((goal: Goal) => goal.type === 'longterm');
        
        setGoals(dailyGoals);
        setIntentions(longtermGoals);
        
        console.log(`✓ Fetched ${dailyGoals.length} daily goals and ${longtermGoals.length} long-term goals`);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  useEffect(() => {
    // Fetch goals from backend
    fetchGoals();
    
    // Check and reset daily goals
    checkAndResetDailyGoals();
    
    // Fetch calendar events
    fetchEvents();
  }, [user?.id]);

  // Refresh data when returning to this screen from navigation
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Home screen focused - refreshing all widgets...');
      fetchGoals();
      checkAndResetDailyGoals();
      fetchEvents();
      return () => {
        // Cleanup if needed
      };
    }, [user?.id])
  );

  const toggleGoalCompletion = async (goalId: string, currentStatus: boolean) => {
    // Update local state immediately
    const today = new Date().toISOString().split('T')[0];
    
    setGoals(
      goals.map((goal) =>
        goal.id === goalId 
          ? { 
              ...goal, 
              completed: !currentStatus,
              lastCompletedDate: !currentStatus ? today : goal.lastCompletedDate
            } 
          : goal
      )
    );

    // Update on backend
    try {
      const token = await AsyncStorage.getItem("@user_token");
      if (!token) return;

      const updatedGoal = goals.find(g => g.id === goalId);
      if (!updatedGoal) return;

      const response = await fetch(`${SERVICE_URL}/api/goals/${goalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          completed: !currentStatus,
          lastCompletedDate: !currentStatus ? today : updatedGoal.lastCompletedDate,
        }),
      });

      if (!response.ok) {
        console.error("Failed to update goal on backend:", response.status);
      }
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const toggleIntentionCompletion = async (intentionId: string, currentStatus: boolean) => {
    // Update local state immediately
    setIntentions(
      intentions.map((intention) =>
        intention.id === intentionId ? { ...intention, completed: !currentStatus } : intention
      )
    );

    // Update on backend
    try {
      const token = await AsyncStorage.getItem("@user_token");
      if (!token) return;

      const response = await fetch(`${SERVICE_URL}/api/goals/${intentionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          completed: !currentStatus,
        }),
      });

      if (!response.ok) {
        console.error("Failed to update intention on backend:", response.status);
      }
    } catch (error) {
      console.error("Error updating intention:", error);
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
          // Organize events by day, including recurring events
          const eventsByDay: DayEvents = {};
          
          data.data.forEach((event: CalendarEvent) => {
            // Parse date correctly to avoid timezone issues
            // Extract just the date part (YYYY-MM-DD) and parse it in local timezone
            let dayNumber: number;
            
            if (event.date) {
              // Extract date string from ISO format (e.g., "2025-11-20" from "2025-11-20T00:00:00.000Z")
              const dateString = event.date.split('T')[0]; // Get YYYY-MM-DD
              const [year, month, day] = dateString.split('-').map(Number);
              dayNumber = day;
            } else {
              const baseDate = new Date(event.createdAt);
              dayNumber = baseDate.getDate();
            }
            
            // If this is a recurring event, generate instances for this month
            if (event.recurring) {
              const instances = generateRecurringInstances(event, currentMonth, currentYear);
              instances.forEach(instanceDay => {
                if (!eventsByDay[instanceDay]) {
                  eventsByDay[instanceDay] = [];
                }
                eventsByDay[instanceDay].push(event);
              });
            } else {
              // One-time event - just add to its day
              if (!eventsByDay[dayNumber]) {
                eventsByDay[dayNumber] = [];
              }
              eventsByDay[dayNumber].push(event);
            }
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

  /**
   * Generate recurring event instances for the current month
   * Returns an array of day numbers (1-31) where the event occurs
   */
  const generateRecurringInstances = (event: CalendarEvent, month: number, year: number): number[] => {
    const instances: number[] = [];
    
    if (!event.recurring) return instances;
    
    // Get the start date of the event
    const startDate = event.date ? new Date(event.date) : new Date(event.createdAt);
    const startDay = startDate.getDate();
    
    // Get the last day of the current month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    
    // Get end date for recurring event (if specified)
    const endDate = event.recurringEndDate ? new Date(event.recurringEndDate) : null;
    
    // Check if we're still within the recurring end date
    const currentMonthStart = new Date(year, month, 1);
    if (endDate && currentMonthStart > endDate) {
      return instances; // No instances if we're past the end date
    }
    
    switch (event.recurring) {
      case 'daily':
        // Add event to every day of the month
        for (let day = 1; day <= lastDayOfMonth; day++) {
          if (!endDate || new Date(year, month, day) <= endDate) {
            instances.push(day);
          }
        }
        break;
        
      case 'weekly':
        // Parse recurringDays to get the days of week (0-6)
        let daysOfWeek: number[] = [startDate.getDay()]; // Default to the start date's day
        if (event.recurringDays) {
          try {
            daysOfWeek = JSON.parse(event.recurringDays);
          } catch (e) {
            console.warn("Failed to parse recurringDays:", event.recurringDays);
          }
        }
        
        // Add events for each specified day of week in the month
        for (let day = 1; day <= lastDayOfMonth; day++) {
          const dateObj = new Date(year, month, day);
          if (daysOfWeek.includes(dateObj.getDay())) {
            if (!endDate || dateObj <= endDate) {
              instances.push(day);
            }
          }
        }
        break;
        
      case 'biweekly':
        // Add event every 2 weeks from the start date
        let dayCounter = startDay;
        while (dayCounter <= lastDayOfMonth) {
          if (!endDate || new Date(year, month, dayCounter) <= endDate) {
            instances.push(dayCounter);
          }
          dayCounter += 14;
        }
        break;
        
      case 'monthly':
        // Add event on the same day of each month
        if (startDay <= lastDayOfMonth) {
          if (!endDate || new Date(year, month, startDay) <= endDate) {
            instances.push(startDay);
          }
        }
        break;
        
      case 'yearly':
        // Add event on the same date yearly (same month and day)
        if (startDate.getMonth() === month && startDay <= lastDayOfMonth) {
          if (!endDate || new Date(year, month, startDay) <= endDate) {
            instances.push(startDay);
          }
        }
        break;
    }
    
    return instances.sort((a, b) => a - b);
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

      {/* Intentions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Milestones</Text>

        {intentions.length === 0 ? (
          <Text style={styles.emptyStateText}>No milestones yet. Add one to get started!</Text>
        ) : (
          intentions.map((intention) => (
            <View key={intention.id} style={styles.goalItem}>
              <View style={styles.goalRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleIntentionCompletion(intention.id, intention.completed)}
                >
                  {intention.completed && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text
                  style={[
                    styles.goalTitle,
                    intention.completed && styles.goalTitleCompleted,
                  ]}
                >
                  {intention.text}
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
          {/* Empty cells for days before the month starts */}
          {[...Array(firstDayOfMonth)].map((_, i) => (
            <View
              key={`empty-${i}`}
              style={styles.dayCell}
            />
          ))}
          
          {/* Actual day cells */}
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
                  isToday && isSelected && styles.todayCell,
                  isToday && !isSelected && styles.todayInactiveCell,
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
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventText}>{event.title}</Text>
                      {event.recurring && (
                        <Text style={styles.recurringBadge}>
                          {event.recurring === 'daily' ? '📅 Daily' : 
                           event.recurring === 'weekly' ? '📅 Weekly' :
                           event.recurring === 'biweekly' ? '📅 Bi-weekly' :
                           event.recurring === 'monthly' ? '📅 Monthly' :
                           event.recurring === 'yearly' ? '📅 Yearly' : '📅 Recurring'}
                        </Text>
                      )}
                    </View>
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
    paddingVertical: 4,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: -50
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
    borderRadius: 8,
  },
  todayCell: {
    backgroundColor: "#0066cc",
  },
  todayInactiveCell: {
    backgroundColor: "#333",
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
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  eventText: {
    color: "#fff",
    fontSize: 13,
    marginBottom: 0,
  },
  recurringBadge: {
    color: "#0099ff",
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
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