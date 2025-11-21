// lib/toast.ts
import Toast from 'react-native-toast-message';

export const showSuccess = (message: string) => {
  Toast.show({
    type: 'success', // This corresponds to the type in our custom config
    text1: 'Success',
    text2: message,
    position: 'top',
    visibilityTime: 3000,
  });
};

export const showError = (message: string) => {
  Toast.show({
    type: 'error', // This corresponds to the type in our custom config
    text1: 'Error',
    text2: message,
    position: 'top',
    visibilityTime: 4000,
  });
};