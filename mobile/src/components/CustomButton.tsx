import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return [styles.button, styles.secondaryButton];
      case 'danger':
        return [styles.button, styles.dangerButton];
      default:
        return [styles.button, styles.primaryButton];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return [styles.buttonText, styles.secondaryButtonText];
      default:
        return [styles.buttonText, styles.primaryButtonText];
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[getTextStyle(), disabled && styles.disabledText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  disabledText: {
    color: '#999',
  },
});

export default CustomButton;
