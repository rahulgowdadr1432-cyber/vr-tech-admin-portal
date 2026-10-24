VR TECH SOLUTIONS — ADMIN PORTAL STARTER

Files:
- index.html: responsive black-and-gold login and admin interface
- app.js: Supabase authentication and starter CRUD interface

IMPORTANT SETUP
1. Open app.js in a text editor.
2. Replace:
   PASTE_YOUR_SUPABASE_PROJECT_URL_HERE
   PASTE_YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE
   with your Supabase Project URL and PUBLIC anon/publishable key.
3. Never use a service_role key or secret key in browser JavaScript.
4. Your SQL tables have Row Level Security enabled. This starter does not create any RLS policies. The portal will not be able to read/write records until secure admin-only policies are configured and tested.
5. Do not add a broad policy allowing all users. Authentication alone does not prove a user is the administrator.
6. Configure Supabase Auth URL settings and password-reset redirect URLs for the final hosted domain.
7. This is a starter interface, not a fully audited production system. Test with non-sensitive sample data first.

Tables expected:
customers, enquiries, projects, transactions, staff, invoices

Current functions:
- Email/password sign-in
- Password reset request
- Sign out
- Add and list records (after secure policies are configured)
- Basic dashboard totals (after secure policies are configured)

Suggested next step:
Create a private GitHub repository or use a local code editor, then publish the static frontend. Configure the custom subdomain DNS only after hosting is deployed.
