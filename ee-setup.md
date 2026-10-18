# Earth Engine Analyzer: one-time setup (site owner)

The page `ee-analyzer.html` signs each student in with their own Google account, so no key or secret is stored on the site.

## You (site owner), once
1. In the Google Cloud Console, open (or create) a project and go to **APIs & Services > Credentials**.
2. Configure the OAuth consent screen (External; add the Earth Engine scope if asked).
3. **Create credentials > OAuth client ID > Web application.**
4. Under **Authorised JavaScript origins** add `https://mdrokibul.me` (and `https://www.mdrokibul.me` if you use it). No redirect URI is needed.
5. Copy the client ID (`...apps.googleusercontent.com`) and paste it into `OAUTH_CLIENT_ID` at the top of the script in `ee-analyzer.html`. A client ID is public, not a secret.

If you skip step 5, students can paste a client ID into the page themselves.

## Each student
1. Register at https://earthengine.google.com/signup/ (non-commercial).
2. Create a Cloud project, register it for Earth Engine, enable the Earth Engine API.
3. Open the page, type the **project ID**, press **Sign in with Google**.
