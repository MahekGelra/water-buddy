# Water Buddy 💧

A tiny, free water reminder for macOS. A friendly blue water drop slides up from the bottom-right of your screen at the interval you choose (15, 30, 45 or 60 minutes) with buttons to confirm you drank, snooze or dismiss. It lives in the menu bar, runs in the background and has no account, tracking or internet access.

## Features
- Animated water-drop reminder with friendly messages
- Menu bar controls: remind now, pause/resume, interval, launch at login
- Settings saved locally
- Recovers after sleep (one reminder, no pile-up)

## Run it
Requires Node.js 20+.

    npm install
    npm run icons   # generates the icons into assets/
    npm start       # normal run (45 min default)
    npm run fast    # test mode: reminders every minute

## Build the app
    npm run pack
    cp -R "dist/mac-arm64/Water Buddy.app" /Applications/

Use `dist/mac/` instead of `dist/mac-arm64/` on Intel Macs.

Built with Electron, vanilla HTML/CSS/JS.

## License
MIT