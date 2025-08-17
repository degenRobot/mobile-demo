import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { PetScreen } from './src/screens/PetScreen';

const Tab = createBottomTabNavigator();

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: { [key: string]: string } = {
    Home: '🏠',
    Pet: '🐾',
  };
  
  return (
    <Text style={{ fontSize: focused ? 28 : 24 }}>
      {icons[name] || '📱'}
    </Text>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={route.name} focused={focused} />
          ),
          tabBarActiveTintColor: '#6B46C1',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            paddingTop: 10,
            paddingBottom: 10,
            height: 70,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: 5,
          },
          headerStyle: {
            backgroundColor: '#6B46C1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'FrenPet' }}
        />
        <Tab.Screen 
          name="Pet" 
          component={PetScreen}
          options={{ title: 'My Pet' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}