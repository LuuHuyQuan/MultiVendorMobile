import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SellzyApp from './src/SellzyApp';

function App() {
  return (
    <SafeAreaProvider>
      <SellzyApp />
    </SafeAreaProvider>
  );
}

export default App;
