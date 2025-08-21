import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { PetScreen } from './src/screens/PetScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { MarketplaceScreen } from './src/screens/MarketplaceScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ToastProvider, pixelTheme } from './src/components/ui';

const Tab = createBottomTabNavigator();

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: { [key: string]: string } = {
    Pet: '🐾',
    Battle: '⚔️',
    Inventory: '🎒',
    Market: '🏪',
    Leaderboard: '🏆',
  };
  
  const iconSize = focused ? 28 : 24;
  const color = focused ? pixelTheme.colors.primary : pixelTheme.colors.textLight;
  
  return (
    <View style={{ 
      alignItems: 'center',
      justifyContent: 'center',
      width: 60,
      height: 40,
      backgroundColor: focused ? pixelTheme.colors.primaryLight + '20' : 'transparent',
      borderWidth: focused ? 2 : 0,
      borderColor: pixelTheme.colors.primary,
    }}>
      <Text style={{ fontSize: iconSize }}>
        {icons[name] || '📱'}
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused }) => (
              <TabBarIcon name={route.name} focused={focused} />
            ),
            tabBarActiveTintColor: pixelTheme.colors.primary,
            tabBarInactiveTintColor: pixelTheme.colors.textLight,
            tabBarStyle: {
              backgroundColor: pixelTheme.colors.surface,
              borderTopWidth: pixelTheme.borders.width.thick,
              borderTopColor: pixelTheme.colors.border,
              paddingTop: 10,
              paddingBottom: 10,
              height: 80,
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontFamily: pixelTheme.typography.fontFamily.pixel,
              letterSpacing: pixelTheme.typography.letterSpacing.normal,
              marginTop: 5,
              textTransform: 'uppercase',
            },
            headerStyle: {
              backgroundColor: pixelTheme.colors.primary,
              borderBottomWidth: pixelTheme.borders.width.thick,
              borderBottomColor: pixelTheme.colors.primaryDark,
            },
            headerTintColor: pixelTheme.colors.surface,
            headerTitleStyle: {
              fontFamily: pixelTheme.typography.fontFamily.pixelBold,
              letterSpacing: pixelTheme.typography.letterSpacing.wide,
              fontSize: pixelTheme.typography.fontSize.xlarge,
            },
          })}
        >
          <Tab.Screen 
            name="Pet" 
            component={PetScreen}
            options={{ title: 'MY PET' }}
          />
          <Tab.Screen 
            name="Battle" 
            component={LobbyScreen}
            options={{ title: 'BATTLE' }}
          />
          <Tab.Screen 
            name="Inventory" 
            component={InventoryScreen}
            options={{ title: 'ITEMS' }}
          />
          <Tab.Screen 
            name="Market" 
            component={MarketplaceScreen}
            options={{ title: 'MARKET' }}
          />
          <Tab.Screen 
            name="Leaderboard" 
            component={LeaderboardScreen}
            options={{ title: 'RANKS' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </ToastProvider>
  );
}