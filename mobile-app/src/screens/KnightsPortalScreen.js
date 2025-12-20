/**
 * Knights Portal Screen
 * WebView wrapper for the Knights' Round Table
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

const KnightsPortalScreen = () => {
  return (
    <LinearGradient
      colors={['#000000', '#1a1a2e']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerIcon}>⚔️</Text>
        <Text style={styles.headerTitle}>THE KNIGHTS' ROUND TABLE</Text>
        <Text style={styles.headerRune}>ᚲᚾᛁᚷᚺᛏᛋ · ᚱᛟᚢᚾᛞ · ᛏᚨᛒᛚᛖ</Text>
      </View>

      <WebView
        source={{ uri: 'https://www.excaliburcrypto.com/web/knights-round-table/' }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#d4af37" />
            <Text style={styles.loadingText}>Opening the portal...</Text>
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
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
    borderBottomColor: '#4682b4',
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
    color: '#4682b4',
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

export default KnightsPortalScreen;
