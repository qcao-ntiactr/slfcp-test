import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';

import { entraAuthService } from '../services/entraAuthService';
import { sessionService } from '../services/sessionService';
import { getTokenConfig } from '../config/sessionConfig';
import { SessionWarning } from '../components/Session/SessionWarning/SessionWarning';
import { clearQueryCache } from '../services/reactQueryService';
import { setupAuthErrorInterceptor } from '../api/axiosConfig';
import { isTokenExpired, getTokenExpirationTime } from '../utils/authUtils';

export interface AuthContextType {
  user: User | null;
  // eslint-disable-next-line no-unused-vars
  login: (userPrincipalName?: string, password?: string) => Promise<boolean>;
  loginWithEntra: () => Promise<void>;
  loginWithLoginGov: () => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  exchangeCodeForTokens: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  token: string | null;
  isLoading: boolean;
  authMode: string;
  isEntraConfigured: boolean;
  isLoginGovConfigured: boolean;
  authError: string | null;
  // eslint-disable-next-line no-unused-vars
  setAuthError: (error: string | null) => void;
}

export enum UserRole {
  // eslint-disable-next-line no-unused-vars
  federal = 'Federal',
  // eslint-disable-next-line no-unused-vars
  commercial = 'Commercial',
  // eslint-disable-next-line no-unused-vars
  ntia = 'NTIA',
}

export interface User {
  id: string;
  displayName: string;
  userPrincipalName: string;
  email: string;
  role: UserRole;
  groups?: string[];
  tenantId: string;
  accessToken?: string;
  federalAgencyId?: number;
  federalAgencyAbbr?: string;
  canConcur?: boolean;
  isEntityActive?: boolean;
}

export const HybridAuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const HybridAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState('');
  const [isEntraConfigured, setIsEntraConfigured] = useState(false);
  const [isLoginGovConfigured, setIsLoginGovConfigured] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Session management state
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [warningTimeRemaining, setWarningTimeRemaining] = useState(0);

  // Mock users for backward compatibility
  const mockUsers: Record<string, User> = {
    federal_navy: {
      id: 'federal@navy.gov',
      displayName: 'Tom Nickelson',
      role: UserRole.federal,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'federal@navy.gov',
      userPrincipalName: 'federal@navy.gov',
      federalAgencyId: 3,
      federalAgencyAbbr: 'NAVY',
      canConcur: true,
      isEntityActive: true,
    },
    federal_nasa: {
      id: 'federal@nasa.gov',
      displayName: 'Andrew Johnson',
      role: UserRole.federal,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'federal@nasa.gov',
      userPrincipalName: 'federal@nasa.gov',
      federalAgencyId: 2,
      federalAgencyAbbr: 'NASA',
      canConcur: true,
    },
    commercial_qa: {
      id: 'commercialqa@company.com',
      displayName: 'Thomas Jefferson',
      role: UserRole.commercial,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'commercialqa@company.com',
      userPrincipalName: 'commercial@qa.com',
    },
    commercial_dev: {
      id: 'commercialdev@company.com',
      displayName: 'Thomas Jefferson',
      role: UserRole.commercial,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'commercialdev@company.com',
      userPrincipalName: 'commercial@dev.com',
    },
    ntia_qa: {
      id: 'ntiaqa@company.com',
      displayName: 'Benjamin Harrison',
      role: UserRole.ntia,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'ntiaqa@company.com',
      userPrincipalName: 'ntia@qa.com',
    },
    ntia_dev: {
      id: 'ntiadev@company.com',
      displayName: 'Benjamin Harrison',
      role: UserRole.ntia,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'ntiadev@company.com',
      userPrincipalName: 'ntia@dev.com',
    },
    spacex_user: {
      id: 'spacex@fakeserver123.com',
      displayName: 'SpaceX User',
      role: UserRole.commercial,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'spacex@fakeserver123.com',
      userPrincipalName: 'spacex@fakeserver123.com',
    },
    // Test Users - Commercial Entity
    sqa_commercial_spacetesting: {
      id: 'spacetesting@outlook.com',
      displayName: 'Dummy Commercial Entity Name',
      role: UserRole.commercial,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'spacetesting@outlook.com',
      userPrincipalName: 'spacetesting@outlook.com',
    },
    // Test Users - Federal Agency (NASA)
    sqa_federal_pshah_rw: {
      id: 'pshah@ctec-corp.com',
      displayName: 'P Shah - Federal Agency Read/Write Access (NASA)',
      role: UserRole.federal,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'pshah@ctec-corp.com',
      userPrincipalName: 'pshah@ctec-corp.com',
      federalAgencyId: 2,
      federalAgencyAbbr: 'NASA',
      canConcur: true,
    },
    sqa_federal_kbvreddy_comment: {
      id: 'kbvreddy@yahoo.com',
      displayName: 'KB VReddy - Federal Agency Comment Only (NASA)',
      role: UserRole.federal,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'kbvreddy@yahoo.com',
      userPrincipalName: 'kbvreddy@yahoo.com',
      federalAgencyId: 2,
      federalAgencyAbbr: 'NASA',
      canConcur: false,
    },
    // Test Users - Federal Agency Admin (NAVY)
    sqa_federal_vkchitty_admin: {
      id: 'vkchitty.ctr@ntia.gov',
      displayName: 'VK Chitty - Federal Agency Admin Access (NAVY)',
      role: UserRole.federal,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'vkchitty.ctr@ntia.gov',
      userPrincipalName: 'vkchitty.ctr@ntia.gov',
      federalAgencyId: 3,
      federalAgencyAbbr: 'NAVY',
      canConcur: true,
      isEntityActive: true,
    },
    // Test Users - NTIA
    sqa_ntia_pshah_rw: {
      id: 'pshah.ctr@ntia.gov',
      displayName: 'P Shah - NTIA User Read/Write Access',
      role: UserRole.ntia,
      accessToken: 'mock.jwt.token',
      tenantId: 'tenant-xyz',
      email: 'pshah.ctr@ntia.gov',
      userPrincipalName: 'pshah.ctr@ntia.gov',
    },
  };

  const hasInitialized = React.useRef(false);

  const cleanupSessionManagement = useCallback(() => {
    sessionService.cleanup();
    setShowSessionWarning(false);

    // Clean up event subscription
    const windowWithSession = window as Window & {
      __sessionUnsubscribe?: () => void;
    };
    if (windowWithSession.__sessionUnsubscribe) {
      windowWithSession.__sessionUnsubscribe();
      delete windowWithSession.__sessionUnsubscribe;
    }
  }, []);

  const logout = useCallback(
    async (isExternal: boolean = false): Promise<void> => {
      // If this is a local logout request, broadcast it to other tabs via sessionService
      if (!isExternal) {
        sessionService.forceLogout('Manual logout');
        return;
      }

      // Cleanup session management first
      cleanupSessionManagement();

      // Preserve current URL for redirect after login
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== '/login' && currentUrl !== '/') {
        sessionStorage.setItem('redirectUrl', currentUrl);
      }

      // Clear React Query cache
      clearQueryCache();

      // Call backend logout endpoint to clear refresh token
      let logoutRedirectUrl: string | null = null;
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const refreshToken =
          localStorage.getItem('refreshToken') ||
          sessionStorage.getItem('refreshToken');
        const response = await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include', // Include HttpOnly cookies
          headers: {
            'Content-Type': 'application/json',
            Authorization: refreshToken ? `Bearer ${refreshToken}` : '',
          },
        });

        if (response.ok) {
          const data = await response.json();
          logoutRedirectUrl = data.logout_redirect_url || null;
        }
      } catch (error) {
        console.error('Backend logout failed:', error);
        // Continue with local cleanup even if backend call fails
      }

      setUser(null);
      setToken(null);

      // Clear all token storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('refreshToken');

      // Redirect based on auth mode and logout response
      if (logoutRedirectUrl) {
        // For login.gov, redirect to the end_session_endpoint
        window.location.href = logoutRedirectUrl;
      } else if (authMode === 'entra' && entraAuthService.isEntraConfigured()) {
        await entraAuthService.logout();
      } else {
        // Mock logout or default - redirect to home
        window.location.href = '/';
      }
    },
    [authMode, cleanupSessionManagement]
  );

  const handleSessionLogout = useCallback(
    async (_reason = 'Manual logout') => {
      setShowSessionWarning(false);
      await logout(true);
    },
    [logout]
  );

  const handleTokenRefresh = useCallback(
    (
      tokenData: { access_token?: string; user?: User },
      isBackground = false
    ) => {
      if (tokenData?.access_token) {
        setToken(tokenData.access_token);
        localStorage.setItem('token', tokenData.access_token);
      }
      if (tokenData?.user) {
        setUser(tokenData.user);
        localStorage.setItem('user', JSON.stringify(tokenData.user));
      }
      setIsLoading(false);

      // Check for saved redirect URL after successful login
      // Skip for background refreshes to avoid unexpected page reloads
      if (!isBackground) {
        const redirectUrl = sessionStorage.getItem('redirectUrl');
        if (redirectUrl) {
          sessionStorage.removeItem('redirectUrl');
          if (window.location.pathname !== redirectUrl) {
            window.location.href = redirectUrl;
          }
        }
      }
    },
    []
  );

  const setupSessionManagement = useCallback(() => {
    // Initialize session service timers and listeners
    sessionService.initialize();
  }, []);

  /// Set up permanent session event subscription
  useEffect(() => {
    const unsubscribe = sessionService.onSessionEvent(
      ({ type: eventType, data: data }) => {
        switch (eventType) {
          case 'login':
            if (data?.user || data?.access_token) {
              handleTokenRefresh(data);
            }
            break;

          case 'warning':
            setShowSessionWarning(true);
            setWarningTimeRemaining(data?.timeRemainingMs || 0);
            break;

          case 'logout':
            handleSessionLogout(data?.reason);
            break;

          case 'tokenRefreshed':
            if (data.user) {
              handleTokenRefresh(data, true);
            }
            break;

          case 'activityDetected':
            setShowSessionWarning(false);
            break;
        }
      }
    );

    return unsubscribe;
  }, [handleSessionLogout, handleTokenRefresh]);

  /// Initialize session management when authenticated
  useEffect(() => {
    if (user && token) {
      setupSessionManagement();
    }
  }, [user, token, setupSessionManagement]);

  const handleEntraAuthResult = useCallback(
    async (result: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      user?: User;
    }) => {
      try {
        // For the Web application flow, the backend returns tokens and user data
        const { access_token, refresh_token, expires_in, user } = result;

        if (!access_token) {
          throw new Error('No access token received from backend');
        }

        if (!user) {
          throw new Error('No user data received from backend');
        }

        // Store the token and user data
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));

        // Store refresh token in sessionStorage (cleared on tab close)
        if (refresh_token) {
          sessionStorage.setItem('refreshToken', refresh_token);
        }

        setUser(user);
        setToken(access_token);

        // Update session service with token data
        if (expires_in) {
          sessionService.updateTokenData({
            access_token,
            expires_in,
            user,
          });
        }
      } catch (error) {
        console.error('Error handling Entra auth result:', error);
        // Don't throw - let user try again
      }
    },
    []
  );

  const initializeAuth = useCallback(async () => {
    setIsLoading(true);

    try {
      // Initialize Entra service and get config
      await entraAuthService.initialize();
      setAuthMode(entraAuthService.getAuthMode());
      setIsEntraConfigured(entraAuthService.isEntraConfigured());

      // Check if Login.gov is configured
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL || 'http://localhost:3000'
          }/auth/config`
        );
        const config = await response.json();
        setIsLoginGovConfigured(config.loginGovConfigured || false);
      } catch (error) {
        console.warn('Failed to fetch Login.gov config:', error);
        setIsLoginGovConfigured(false);
      }

      // Check for existing authentication
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);

          // Only handle token expiration for real tokens
          if (storedToken !== 'mock.jwt.token' && isTokenExpired(storedToken)) {
            console.warn('Stored token is expired, clearing session');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setToken(null);
          } else {
            setUser(parsedUser);
            setToken(storedToken);

            const tokenConfig = getTokenConfig();
            if (storedToken !== 'mock.jwt.token') {
              const expirationTime = getTokenExpirationTime(storedToken);
              const now = Date.now();

              // Calculate actual seconds remaining, or fallback to config if parsing fails
              const expiresIn =
                expirationTime && expirationTime > now
                  ? Math.floor((expirationTime - now) / 1000)
                  : tokenConfig.accessTokenExpiresIn;

              sessionService.updateTokenData({
                access_token: storedToken,
                expires_in: expiresIn,
                user: parsedUser,
              });
            } else {
              // For mock tokens, use configured expiration to support refresh testing
              sessionService.updateTokenData({
                access_token: storedToken,
                expires_in: tokenConfig.accessTokenExpiresIn,
                user: parsedUser,
              });
            }
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('refreshToken');
        }
      }

      // Handle Entra ID redirect callback (only for Entra mode)
      if (
        entraAuthService.getAuthMode() === 'entra' &&
        entraAuthService.isEntraConfigured()
      ) {
        const result = await entraAuthService.handleRedirectPromise();
        if (result) {
          await handleEntraAuthResult(result);
        }
      }

      hasInitialized.current = true;
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);

      // Handle redirect if one was saved
      const redirectUrl = sessionStorage.getItem('redirectUrl');
      const hasToken = !!localStorage.getItem('token');

      if (redirectUrl && hasToken) {
        sessionStorage.removeItem('redirectUrl');
        if (window.location.pathname !== redirectUrl) {
          window.location.href = redirectUrl;
        }
      }
    }
  }, [handleEntraAuthResult]);

  useEffect(() => {
    const cleanup = setupAuthErrorInterceptor((errorMsg, status) => {
      setAuthError(errorMsg);
      // Automatically log out if we get a 401 Unauthorized (expired/invalid token)
      if (status === 401) {
        console.warn('Authentication failed (401), logging out');
        handleSessionLogout();
      }
    });

    initializeAuth();

    return cleanup;
  }, [initializeAuth, handleSessionLogout]);

  // Cleanup only once on unmount
  useEffect(() => {
    return () => cleanupSessionManagement();
  }, [cleanupSessionManagement]);

  const extendSession = () => {
    sessionService.recordActivity();
    setShowSessionWarning(false);
  };

  const login = useCallback(
    async (userPrincipalName?: string, password?: string): Promise<boolean> => {
      if (authMode === 'entra' && entraAuthService.isEntraConfigured()) {
        // For Entra mode, redirect to Entra login
        await loginWithEntra();
        return true;
      }

      // Mock authentication (backward compatibility)
      if (authMode !== 'mock' || !userPrincipalName || !password) {
        return false;
      }

      const loggedInUser = Object.values(mockUsers).find(
        (u) => u.userPrincipalName === userPrincipalName
      );

      if (password === 'password123' && loggedInUser) {
        const mockToken = 'mock.jwt.token';
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        setToken(mockToken);

        // Update session service with token data to trigger broadcast
        // Use configured expiration for testing refresh behavior
        const tokenConfig = getTokenConfig();
        sessionService.updateTokenData({
          access_token: mockToken,
          expires_in: tokenConfig.accessTokenExpiresIn,
          user: loggedInUser,
        });

        return true;
      }

      return false;
    },
    [authMode, mockUsers]
  );

  const loginWithEntra = useCallback(async (): Promise<void> => {
    if (!entraAuthService.isEntraConfigured()) {
      throw new Error('Entra ID not configured');
    }

    await entraAuthService.loginRedirect();
  }, []);

  const loginWithLoginGov = useCallback(async (): Promise<void> => {
    if (!isLoginGovConfigured) {
      throw new Error('Login.gov not configured');
    }

    // Get auth config from backend to get authorization endpoint
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      console.log('Fetching config from:', `${API_URL}/auth/config`);
      const response = await fetch(`${API_URL}/auth/config`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch config: ${response.status} ${response.statusText}`
        );
      }

      const config = await response.json();
      console.log('Config received:', config);

      const clientId = config.loginGovClientId;
      const authEndpoint = config.loginGovAuthEndpoint;
      const redirectUri = config.loginGovRedirectUri;

      if (!clientId || !authEndpoint || !redirectUri) {
        throw new Error(
          'Missing Login.gov configuration: ' +
            JSON.stringify({ clientId, authEndpoint, redirectUri })
        );
      }

      // Generate cryptographically secure random state and nonce (minimum 22 characters)
      // PKCE code_verifier MUST use only base64url-safe characters for Login.gov compatibility
      const generateRandomString = (length: number): string => {
        const chars =
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        let result = '';
        const randomValues = new Uint8Array(length);
        crypto.getRandomValues(randomValues);
        for (let i = 0; i < length; i++) {
          result += chars[randomValues[i] % chars.length];
        }
        return result;
      };

      const state = generateRandomString(32);
      const nonce = generateRandomString(32);

      // Generate PKCE parameters (code_verifier + code_challenge)
      const generatePKCEParameters = () => {
        const codeVerifier = generateRandomString(128); // 128 chars for maximum entropy

        // Create code_challenge by base64url encoding SHA256 hash of code_verifier
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        return crypto.subtle.digest('SHA-256', data).then((hashBuffer) => {
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashBase64 = btoa(String.fromCharCode(...hashArray))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
          return { codeVerifier, codeChallenge: hashBase64 };
        });
      };

      const pkce = await generatePKCEParameters();

      // Store state, nonce, and code_verifier in sessionStorage for validation on callback
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_nonce', nonce);
      sessionStorage.setItem('oauth_code_verifier', pkce.codeVerifier);

      // Build authorization URL with required Login.gov parameters including PKCE
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        scope: 'openid email profile',
        redirect_uri: redirectUri,
        state: state,
        nonce: nonce,
        code_challenge: pkce.codeChallenge,
        code_challenge_method: 'S256',
        acr_values: 'http://idmanagement.gov/ns/assurance/ial/1',
      });

      // Redirect to Login.gov
      window.location.href = `${authEndpoint}?${params.toString()}`;
    } catch (error) {
      console.error('Login.gov redirect failed:', error);
      throw error;
    }
  }, [isLoginGovConfigured]);

  const exchangeCodeForTokens = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

        // Retrieve code_verifier from sessionStorage (generated during login redirect)
        const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

        // Prevent reuse of authorization codes (single-use only)
        const codeKey = `oauth_code_processed_${code}`;
        if (sessionStorage.getItem(codeKey)) {
          console.warn(
            '⚠️ Authorization code already processed - preventing reuse'
          );
          return false;
        }

        // Mark this code as processed
        sessionStorage.setItem(codeKey, 'true');

        console.log(
          'Exchanging code for tokens at:',
          `${API_URL}/auth/token`,
          'Code:',
          code,
          'Has code_verifier:',
          !!codeVerifier
        );

        const requestBody = {
          code,
          code_verifier: codeVerifier,
        };

        const response = await fetch(`${API_URL}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMsg =
            errorData.message ||
            errorData.error ||
            'Failed to exchange code for tokens';
          setAuthError(errorMsg);
          throw new Error(errorMsg);
        }

        const data = await response.json();

        // Store tokens and user info
        const { access_token, refresh_token, user, expires_in } = data;

        if (!access_token) {
          throw new Error('No access token received from server');
        }

        if (!user) {
          throw new Error('No user data received from server');
        }

        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));

        if (refresh_token) {
          sessionStorage.setItem('refreshToken', refresh_token);
        }

        setUser(user);
        setToken(access_token);

        // Update session service with token data
        if (expires_in) {
          sessionService.updateTokenData({
            access_token,
            expires_in,
            user,
          });
        }

        return true;
      } catch (error) {
        console.error('Token exchange failed:', error);
        return false;
      }
    },
    []
  );

  return (
    <HybridAuthContext.Provider
      value={{
        user,
        login,
        loginWithEntra,
        loginWithLoginGov,
        exchangeCodeForTokens,
        logout,
        token,
        isLoading,
        authMode,
        isEntraConfigured,
        isLoginGovConfigured,
        authError,
        setAuthError,
      }}
    >
      {children}
      <SessionWarning
        isVisible={showSessionWarning}
        timeRemaining={warningTimeRemaining}
        onExtendSession={extendSession}
        onLogout={() => handleSessionLogout()}
      />
    </HybridAuthContext.Provider>
  );
};

export const useHybridAuth = () => {
  const context = useContext(HybridAuthContext);
  if (context === undefined) {
    throw new Error('useHybridAuth must be used within a HybridAuthProvider');
  }
  return context;
};
