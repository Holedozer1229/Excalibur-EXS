/**
 * App Navigator - Main Navigation Structure
 * Double-Portal Architecture for Mobile
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

// Screens
import SplashScreen from '../screens/SplashScreen';
import AxiomGateScreen from '../screens/AxiomGateScreen';
import HomeScreen from '../screens/HomeScreen';
import KnightsPortalScreen from '../screens/KnightsPortalScreen';
import MerlinsPortalScreen from '../screens/MerlinsPortalScreen';
import ForgeScreen from '../screens/ForgeScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Tab Bar Icon Component
const TabIcon = ({ icon, focused }) => (
  <View style={{
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: focused ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
    borderWidth: focused ? 2 : 0,
    borderColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
  }}>
    <Text style={{ fontSize: 24 }}>{icon}</Text>
  </View>
);

// Main Tabs Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 2,
          borderTopColor: 'rgba(212, 175, 55, 0.3)',
          height: 70,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#d4af37',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 1,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'REALM',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏰" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="KnightsPortal"
        component={KnightsPortalScreen}
        options={{
          tabBarLabel: 'KNIGHTS',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚔️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Forge"
        component={ForgeScreen}
        options={{
          tabBarLabel: 'FORGE',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚒" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MerlinsPortal"
        component={MerlinsPortalScreen}
        options={{
          tabBarLabel: 'MERLIN',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔮" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator with Splash and Gate
const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#000000' },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="AxiomGate" component={AxiomGateScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
