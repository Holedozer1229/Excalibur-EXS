/**
 * Axiom Gate Screen
 * The XIII Words Challenge - Entry to the Realm
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const CORRECT_AXIOM = 'sword legend pull magic kingdom artist stone destroy forget fire steel honey question';

const AxiomGateScreen = ({ navigation }) => {
  const [axiomInput, setAxiomInput] = useState('');
  const [glowAnim] = useState(new Animated.Value(0));

  const verifyAxiom = () => {
    const userAxiom = axiomInput.trim().toLowerCase();
    const correctAxiom = CORRECT_AXIOM.toLowerCase();

    if (userAxiom === correctAxiom) {
      // Success animation
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start();

      setTimeout(() => {
        navigation.replace('Main');
      }, 1000);
    } else {
      Alert.alert(
        '✗ The Prophecy is Broken',
        'Speak the XIII words in their true form.',
        [{ text: 'Try Again', style: 'cancel' }]
      );
    }
  };

  const backgroundColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(26, 26, 26, 0.9)', 'rgba(212, 175, 55, 0.3)'],
  });

  return (
    <LinearGradient
      colors={['#000000', '#1a1a2e', '#2d0a4e']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.gateFrame}>
          <Text style={styles.gateTitle}>⚔️</Text>
          <Text style={styles.gateHeader}>THE AXIOM GATE</Text>
          <Text style={styles.gateSubtitle}>ᛏᚺᛖ ᚷᚨᛏᛖ ᛟᚠ ᛏᚱᚢᛏᚺ</Text>

          <View style={styles.prophecyContainer}>
            <Text style={styles.prophecyLabel}>
              Speak the XIII Words of Prophecy:
            </Text>

            <View style={styles.wordGrid}>
              {[
                'SWORD', 'LEGEND', 'PULL', 'MAGIC',
                'KINGDOM', 'ARTIST', 'STONE', 'DESTROY',
                'FORGET', 'FIRE', 'STEEL', 'HONEY', 'QUESTION'
              ].map((word, index) => (
                <View key={index} style={styles.wordBox}>
                  <Text style={styles.wordNumber}>{index + 1}</Text>
                  <Text style={styles.wordText}>{word}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.instruction}>
              Enter all XIII words in sequence, separated by spaces:
            </Text>

            <Animated.View style={[styles.inputContainer, { backgroundColor }]}>
              <TextInput
                style={styles.input}
                value={axiomInput}
                onChangeText={setAxiomInput}
                placeholder="sword legend pull..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Animated.View>

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={verifyAxiom}
            >
              <LinearGradient
                colors={['#4a148c', '#2d0a4e']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>🔮 SPEAK THE TRUTH</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>
              "Only those who know the sacred words may pass..."
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  gateFrame: {
    borderWidth: 3,
    borderColor: '#d4af37',
    borderRadius: 20,
    padding: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  gateTitle: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 20,
  },
  gateHeader: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 10,
  },
  gateSubtitle: {
    fontSize: 16,
    color: '#4a148c',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 40,
  },
  prophecyContainer: {
    marginTop: 20,
  },
  prophecyLabel: {
    fontSize: 16,
    color: '#c0c0c0',
    textAlign: 'center',
    marginBottom: 25,
    fontStyle: 'italic',
  },
  wordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  wordBox: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 1,
    borderColor: '#cd7f32',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  wordNumber: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  wordText: {
    fontSize: 12,
    color: '#d4af37',
    fontWeight: '600',
    letterSpacing: 1,
  },
  instruction: {
    fontSize: 14,
    color: '#c0c0c0',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: '#4a148c',
    borderRadius: 12,
    padding: 4,
    marginBottom: 25,
  },
  input: {
    color: '#c0c0c0',
    fontSize: 16,
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  verifyButton: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  buttonText: {
    color: '#d4af37',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AxiomGateScreen;
