# Kickboxing Timer - Development Notes

## Project Overview
A web-based kickboxing/boxing timer application with multi-language support, deployed on Cloudflare Pages.

**Live URL**: https://riotgym-kitanaka.pages.dev

---

## Key Features Implemented

### 1. Audio Reliability System
**Problem**: Countdown and gong sounds not playing reliably during continuous loops.

**Solution**:
- Proper audio reset sequence: `pause()` → `currentTime = 0` → `load()`
- AudioContext state management with `resume()` for iOS compatibility
- Retry logic with 100ms timeout for failed playback attempts
- Removed flag-based countdown logic that prevented sounds on subsequent loops

**Code Pattern** (script.js):
```javascript
playSound(type) {
    if (!this.settings.soundEnabled) return;

    // Resume AudioContext for iOS
    if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }

    // Reset audio element
    sound.pause();
    sound.currentTime = 0;
    sound.load();

    // Play with retry logic
    const playPromise = sound.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            setTimeout(() => {
                sound.load();
                sound.play().catch(err => console.log('Retry failed:', err));
            }, 100);
        });
    }
}
```

### 2. Screen Sleep Prevention
**Problem**: iPhone goes to sleep during timer operation.

**Solution**:
- Primary: Wake Lock API for modern browsers
- Fallback: Invisible looping video for unsupported browsers
- Visibility change handler to re-acquire wake lock when user returns to app

**Code Pattern** (script.js):
```javascript
async requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            this.wakeLock = await navigator.wakeLock.request('screen');
        } else {
            this.useNoSleepFallback();
        }
    } catch (err) {
        this.useNoSleepFallback();
    }
}

useNoSleepFallback() {
    this.noSleepVideo = document.createElement('video');
    this.noSleepVideo.setAttribute('playsinline', '');
    this.noSleepVideo.setAttribute('muted', '');
    this.noSleepVideo.setAttribute('loop', '');
    this.noSleepVideo.src = 'data:video/mp4;base64,...';
    this.noSleepVideo.play();
}
```

### 3. Audio Volume Boost
**Problem**: Horn/bell sound too quiet for gym environment.

**Solution**:
- Web Audio API with GainNode to boost volume 2.5x
- Fallback to normal Audio element if Web Audio fails

**Code Pattern** (script.js):
```javascript
async playBellWithBoost() {
    if (!this.settings.soundEnabled) return;

    const response = await fetch('bell.mp3');
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = audioBuffer;
    gainNode.gain.value = 2.5; // 2.5x volume boost

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.start(0);
}
```

### 4. Multi-Language Support (Japanese/English)
**Problem**: Gym has American members who need English interface.

**Solution**:
- Translation object with complete Japanese and English strings
- Data attribute-based system: `data-i18n`, `data-i18n-placeholder`, `data-i18n-html`
- Language preference saved to localStorage
- Country flag icons (🇺🇸/🇯🇵) for language toggle

**Code Pattern** (script.js):
```javascript
const translations = {
    ja: { /* Japanese translations */ },
    en: { /* English translations */ }
};

applyTranslations() {
    // Standard text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = this.t(key);
    });

    // Placeholder text
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = this.t(key);
    });

    // HTML content
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = this.t(key);
    });
}
```

### 5. Quick Preset Selection
**Problem**: Opening settings modal to change presets was cumbersome.

**Solution**:
- Top bar with preset selector, status display, and language toggle
- Clickable preset name reveals dropdown for instant switching
- Auto-blur after selection to close dropdown

**Code Pattern** (script.js):
```javascript
onQuickPresetChange(presetId) {
    this.presetQuickSelect.blur(); // Close dropdown

    if (!presetId) {
        this.currentPresetId = null;
        localStorage.removeItem('currentPresetId');
        this.updatePresetDisplay();
        return;
    }

    const preset = this.presets[presetId];
    if (preset) {
        this.currentPresetId = presetId;
        localStorage.setItem('currentPresetId', presetId);
        this.settings = { ...preset.settings };
        this.saveSettingsToStorage();
        this.updatePresetDisplay();
        this.reset();
    }
}
```

---

## UI/Layout Design Patterns

### Top Bar Layout
**Pattern**: Flexbox with three equal sections (left-center-right)

**CSS** (style.css):
```css
.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    padding-top: calc(env(safe-area-inset-top, 0px) + 15px);
    padding-left: calc(env(safe-area-inset-left, 0px) + 20px);
    padding-right: calc(env(safe-area-inset-right, 0px) + 20px);
}

.preset-selector,
.round-info,
.language-switcher-top {
    flex: 1;
    display: flex;
}

.preset-selector { justify-content: flex-start; }
.round-info { justify-content: center; }
.language-switcher-top { justify-content: flex-end; }
```

### Unified Button Style
**Pattern**: Consistent visual design for preset and language buttons

**CSS** (style.css):
```css
.preset-name,
.btn-language {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px 4px 6px;
    font-size: clamp(0.7rem, 1.6vw, 0.85rem);
    font-weight: 500;
    background: rgba(0, 255, 0, 0.08);
    border: 1px solid rgba(0, 255, 0, 0.2);
    color: rgba(0, 255, 0, 0.8);
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.preset-name:hover,
.btn-language:hover {
    background: rgba(0, 255, 0, 0.15);
    border-color: rgba(0, 255, 0, 0.4);
    color: #00ff00;
}
```

### Dropdown Positioning
**Problem**: Absolute positioning caused layout collapse.

**Solution**: Fixed positioning with explicit coordinates prevents layout shift.

**CSS** (style.css):
```css
.preset-quick-select {
    position: absolute;
    pointer-events: none; /* Prevent clickable area */
    opacity: 0;
}

.preset-quick-select:focus {
    opacity: 1;
    pointer-events: all;
    position: fixed;
    left: calc(env(safe-area-inset-left, 0px) + 20px);
    top: calc(env(safe-area-inset-top, 0px) + 60px);
    z-index: 10000;
    background: rgba(10, 10, 10, 0.98);
    border: 2px solid rgba(0, 255, 0, 0.6);
}
```

### Z-Index Layering Strategy
**Pattern**: Clear hierarchy to prevent overlap issues

```
Modal: 100000
Dropdown: 10000
Normal content: 1 (default)
```

### Input Field Visibility
**Pattern**: Explicit cursor color and focus states

**CSS** (style.css):
```css
.setting-group input[type="number"],
.setting-group input[type="text"] {
    caret-color: #ffffff;
    -webkit-appearance: none;
    appearance: none;
}

.setting-group input:focus {
    border-color: #00ff00;
    box-shadow: 0 0 0 3px rgba(0, 255, 0, 0.1);
}
```

---

## Common Patterns and Best Practices

### 1. Avoid `position: fixed` for Layout Elements
**Rule**: Use normal document flow with flexbox instead of fixed positioning.

**Reason**: Fixed positioning removes elements from document flow, causing overlap and alignment issues.

**Example**: Top bar uses flexbox instead of fixed positioning for three sections.

### 2. Use `pointer-events: none` for Invisible Elements
**Rule**: Set `pointer-events: none` on invisible overlays to prevent accidental clicks.

**Example**: Dropdown select has `pointer-events: none` when not focused.

### 3. iOS Safe Area Support
**Rule**: Always account for safe area insets on iOS devices with notches.

**Pattern**:
```css
padding-top: calc(env(safe-area-inset-top, 0px) + 15px);
padding-left: calc(env(safe-area-inset-left, 0px) + 20px);
padding-right: calc(env(safe-area-inset-right, 0px) + 20px);
```

### 4. Audio Playback Reliability
**Rule**: Always reset audio elements before playing.

**Pattern**:
```javascript
sound.pause();
sound.currentTime = 0;
sound.load();
sound.play();
```

### 5. Feature Detection with Fallbacks
**Rule**: Check for API availability before use, provide fallbacks.

**Example**: Wake Lock API → video playback fallback

### 6. LocalStorage Persistence
**Rule**: Save user preferences to localStorage for persistence across sessions.

**Pattern**:
```javascript
localStorage.setItem('language', this.currentLanguage);
localStorage.setItem('currentPresetId', presetId);
localStorage.setItem('timerSettings', JSON.stringify(this.settings));
```

---

## Deployment

**Platform**: Cloudflare Pages
**Tool**: wrangler CLI

**Command**:
```bash
npx wrangler pages deploy . --project-name riotgym-kitanaka
```

**Live URL**: https://riotgym-kitanaka.pages.dev

---

## File Structure

```
riotgym_kitanaka/
├── index.html          # Main HTML structure
├── style.css           # All styling and responsive design
├── script.js           # Timer logic, audio, i18n, UI interactions
├── manifest.json       # PWA manifest
├── bell.mp3           # Horn/bell sound file
├── gong.mp3           # Gong sound file
├── voice.mp3          # Voice start sound
├── countdown3.mp3     # Countdown sounds
├── countdown2.mp3
├── countdown1.mp3
└── DEVELOPMENT_NOTES.md  # This file
```

---

## Key Technical Dependencies

- **Wake Lock API**: Screen sleep prevention
- **Web Audio API**: Volume control and audio manipulation
- **LocalStorage API**: Settings persistence
- **Flexbox**: Responsive layout
- **CSS Safe Area**: iOS notch support
- **HTML5 Audio**: Sound playback

---

## Testing Checklist

- [ ] Audio plays reliably during continuous loops
- [ ] Screen doesn't sleep during timer operation (iOS/Android)
- [ ] Bell sound is loud enough in gym environment
- [ ] Language toggle works correctly
- [ ] Quick preset switching works without opening modal
- [ ] All UI elements aligned properly on various screen sizes
- [ ] Input cursor visible when editing settings
- [ ] Settings modal appears above all other content
- [ ] Dropdown doesn't cause layout collapse
- [ ] Safe area insets work correctly on iOS devices with notches

---

## Future Considerations

- Consider adding more languages if international membership grows
- Monitor audio performance on different browser versions
- Collect user feedback on bell volume levels
- Consider adding custom sound upload feature
- Evaluate battery consumption during long sessions
