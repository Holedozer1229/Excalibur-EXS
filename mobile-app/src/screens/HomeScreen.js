/**
 * Home Screen - The Realm Overview
 * Central hub showing protocol information
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const protocolStats = [
    { label: 'Total Supply', value: '21,000,000', unit: '$EXS' },
    { label: 'Per Forge', value: '50', unit: '$EXS' },
    { label: 'Treasury Fee', value: '1', unit: '%' },
    { label: 'Forge Fee', value: '0.0001', unit: 'BTC' },
  ];

  return (
    <LinearGradient
      colors={['#000000', '#1a1a2e', '#000000']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>⚔️</Text>
          <Text style={styles.headerTitle}>EXCALIBVR</Text>
          <Text style={styles.headerSubtitle}>THE REALM OF DIGITAL STEEL</Text>
          <Text style={styles.axiom}>
            "sword legend pull magic kingdom artist stone{'\n'}
            destroy forget fire steel honey question"
          </Text>
        </View>

        {/* Protocol Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.ornament}>◈ </Text>
            PROTOCOL CODEX
            <Text style={styles.ornament}> ◈</Text>
          </Text>
          <View style={styles.statsGrid}>
            {protocolStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statUnit}>{stat.unit}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* The Dual Portals */}
        <View style={styles.portalsContainer}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.ornament}>⟐ </Text>
            THE TWIN GATEWAYS
            <Text style={styles.ornament}> ⟐</Text>
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('KnightsPortal')}
          >
            <LinearGradient
              colors={['rgba(70, 130, 180, 0.3)', 'rgba(70, 130, 180, 0.1)']}
              style={styles.portalCard}
            >
              <Text style={styles.portalIcon}>⚔️</Text>
              <Text style={styles.portalTitle}>The Knights' Round Table</Text>
              <Text style={styles.portalRune}>ᚲᚾᛁᚷᚺᛏᛋ</Text>
              <Text style={styles.portalDesc}>
                Where warriors gather to prove worth through the forge
              </Text>
              <View style={styles.portalFeatures}>
                <Text style={styles.feature}>◆ Forge Interface</Text>
                <Text style={styles.feature}>◆ Real-time Visualization</Text>
                <Text style={styles.feature}>◆ P2TR Rewards</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('MerlinsPortal')}
          >
            <LinearGradient
              colors={['rgba(74, 20, 140, 0.3)', 'rgba(74, 20, 140, 0.1)']}
              style={styles.portalCard}
            >
              <Text style={styles.portalIcon}>🔮</Text>
              <Text style={styles.portalTitle}>Merlin's Sanctum</Text>
              <Text style={styles.portalRune}>ᛗᛖᚱᛚᛁᚾ</Text>
              <Text style={styles.portalDesc}>
                The wizard's observatory - monitor and adjust the realm
              </Text>
              <View style={styles.portalFeatures}>
                <Text style={styles.feature}>◇ Treasury Scrying</Text>
                <Text style={styles.feature}>◇ Forge Weight</Text>
                <Text style={styles.feature}>◇ Anomaly Sight</Text>
              </View>
              <Text style={styles.restricted}>⚠ RESTRICTED ACCESS ⚠</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Ω′ Δ18 Info */}
        <View style={styles.alchemyContainer}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.ornament}>◈ </Text>
            Ω′ Δ18 TETRA-POW
            <Text style={styles.ornament}> ◈</Text>
          </Text>
          <View style={styles.alchemyCard}>
            <Text style={styles.alchemyText}>
              ☿ 128 Nonlinear Transmutations{'\n'}
              🜔 HPP-1 Quantum Tempering{'\n'}
              ⚚ Axiomatic Prophecy Binding{'\n'}
              🜏 P2TR Taproot Inscription
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
    borderBottomColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 30,
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#d4af37',
    letterSpacing: 6,
    textShadowColor: '#d4af37',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4a148c',
    letterSpacing: 4,
    marginTop: 8,
    marginBottom: 20,
  },
  axiom: {
    fontSize: 12,
    color: '#c0c0c0',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
    opacity: 0.8,
  },
  statsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 25,
  },
  ornament: {
    color: '#4a148c',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  statCard: {
    width: (width - 55) / 2,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 2,
    borderColor: '#4a148c',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#c0c0c0',
    marginBottom: 10,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 5,
  },
  statUnit: {
    fontSize: 12,
    color: '#666',
  },
  portalsContainer: {
    marginBottom: 30,
  },
  portalCard: {
    borderWidth: 3,
    borderRadius: 15,
    padding: 25,
    marginBottom: 20,
  },
  portalIcon: {
    fontSize: 50,
    textAlign: 'center',
    marginBottom: 15,
  },
  portalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  portalRune: {
    fontSize: 16,
    color: '#4a148c',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 15,
  },
  portalDesc: {
    fontSize: 13,
    color: '#c0c0c0',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
    lineHeight: 20,
  },
  portalFeatures: {
    marginBottom: 10,
  },
  feature: {
    fontSize: 12,
    color: '#c0c0c0',
    marginBottom: 6,
    letterSpacing: 1,
  },
  restricted: {
    fontSize: 11,
    color: '#8b0000',
    textAlign: 'center',
    marginTop: 15,
    letterSpacing: 2,
  },
  alchemyContainer: {
    marginBottom: 30,
  },
  alchemyCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 2,
    borderColor: '#cd7f32',
    borderRadius: 12,
    padding: 25,
  },
  alchemyText: {
    fontSize: 14,
    color: '#c0c0c0',
    lineHeight: 26,
    letterSpacing: 1,
  },
});

export default HomeScreen;
