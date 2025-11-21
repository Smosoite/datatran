import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../styles/typography';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    fontSize: 24,
    fontWeight: 600,
  },
  link: {
    marginTop: 16,
    paddingVertical: 16,
  },
});
