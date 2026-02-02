// styles/typography.ts
import { StyleSheet } from 'react-native';

export const typography = StyleSheet.create({
  // For large screen titles
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  // For section headers
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  // For card titles or important labels
  h3: {
    fontSize: 20,
    fontWeight: '600',
  },
  // For regular body text
  body: {
    fontSize: 16,
    fontWeight: '400',
  },
  // For input labels
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  // For small helper text or descriptions
  caption: {
    fontSize: 12,
    fontWeight: '400',
  },
  shadow: {
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  // For text inside buttons
  button: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});