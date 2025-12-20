/**
 * Forge Screen
 * Quick forge interface for mobile
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const ForgeScreen = () => {
  const [axiom, setAxiom] = useState('');
  const [isForging, setIsForging] = useState(false);
  const [forgeProgress, setForgeProgress] = useState(0);

  const startForge = () => {
    const correctAxiom = 'sword legend pull magic kingdom artist stone destroy forget fire steel honey question';
    
    if (axiom.trim().toLowerCase() !== correctAxiom.toLowerCase()) {
      Alert.alert(
        '✗ Invalid Axiom',
        'The XIII words must be spoken correctly.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsForging(true);
    setForgeProgress(0);

    // Simulate forge progress
    const interval = setInterval(() => {
      setForgeProgress(prev => {
        if (prev >= 128) {
          clearInterval(interval);
          setIsForging(false);
          Alert.alert(
            '✓ Forge Complete!',
            'Your steel has been forged.\n\nP2TR Address: bc1p...\nReward: 49.5 $EXS',
            [{ text: 'Excellent' }]
          );
          return 128;
        }
        return prev + 1;
      });
    }, 50);
  };

  return (
    <LinearGradient
      colors={['#000000', '#2a1a0a', '#000000']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>⚒</Text>
          <Text style={styles.headerTitle}>THE FORGE</Text>
          <Text style={styles.headerRune}>ᛏᚺᛖ · ᚠᛟᚱᚷᛖ</Text>
        </View>

        <View style={styles.forgeContainer}>
          <Text style={styles.instruction}>
            Enter the XIII Words to begin forging:
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={axiom}
              onChangeText={setAxiom}
              placeholder="sword legend pull magic kingdom..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
              autoCapitalize="none"
              editable={!isForging}
            />
          </View>

          {isForging ? (
            <View style={styles.progressContainer}>
              <Text style={styles.progressTitle}>
                ⚒ FORGING IN PROGRESS ⚒
              </Text>
              <Text style={styles.progressText}>
                Round {forgeProgress} / 128
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${(forgeProgress / 128) * 100}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressDesc}>
                The 128 transmutations are underway...
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.forgeButton}
              onPress={startForge}
            >
              <LinearGradient
                colors={['#cd7f32', '#8b4513']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonIcon}>⚒</Text>
                <Text style={styles.buttonText}>DRAW THE SWORD</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Forge Specifications:</Text>
            <Text style={styles.infoText}>
              • Algorithm: Ω′ Δ18 Tetra-PoW{'\n'}
              • Rounds: 128 nonlinear{'\n'}
              • Hardening: HPP-1 (600k iterations){'\n'}
              • Difficulty: 4 leading zeros{'\n'}
              • Reward: 50 $EXS (49.5 to miner){'\n'}
              • Fee: 0.0001 BTC
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#cd7f32',
    marginBottom: 30,
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d4af37',
    letterSpacing: 4,
  },
  headerRune: {
    fontSize: 14,
    color: '#cd7f32',
    letterSpacing: 3,
    marginTop: 8,
  },
  forgeContainer: {
    flex: 1,
  },
  instruction: {
    fontSize: 16,
    color: '#c0c0c0',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: '#cd7f32',
    borderRadius: 12,
    padding: 4,
    marginBottom: 25,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
  },
  input: {
    color: '#c0c0c0',
    fontSize: 14,
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  forgeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 30,
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#d4af37',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonText: {
    color: '#d4af37',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  progressContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 2,
    borderColor: '#50c878',
    borderRadius: 12,
    padding: 30,
    marginBottom: 30,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 18,
    color: '#50c878',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 20,
  },
  progressText: {
    fontSize: 24,
    color: '#d4af37',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#50c878',
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#50c878',
  },
  progressDesc: {
    fontSize: 14,
    color: '#c0c0c0',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 2,
    borderColor: '#4a148c',
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    color: '#d4af37',
    fontWeight: 'bold',
    marginBottom: 15,
    letterSpacing: 1,
  },
  infoText: {
    fontSize: 13,
    color: '#c0c0c0',
    lineHeight: 22,
  },
});

export default ForgeScreen;
