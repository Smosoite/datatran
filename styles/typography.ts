// styles/typography.ts
import { StyleSheet } from 'react-native';

export const typography = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  captionSmall: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  button: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  shadow: {
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  number: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  numberLarge: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -1,
  },
});