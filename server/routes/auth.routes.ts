import { Router, Request, Response } from 'express';
import { ENV } from '../config/env';

export const authRouter = Router();

// Endpoint: Outlook OAuth URL
authRouter.get('/auth/outlook/url', (req: Request, res: Response) => {
  const origin = req.headers.origin || ENV.APP_URL;
  const redirectUri = `${origin}/auth/callback`;
  const clientId = ENV.OUTLOOK_CLIENT_ID;

  const params = new URLSearchParams({
    client_id: clientId || 'sample-outlook-client-id',
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: 'https://graph.microsoft.com/Mail.Read user.read openid profile',
    response_mode: 'fragment',
    state: 'provider=outlook',
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

  res.json({
    url: authUrl,
    redirectUri,
    isConfigured: Boolean(clientId),
    provider: 'outlook',
  });
});

// Endpoint: Gmail OAuth URL
authRouter.get('/auth/gmail/url', (req: Request, res: Response) => {
  const origin = req.headers.origin || ENV.APP_URL;
  const redirectUri = `${origin}/auth/callback`;
  const clientId = ENV.GOOGLE_CLIENT_ID;

  const params = new URLSearchParams({
    client_id: clientId || 'sample-google-client-id',
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'https://www.googleapis.com/auth/gmail.readonly email profile',
    include_granted_scopes: 'true',
    state: 'provider=gmail',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  res.json({
    url: authUrl,
    redirectUri,
    isConfigured: Boolean(clientId),
    provider: 'gmail',
  });
});

// OAuth Callback HTML generator for popup
export function renderAuthCallbackHtml(): string {
  return `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <title>Autoryzacja skrzynki e-mail</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        background: #0f172a;
        color: #f8fafc;
      }
      .card {
        text-align: center;
        padding: 2.5rem;
        background: #1e293b;
        border-radius: 1.25rem;
        border: 1px solid #334155;
        max-width: 440px;
        box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.5);
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(59, 130, 246, 0.25);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 1.25rem;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      h2 { margin: 0 0 0.5rem 0; font-size: 1.35rem; font-weight: 700; }
      p { color: #94a3b8; font-size: 0.95rem; margin: 0; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h2>Połączono ze skrzynką!</h2>
      <p>Przekazywanie uprawnień do trackera aplikacji... To okno zamknie się automatycznie za chwilę.</p>
    </div>
    <script>
      (function() {
        const hash = window.location.hash.substring(1);
        const search = window.location.search.substring(1);
        const params = new URLSearchParams(hash || search);
        const accessToken = params.get('access_token');
        const code = params.get('code');
        const state = params.get('state') || '';
        const error = params.get('error') || params.get('error_description');

        const provider = state.includes('outlook') ? 'outlook' : state.includes('gmail') ? 'gmail' : 'unknown';

        const payload = {
          type: 'OAUTH_AUTH_SUCCESS',
          provider,
          accessToken,
          code,
          state,
          error,
          timestamp: Date.now()
        };

        if (window.opener) {
          window.opener.postMessage(payload, '*');
          setTimeout(function() { window.close(); }, 600);
        } else {
          setTimeout(function() { window.location.href = '/'; }, 1000);
        }
      })();
    </script>
  </body>
</html>`;
}
