// 多言語対応テキスト
const translations = {
    ja: {
        appTitle: 'キックボクシング タイマー',
        ready: '準備完了',
        preparation: 'インターバル',
        round: 'ラウンド',
        start: 'スタート',
        pause: '一時停止',
        resume: '再開',
        reset: 'リセット',
        settings: '⚙️ 設定',
        timerSettings: 'タイマー設定',
        preset: 'プリセット',
        custom: 'カスタム',
        presetName: 'プリセット名',
        presetNamePlaceholder: '例: スパーリング用',
        roundTime: 'ラウンド時間',
        minutes: '分',
        seconds: '秒',
        enableBell: 'ホラ貝を有効にする',
        bellTime: 'ホラ貝（秒）',
        bellTimeDescription: 'ラウンド終了までの残り時間でホラ貝が鳴ります',
        intervalTime: 'インターバル（秒）',
        roundStartSound: 'ラウンド開始音',
        gong: 'ゴング',
        voice: '掛け声',
        enableSound: '音声を有効にする',
        enableCountdown: 'カウントダウン音声を有効にする',
        enableVibration: 'バイブレーションを有効にする',
        totalRounds: '総ラウンド数',
        unlimited: '無制限',
        save: '保存',
        updatePreset: 'プリセット更新',
        savePreset: 'プリセット保存',
        delete: '削除',
        cancel: 'キャンセル',
        pwaHint: '💡 ヒント: このページをホーム画面に追加すると、全画面で使用できます',
        pwaInstructions: 'Safari: 共有ボタン → ホーム画面に追加<br>Chrome: メニュー → ホーム画面に追加',
        presetSaved: 'を保存しました',
        deleteConfirm: 'を削除しますか？',
        enterPresetName: 'プリセット名を入力してください',
        language: '言語',
        tapToSelect: 'タップして選択',
        finished: '終了',
        roundOf: 'R'
    },
    en: {
        appTitle: 'Kickboxing Timer',
        ready: 'Ready',
        preparation: 'Interval',
        round: 'Round',
        start: 'Start',
        pause: 'Pause',
        resume: 'Resume',
        reset: 'Reset',
        settings: '⚙️ Settings',
        timerSettings: 'Timer Settings',
        preset: 'Preset',
        custom: 'Custom',
        presetName: 'Preset Name',
        presetNamePlaceholder: 'e.g., Sparring',
        roundTime: 'Round Time',
        minutes: 'min',
        seconds: 'sec',
        enableBell: 'Enable Horn',
        bellTime: 'Horn (seconds)',
        bellTimeDescription: 'Horn sounds at remaining time before round ends',
        intervalTime: 'Interval (seconds)',
        roundStartSound: 'Round Start Sound',
        gong: 'Gong',
        voice: 'Voice',
        enableSound: 'Enable Sound',
        enableCountdown: 'Enable Countdown Sound',
        enableVibration: 'Enable Vibration',
        totalRounds: 'Total Rounds',
        unlimited: 'Unlimited',
        save: 'Save',
        updatePreset: 'Update Preset',
        savePreset: 'Save Preset',
        delete: 'Delete',
        cancel: 'Cancel',
        pwaHint: '💡 Tip: Add this page to your home screen for fullscreen use',
        pwaInstructions: 'Safari: Share button → Add to Home Screen<br>Chrome: Menu → Add to Home Screen',
        presetSaved: ' saved',
        deleteConfirm: '?',
        enterPresetName: 'Please enter a preset name',
        language: 'Language',
        tapToSelect: 'Tap to select',
        finished: 'Finished',
        roundOf: 'R'
    }
};

// タイマーアプリケーション
class BoxingTimer {
    constructor() {
        // 言語設定
        this.currentLanguage = this.safeLocalStorageGet('language') || 'ja';

        // デフォルト設定
        this.defaultSettings = {
            roundTime: 2, // 数値
            roundTimeUnit: 'minutes', // 'minutes' or 'seconds'
            bellEnabled: true, // ベル機能の有効/無効
            bellTime: 60, // 秒（呼鈴時間 = 1分前）
            prepTime: 30, // 秒（インターバル）
            soundEnabled: true,
            countdownEnabled: true, // カウントダウン音声の有効/無効
            roundStartSound: 'gong', // 'gong' or 'voice'
            totalRounds: 0, // 0 = 無制限
            vibrationEnabled: true // バイブレーション
        };

        // プリセット管理
        this.presets = this.loadPresets();
        this.currentPresetId = this.safeLocalStorageGet('currentPresetId') || null;

        // 現在の設定
        // プリセットが選択されている場合はそちらを優先
        if (this.currentPresetId && this.presets[this.currentPresetId]) {
            this.settings = { ...this.defaultSettings, ...this.presets[this.currentPresetId].settings };
        } else {
            this.settings = this.loadSettings();
            this.currentPresetId = null; // 無効なプリセットIDをクリア
        }

        // タイマーの状態
        this.totalTime = 0;
        this.remainingTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.timerInterval = null;
        this.currentPhase = 'ready'; // 'preparation', 'round', 'ready', 'finished'
        this.bellSounded = false; // 呼鈴を鳴らしたかのフラグ
        this.currentRound = 1; // 現在のラウンド番号

        // Audio Context
        this.audioContext = null;

        // Wake Lock (スリープ防止)
        this.wakeLock = null;

        // 点滅用
        this.blinkInterval = null;

        // 音声ファイルの事前読み込み
        this.sounds = {
            roundStartGong: new Audio('round-start.mp3'),
            roundStartVoice: new Audio('round-start-voice.mp3'),
            roundEnd: new Audio('round-end.mp3'),
            bell: new Audio('bell.mp3')
        };

        // 音声ファイル読み込みエラーハンドリング
        Object.entries(this.sounds).forEach(([key, sound]) => {
            sound.volume = 1.0;
            sound.addEventListener('error', (e) => {
                console.warn(`Audio file for ${key} failed to load:`, e);
            });
        });

        // DOM要素
        this.initElements();
        this.initEventListeners();
        this.updatePresetDisplay();
        this.updateDisplay();

        // 初期言語設定を適用
        this.applyTranslations();
        this.updateLanguageButton();

        // ページの可視性変更時にWake Lockを再取得
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isRunning && !this.isPaused) {
                this.requestWakeLock();
            }
        });
    }

    // localStorage安全アクセス（プライベートブラウジング対応）
    safeLocalStorageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn('localStorage not available:', e);
            return null;
        }
    }

    safeLocalStorageSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('localStorage not available:', e);
        }
    }

    safeLocalStorageRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('localStorage not available:', e);
        }
    }

    initElements() {
        // タイマー表示
        this.timeDisplay = document.querySelector('.time');
        this.statusText = document.querySelector('.status-text');
        this.roundCounterDisplay = document.getElementById('roundCounter');
        this.presetDisplay = document.getElementById('presetDisplay');
        this.presetQuickSelect = document.getElementById('presetQuickSelect');
        this.timerDisplay = document.querySelector('.timer-display');

        // ボタン
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.languageBtn = document.getElementById('languageBtn');

        // モーダル
        this.settingsModal = document.getElementById('settingsModal');
        this.closeModalBtn = document.getElementById('closeModal');
        this.saveSettingsBtn = document.getElementById('saveSettings');
        this.cancelSettingsBtn = document.getElementById('cancelSettings');

        // 設定入力
        this.roundTimeInput = document.getElementById('roundTime');
        this.roundTimeUnitSelect = document.getElementById('roundTimeUnit');
        this.bellEnabledInput = document.getElementById('bellEnabled');
        this.bellTimeInput = document.getElementById('bellTime');
        this.bellTimeGroup = document.getElementById('bellTimeGroup');
        this.prepTimeInput = document.getElementById('prepTime');
        this.soundEnabledInput = document.getElementById('soundEnabled');
        this.countdownEnabledInput = document.getElementById('countdownEnabled');
        this.roundStartSoundSelect = document.getElementById('roundStartSound');
        this.totalRoundsInput = document.getElementById('totalRounds');
        this.vibrationEnabledInput = document.getElementById('vibrationEnabled');

        // プリセット関連
        this.presetSelect = document.getElementById('presetSelect');
        this.presetNameInput = document.getElementById('presetName');
        this.presetNameGroup = document.querySelector('.preset-name-group');
        this.saveAsPresetBtn = document.getElementById('saveAsPreset');
        this.deletePresetBtn = document.getElementById('deletePreset');
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleStartPause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.languageBtn.addEventListener('click', () => this.toggleLanguage());

        this.closeModalBtn.addEventListener('click', () => this.closeSettings());
        this.cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.saveAsPresetBtn.addEventListener('click', () => this.saveAsPreset());
        this.deletePresetBtn.addEventListener('click', () => this.deletePreset());

        // プリセット選択変更
        this.presetSelect.addEventListener('change', (e) => this.onPresetChange(e.target.value));

        // クイックプリセット選択
        this.presetQuickSelect.addEventListener('change', (e) => this.onQuickPresetChange(e.target.value));

        // プリセット名クリックでセレクトを開く
        this.presetDisplay.addEventListener('click', () => {
            this.presetQuickSelect.focus();
            this.presetQuickSelect.click();
        });

        // ベル有効/無効の切り替え
        this.bellEnabledInput.addEventListener('change', () => this.toggleBellTimeInput());

        // 設定値変更時の処理
        const settingInputs = [this.roundTimeInput, this.roundTimeUnitSelect, this.bellEnabledInput, this.bellTimeInput, this.prepTimeInput, this.soundEnabledInput, this.countdownEnabledInput, this.roundStartSoundSelect, this.totalRoundsInput, this.vibrationEnabledInput];
        settingInputs.forEach(input => {
            if (input) {
                input.addEventListener('change', () => this.onSettingsChange());
            }
        });

        // モーダル外クリックで閉じる
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isModalOpen()) {
                e.preventDefault();
                this.toggleStartPause();
            }
            if (e.code === 'KeyR' && !this.isModalOpen()) {
                e.preventDefault();
                this.reset();
            }
        });
    }

    toggleStartPause() {
        if (this.currentPhase === 'finished') {
            this.reset();
            return;
        }

        if (!this.isRunning) {
            this.start();
        } else if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    isModalOpen() {
        return this.settingsModal.classList.contains('show');
    }

    loadSettings() {
        const saved = this.safeLocalStorageGet('boxingTimerSettings');
        if (saved) {
            try {
                return { ...this.defaultSettings, ...JSON.parse(saved) };
            } catch (e) {
                return { ...this.defaultSettings };
            }
        }
        return { ...this.defaultSettings };
    }

    saveSettingsToStorage() {
        this.safeLocalStorageSet('boxingTimerSettings', JSON.stringify(this.settings));
    }

    // 設定オブジェクトを取得するヘルパーメソッド（重複解消）
    getSettingsFromInputs() {
        return {
            roundTime: parseInt(this.roundTimeInput.value) || 2,
            roundTimeUnit: this.roundTimeUnitSelect.value,
            bellEnabled: this.bellEnabledInput.checked,
            bellTime: parseInt(this.bellTimeInput.value) || 60,
            prepTime: parseInt(this.prepTimeInput.value) || 0,
            soundEnabled: this.soundEnabledInput.checked,
            countdownEnabled: this.countdownEnabledInput.checked,
            roundStartSound: this.roundStartSoundSelect.value,
            totalRounds: parseInt(this.totalRoundsInput.value) || 0,
            vibrationEnabled: this.vibrationEnabledInput ? this.vibrationEnabledInput.checked : true
        };
    }

    // 入力フィールドに設定を適用するヘルパーメソッド
    applySettingsToInputs(settings) {
        this.roundTimeInput.value = settings.roundTime;
        this.roundTimeUnitSelect.value = settings.roundTimeUnit || 'minutes';
        this.bellEnabledInput.checked = settings.bellEnabled !== false;
        this.bellTimeInput.value = settings.bellTime;
        this.prepTimeInput.value = settings.prepTime;
        this.soundEnabledInput.checked = settings.soundEnabled;
        this.countdownEnabledInput.checked = settings.countdownEnabled || false;
        this.roundStartSoundSelect.value = settings.roundStartSound || 'gong';
        this.totalRoundsInput.value = settings.totalRounds || 0;
        if (this.vibrationEnabledInput) {
            this.vibrationEnabledInput.checked = settings.vibrationEnabled !== false;
        }
    }

    openSettings() {
        // タイマー動作中は設定を無効化
        if (this.isRunning && !this.isPaused) {
            return; // 動作中は設定を開かない
        }

        this.updatePresetList();
        this.applySettingsToInputs(this.settings);
        this.toggleBellTimeInput();
        this.presetSelect.value = this.currentPresetId || '';
        this.updatePresetUI();

        this.settingsModal.classList.add('show');
    }

    closeSettings() {
        this.settingsModal.classList.remove('show');
    }

    saveSettings() {
        this.settings = this.getSettingsFromInputs();
        this.saveSettingsToStorage();

        // プリセット選択中なら、プリセットも更新
        if (this.currentPresetId) {
            this.updateCurrentPreset();
        }

        this.updatePresetDisplay();
        this.closeSettings();
        this.reset();
    }

    updateCurrentPreset() {
        if (!this.currentPresetId || !this.presets[this.currentPresetId]) return;

        this.presets[this.currentPresetId].settings = this.getSettingsFromInputs();
        this.savePresets();
    }

    toggleBellTimeInput() {
        if (this.bellEnabledInput.checked) {
            this.bellTimeGroup.style.display = 'block';
        } else {
            this.bellTimeGroup.style.display = 'none';
        }
    }

    async start() {
        if (this.isRunning) return;

        // iOS対応: ユーザーアクションで全ての音声をプリロード
        Object.values(this.sounds).forEach(sound => {
            sound.load();
        });

        // iOS対応: AudioContextの初期化（カウントダウン音用）
        if (!this.audioContext && this.settings.countdownEnabled) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                // iOS Safari対応: 無音を再生してAudioContextを起動
                const buffer = this.audioContext.createBuffer(1, 1, 22050);
                const source = this.audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(this.audioContext.destination);
                source.start(0);
            } catch (e) {
                console.warn('AudioContext initialization failed:', e);
            }
        }

        // Wake Lockを取得してスリープを防止
        await this.requestWakeLock();

        this.isRunning = true;
        this.isPaused = false;
        this.currentRound = 1;

        // ラウンドから開始
        this.startRound();

        this.updateButtonState();
        this.updateSettingsButtonState();
    }

    pause() {
        if (!this.isRunning || this.isPaused) return;

        this.isPaused = true;
        clearInterval(this.timerInterval);
        this.stopBlink();
        this.updateButtonState();
        this.updateSettingsButtonState();
    }

    resume() {
        if (!this.isPaused) return;

        this.isPaused = false;
        this.updateButtonState();
        this.updateSettingsButtonState();
        this.tick();
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentPhase = 'ready';
        this.currentRound = 1;
        clearInterval(this.timerInterval);
        this.stopBlink();

        // Wake Lockを解放
        this.releaseWakeLock();

        this.updateButtonState();
        this.updateSettingsButtonState();
        this.updateDisplay();
    }

    updateButtonState() {
        if (!this.isRunning || this.currentPhase === 'finished') {
            this.startBtn.textContent = this.t('start');
            this.startBtn.classList.remove('btn-warning');
            this.startBtn.classList.add('btn-primary');
        } else if (this.isPaused) {
            this.startBtn.textContent = this.t('resume');
            this.startBtn.classList.remove('btn-warning');
            this.startBtn.classList.add('btn-primary');
        } else {
            this.startBtn.textContent = this.t('pause');
            this.startBtn.classList.remove('btn-primary');
            this.startBtn.classList.add('btn-warning');
        }
    }

    // タイマー動作中は設定ボタンを無効化
    updateSettingsButtonState() {
        if (this.isRunning && !this.isPaused) {
            this.settingsBtn.disabled = true;
            this.settingsBtn.style.opacity = '0.5';
        } else {
            this.settingsBtn.disabled = false;
            this.settingsBtn.style.opacity = '1';
        }
    }

    startPreparation() {
        // インターバル時間が0の場合はスキップ
        if (this.settings.prepTime <= 0) {
            this.startRound();
            return;
        }

        this.currentPhase = 'preparation';
        this.totalTime = this.settings.prepTime;
        this.remainingTime = this.totalTime;
        // インターバル開始時は音なし
        this.updateDisplay();
        this.tick();
    }

    startRound() {
        // 全ラウンド終了チェック
        if (this.settings.totalRounds > 0 && this.currentRound > this.settings.totalRounds) {
            this.finishAllRounds();
            return;
        }

        this.currentPhase = 'round';
        // 単位に応じて秒に変換
        const roundTimeInSeconds = this.settings.roundTimeUnit === 'minutes'
            ? this.settings.roundTime * 60
            : this.settings.roundTime;
        this.totalTime = roundTimeInSeconds;
        this.remainingTime = this.totalTime;
        this.bellSounded = false; // 呼鈴フラグをリセット
        this.playSound('roundStart'); // ラウンド開始のゴング1回
        this.vibrate([200]); // バイブレーション
        this.updateDisplay();
        this.tick();
    }

    finishAllRounds() {
        this.currentPhase = 'finished';
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.stopBlink();
        this.releaseWakeLock();

        // 終了音
        this.playSound('roundEnd');
        this.vibrate([500, 200, 500]); // 長めのバイブレーション

        this.updateDisplay();
        this.updateButtonState();
        this.updateSettingsButtonState();
    }

    tick() {
        clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            if (this.isPaused) return;

            this.remainingTime--;

            // ラウンド中の呼鈴チェック（残り時間で判定）
            if (this.currentPhase === 'round' && !this.bellSounded && this.settings.bellEnabled) {
                if (this.remainingTime <= this.settings.bellTime) {
                    this.playSound('bell');
                    this.vibrate([100, 50, 100]);
                    this.bellSounded = true;
                }
            }

            // カウントダウン音声（ラウンドとインターバル終了時、残り3秒、2秒、1秒でそれぞれ鳴らす）
            if (this.settings.countdownEnabled && this.remainingTime > 0 && this.remainingTime <= 3) {
                this.playCountdown(this.remainingTime);
                this.vibrate([50]); // 短いバイブ
            }

            // 残り10秒以下で点滅開始
            if (this.remainingTime <= 10 && this.remainingTime > 0) {
                this.startBlink();
            } else {
                this.stopBlink();
            }

            this.updateDisplay();

            // 時間切れ
            if (this.remainingTime <= 0) {
                this.handlePhaseEnd();
            }
        }, 1000);
    }

    handlePhaseEnd() {
        clearInterval(this.timerInterval);
        this.stopBlink();

        if (this.currentPhase === 'preparation') {
            // 準備時間終了 → ラウンド開始
            this.startRound();
        } else if (this.currentPhase === 'round') {
            // ラウンド終了 → ゴング音3回を鳴らしてからインターバル開始
            this.playSound('roundEnd');
            this.vibrate([200, 100, 200]);
            this.currentRound++;
            this.startPreparation();
        }
    }

    // 点滅開始
    startBlink() {
        if (this.blinkInterval) return; // 既に点滅中

        this.blinkInterval = setInterval(() => {
            this.timerDisplay.classList.toggle('blink');
        }, 500);
    }

    // 点滅停止
    stopBlink() {
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
            this.blinkInterval = null;
        }
        this.timerDisplay.classList.remove('blink');
    }

    // バイブレーション
    vibrate(pattern) {
        if (!this.settings.vibrationEnabled) return;
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                console.warn('Vibration failed:', e);
            }
        }
    }

    updateDisplay() {
        // 時間表示
        const minutes = Math.floor(Math.max(0, this.remainingTime) / 60);
        const seconds = Math.max(0, this.remainingTime) % 60;
        this.timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // ラウンド数表示
        if (this.roundCounterDisplay) {
            if (this.currentPhase === 'finished') {
                this.roundCounterDisplay.textContent = this.t('finished');
            } else if (this.settings.totalRounds > 0) {
                this.roundCounterDisplay.textContent = `${this.t('roundOf')}${this.currentRound}/${this.settings.totalRounds}`;
            } else {
                this.roundCounterDisplay.textContent = `${this.t('roundOf')}${this.currentRound}`;
            }
        }

        // ステータステキスト（多言語対応）
        const statusTexts = {
            'ready': this.t('ready'),
            'preparation': this.t('preparation'),
            'round': this.t('round'),
            'finished': this.t('finished')
        };
        this.statusText.textContent = statusTexts[this.currentPhase] || '';

        // 背景色変更と時間表示の色変更
        this.timerDisplay.classList.remove('active', 'preparation', 'finished');
        if (this.currentPhase === 'round') {
            this.timerDisplay.classList.add('active');
            this.timeDisplay.style.color = '#ff0000'; // ラウンド: 赤
            this.timeDisplay.style.textShadow = '0 0 30px rgba(255, 0, 0, 0.6), 0 0 10px rgba(255, 0, 0, 0.4)'; // 赤グロー
        } else if (this.currentPhase === 'preparation') {
            this.timerDisplay.classList.add('preparation');
            this.timeDisplay.style.color = '#00ff00'; // インターバル: 緑
            this.timeDisplay.style.textShadow = '0 0 30px rgba(0, 255, 0, 0.6), 0 0 10px rgba(0, 255, 0, 0.4)'; // 緑グロー
        } else if (this.currentPhase === 'finished') {
            this.timerDisplay.classList.add('finished');
            this.timeDisplay.style.color = '#ffcc00'; // 終了: 黄色
            this.timeDisplay.style.textShadow = '0 0 30px rgba(255, 204, 0, 0.6), 0 0 10px rgba(255, 204, 0, 0.4)';
        } else {
            this.timeDisplay.style.color = '#ff0000'; // デフォルト: 赤
            this.timeDisplay.style.textShadow = '0 0 30px rgba(255, 0, 0, 0.6), 0 0 10px rgba(255, 0, 0, 0.4)'; // 赤グロー
        }

        // 準備完了状態の初期表示
        if (this.currentPhase === 'ready') {
            const roundTimeInSeconds = this.settings.roundTimeUnit === 'minutes'
                ? this.settings.roundTime * 60
                : this.settings.roundTime;
            const minutes = Math.floor(roundTimeInSeconds / 60);
            const seconds = roundTimeInSeconds % 60;
            this.timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }

    playSound(type) {
        if (!this.settings.soundEnabled) return;

        // AudioContextをレジューム（iOS対策）
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(e => console.warn('AudioContext resume failed:', e));
        }

        switch (type) {
            case 'roundStart':
                // ラウンド開始: 選択された音声ファイル再生
                const soundKey = this.settings.roundStartSound === 'voice' ? 'roundStartVoice' : 'roundStartGong';
                this.playSoundFile(this.sounds[soundKey]);
                break;
            case 'roundEnd':
                // ラウンド終了: 音声ファイル再生
                this.playSoundFile(this.sounds.roundEnd);
                break;
            case 'bell':
                // 中間ベル: 音声ファイル再生（音量増幅版）
                this.playBellWithBoost();
                break;
        }
    }

    // 音声ファイル再生のヘルパー（エラーハンドリング付き）
    playSoundFile(sound) {
        if (!sound) return;

        // 再生中の場合は停止してリセット
        sound.pause();
        sound.currentTime = 0;
        sound.load(); // iOS対応: 明示的にload()

        const playPromise = sound.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn('Audio play failed:', e);
                // フォールバック: Web Audio APIで代替音を再生
                this.playFallbackBeep();
            });
        }
    }

    // 音声ファイルが読み込めない場合のフォールバック
    playFallbackBeep() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('AudioContext not available:', e);
                return;
            }
        }

        const now = this.audioContext.currentTime;
        this.createBeepSound(now, 440, 0.3);
    }

    async playBellWithBoost() {
        if (!this.settings.soundEnabled) return;

        // Web Audio APIを使って音量を増幅
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('AudioContext not available:', e);
                return;
            }
        }

        try {
            // AudioContextが停止している場合はレジューム
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // 音声ファイルを取得
            const response = await fetch('bell.mp3');
            if (!response.ok) throw new Error('Bell file not found');

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // ソースとゲインノードを作成
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = audioBuffer;

            // 音量を2.5倍に増幅（クリッピングに注意）
            gainNode.gain.value = 2.5;

            // 接続: ソース → ゲイン → 出力
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 再生
            source.start(0);
        } catch (err) {
            console.warn('Bell boost playback failed:', err);
            // フォールバック: 合成ベル音
            this.createBellSound(this.audioContext.currentTime);
        }
    }

    playCountdown(remainingSeconds) {
        if (!this.settings.soundEnabled) return;
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('AudioContext not available:', e);
                return;
            }
        }

        const now = this.audioContext.currentTime;

        // 残り秒数に応じて音程を変える（3秒=低音、1秒=高音）
        const frequencies = {
            3: 660,  // E5
            2: 784,  // G5
            1: 1047  // C6
        };
        const frequency = frequencies[remainingSeconds] || 880;

        this.createBeepSound(now, frequency, 0.2);
    }

    createGongSound(time) {
        // ゴング音の合成（低めの「カーン」）
        const frequencies = [400, 800, 1200, 1600];

        frequencies.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            const amplitude = 1.0 / (index + 1);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(amplitude, time + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

            osc.start(time);
            osc.stop(time + 1.5);
        });

        // ノイズを追加
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        const noiseGain = this.audioContext.createGain();
        noise.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);

        noiseGain.gain.setValueAtTime(0.15, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        noise.start(time);
        noise.stop(time + 0.1);
    }

    createBellSound(time) {
        // ベルっぽい音の合成（高めの周波数で「チーン」）
        const frequencies = [1200, 1800, 2400, 3000];

        frequencies.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            const amplitude = 0.8 / (index + 1);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(amplitude, time + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 2.0);

            osc.start(time);
            osc.stop(time + 2.0);
        });
    }

    createBeepSound(time, frequency, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, time);
        oscillator.type = 'square';

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(1.0, time + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, time + duration);

        oscillator.start(time);
        oscillator.stop(time + duration);
    }

    // プリセット管理機能
    loadPresets() {
        const saved = this.safeLocalStorageGet('boxingTimerPresets');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return {};
            }
        }
        return {};
    }

    savePresets() {
        this.safeLocalStorageSet('boxingTimerPresets', JSON.stringify(this.presets));
    }

    updatePresetList() {
        // プリセットセレクトボックスを更新（設定モーダル内）
        const currentValue = this.presetSelect.value;
        this.presetSelect.innerHTML = `<option value="" data-i18n="custom">${this.t('custom')}</option>`;

        Object.keys(this.presets).forEach(id => {
            const preset = this.presets[id];
            const option = document.createElement('option');
            option.value = id;
            option.textContent = preset.name;
            this.presetSelect.appendChild(option);
        });

        this.presetSelect.value = currentValue;

        // クイックセレクトも更新
        this.updateQuickPresetList();
    }

    updateQuickPresetList() {
        // トップのクイックセレクトを更新
        this.presetQuickSelect.innerHTML = `<option value="" data-i18n="custom">${this.t('custom')}</option>`;

        Object.keys(this.presets).forEach(id => {
            const preset = this.presets[id];
            const option = document.createElement('option');
            option.value = id;
            option.textContent = preset.name;
            this.presetQuickSelect.appendChild(option);
        });

        this.presetQuickSelect.value = this.currentPresetId || '';
    }

    onQuickPresetChange(presetId) {
        // タイマー動作中は変更不可
        if (this.isRunning && !this.isPaused) {
            this.presetQuickSelect.value = this.currentPresetId || '';
            return;
        }

        // ドロップダウンをブラー（閉じる）
        this.presetQuickSelect.blur();

        if (!presetId) {
            // カスタム選択
            this.currentPresetId = null;
            this.safeLocalStorageRemove('currentPresetId');
            this.updatePresetDisplay();
            return;
        }

        const preset = this.presets[presetId];
        if (preset) {
            this.currentPresetId = presetId;
            this.safeLocalStorageSet('currentPresetId', presetId);

            // 設定を適用
            this.settings = { ...this.defaultSettings, ...preset.settings };
            this.saveSettingsToStorage();

            this.updatePresetDisplay();
            this.reset();
        }
    }

    onPresetChange(presetId) {
        if (!presetId) {
            // カスタム選択
            this.currentPresetId = null;
            this.safeLocalStorageRemove('currentPresetId');
            this.updatePresetUI();
            this.updatePresetDisplay();
            return;
        }

        const preset = this.presets[presetId];
        if (preset) {
            this.currentPresetId = presetId;
            this.safeLocalStorageSet('currentPresetId', presetId);
            this.applySettingsToInputs({ ...this.defaultSettings, ...preset.settings });
            this.toggleBellTimeInput();
            this.updatePresetUI();
            this.updatePresetDisplay();
        }
    }

    onSettingsChange() {
        // プリセット選択中は何もしない（プリセットを維持）
        // ユーザーが明示的に保存ボタンを押したときにプリセットを更新する
    }

    updatePresetUI() {
        if (this.currentPresetId) {
            // プリセット選択中
            this.saveAsPresetBtn.style.display = 'none';
            this.deletePresetBtn.style.display = 'inline-block';
            this.presetNameGroup.style.display = 'none';
            this.saveSettingsBtn.textContent = this.t('updatePreset');
        } else {
            // カスタムモード
            this.saveAsPresetBtn.style.display = 'inline-block';
            this.deletePresetBtn.style.display = 'none';
            this.presetNameGroup.style.display = 'block';
            this.saveSettingsBtn.textContent = this.t('save');
        }
    }

    saveAsPreset() {
        const name = this.presetNameInput.value.trim();
        if (!name) {
            alert(this.t('enterPresetName'));
            return;
        }

        const id = Date.now().toString();
        this.presets[id] = {
            name: name,
            settings: this.getSettingsFromInputs()
        };

        this.savePresets();
        this.currentPresetId = id;
        this.safeLocalStorageSet('currentPresetId', id);
        this.updatePresetList();
        this.presetSelect.value = id;
        this.presetNameInput.value = '';
        this.updatePresetUI();
        this.updatePresetDisplay();

        const message = this.currentLanguage === 'ja'
            ? `プリセット「${name}」${this.t('presetSaved')}`
            : `Preset "${name}"${this.t('presetSaved')}`;
        alert(message);
    }

    deletePreset() {
        if (!this.currentPresetId) return;

        const preset = this.presets[this.currentPresetId];
        const message = this.currentLanguage === 'ja'
            ? `プリセット「${preset.name}」${this.t('deleteConfirm')}`
            : `Delete preset "${preset.name}"${this.t('deleteConfirm')}`;

        if (confirm(message)) {
            delete this.presets[this.currentPresetId];
            this.savePresets();
            this.currentPresetId = null;
            this.safeLocalStorageRemove('currentPresetId');
            this.updatePresetList();
            this.presetSelect.value = '';
            this.updatePresetUI();
            this.updatePresetDisplay();
        }
    }

    updatePresetDisplay() {
        if (this.currentPresetId && this.presets[this.currentPresetId]) {
            this.presetDisplay.textContent = this.presets[this.currentPresetId].name;
        } else {
            this.presetDisplay.textContent = '';
            this.presetDisplay.setAttribute('data-empty-text', this.t('tapToSelect'));
        }
    }

    toggleLanguage() {
        // 言語を切り替え
        this.currentLanguage = this.currentLanguage === 'ja' ? 'en' : 'ja';
        this.safeLocalStorageSet('language', this.currentLanguage);

        // UIを更新
        this.applyTranslations();
        this.updateLanguageButton();
    }

    updateLanguageButton() {
        // 言語ボタンのテキストを更新（現在の言語と逆の国旗を表示）
        this.languageBtn.textContent = this.currentLanguage === 'ja' ? '🇺🇸 English' : '🇯🇵 日本語';
    }

    applyTranslations() {
        const t = translations[this.currentLanguage];

        // data-i18n属性を持つ要素のテキストを更新
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (t[key]) {
                element.textContent = t[key];
            }
        });

        // data-i18n-placeholder属性を持つ要素のプレースホルダーを更新
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (t[key]) {
                element.placeholder = t[key];
            }
        });

        // data-i18n-html属性を持つ要素のHTMLを更新
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            if (t[key]) {
                element.innerHTML = t[key];
            }
        });

        // ページタイトルを更新
        document.title = t.appTitle;

        // ステータステキストを更新
        this.updateDisplay();

        // ボタンの状態を更新
        this.updateButtonState();

        // プリセットリストを更新（「カスタム」の翻訳を含む）
        this.updatePresetList();
    }

    t(key) {
        // 翻訳テキストを取得するヘルパーメソッド
        return translations[this.currentLanguage][key] || key;
    }

    async requestWakeLock() {
        try {
            // Wake Lock API対応チェック
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock activated');

                // Wake Lockが解放された時の処理（例: ページが非表示になった時）
                this.wakeLock.addEventListener('release', () => {
                    console.log('Wake Lock released');
                });
            } else {
                console.log('Wake Lock API not supported');
                // Wake Lock非対応の場合は、代替手段としてNoSleepを使用
                this.useNoSleepFallback();
            }
        } catch (err) {
            console.error('Wake Lock request failed:', err);
            // エラー時も代替手段を試す
            this.useNoSleepFallback();
        }
    }

    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
            console.log('Wake Lock manually released');
        }
        // NoSleep代替手段の解放
        if (this.noSleepVideo) {
            this.noSleepVideo.pause();
        }
    }

    useNoSleepFallback() {
        // Wake Lock非対応デバイス用の代替手段
        // 無音動画を再生し続けることでスリープを防ぐ
        if (!this.noSleepVideo) {
            this.noSleepVideo = document.createElement('video');
            this.noSleepVideo.setAttribute('playsinline', '');
            this.noSleepVideo.setAttribute('muted', '');
            this.noSleepVideo.setAttribute('loop', '');
            // 1x1の透明動画データ（base64）
            this.noSleepVideo.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAACG1kYXQAAAGzABAHAAABthADAowdbb9/AAAC6W1vb3YAAABsbXZoZAAAAAAAAAAAAAAAAAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAIYdHJhawAAAFx0a2hkAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAAAAAAAEAAAABAAAAAWG1kaWEAAAAgbWRoZAAAAAAAAAAAAAAAAAAAPAAAAAAAAFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAEMbWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAABzHN0YmwAAACYc3RzZAAAAAAAAAABAAAAiGF2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAQABAAEgAAABIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAAyYXZjQwFNQCj/4QAYZ01AKOyho3ySTUBAQFAAAAMAEAAr8gDxgxlgAQAGaOvjyyLAAAAAGHN0dHMAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAEdHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAAQAAABRzdHN6AAAAAAAAAAAAAAABAAAAGHN0Y28AAAAAAAAAAQAAADAAAAAA';
            this.noSleepVideo.style.position = 'fixed';
            this.noSleepVideo.style.opacity = '0';
            this.noSleepVideo.style.pointerEvents = 'none';
            document.body.appendChild(this.noSleepVideo);
        }

        // 動画を再生
        this.noSleepVideo.play().catch(err => {
            console.error('NoSleep video play failed:', err);
        });
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    new BoxingTimer();
});
