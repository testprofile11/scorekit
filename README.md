# J1-Hoops Scorekit Prototype

J1-Hoops Scorekit is an iPhone-friendly black-and-white PWA prototype for scoring basketball, pickleball, and badminton games while tracking player wins, losses, and leaderboard records.

Open `INSTALLER.html` first. It acts as the iPhone install launcher for the PWA version.

The app opens clean with no demo players, groups, or match history. A user can choose **Host** to create a group, or **Joiner** to join/add themselves to a group. Each person gets a unique code like `Player#00000`, can be marked as Player, Organizer, or Organizer + Player, and can be assigned to a team inside the active group. Records are stored locally on the device.

Basketball matches include a 12-minute countdown timer with start, pause, and reset controls.

The app supports both portrait and landscape rotation. Landscape mode gives the live scoreboard a wider side-by-side layout.

Match history can be cleared for the active group without deleting players, teams, or groups.

## Open Locally

Open `index.html` in a browser to preview the prototype.

## Install On iPhone

iPhone installation requires the files to be hosted over HTTPS.

1. Upload this folder to a static host such as Netlify, Vercel, Cloudflare Pages, or GitHub Pages.
2. Open the hosted URL in Safari on iPhone.
3. Tap Share.
4. Tap Add to Home Screen.
5. Launch J1-Hoops Scorekit from the home screen.

## Native iOS Note

This is a PWA prototype. To distribute through TestFlight or the App Store, convert the design and logic into a native iOS app or React Native / Expo app, then build with an Apple Developer account.

