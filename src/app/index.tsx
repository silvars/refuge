import { StyleSheet, Text, View } from 'react-native';

// Placeholder do scaffold (issue #6). Roteamento onboarding/principal entra na Fase 1/2.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Refúgio Sensorial</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E0E14',
  },
  title: {
    color: '#FCFCFC',
    fontSize: 28,
    fontWeight: '300',
  },
});
