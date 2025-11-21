// A custom implementation for React Native, since the default nanoid package has issues.
import 'react-native-get-random-values';
import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const generateJoinCode = customAlphabet(alphabet, 6);