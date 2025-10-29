# Mobile App with Authentication

This React Native app includes a complete authentication system with sign-in, sign-up, and home page functionality.

## Features

- **Authentication Context**: Centralized auth state management using React Context
- **Persistent Login**: User sessions are saved using AsyncStorage
- **Navigation**: Stack-based navigation using React Navigation
- **Modern UI**: Clean, iOS-style interface with proper loading states
- **TypeScript**: Fully typed codebase for better developer experience

## Screens

### 1. Sign In Screen (`src/screens/SignInScreen.tsx`)
- Email and password authentication
- Demo credentials provided
- Navigation to sign-up screen
- Loading states and error handling

### 2. Sign Up Screen (`src/screens/SignUpScreen.tsx`)
- User registration with name, email, and password
- Password confirmation validation
- Navigation to sign-in screen
- Form validation and error handling

### 3. Home Screen (`src/screens/HomeScreen.tsx`)
- Personalized welcome message
- Quick action buttons (customizable)
- User profile information
- Sign out functionality

### 4. Loading Screen (`src/screens/LoadingScreen.tsx`)
- Shown while checking authentication state
- Clean loading indicator

## Authentication System

The app uses a custom `AuthContext` (`src/context/AuthContext.tsx`) that provides:

- `user`: Current user object or null
- `isLoading`: Loading state indicator
- `signIn(email, password)`: Authentication function
- `signUp(email, password, name)`: Registration function
- `signOut()`: Logout function

### Demo Credentials
- **Email**: demo@example.com
- **Password**: password

## File Structure

```
src/
├── context/
│   └── AuthContext.tsx          # Authentication context and provider
├── navigation/
│   └── AppNavigator.tsx         # Navigation setup and routing
├── screens/
│   ├── HomeScreen.tsx           # Main app screen (authenticated)
│   ├── LoadingScreen.tsx        # Loading indicator screen
│   ├── SignInScreen.tsx         # User login screen
│   └── SignUpScreen.tsx         # User registration screen
└── components/
    └── CustomButton.tsx         # Reusable button component
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. For iOS (if Podfile exists):
   ```bash
   cd ios && pod install && cd ..
   ```

3. Start the Metro bundler:
   ```bash
   npm start
   ```

4. Run on your preferred platform:
   ```bash
   # iOS
   npm run ios
   
   # Android  
   npm run android
   ```

## Customization

### Adding New Screens
1. Create screen component in `src/screens/`
2. Add route to navigation stack in `src/navigation/AppNavigator.tsx`
3. Update the `RootStackParamList` type for proper TypeScript support

### Modifying Authentication
The authentication logic in `AuthContext.tsx` currently uses mock authentication. To integrate with a real backend:

1. Replace the mock API calls in `signIn()` and `signUp()` functions
2. Add proper error handling for network requests
3. Update token storage logic as needed
4. Add token refresh functionality if required

### Styling
All styles use React Native's StyleSheet API. The design system uses:
- Primary color: `#007AFF` (iOS blue)
- Background: `#f5f5f5` (light gray)
- Cards: White with subtle shadows
- Danger color: `#FF3B30` (iOS red)

## Dependencies

- `@react-navigation/native`: Navigation framework
- `@react-navigation/stack`: Stack navigator
- `@react-native-async-storage/async-storage`: Persistent storage
- `react-native-gesture-handler`: Gesture handling for navigation
- `react-native-screens`: Native screen components
- `react-native-safe-area-context`: Safe area handling

## Notes

- The app automatically persists user sessions
- All screens are responsive and handle keyboard properly
- Form validation includes email format and password strength
- Error states are handled gracefully with user-friendly messages
