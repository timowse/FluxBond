//! The pages the About screen links to, opened in the default browser. The
//! popup names a page; it can't open an address of its own.

use std::process::Command;

use serde::Deserialize;

const REPOSITORY: &str = "https://github.com/timowse/FluxBond";
const UPSTREAM: &str = "https://github.com/uditya-kumar/MultiPath";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Page {
    Repository,
    License,
    Notice,
    /// The project FluxBond is based on.
    Upstream,
    UpstreamLicense,
}

impl Page {
    pub fn url(self) -> String {
        match self {
            Page::Repository => REPOSITORY.to_owned(),
            Page::License => format!("{REPOSITORY}/blob/main/LICENSE"),
            Page::Notice => format!("{REPOSITORY}/blob/main/NOTICE.md"),
            Page::Upstream => UPSTREAM.to_owned(),
            Page::UpstreamLicense => format!("{UPSTREAM}/blob/main/LICENSE"),
        }
    }
}

fn browser(url: &str) -> Command {
    #[cfg(target_os = "macos")]
    let mut cmd = Command::new("/usr/bin/open");
    #[cfg(target_os = "linux")]
    let mut cmd = Command::new("xdg-open");
    #[cfg(windows)]
    let mut cmd = Command::new("explorer.exe");
    cmd.arg(url);
    cmd
}

#[tauri::command]
pub fn open_page(page: Page) -> Result<(), String> {
    browser(&page.url())
        .spawn()
        .map(drop)
        .map_err(|err| format!("couldn't open {}: {err}", page.url()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pages_are_fixed_https_addresses() {
        for page in [
            Page::Repository,
            Page::License,
            Page::Notice,
            Page::Upstream,
            Page::UpstreamLicense,
        ] {
            assert!(page.url().starts_with("https://github.com/"), "{page:?}");
        }
        assert_eq!(
            Page::Upstream.url(),
            "https://github.com/uditya-kumar/MultiPath"
        );
        let page: Page = serde_json::from_str(r#""upstreamLicense""#).unwrap();
        assert_eq!(page, Page::UpstreamLicense);
        // Only a page's name is accepted, never an address.
        assert!(serde_json::from_str::<Page>(r#""https://example.com""#).is_err());
    }
}
