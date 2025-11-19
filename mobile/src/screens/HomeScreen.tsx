import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type HomeScreenProps = StackScreenProps<RootStackParamList, "Home">;

const { width } = Dimensions.get("window");

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
  const dailyGoals = [
    { title: "Drink water", value: 0.9 },
    { title: "Workout", value: 0.5 },
    { title: "Read", value: 0.3 },
  ];

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

        {dailyGoals.map((goal) => (
          <View key={goal.title} style={styles.goalItem}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${goal.value * 100}%` },
                ]}
              />
            </View>
          </View>
        ))}
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
        <Text style={styles.monthTitle}>July</Text>
        
        <View style={styles.dayLabels}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <Text key={`dayLabel-${index}`} style={styles.dayLabel}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {[...Array(31)].map((_, i) => {
            const day = i + 1;
            const isToday = day === 20;
            return (
              <View
                key={`day-${day}`}
                style={[
                  styles.dayCell,
                  isToday && styles.todayCell,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && styles.todayText,
                  ]}
                >
                  {day}
                </Text>
              </View>
            );
          })}
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
  },
  todayCell: {
    backgroundColor: "#0066cc",
    borderRadius: 20,
  },
  dayText: {
    color: "#999",
    fontSize: 12,
  },
  todayText: {
    color: "#fff",
    fontWeight: "600",
  },
  goalItem: {
    marginBottom: 16,
  },
  goalTitle: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#333",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#0066cc",
    borderRadius: 3,
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
});