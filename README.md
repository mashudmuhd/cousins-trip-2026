# കാട്ടിലെ കുട്ടികൾ · Cousins Trip 2026

A mobile-first, bilingual registration app built with HTML, CSS and JavaScript. No framework or build step is required. The configured Google Apps Script endpoint is in `dist/config.js`.

## Included

- Family member cards, three age groups, required mobile number and adult validation.
- Live Google Sheets list, 30-second refresh, counts, search, local cache and pending-save recovery.
- Duplicate-number dialog, accessible tabs, keyboard controls, reduced-motion support.
- Sound toggle, quiet fireflies, celebration confetti and organiser WhatsApp link.
- Standalone Apps Script backend with locked duplicate checking and server-side validation.

## Existing backend

The supplied endpoint was verified to return `status: success` and registrations in `data`, including `membersList`. The frontend sends compatible fields: ticketId, familyHead, phone, totalCount, adultCount, kid8to15Count, kidBelow8Count, membersSummary, membersList. Its POST handler has not been inspected or replaced. A live test registration has not been added to your sheet.

The app checks the remote list before submission and shows confirmation only after a successful POST response. A failed or uncertain POST remains pending on the device. Refresh checks for a completed write before retrying. For race-proof duplicate prevention across simultaneous devices, deploy the supplied Apps Script or confirm that your current backend uses a script lock and checks the phone inside that lock.

WhatsApp opens after a successful save. Some browsers block new windows after network requests; a visible “Send to organiser on WhatsApp” link is always provided. Opening a message does not send it automatically.

## Deploy or replace the Apps Script

1. Open your target Google Sheet → Extensions → Apps Script.
2. Paste `google-apps-script.js`. For standalone Apps Script projects, set Script Property `SPREADSHEET_ID` to your Google Sheet ID.
3. The script creates a dedicated **Cousins Trip 2026** tab with headers and styling. It does not migrate existing tabs. Retain or adapt your existing tab schema if preserving prior registrations in place.
4. Deploy → New deployment → Web app → Execute as Me → Who has access: Anyone. Authorise Google’s permissions in your account.
5. Paste the deployment URL ending in `/exec` into `dist/config.js` and republish the frontend. For later changes to an existing deployment, update it to a new version.

The joined list exposes family names, phones, and age groups to anyone allowed to open the site, as requested. The Apps Script endpoint itself has public read access. The original Sites deployment is private to its owner. The GitHub Pages deployment is public.

## Local preview

Serve `dist` using any static HTTP server. Open the served URL in your browser. Opening the HTML directly as a file may prevent remote requests.


## GitHub Pages

The complete project source is on the `main` branch. GitHub Pages publishes the static app from the root of the `gh-pages` branch, generated from `dist`. Google Apps Script continues to handle registration storage.

To publish later changes from this checkout:

```sh
git add .
git commit -m "Update trip registration"
git push github main
git subtree push --prefix dist github gh-pages
```

Only files in `dist` are served by GitHub Pages. The backend source and setup instructions remain in the repository.
