// Polyfill: parchea CSSStyleDeclaration en web para evitar el error
// "Failed to set an indexed property [0]" causado por react-native-css-interop.
// Metro resuelve esto a polyfills.web.ts en web y polyfills.ts en nativo.
import './polyfills';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import './global.css';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { View, Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';
import * as Font from 'expo-font';
import { ErrorFallback } from '~/infrastructure/interceptors/error';
import { navigationRef } from '~/navigation/navigationService';
import { RootNavigation } from '~/navigation/root';
import { CartProvider } from '~/presentation/context/cartContext';
import { OrderEventsProvider } from '~/presentation/context/orderContext';
import { NotificationProvider } from '~/presentation/context/notificationContext';
import { PushNotificationProvider } from '~/presentation/context/pushNotificationContext';
import { UserProvider, useUser } from '~/presentation/context/userContext';
import { AddressProvider } from '~/presentation/hooks/useAddress';
import { useGlobalFont } from '~/presentation/hooks/useGlobalFont';
import { getThemedStyles } from '~/presentation/styles/theme';
import '~/presentation/config/globalTextConfig';

enableScreens();
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 100 });

const ThemedApp = () => {
  const [appIsReady, setAppIsReady] = useState(false);
  const { loadingUser, fetchUserData } = useUser();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useGlobalFont();

  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'LuckiestGuy-Regular': require('./assets/fonts/LuckiestGuy-Regular.ttf'),
        });
        console.log('✅ Fuentes cargadas exitosamente');
        setFontsLoaded(true);
      } catch (error) {
        console.warn('⚠️ Error cargando fuentes personalizadas, usando fallback:', error);
        setFontsLoaded(true);
      }
    };

    loadFonts();
  }, []);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        if (!loadingUser && !appIsReady && fontsLoaded) {
          await fetchUserData();
          setAppIsReady(true);
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.warn('Error preparing app:', error);
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    prepareApp();
  }, [loadingUser, fetchUserData, fontsLoaded]);

  const theme = getThemedStyles();

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        theme={{
          dark: false,
          colors: {
            primary: theme.primaryColor,
            background: theme.backgroundColor,
            card: theme.cardBackground,
            text: theme.textColor,
            border: theme.borderColor,
            notification: theme.primaryColor,
          },
          fonts: {
            regular: {
              fontFamily: 'LuckiestGuy-Regular',
              fontWeight: 'normal',
            },
            medium: {
              fontFamily: 'LuckiestGuy-Regular',
              fontWeight: 'normal',
            },
            bold: {
              fontFamily: 'LuckiestGuy-Regular',
              fontWeight: 'normal',
            },
            heavy: {
              fontFamily: 'LuckiestGuy-Regular',
              fontWeight: 'normal',
            },
          },
        }}>
        <RootNavigation />
      </NavigationContainer>
    </View>
  );
};

export default function App() {
  const theme = getThemedStyles();
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <CartProvider>
        <UserProvider>
          <PushNotificationProvider>
            <NotificationProvider>
              <AddressProvider>
                <OrderEventsProvider>
                  <ThemedApp />
                  <StatusBar
                    hidden={false}
                    translucent={false}
                    backgroundColor={theme.backgroundColor}
                  />
                </OrderEventsProvider>
              </AddressProvider>
            </NotificationProvider>
          </PushNotificationProvider>
        </UserProvider>
      </CartProvider>
    </ErrorBoundary>
  );
}
