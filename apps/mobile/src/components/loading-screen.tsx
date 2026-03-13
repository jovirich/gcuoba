import { ActivityIndicator, Text, View } from 'react-native';
import { styles } from '../styles';

export function LoadingScreen({ text }: { text: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#be123c" />
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  );
}
