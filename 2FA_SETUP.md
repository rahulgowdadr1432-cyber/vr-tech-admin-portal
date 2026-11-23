# Admin login two-factor authentication

The existing login now gates access to the portal with Supabase Auth TOTP MFA. On the first successful password sign-in, the portal displays a QR code for an authenticator app and requires a valid code to finish setup. Future sign-ins require a fresh 6-digit code before the admin interface opens.

## Supabase setup

1. In Supabase, enable TOTP authenticator factors under Authentication → MFA settings.
2. In Authentication → Settings, set the minimum AAL to `aal2` for admin authentication where supported.
3. Protect sensitive tables and operations with RLS policies requiring `auth.jwt() ->> 'aal' = 'aal2'`. A browser-only screen is not a security boundary by itself; RLS/server-side enforcement is essential.
4. Test with an administrator account and keep account recovery access available before enforcing MFA for all administrators.

The portal uses the `team-builder.js` script tag already present in `index.html`; no changes to the login form markup are needed.
