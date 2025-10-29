import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isLoading } = useAuth();
  return null; // We're just testing that the context works
};

describe('AuthContext', () => {
  it('should provide auth context without crashing', () => {
    expect(() => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    }).not.toThrow();
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });
});
