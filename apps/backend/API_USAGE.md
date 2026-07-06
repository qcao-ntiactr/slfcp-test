# SLFCP API Usage Guide

This guide provides instructions on how to use the SLFCP API when in **Login.gov mode**.

## Base URL

The production API base URL is: `https://app-e-osmspp-prod-spaceportal-custom-prod.azurewebsites.net`

## Authentication Flow

SLFCP uses OpenID Connect (OIDC) via Login.gov for authentication. To access protected API endpoints, you must obtain a JWT (JSON Web Token) from the backend.

### 1. Obtain an Authorization Code

Redirect the user to Login.gov to sign in. Since SLFCP uses Login.gov for identity, users must complete the standard authentication process, which includes any Multi-Factor Authentication (MFA) requirements (e.g., Authenticator app, SMS) configured for their Login.gov account.

Login.gov will redirect back to your configured callback URL with an `authorization_code`.

### 2. Exchange Code for Tokens

Send a POST request to `/auth/token` with the authorization code and PKCE code verifier.

**Endpoint:** `POST /auth/token`
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "code": "YOUR_AUTHORIZATION_CODE",
  "code_verifier": "YOUR_PKCE_CODE_VERIFIER"
}
```

**Response:**

```json
{
  "access_token": "BACKEND_JWT_TOKEN",
  "refresh_token": "REFRESH_TOKEN",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "user_id",
    "displayName": "User Name",
    "email": "user@example.com",
    "role": "Commercial"
  }
}
```

### 3. Use the Access Token

For all subsequent requests to protected endpoints, include the `access_token` in the `Authorization` header.

**Header:** `Authorization: Bearer <BACKEND_JWT_TOKEN>`

### 4. Refreshing the Token

When the access token expires, use the refresh token to obtain a new one.

**Endpoint:** `POST /auth/refresh`
**Header:** `Authorization: Bearer <REFRESH_TOKEN>`

**Response:**

```json
{
  "access_token": "NEW_BACKEND_JWT_TOKEN",
  "refresh_token": "NEW_REFRESH_TOKEN",
  "token_type": "Bearer",
  "expires_in": 900
}
```

## Token Lifetimes & Expiration

The SLFCP API uses short-lived sessions for security:

- **Access Tokens**: Valid for **15 minutes**.
- **Refresh Tokens**: Valid for **24 hours**.

After 24 hours, the refresh token will expire, and a human user must manually re-authenticate via Login.gov to obtain a new authorization code and restart the session.

## Rate Limiting

The API is protected by rate-limiting.

- **General requests**: 300 requests per 15 minutes per IP.
- **Auth-related requests**: 10 requests per 15 minutes per IP.

## OpenAPI Specification

The full OpenAPI specification is available at `.\apps\backend\api\open_api_specs\openapi.yaml`.
