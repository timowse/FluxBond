# Releasing FluxBond for macOS (Apple silicon)

Releases go to **https://github.com/timowse/FluxBond/releases**. The app looks for updates at

    https://github.com/timowse/FluxBond/releases/latest/download/latest.json

That URL always points at the **latest published, non-prerelease** release. A draft or a prerelease is invisible to
the updater, so publish it as a normal release once everything is uploaded.

## Build the release

1. The version must agree in **all three** places: `package.json` (plus `npm install` to sync `package-lock.json`),
   `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`. `cargo test` fails if they disagree (`versions_agree`).
2. Run the full test suite (see the README), then

       scripts/release-macos.sh "One or two plain sentences: what's new"

   The notes appear in the popup's update prompt.

The script refuses to build if the key is missing, isn't mode 0600, doesn't match the public key in
`tauri.conf.json`, or if the versions disagree. It replaces the previous archive, signature, feed and checksums in
`release-assets/`, so copy an earlier release's files into a subfolder first if you still need them.

It produces these files in `release-assets/` (shown for 1.0.0). Their names must stay exactly as they are, because
`latest.json` points at `https://github.com/timowse/FluxBond/releases/download/v1.0.0/FluxBond_1.0.0_aarch64.app.tar.gz`.

| file | what it is |
| --- | --- |
| `FluxBond_1.0.0_aarch64.dmg` | the installer people download by hand |
| `FluxBond_1.0.0_aarch64.app.tar.gz` | what the in-app updater downloads |
| `FluxBond_1.0.0_aarch64.app.tar.gz.sig` | its updater signature (minisign, also inside `latest.json`) |
| `latest.json` | the update feed: version, notes, date, `darwin-aarch64` URL and signature |
| `SHA256SUMS` | checksums of the four files above (`shasum -a 256 -c SHA256SUMS`); uploading it is optional |

The signature's trusted comment is `version:<version>`. The app is configured with `requireSignedVersion`, so a feed
that announces another version with this archive is refused.

## Publish a release (manual, nothing here does it for you)

1. Check the files: `cd release-assets && shasum -a 256 -c SHA256SUMS`, then
   `cd ../src-tauri && cargo test -- --ignored release_assets` (verifies the archive against the public key and
   `latest.json`, the same way the app will, and that a changed byte fails).
2. Push the source to `timowse/FluxBond` and create the tag `v<version>` on that commit.
3. On GitHub: **Releases → Draft a new release**, tag `v<version>`, title `FluxBond <version>`, upload the four files.
4. Leave "Set as a pre-release" **unticked** and publish.
5. Check the feed: `curl -sL https://github.com/timowse/FluxBond/releases/latest/download/latest.json` shows the new
   version, and the `url` inside it downloads (HTTP 200 after redirects).

With the GitHub CLI, steps 3–4 are
`gh release create v1.0.0 --repo timowse/FluxBond --title "FluxBond 1.0.0" --notes-file <notes>
release-assets/FluxBond_1.0.0_aarch64.dmg release-assets/FluxBond_1.0.0_aarch64.app.tar.gz
release-assets/FluxBond_1.0.0_aarch64.app.tar.gz.sig release-assets/latest.json`.

1.0.0 is the first FluxBond release, so it is installed from the DMG by hand. Every later release is offered in the
app. FluxBond has its own bundle identifier, so it installs next to an earlier MultiPath build rather than replacing
it; MultiPath's own updater never offers FluxBond.

## The signing key

- Private key: `~/.config/fluxbond/updater.key` (mode 0600, folder 0700), or the path in `FLUXBOND_UPDATER_KEY`. It
  has an empty password, so the file permissions are what protect it. Never commit, print or upload it.
  `.gitignore` excludes `*.key`.
- Public key: `updater.key.pub` next to it, the same text as `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`.
- **Back it up** somewhere safe and offline, such as an encrypted disk image or a password manager. If it's lost,
  installed copies can never accept another update; people would have to reinstall a build with a new public key by
  hand.
- If it leaks, anyone could sign updates that installed copies accept. Generate a new key
  (`npx tauri signer generate -w <path>`), put its public key in `tauri.conf.json`, publish a release signed with the
  **old** key that carries the new public key, and sign everything after that with the new key.
- To build from another machine or CI, give it the key as a secret: `TAURI_SIGNING_PRIVATE_KEY` (the key's text or
  the path to the file) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (empty). `tauri build` ignores
  `TAURI_SIGNING_PRIVATE_KEY_PATH`.

## What a release is not

- **Not notarised and only ad-hoc signed** (no Apple Developer ID). The first open needs right-click → Open, and
  Gatekeeper's `spctl` rejects it. In-app updates still work: the updater checks its own minisign signature, which is
  independent of Apple code signing. A Developer ID build would also need `APPLE_*` notarisation variables for
  `tauri build`.
- Apple silicon only: there is no Intel build, and `latest.json` lists only `darwin-aarch64`.
