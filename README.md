# ScoreKit Prototype

ScoreKit is an iPhone-friendly black-and-white PWA prototype for scoring basketball, pickleball, and badminton games while tracking player wins, losses, and leaderboard records.

Open `INSTALLER.html` first. It acts as the iPhone install launcher for the PWA version.

Players can add their own names from the Players tab or by typing names when starting a new game. Each person can be marked as Player, Organizer, or Organizer + Player. A game organizer can also create groups from the Groups tab, switch the active group, and keep match history plus all-time win/loss records for that group. Records are stored locally on the device.

## Open Locally

Open `index.html` in a browser to preview the prototype.

## Install On iPhone

iPhone installation requires the files to be hosted over HTTPS.

1. Upload this folder to a static host such as Netlify, Vercel, Cloudflare Pages, or GitHub Pages.
2. Open the hosted URL in Safari on iPhone.
3. Tap Share.
4. Tap Add to Home Screen.
5. Launch ScoreKit from the home screen.

## Native iOS Note

This is a PWA prototype. To distribute through TestFlight or the App Store, convert the design and logic into a native iOS app or React Native / Expo app, then build with an Apple Developer account.
