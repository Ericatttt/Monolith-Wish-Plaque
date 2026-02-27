// polyfill.js
// Import and setup Buffer first
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Import random values polyfill
import 'react-native-get-random-values';

// Install quick-crypto
import { install } from 'react-native-quick-crypto';
install();

// Make sure crypto is available globally
const QuickCrypto = require('react-native-quick-crypto');
if (typeof global.crypto === 'undefined') {
  global.crypto = QuickCrypto;
}

// Additional polyfills for Web3
global.process = global.process || require('process');
global.process.env = global.process.env || {};
global.process.version = global.process.version || 'v16.0.0';
