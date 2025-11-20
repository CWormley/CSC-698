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
  updateUser: (updatedUser: Partial<User>) => void;
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
        const response = await fetch(`${SERVICE_URL}/api/auth/me`, {
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
      const loginUrl = `${SERVICE_URL}/api/auth/login`;
      console.log('Attempting login to:', loginUrl);
      console.log('SERVICE_URL:', SERVICE_URL);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      console.log('Login response received:', data);
      
      if (response.ok && data.success) {
        const { user: userData, token } = data.data;
        
        // Store token and user data
        await AsyncStorage.setItem(STORAGE_KEY, token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        
        setUser(userData);
        return true;
      }
      
      // Log error for debugging
      console.error('Sign in failed - Status:', response.status);
      console.error('Sign in failed - Response:', data);
      console.error('Sign in failed - Error:', data.error || 'Unknown error');
      return false;
    } catch (error: any) {
      console.error('Sign in network error:', error);
      console.error('Sign in error message:', (error as Error).message);
      console.error('Sign in error code:', error.code || 'no code');
      console.error('Sign in error name:', error.name || 'unnamed error');
      console.error('Sign in full error:', JSON.stringify(error));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Call real registration API
      const registerUrl = `${SERVICE_URL}/api/auth/register`;
      console.log('Attempting signup to:', registerUrl);
      console.log('SERVICE_URL:', SERVICE_URL);
      
      const response = await fetch(registerUrl, {
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
    } catch (error: any) {
      console.error('Sign up network error:', error);
      console.error('Sign up error message:', (error as Error).message);
      console.error('Sign up error code:', error.code || 'no code');
      console.error('Sign up error name:', error.name || 'unnamed error');
      console.error('Sign up full error:', JSON.stringify(error));
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
          await fetch(`${SERVICE_URL}/api/auth/logout`, {
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

  const updateUser = (updatedUser: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      // Also update the stored user data
      AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)).catch(err => {
        console.error('Error updating user in storage:', err);
      });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateUser,
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
