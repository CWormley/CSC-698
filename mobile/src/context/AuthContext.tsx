import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVICE_URL } from '@env';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = '@user_token';
const USER_KEY = '@user_data';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (token) {
        // Validate token with backend
        const response = await fetch(`${SERVICE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUser(data.data);
          } else {
            // Token is invalid, clear storage
            await AsyncStorage.removeItem(STORAGE_KEY);
            await AsyncStorage.removeItem(USER_KEY);
          }
        } else {
          // Token is invalid, clear storage
          await AsyncStorage.removeItem(STORAGE_KEY);
          await AsyncStorage.removeItem(USER_KEY);
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      // Clear storage on error
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Call real authentication API
      const response = await fetch(`${SERVICE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const { user: userData, token } = data.data;
        
        // Store token and user data
        await AsyncStorage.setItem(STORAGE_KEY, token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        
        setUser(userData);
        return true;
      }
      
      // Log error for debugging
      console.error('Sign in failed:', data.error || 'Unknown error');
      return false;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Call real registration API
      const response = await fetch(`${SERVICE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const { user: userData, token } = data.data;
        
        // Store token and user data
        await AsyncStorage.setItem(STORAGE_KEY, token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        
        setUser(userData);
        return true;
      }
      
      // Log error for debugging
      console.error('Sign up failed:', data.error || 'Unknown error');
      return false;
    } catch (error) {
      console.error('Sign up error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (token) {
        // Call logout endpoint (optional - mainly for server-side session management)
        try {
          await fetch(`${SERVICE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } catch (logoutError) {
          console.log('Logout API call failed, proceeding with local cleanup');
        }
      }
      
      // Clear local storage
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
