/**
 * Merlin's Portal Screen
 * WebView wrapper for Merlin's Sanctum (Admin Dashboard)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import LinearGradient from 'react-native-linear-gradient';

const MerlinsPortalScreen = () => {
  return (
    <LinearGradient
      colors={['#2d0a4e', '#000000']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🔮</Text>
        <Text style={styles.headerTitle}>MERLIN'S SANCTUM</Text>
        <Text style={styles.headerRune}>ᛗᛖᚱᛚᛁᚾ'ᛊ · ᛊᚨᚾᚲᛏᚢᛗ</Text>
        <Text style={styles.warning}>⚠ RESTRICTED ACCESS ⚠</Text>
      </View>

      <WebView
        source={{ uri: 'https://www.excaliburcrypto.com/admin/merlins-portal/' }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a148c" />
            <Text style={styles.loadingText}>The wizard stirs...</Text>
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          // Handle WebView errors gracefully
          // In production, this should report to an error tracking service
        }}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#4a148c',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    letterSpacing: 2,
    marginBottom: 5,
  },
  headerRune: {
    fontSize: 12,
    color: '#4a148c',
    letterSpacing: 2,
    marginBottom: 10,
  },
  warning: {
    fontSize: 10,
    color: '#8b0000',
    letterSpacing: 2,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 20,
    color: '#c0c0c0',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default MerlinsPortalScreen;
