/**
 * Excalibur $EXS Mobile Portal
 * Main Application Component
 * 
 * Axiomatically Arthurian & Cryptic Mobile Experience
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { darkTheme } from './styles/theme';

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={darkTheme}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <AppNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;
