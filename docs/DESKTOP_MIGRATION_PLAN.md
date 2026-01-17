# Desktop App Migration Plan for Second Brain

## Executive Summary

This document outlines a phased approach to wrapping Second Brain as a native desktop application. After thorough research comparing Electron, Tauri, and Neutralino, **Tauri 2.0 is recommended** as the optimal framework for this migration.

---

## Framework Comparison

### Bundle Size & Performance

| Framework | Typical Bundle Size | Memory Usage | Startup Time |
|-----------|-------------------|--------------|--------------|
| **Tauri** | ~600KB - 3MB | Low (uses OS webview) | Fast |
| Electron | 150MB - 250MB | High (bundles Chromium) | Slower |
| Neutralino | ~2MB compressed | Low (uses system browser) | Fast |

### Feature Comparison

| Feature | Tauri 2.0 | Electron | Neutralino |
|---------|-----------|----------|------------|
| Bundle Size | Minimal | Large | Small |
| Security Model | Excellent (Rust, sandboxed) | Moderate | Good |
| Native APIs | Via plugins + Rust | Via Node.js | Limited |
| Cross-platform | Win/Mac/Linux + Mobile | Win/Mac/Linux | Win/Mac/Linux/Web |
| Auto-updates | Built-in plugin | Via electron-updater | Manual |
| Code Signing | Built-in support | Built-in support | Manual |
| Community/Ecosystem | Growing rapidly | Mature, extensive | Smaller |
| Learning Curve | Moderate (Rust for native) | Low (JavaScript only) | Low |

---

## Recommendation: Tauri 2.0

### Rationale

1. **Bundle Size**: Our users will download a ~2-3MB app instead of 150MB+
2. **Security**: Rust-based core with strict security boundaries; WebView is sandboxed
3. **Our Stack Compatibility**: Vite + React + TypeScript is first-class supported
4. **Existing PWA Foundation**: Our offline-first architecture with Workbox translates directly
5. **Mobile Future**: Tauri 2.0 supports iOS and Android, enabling future mobile expansion
6. **Modern Architecture**: Uses OS-native WebView (no Chromium bundling)
7. **Active Development**: Tauri 2.0 released with strong momentum and backing

### When Electron Might Be Better

- If extensive Node.js ecosystem dependencies are required
- If team has zero Rust experience and native extensions are critical
- If targeting very old OS versions (Tauri requires newer WebView)

---

## Current Architecture Analysis

### Existing Stack (packages/web)

```
- Vite 5.x (build tool)
- React 18.3 + TypeScript
- React Router v7
- TanStack React Query
- Tailwind CSS
- PWA via vite-plugin-pwa + Workbox
- Service Worker with:
  - Background sync for offline captures
  - NetworkFirst caching for API
  - CacheFirst for static assets
  - StaleWhileRevalidate for images
```

### Compatibility Assessment

| Component | Tauri Compatibility | Notes |
|-----------|-------------------|-------|
| Vite 5.x | Excellent | Native integration via `@tauri-apps/cli` |
| React 18 | Excellent | Standard frontend framework support |
| TypeScript | Excellent | Full support |
| React Router v7 | Excellent | Client-side routing works unchanged |
| TanStack Query | Excellent | HTTP requests work via WebView |
| Tailwind CSS | Excellent | CSS framework agnostic |
| Service Worker | Partial | PWA features work but some desktop alternatives exist |
| Workbox | Partial | Can keep for web, use native storage for desktop |

---

## Desktop Features Implementation

### 1. Global Hotkeys

**Tauri Plugin**: `@tauri-apps/plugin-global-shortcut`

```typescript
import { register } from '@tauri-apps/plugin-global-shortcut';

// Quick capture hotkey
await register('CommandOrControl+Shift+C', () => {
  // Open quick capture window
});
```

**Use Cases**:
- `Cmd/Ctrl+Shift+C`: Quick capture from anywhere
- `Cmd/Ctrl+Shift+S`: Show/hide app
- `Cmd/Ctrl+Shift+I`: Quick inbox view

### 2. System Tray

**Tauri Feature**: Built-in tray icon support

```typescript
import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu } from '@tauri-apps/api/menu';

const tray = await TrayIcon.new({
  icon: 'icons/tray-icon.png',
  tooltip: 'Second Brain',
  menu: await Menu.new({
    items: [
      { id: 'capture', text: 'Quick Capture' },
      { id: 'inbox', text: 'Open Inbox' },
      { id: 'quit', text: 'Quit' }
    ]
  })
});
```

### 3. Native Notifications

**Tauri Plugin**: `@tauri-apps/plugin-notification`

```typescript
import { sendNotification, requestPermission } from '@tauri-apps/plugin-notification';

await sendNotification({
  title: 'Second Brain',
  body: 'New item added to inbox'
});
```

### 4. Auto-Launch on Startup

**Tauri Plugin**: `@tauri-apps/plugin-autostart`

```typescript
import { enable, isEnabled } from '@tauri-apps/plugin-autostart';

// Enable auto-start (user preference)
if (userWantsAutoStart) {
  await enable();
}
```

### 5. Offline-First / Local Storage

**Options**:
- Keep existing Service Worker for web parity
- Use Tauri's file system APIs for local data persistence
- SQLite via `@tauri-apps/plugin-sql` for structured local data

---

## Phased Implementation Plan

### Phase 1: Foundation Setup
**Complexity: Low-Medium**

#### Tasks:
1. **Install Tauri CLI and dependencies**
   ```bash
   npm install -D @tauri-apps/cli@latest
   npx tauri init
   ```

2. **Configure Tauri for existing Vite setup**
   - Create `src-tauri/` directory structure
   - Configure `tauri.conf.json` with correct paths
   - Set `frontendDist: "../dist"` and `devUrl: "http://localhost:5173"`

3. **Update Vite configuration**
   ```typescript
   // vite.config.ts additions
   server: {
     port: 5173,
     strictPort: true,
   }
   ```

4. **Add npm scripts**
   ```json
   {
     "scripts": {
       "tauri:dev": "tauri dev",
       "tauri:build": "tauri build"
     }
   }
   ```

5. **Basic window configuration**
   - Set window title, size, resizable options
   - Configure app icon

#### Deliverable:
- App runs in Tauri window with existing functionality
- Dev workflow: `npm run tauri:dev`

#### Risks:
- WebView compatibility issues on older OS versions
- Potential CSS/rendering differences from browser

---

### Phase 2: Desktop Features - Core
**Complexity: Medium**

#### Tasks:
1. **System Tray Integration**
   - Add tray icon with context menu
   - Quick actions: Capture, Inbox, Settings, Quit
   - Minimize to tray option

2. **Global Hotkey: Quick Capture**
   - Register `Cmd/Ctrl+Shift+C` for instant capture
   - Create lightweight capture window component
   - Handle hotkey conflicts gracefully

3. **Native Notifications**
   - Replace web notifications with native ones
   - Notification preferences in settings

4. **Window Management**
   - Remember window position/size
   - Multiple window support (main + quick capture)

#### Deliverable:
- Functional system tray with menu
- Global hotkey for quick capture
- Native notification support

#### Risks:
- Linux tray support limitations
- Hotkey conflicts with other apps

---

### Phase 3: Desktop Features - Enhanced
**Complexity: Medium**

#### Tasks:
1. **Auto-Launch on Startup**
   - Add to system startup (optional, user preference)
   - Settings toggle

2. **Local Data Persistence**
   - Evaluate keeping PWA offline vs. Tauri native storage
   - Consider SQLite for structured data if needed

3. **Deep Link Handling**
   - Register `secondbrain://` protocol
   - Handle URLs for quick actions

4. **Clipboard Integration**
   - Quick capture from clipboard
   - Paste detection

#### Deliverable:
- Auto-launch capability
- Enhanced local storage
- Deep linking support

#### Risks:
- Platform-specific deep link registration complexity
- Data migration from existing PWA storage

---

### Phase 4: Build & Distribution Setup
**Complexity: High**

#### Tasks:
1. **Code Signing Setup**

   **macOS**:
   - Enroll in Apple Developer Program ($99/year)
   - Generate Developer ID certificate
   - Configure notarization

   **Windows**:
   - Purchase EV code signing certificate (~$300-500/year)
   - Configure certificate in build process
   - Options: DigiCert, GlobalSign, Sectigo

2. **Auto-Update System**
   - Configure `@tauri-apps/plugin-updater`
   - Set up update server (static JSON or dynamic)
   - Generate signing keys for updates
   ```bash
   npx tauri signer generate -w ~/.tauri/keys
   ```

3. **Build Configuration**
   - macOS: DMG, App bundle
   - Windows: MSI, NSIS installer
   - Linux: AppImage, .deb, .rpm

4. **CI/CD Pipeline**
   - GitHub Actions workflow for multi-platform builds
   - Automated signing and notarization
   - Release artifact publishing

#### Deliverable:
- Signed installers for all platforms
- Working auto-update system
- Automated build pipeline

#### Risks:
- Code signing certificate costs
- macOS notarization delays
- CI complexity for cross-platform builds

---

### Phase 5: Polish & Release
**Complexity: Medium**

#### Tasks:
1. **Platform-Specific Polish**
   - macOS: Menu bar integration, dock icon behavior
   - Windows: Taskbar integration, jump lists
   - Linux: Desktop file, icons

2. **Performance Optimization**
   - Startup time analysis
   - Memory usage profiling
   - Bundle size optimization

3. **Testing**
   - Cross-platform testing matrix
   - Auto-update testing
   - Edge case handling

4. **Documentation**
   - User installation guide
   - Troubleshooting guide
   - Update process documentation

#### Deliverable:
- Production-ready desktop application
- Comprehensive documentation
- Release v1.0

---

## Reference Implementations

### Recommended Templates

1. **electron-vite-react** (if choosing Electron)
   - https://github.com/electron-vite/electron-vite-react
   - Modern Vite + React + TypeScript template
   - Built-in HMR, TypeScript support, Tailwind CSS

2. **Tauri + Vite + React**
   - Use `create-tauri-app` with React template
   - Or add Tauri to existing Vite project

### Notable Tauri Apps (Reference)

- **ChatGPT desktop clients** - Cross-platform AI chat apps
- **PromptLab** - Code context for AI models
- **MarkFlowy** - Markdown editor with AI integration
- **Stable Diffusion Buddy** - AI image generation UI

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| WebView compatibility issues | Medium | High | Test on target OS versions early |
| Code signing costs | Certain | Medium | Budget for certificates |
| Rust learning curve | Low | Medium | Most work is JS/TS; Rust only for native features |
| Platform-specific bugs | Medium | Medium | Comprehensive testing matrix |
| Auto-update failures | Low | High | Robust rollback mechanism |
| User migration from PWA | Low | Low | Keep web version available |

---

## Cost Estimates

### One-Time Costs
- Apple Developer Program: $99/year
- Windows EV Certificate: ~$300-500/year (or Azure Trusted Signing)

### Recurring Costs
- Code signing renewals: ~$500/year total
- Update hosting: Minimal (static files or GitHub releases)

### Development Investment
- Phase 1: Foundation - Small
- Phase 2: Core Features - Medium
- Phase 3: Enhanced Features - Medium
- Phase 4: Distribution - Large (signing setup complexity)
- Phase 5: Polish - Medium

---

## Decision Checklist

Before proceeding, confirm:

- [ ] Team comfortable with Tauri approach (vs. Electron)
- [ ] Budget approved for code signing certificates
- [ ] Target OS versions defined (affects WebView compatibility)
- [ ] Auto-update strategy decided (static vs. server)
- [ ] Release cadence planned
- [ ] Web version will continue alongside desktop

---

## Next Steps

1. **Approve this plan** and framework choice (Tauri)
2. **Begin Phase 1** - Foundation setup
3. **Set up development environment** with Rust toolchain
4. **Create feature branch** for desktop development

---

## Appendix: Tauri vs Electron Quick Reference

### Tauri Advantages
- 100x smaller bundle size
- Better security model
- Native performance
- Mobile support (iOS/Android)
- Modern architecture

### Electron Advantages
- Mature ecosystem
- Extensive documentation
- More Stack Overflow answers
- Full Node.js API access
- Consistent rendering (bundled Chromium)

### Recommendation
For Second Brain, **Tauri is the better choice** because:
1. Bundle size matters for user download/install experience
2. Our app doesn't need heavy Node.js dependencies
3. Security is important for a personal knowledge tool
4. Future mobile expansion is desirable
5. Our existing Vite + React stack integrates cleanly
