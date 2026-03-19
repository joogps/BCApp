import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView, WebViewNavigation } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TARGET_URL = 'https://appbrazilconference.framer.website/';
const STORAGE_KEY_LAST_URL = '@bcapp/last_url';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(TARGET_URL);
  const [loading, setLoading] = useState(true);

  // Restore last visited URL on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_LAST_URL).then((saved) => {
      if (saved && saved.startsWith(TARGET_URL)) {
        setCurrentUrl(saved);
      }
    });
  }, []);

  // Android hardware back button support
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      webViewRef.current?.goBack();
      return true;
    });
    return () => handler.remove();
  }, []);

  const disableZoomScript = `
    (function() {
      var meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.setAttribute('content', meta.getAttribute('content').replace(/user-scalable=[^,]*/i, '') + ', user-scalable=no');
      } else {
        var m = document.createElement('meta');
        m.name = 'viewport';
        m.content = 'width=device-width, initial-scale=1, user-scalable=no';
        document.head.appendChild(m);
      }
      document.addEventListener('touchend', function(e) {
        var now = Date.now();
        if (now - (document._lastTap || 0) < 300) e.preventDefault();
        document._lastTap = now;
      }, { passive: false });
    })();
    true;
  `;

  const removeBadgeScript = `
    (function() {
      function removeBadge() {
        document.querySelectorAll('.__framer-badge').forEach(function(el) {
          el.remove();
        });
      }
      removeBadge();
      new MutationObserver(removeBadge).observe(document.documentElement, { childList: true, subtree: true });
      setInterval(removeBadge, 500);
    })();
    true;
  `;

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    if (navState.url && navState.url.startsWith(TARGET_URL)) {
      AsyncStorage.setItem(STORAGE_KEY_LAST_URL, navState.url);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          webViewRef.current?.injectJavaScript(disableZoomScript);
          webViewRef.current?.injectJavaScript(removeBadgeScript);
        }}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        scalesPageToFit={false}
        allowsLinkPreview={false}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
