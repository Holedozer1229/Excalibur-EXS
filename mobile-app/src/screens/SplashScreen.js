/**
 * Splash Screen - The Awakening
 * Initial loading screen with sword animation
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate sword appearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to Axiom Gate after animation
    const timer = setTimeout(() => {
      navigation.replace('AxiomGate');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#2d0a4e', '#000000', '#000000']}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.swordContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { rotate }],
          },
        ]}
      >
        <Text style={styles.swordIcon}>⚔️</Text>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.title}>EXCALIBVR</Text>
        <Text style={styles.subtitle}>$EXS · Ω′ Δ18</Text>
        <Text style={styles.axiom}>
          The Legend Awakens...
        </Text>
      </Animated.View>

      <Animated.View style={[styles.runes, { opacity: fadeAnim }]}>
        <Text style={styles.runeText}>ᛋᚹᛟᚱᛞ · ᛚᛖᚷᛖᚾᛞ · ᛈᚢᛚᛚ</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swordContainer: {
    marginBottom: 60,
  },
  swordIcon: {
    fontSize: 120,
    textShadowColor: '#d4af37',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    letterSpacing: 8,
    textShadowColor: '#d4af37',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 20,
    color: '#4a148c',
    textAlign: 'center',
    letterSpacing: 6,
    marginTop: 10,
  },
  axiom: {
    fontSize: 16,
    color: '#c0c0c0',
    textAlign: 'center',
    marginTop: 30,
    fontStyle: 'italic',
  },
  runes: {
    position: 'absolute',
    bottom: 50,
  },
  runeText: {
    fontSize: 18,
    color: '#d4af37',
    letterSpacing: 4,
    opacity: 0.5,
  },
});

export default SplashScreen;
