# Deploy J1-Hoops j1-hoops-scorekit to GitHub Pages

This folder is ready for GitHub Pages. The `index.html` file is already at the top level, which GitHub Pages needs as the site entry file. The app opens clean with no demo names, groups, or matches, generates a player code at startup, and supports host-only player/team management.

## Upload Through GitHub Website

1. Go to https://github.com and sign in.
2. Click **New repository**.
3. Name it something like `J1-Hoops j1-hoops-scorekit`.
4. Choose **Public** if you are using a free GitHub account and want GitHub Pages.
5. Click **Create repository**.
6. Click **uploading an existing file**.
7. Drag all files from this folder into GitHub.
8. Click **Commit changes**.
9. Go to **Settings**.
10. Click **Pages**.
11. Under **Build and deployment**, choose:
    - Source: **Deploy from a branch**
    - Branch: **main**
    - Folder: **/root**
12. Click **Save**.

After a few minutes, GitHub will give you a site URL like:

```text
https://YOUR_USERNAME.github.io/J1-Hoops j1-hoops-scorekit/
```

Open that URL in Safari on iPhone, then tap:

```text
Share -> Add to Home Screen
```

## Files To Upload

Upload everything in this folder:

- `index.html`
- `styles.css`
- `script.js`
- `manifest.webmanifest`
- `service-worker.js`
- `icon.svg`
- `INSTALLER.html`
- `START-HERE-iPhone.html`
- `README.md`
- `.nojekyll`


