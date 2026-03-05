import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { HomeScreen } from '../screens/HomeScreen';
import { CreateWishScreen } from '../screens/CreateWishScreen';
import { MyWishesScreen } from '../screens/MyWishesScreen';
import { LanguageToggle } from '../components/LanguageToggle';

const Tab = createBottomTabNavigator();

export const AppNavigator = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#C8360A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
        headerTitle: '⛩️ 神社 Shrine',
        headerRight: () => <LanguageToggle />,
        tabBarActiveTintColor: '#C8360A',
        tabBarInactiveTintColor: '#BFB0A8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#EDE0D4',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('nav.home'),
          tabBarIcon: () => (
            <Text style={{ fontSize: 24 }}>⛩️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="CreateWish"
        component={CreateWishScreen}
        options={{
          tabBarLabel: t('nav.createWish'),
          tabBarIcon: () => (
            <Text style={{ fontSize: 24 }}>✨</Text>
          ),
        }}
      />
      <Tab.Screen
        name="MyWishes"
        component={MyWishesScreen}
        options={{
          tabBarLabel: t('nav.myWishes'),
          tabBarIcon: () => (
            <Text style={{ fontSize: 24 }}>📜</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};
