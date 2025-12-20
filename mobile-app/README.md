# Excalibur $EXS Mobile App

**Axiomatically Arthurian Mobile Portal for iOS & Android**

## 🎯 Overview

The Excalibur $EXS Mobile App provides native iOS and Android access to the Double-Portal Architecture, allowing users to interact with the Knights' Round Table (public forge) and Merlin's Sanctum (admin dashboard) from their mobile devices.

## 📱 Features

### Core Functionality
- **Splash Screen**: Mystical awakening animation with rotating sword
- **Axiom Gate**: XIII words verification before entering the realm
- **Home Screen**: Protocol overview with stats and portal access
- **Knights' Portal**: WebView access to the public forge interface
- **Merlin's Sanctum**: WebView access to the admin dashboard
- **Quick Forge**: Native mobile forge interface with real-time progress

### Design Philosophy
- **Cryptic Arthurian Theme**: Elder Futhark runes, mystical symbols, medieval aesthetics
- **Dark Mode**: Optimized for nighttime viewing with gold/purple accents
- **Responsive**: Adapts to all screen sizes (phones and tablets)
- **Smooth Animations**: Fade-ins, rotations, and progress animations

## 🏗️ Architecture

```
mobile-app/
├── src/
│   ├── App.js                 # Root component
│   ├── navigation/
│   │   └── AppNavigator.js    # Navigation structure
│   ├── screens/
│   │   ├── SplashScreen.js    # Initial loading
│   │   ├── AxiomGateScreen.js # XIII words challenge
│   │   ├── HomeScreen.js      # Main hub
│   │   ├── KnightsPortalScreen.js  # Public forge
│   │   ├── MerlinsPortalScreen.js  # Admin dashboard
│   │   └── ForgeScreen.js     # Quick forge interface
│   ├── components/            # Reusable components
│   ├── services/              # API services
│   ├── styles/
│   │   └── theme.js          # Color scheme & fonts
│   └── assets/                # Images, icons
├── ios/                       # iOS native code
├── android/                   # Android native code
├── package.json
├── app.json
└── index.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

```bash
cd mobile-app

# Install dependencies
npm install

# iOS specific
cd ios && pod install && cd ..

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Development

```bash
# Start Metro bundler
npm start

# Run on specific iOS simulator
npm run ios -- --simulator="iPhone 15 Pro"

# Run on connected Android device
npm run android

# Run tests
npm test

# Lint code
npm run lint
```

## 📦 Dependencies

### Core
- **react-native**: 0.73.0
- **react**: 18.2.0

### Navigation
- **@react-navigation/native**: Tab and stack navigation
- **@react-navigation/stack**: Stack navigator
- **@react-navigation/bottom-tabs**: Bottom tab bar

### UI/UX
- **react-native-linear-gradient**: Gradient backgrounds
- **react-native-svg**: SVG support
- **react-native-reanimated**: Smooth animations
- **react-native-gesture-handler**: Touch gestures

### Functionality
- **react-native-webview**: Embed web portals
- **@react-native-async-storage/async-storage**: Local storage
- **axios**: HTTP requests

## 🎨 Theming

The app uses a cryptic Arthurian color scheme:

```javascript
{
  gold: '#d4af37',        // Primary accent
  purple: '#4a148c',      // Mystical elements
  steelBlue: '#4682b4',   // Knights' theme
  emerald: '#50c878',     // Success states
  bloodRed: '#8b0000',    // Warnings
  bronze: '#cd7f32',      // Secondary accent
  voidBlack: '#000000',   // Background
}
```

## 📱 Screens

### 1. Splash Screen
- Animated sword icon
- Rotating entrance animation
- Auto-navigation to Axiom Gate (3 seconds)

### 2. Axiom Gate
- XIII word grid display
- Text input for axiom verification
- Validates: `sword legend pull magic kingdom artist stone destroy forget fire steel honey question`
- Grants access to main app

### 3. Home Screen
- Protocol statistics (supply, rewards, fees)
- Portal cards (Knights & Merlin)
- Ω′ Δ18 algorithm info
- Navigation to all sections

### 4. Knights' Portal
- WebView embedding public forge at `https://www.excaliburcrypto.com/web/knights-round-table/`
- Full forge functionality
- Real-time mining visualization

### 5. Merlin's Sanctum
- WebView embedding admin dashboard at `https://www.excaliburcrypto.com/admin/merlins-portal/`
- Treasury monitoring
- Difficulty adjustment
- Anomaly map

### 6. Forge Screen
- Native mobile forge interface
- Axiom input
- 128-round progress bar
- Forge completion alerts

## 🔐 Security

- Client-side axiom validation (server validation in production)
- WebView security policies
- No private key storage in app
- HTTPS-only connections for web portals

## 📊 Build for Production

### iOS

```bash
cd ios

# Archive for App Store
xcodebuild -workspace ExcaliburEXS.xcworkspace \
  -scheme ExcaliburEXS \
  -configuration Release \
  -archivePath build/ExcaliburEXS.xcarchive \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/ExcaliburEXS.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/
```

### Android

```bash
cd android

# Build release APK
./gradlew assembleRelease

# Build AAB (for Play Store)
./gradlew bundleRelease

# Output: android/app/build/outputs/
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests (Detox)
npm run test:e2e:ios
npm run test:e2e:android
```

## 📝 Configuration

### Environment Variables
Create `.env` file:

```
API_BASE_URL=https://www.excaliburcrypto.com/api
WEB_PORTAL_URL=https://www.excaliburcrypto.com
ENABLE_DEBUG=false
```

### App Icons & Splash
- Place icons in `assets/` directory
- Use appropriate sizes for iOS and Android
- Update `app.json` with correct paths

## 🔄 Updates

### Over-The-Air (OTA) Updates
Using CodePush or similar:

```bash
# Install CodePush
npm install react-native-code-push

# Deploy update
appcenter codepush release-react \
  -a YourOrg/ExcaliburEXS \
  -d Production
```

## 📱 App Store Listing

### iOS App Store
- **Name**: Excalibur $EXS
- **Subtitle**: The Prophetic Forge
- **Category**: Finance / Cryptocurrency
- **Keywords**: excalibur, exs, cryptocurrency, forge, blockchain

### Google Play Store
- **Package**: com.excaliburexs.mobile
- **Category**: Finance
- **Content Rating**: Everyone

## ⚠️ Production Considerations

Before releasing to app stores:

1. **Backend Integration**: Connect to real API endpoints
2. **Authentication**: Implement proper auth for Merlin's Sanctum
3. **Push Notifications**: Add forge completion notifications
4. **Analytics**: Integrate Firebase or similar
5. **Crash Reporting**: Add Sentry or Crashlytics
6. **Deep Linking**: Handle external links to forges
7. **App Store Compliance**: Review store guidelines

## 🤝 Contributing

See main repository [CONTRIBUTING.md](../CONTRIBUTING.md)

## 📜 License

BSD 3-Clause License - See [LICENSE](../LICENSE)

## 👨‍💻 Lead Architect

**Travis D Jones**  
Email: holedozer@gmail.com

---

*"The sword now fits in your pocket. The legend travels with you."*

⚔️ EXCALIBUR $EXS ⚔️
