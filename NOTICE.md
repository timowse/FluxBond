# Notice

FluxBond is based on **MultiPath** by **Uditya Kumar**
(<https://github.com/uditya-kumar/MultiPath>), released under the MIT License. The original copyright notice and
license are kept in [LICENSE](LICENSE) and apply to this distribution as well.

This distribution, developed by Timo Wiese, adds:

- the macOS backend for Apple silicon (`utun` adapter, interface-pinned sockets, a short-lived root helper behind the
  administrator password prompt);
- native routing and DNS integration through the system's `route`, `ifconfig` and `scutil` tools;
- the redesigned interface, the FluxBond name, icon and visual identity;
- signed self-updates (minisign signatures, verified before anything is installed).

Third-party components keep their own licenses, such as Wintun (`src-tauri/resources/wintun-LICENSE.txt`) and the
Rust and npm dependencies listed in `src-tauri/Cargo.lock` and `package-lock.json`.
