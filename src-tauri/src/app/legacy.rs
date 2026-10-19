//! Earlier builds of this macOS distribution were installed as MultiPath,
//! under the identifier `dev.multipath.app`. Their settings are carried over
//! once, the first time FluxBond starts. What it leaves behind is only removed when the
//! user confirms it in Settings, and the MultiPath app itself is never touched.

use std::io;
use std::path::{Path, PathBuf};

use serde::Serialize;

use super::settings::Settings;
use super::usage::Usage;

/// MultiPath's identifier, which names its folders and its login item.
const IDENTIFIER: &str = "dev.multipath.app";
const SETTINGS: &str = "settings.json";
const USAGE: &str = "usage.json";

/// MultiPath's config folder: next to FluxBond's, under its own identifier.
fn old_config_dir(config_dir: &Path) -> Option<PathBuf> {
    Some(config_dir.parent()?.join(IDENTIFIER))
}

/// Copies MultiPath's settings, and today's usage, into `config_dir` unless
/// FluxBond already has settings of its own. The copy is always off: having
/// been on in MultiPath must not turn FluxBond on by itself. MultiPath's own
/// files stay as they are. Returns true if settings were imported.
pub fn import_settings(config_dir: &Path) -> bool {
    let target = config_dir.join(SETTINGS);
    if target.exists() {
        return false;
    }
    let Some(old) = old_config_dir(config_dir) else {
        return false;
    };
    let Some(mut settings) = std::fs::read(old.join(SETTINGS))
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Settings>(&bytes).ok())
    else {
        return false;
    };
    settings.on = false;
    settings.save(&target);
    let usage = Usage::load(&old.join(USAGE));
    if usage != Usage::default() && !config_dir.join(USAGE).exists() {
        usage.save(&config_dir.join(USAGE));
    }
    target.exists()
}

/// Something MultiPath left behind that FluxBond can remove for the user.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Leftover {
    /// The launch agent that opens MultiPath at login.
    LoginItem,
    /// Its settings and usage files.
    Settings,
    /// The web view's caches.
    Caches,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Leftovers {
    /// MultiPath is running, so nothing can be removed until it quits.
    pub running: bool,
    pub items: Vec<Leftover>,
}

/// Where MultiPath kept its files, from the home folder and FluxBond's
/// config folder. Only macOS has anything to tidy up.
pub struct OldInstall {
    home: PathBuf,
    config_dir: PathBuf,
}

impl OldInstall {
    pub fn new(home: PathBuf, config_dir: PathBuf) -> OldInstall {
        OldInstall { home, config_dir }
    }

    /// From `$HOME`, or None without one.
    pub fn for_user(config_dir: PathBuf) -> Option<OldInstall> {
        let home = std::env::var_os("HOME").filter(|home| !home.is_empty())?;
        Some(OldInstall::new(home.into(), config_dir))
    }

    fn login_item(&self) -> PathBuf {
        self.home
            .join("Library/LaunchAgents")
            .join(format!("{IDENTIFIER}.plist"))
    }

    fn settings_files(&self) -> Vec<PathBuf> {
        let Some(dir) = old_config_dir(&self.config_dir) else {
            return Vec::new();
        };
        [SETTINGS, USAGE, "settings.json.tmp", "usage.json.tmp"]
            .iter()
            .map(|name| dir.join(name))
            .collect()
    }

    fn cache_dirs(&self) -> [PathBuf; 2] {
        [
            self.home.join("Library/Caches").join(IDENTIFIER),
            self.home.join("Library/WebKit").join(IDENTIFIER),
        ]
    }

    /// What's still there.
    pub fn find(&self) -> Vec<Leftover> {
        let mut found = Vec::new();
        if self.login_item().exists() {
            found.push(Leftover::LoginItem);
        }
        if self.settings_files().iter().any(|file| file.exists()) {
            found.push(Leftover::Settings);
        }
        if self.cache_dirs().iter().any(|dir| dir.exists()) {
            found.push(Leftover::Caches);
        }
        found
    }

    /// Removes the login item, the settings files (and their folder once
    /// it's empty) and the caches. Anything else in that folder stays.
    pub fn remove(&self) -> io::Result<()> {
        remove_file(&self.login_item())?;
        for file in self.settings_files() {
            remove_file(&file)?;
        }
        if let Some(dir) = old_config_dir(&self.config_dir) {
            // Fails, harmlessly, if the folder holds anything else.
            let _ = std::fs::remove_dir(dir);
        }
        for dir in self.cache_dirs() {
            match std::fs::remove_dir_all(&dir) {
                Err(err) if err.kind() == io::ErrorKind::NotFound => {}
                other => other?,
            }
        }
        Ok(())
    }
}

fn remove_file(path: &Path) -> io::Result<()> {
    match std::fs::remove_file(path) {
        Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(()),
        other => other,
    }
}

/// Whether MultiPath is running: its single-instance socket answers. A bare
/// connection is only a liveness check to it and doesn't open its popup.
#[cfg(unix)]
pub fn is_running() -> bool {
    let path = match std::env::var_os("XDG_RUNTIME_DIR") {
        Some(dir) => PathBuf::from(dir).join("multipath.sock"),
        None => std::env::temp_dir().join(format!("multipath-{}.sock", unsafe { libc::getuid() })),
    };
    std::os::unix::net::UnixStream::connect(path).is_ok()
}

/// Windows keeps no files where `OldInstall` looks, so there's nothing to guard.
#[cfg(windows)]
pub fn is_running() -> bool {
    false
}

/// Whether MultiPath is running and has turned on. Both apps use the same
/// adapter address, and a utun goes away with the app that opened it, so a
/// utun with that address while MultiPath runs is MultiPath's. Turning
/// FluxBond on as well would take away its routes.
#[cfg(target_os = "macos")]
pub fn is_on() -> bool {
    use std::time::{Duration, Instant};

    if !is_running() {
        return false;
    }
    // FluxBond's own utun, just turned off for a restart, may need a moment to go.
    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        if !netdev::get_interfaces().iter().any(crate::engine::is_tun) {
            return false;
        }
        if Instant::now() >= deadline {
            return true;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A fresh home folder with FluxBond's config folder inside, the way
    /// macOS lays them out.
    fn home(name: &str) -> (PathBuf, PathBuf) {
        let home = std::env::temp_dir().join(format!("fb-legacy-{}-{name}", std::process::id()));
        let _ = std::fs::remove_dir_all(&home);
        let config_dir = home.join("Library/Application Support/com.timowse.fluxbond");
        (home, config_dir)
    }

    fn write(path: &Path, text: &str) {
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, text).unwrap();
    }

    #[test]
    fn imports_settings_once_and_always_off() {
        let (home, config_dir) = home("import");
        let old = home.join("Library/Application Support/dev.multipath.app");
        let old_settings = r#"{"on":true,"sticky":true,"dns":["9.9.9.9"],"checkUpdates":true}"#;
        write(&old.join("settings.json"), old_settings);
        write(
            &old.join("usage.json"),
            r#"{"date":[2026,10,19],"bytes":42}"#,
        );

        assert!(import_settings(&config_dir));
        let imported = Settings::load(&config_dir.join("settings.json"));
        assert!(!imported.on, "an import must never turn FluxBond on");
        assert!(imported.sticky && imported.check_updates);
        assert_eq!(
            imported.dns,
            vec!["9.9.9.9".parse::<std::net::IpAddr>().unwrap()]
        );
        assert_eq!(Usage::load(&config_dir.join("usage.json")).bytes, 42);
        // MultiPath's files are left exactly as they were.
        assert_eq!(
            std::fs::read_to_string(old.join("settings.json")).unwrap(),
            old_settings
        );

        // FluxBond's own settings win from then on.
        write(&config_dir.join("settings.json"), r#"{"sticky":false}"#);
        assert!(!import_settings(&config_dir));
        assert!(!Settings::load(&config_dir.join("settings.json")).sticky);
        let _ = std::fs::remove_dir_all(&home);
    }

    #[test]
    fn nothing_to_import() {
        let (home, config_dir) = home("none");
        assert!(!import_settings(&config_dir));
        assert!(!config_dir.join("settings.json").exists());
        // A damaged file isn't imported, and isn't touched.
        let old = home.join("Library/Application Support/dev.multipath.app/settings.json");
        write(&old, "{not json");
        assert!(!import_settings(&config_dir));
        assert_eq!(std::fs::read_to_string(&old).unwrap(), "{not json");
        let _ = std::fs::remove_dir_all(&home);
    }

    #[test]
    fn finds_and_removes_only_multipaths_files() {
        let (home, config_dir) = home("remove");
        let install = OldInstall::new(home.clone(), config_dir.clone());
        assert!(install.find().is_empty());
        install.remove().unwrap();

        let agent = home.join("Library/LaunchAgents/dev.multipath.app.plist");
        let ours = home.join("Library/LaunchAgents/com.timowse.fluxbond.plist");
        let old = home.join("Library/Application Support/dev.multipath.app");
        write(&agent, "<plist/>");
        write(&ours, "<plist/>");
        write(&old.join("settings.json"), "{}");
        write(&old.join("usage.json"), "{}");
        write(
            &home.join("Library/WebKit/dev.multipath.app/WebsiteData/x"),
            "",
        );
        write(&config_dir.join("settings.json"), "{}");
        assert_eq!(
            install.find(),
            [Leftover::LoginItem, Leftover::Settings, Leftover::Caches]
        );

        install.remove().unwrap();
        assert!(install.find().is_empty());
        assert!(!agent.exists() && !old.exists());
        assert!(!home.join("Library/WebKit/dev.multipath.app").exists());
        // FluxBond's own login item and settings stay.
        assert!(ours.exists() && config_dir.join("settings.json").exists());

        // A file it doesn't know keeps the folder.
        write(&old.join("settings.json"), "{}");
        write(&old.join("notes.txt"), "mine");
        install.remove().unwrap();
        assert!(old.join("notes.txt").exists() && !old.join("settings.json").exists());
        assert!(install.find().is_empty());
        let _ = std::fs::remove_dir_all(&home);
    }

    #[test]
    fn leftovers_serialize_for_the_popup() {
        let leftovers = Leftovers {
            running: true,
            items: vec![Leftover::LoginItem, Leftover::Caches],
        };
        assert_eq!(
            serde_json::to_string(&leftovers).unwrap(),
            r#"{"running":true,"items":["loginItem","caches"]}"#
        );
    }
}
