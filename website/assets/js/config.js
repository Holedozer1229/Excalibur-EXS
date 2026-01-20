// Excalibur $EXS Protocol - Configuration
// This file contains environment-specific configuration

(function(window) {
    'use strict';
    
    // Determine environment based on hostname
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isProduction = hostname === 'www.excaliburcrypto.com' || hostname === 'excaliburcrypto.com';
    
    // Oracle API Configuration
    // Default to production URL, override for localhost development
    const ORACLE_API_URLS = {
        production: 'https://oracle.excaliburcrypto.com',
        staging: 'https://oracle-staging.excaliburcrypto.com',
        development: 'http://localhost:5001'
    };
    
    // Determine which Oracle API URL to use
    let oracleApiUrl;
    if (isLocalhost) {
        oracleApiUrl = ORACLE_API_URLS.development;
    } else if (isProduction) {
        oracleApiUrl = ORACLE_API_URLS.production;
    } else {
        // Default to staging for any other domains
        oracleApiUrl = ORACLE_API_URLS.staging;
    }
    
    // Determine environment
    let environment;
    if (isLocalhost) {
        environment = 'development';
    } else if (isProduction) {
        environment = 'production';
    } else {
        environment = 'staging';
    }
    
    // API Configuration object
    window.ExcaliburConfig = {
        // Environment
        environment: environment,
        isProduction: isProduction,
        isDevelopment: isLocalhost,
        
        // Oracle API
        oracleApiUrl: oracleApiUrl,
        // SECURITY WARNING: API keys should be managed via secure environment variables in production
        // This is a public demo key for development purposes only
        // In production, configure proper authentication and authorization
        oracleApiKey: isProduction ? null : 'public_key_67890',  // Only use in development
        
        // Bitcoin Network
        bitcoinNetwork: isProduction ? 'mainnet' : 'testnet',
        
        // Feature Flags
        features: {
            enableOracle: true,
            enableForge: true,
            enableAdminPortal: true,
            enableMobileApp: true
        },
        
        // API Endpoints
        endpoints: {
            oracle: '/oracle',
            speak: '/speak',
            status: '/status',
            grail: '/grail',
            health: '/health'
        },
        
        // Rate Limiting
        rateLimits: {
            oracleQuery: 10, // queries per minute
            forgeAttempt: 1  // forge attempts per minute
        },
        
        // App Store Links (IMPORTANT: Update these when apps are published)
        // These are placeholder URLs as specified in the website
        // Remove or update these links when actual mobile apps are available
        appStores: {
            ios: 'https://apps.apple.com/app/excalibur-exs',  // Placeholder - update when app is published
            android: 'https://play.google.com/store/apps/details?id=com.excaliburcrypto.exs'  // Placeholder - update when app is published
        },
        
        // External Links
        links: {
            github: 'https://github.com/Holedozer1229/Excalibur-EXS',
            readme: 'https://github.com/Holedozer1229/Excalibur-EXS/blob/main/README.md',
            contributing: 'https://github.com/Holedozer1229/Excalibur-EXS/blob/main/CONTRIBUTING.md'
        }
    };
    
    // Log configuration in development
    if (window.ExcaliburConfig.isDevelopment) {
        console.log('Excalibur $EXS Configuration:', window.ExcaliburConfig);
    }
    
})(window);
