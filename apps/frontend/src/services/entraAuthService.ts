import {
  PublicClientApplication,
  AuthenticationResult,
  PopupRequest,
} from '@azure/msal-browser';

import type { User } from '../context/HybridAuthContext';

interface AuthConfig {
  authMode: 'mock' | 'entra' | 'hybrid';
  entraConfigured: boolean;
  tenantId?: string;
  clientId?: string;
  redirectUri?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user?: User;
}

class EntraAuthService {
  private msalInstance: PublicClientApplication | null = null;
  private authConfig: AuthConfig | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get auth configuration from backend (only authMode and entraConfigured)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/auth/config`);
      const backendConfig = await response.json();

      // Get sensitive config from environment variables (not from backend)
      const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || '';
      const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID || '';
      const redirectUri =
        import.meta.env.VITE_ENTRA_REDIRECT_URI || window.location.origin;

      this.authConfig = {
        ...backendConfig,
        clientId,
        tenantId,
        redirectUri,
      };

      // For Web application flow, we don't need MSAL on the frontend
      // The backend handles all token operations

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Entra Auth Service:', error);
      this.initialized = true; // Set to true to prevent infinite retry
    }
  }

  async loginRedirect(): Promise<void> {
    await this.initialize();

    if (this.authConfig?.authMode === 'mock') {
      // Fallback to mock login or redirect to mock login page
      window.location.href = '/signin';
      return;
    }

    if (
      !this.authConfig?.entraConfigured ||
      !this.authConfig.clientId ||
      !this.authConfig.tenantId
    ) {
      throw new Error('Entra ID not configured');
    }

    // Use authorization code flow - redirect to Microsoft login
    const authUrl = new URL(
      `https://login.microsoftonline.com/${this.authConfig.tenantId}/oauth2/v2.0/authorize`
    );
    authUrl.searchParams.set('client_id', this.authConfig.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set(
      'redirect_uri',
      this.authConfig.redirectUri || window.location.origin
    );
    authUrl.searchParams.set('scope', 'openid profile email User.Read');
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('prompt', 'select_account');

    // Add state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('auth_state', state);
    authUrl.searchParams.set('state', state);

    window.location.href = authUrl.toString();
  }

  async loginPopup(): Promise<AuthenticationResult | null> {
    await this.initialize();

    if (!this.msalInstance || this.authConfig?.authMode === 'mock') {
      return null;
    }

    const loginRequest: PopupRequest = {
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      prompt: 'select_account',
    };

    try {
      return await this.msalInstance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Login popup failed:', error);
      return null;
    }
  }

  async handleRedirectPromise(): Promise<TokenResponse | null> {
    await this.initialize();

    // Check if we have an authorization code in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const rawCode = urlParams.get('code');
    const rawState = urlParams.get('state');
    const rawError = urlParams.get('error');

    // Sanitize input before branching
    const code =
      typeof rawCode === 'string' && rawCode.length > 0 ? rawCode : null;
    const state =
      typeof rawState === 'string' && /^[A-Za-z0-9._-]+$/.test(rawState)
        ? rawState
        : null;
    const error = typeof rawError === 'string' ? rawError : null;

    if (error) {
      console.error('OAuth error:', error, urlParams.get('error_description'));
      return null;
    }

    if (!code) {
      return null; // No code, not a redirect from Microsoft
    }

    // Verify state parameter
    const storedState = localStorage.getItem('auth_state');
    if (state !== storedState) {
      console.error('State mismatch - possible CSRF attack');
      return null;
    }

    // Clean up state
    localStorage.removeItem('auth_state');

    try {
      // Exchange code for tokens via backend
      const tokens = await this.exchangeCodeForTokens(code);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      return tokens;
    } catch (error) {
      console.error('Handle redirect promise failed:', error);
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    // For Web application flow, just return the stored token
    return localStorage.getItem('token');
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${API_URL}/auth/token`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to exchange code for tokens');
    }

    const tokenResponse = await response.json();

    // Store refresh token in sessionStorage if provided
    if (tokenResponse.refresh_token) {
      sessionStorage.setItem('refreshToken', tokenResponse.refresh_token);
    }

    return tokenResponse;
  }

  async refreshToken(_currentToken: string): Promise<TokenResponse> {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const refreshToken = sessionStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to refresh token');
    }

    const tokenResponse = await response.json();

    // Update refresh token if provided in response
    if (tokenResponse.refresh_token) {
      sessionStorage.setItem('refreshToken', tokenResponse.refresh_token);
    }

    return tokenResponse;
  }

  async getCurrentUser(): Promise<User | null> {
    const token = await this.getAccessToken();
    if (!token) {
      return null;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${API_URL}/auth/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  async logout(): Promise<void> {
    await this.initialize();

    // Call backend logout endpoint to clear refresh token
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
    } catch (error) {
      console.error('Backend logout failed:', error);
      // Continue with local cleanup even if backend call fails
    }

    // Clear all token storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('refreshToken');

    if (this.msalInstance && this.authConfig?.authMode !== 'mock') {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        try {
          await this.msalInstance.logoutRedirect({
            account: accounts[0],
          });
        } catch (error) {
          console.error('Logout failed:', error);
          // Force redirect to home page
          window.location.href = '/';
        }
      }
    } else {
      // For mock mode, just redirect to home
      window.location.href = '/';
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  getAuthMode(): string {
    return this.authConfig?.authMode || '';
  }

  isEntraConfigured(): boolean {
    return this.authConfig?.entraConfigured || false;
  }
}

export const entraAuthService = new EntraAuthService();
