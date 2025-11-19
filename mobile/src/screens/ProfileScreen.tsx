import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { SERVICE_URL } from "@env";

type ProfileScreenProps = StackScreenProps<RootStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, signOut, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }

    if (name === user?.name) {
      return;
    }

    try {
      setIsSaving(true);
      
      // Get auth token
      const token = await AsyncStorage.getItem("@user_token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      console.log("Updating user:", {
        url: `${SERVICE_URL}/api/users/${user?.id}`,
        userId: user?.id,
        token: token ? "present" : "missing",
        name: name.trim(),
      });

      // Call API to update user name
      const response = await fetch(`${SERVICE_URL}/api/users/${user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      console.log("Update response:", { status: response.status, data });

      if (!response.ok) {
        Alert.alert("Error", data.error || "Failed to update profile");
        return;
      }

      // Update the user in auth context
      updateUser({ name: name.trim() });
      
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
      console.error("Update profile error:", error);
      if (error instanceof TypeError) {
        console.error("Network error:", error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Sign Out",
        onPress: async () => {
          try {
            setIsLoading(true);
            await signOut();
          } catch (error) {
            Alert.alert("Error", "Failed to sign out");
            console.error(error);
          } finally {
            setIsLoading(false);
          }
        },
        style: "destructive",
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButtonContainer}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
              editable={!isSaving}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={handleSaveName}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        {/* Spacer to push sign out button to bottom */}
        <View style={{ flex: 1 }} />

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sign Out Button - Fixed at bottom */}
      <TouchableOpacity
        style={styles.fixedSignOutButton}
        onPress={handleSignOut}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
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
    paddingTop: 55,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 24,
    paddingTop: 0,
  },
  backButton: {
    color: "#0066cc",
    fontSize: 16,
    fontWeight: "600",
  },
  headerContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
    width: "100%",
  },
  backButtonContainer: {
    position: "absolute",
    left: 0,
    top: -4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#0066cc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
  },
  email: {
    fontSize: 14,
    color: "#999",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#999",
  },
  infoValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#0066cc",
  },
  dangerButton: {
    backgroundColor: "#666",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  fixedSignOutButton: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#666",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 14,
    zIndex: 10,
  },
});
