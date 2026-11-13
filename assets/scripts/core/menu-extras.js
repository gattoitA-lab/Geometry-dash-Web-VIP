/* Geometry Dash Web VIP - menu extras
 * Daily / Free rewards, profile screens and the animated background icon.
 * Kept separate from game-scene.js so the original gameplay file stays easier to maintain.
 */
(function () {
  const SOCIALS = {
    youtube: "https://www.youtube.com/@gattoitalianoGD",
    tiktok: "https://www.tiktok.com/@gatto.italiano7",
    instagram: "https://www.instagram.com/gatt0italian0/"
  };

  const CHANNELS = [
    { key: "youtube", name: "YOUTUBE", frame: "gj_ytIcon_001.png", url: SOCIALS.youtube },
    { key: "tiktok", name: "TIKTOK", frame: "gj_tiktokIcon_001.png", url: SOCIALS.tiktok },
    { key: "instagram", name: "INSTAGRAM", frame: "gj_instaIcon_001.png", url: SOCIALS.instagram }
  ];

  const PANEL_TEXTURE = "square01_001";

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  GameScene.prototype._gattoUsername = function () {
    const user = window.AccountAPI && window.AccountAPI.currentUser;
    return String((user && user.username) || "GATTOITALIANO").toUpperCase();
  };

  GameScene.prototype._gattoCubes = function () {
    return Math.max(0, parseInt(localStorage.getItem("gd_vip_cubes") || "0", 10) || 0);
  };

  GameScene.prototype._gattoSetCubes = function (value) {
    const next = Math.max(0, Math.floor(Number(value) || 0));
    localStorage.setItem("gd_vip_cubes", String(next));
    return next;
  };

  GameScene.prototype._gattoAddCubes = function (amount) {
    return this._gattoSetCubes(this._gattoCubes() + Math.floor(Number(amount) || 0));
  };

  GameScene.prototype._gattoTimeLeft = function (timestamp) {
    const left = Math.max(0, Number(timestamp || 0) - Date.now());
    if (left <= 0) return "";
    const hours = Math.floor(left / 3600000);
    const minutes = Math.floor((left % 3600000) / 60000);
    if (hours > 0) return `${hours}H ${minutes}MIN`;
    return `${Math.max(1, minutes)}MIN`;
  };

  GameScene.prototype._gattoPanel = function (width, height, tint, title, textureKey) {
    const root = this.add.container(0, 0).setScrollFactor(0).setDepth(500);
    const dim = this.add.rectangle(screenWidth / 2, screenHeight / 2, screenWidth, screenHeight, 0, 0.58).setInteractive();
    root.add(dim);

    const panel = this.add.container(screenWidth / 2, screenHeight / 2);
    root.add(panel);

    const panelTexture = textureKey || PANEL_TEXTURE;
    const border = (this.textures.get(panelTexture)?.source?.[0]?.width || 120) * 0.3;
    const panelBg = this._drawScale9(0, 0, width, height, panelTexture, border, tint === undefined ? 0xffffff : tint, 1);
    panel.add(panelBg);

    // Geometry Dash style pixel corners.
    const cornerFrames = ["GJ_GameSheet03", "dailyLevelCorner_001.png"];
    const cornerSize = 0.42;
    const corners = [
      [-width / 2 + 38, -height / 2 + 38, 0],
      [width / 2 - 38, -height / 2 + 38, 90],
      [width / 2 - 38, height / 2 - 38, 180],
      [-width / 2 + 38, height / 2 - 38, 270]
    ];
    for (const [x, y, angle] of corners) {
      if (this.textures.getFrame(cornerFrames[0], cornerFrames[1])) {
        panel.add(this.add.image(x, y, cornerFrames[0], cornerFrames[1]).setScale(cornerSize).setAngle(angle).setAlpha(0.9));
      }
    }

    if (title) {
      panel.add(this.add.bitmapText(0, -height / 2 + 48, "goldFont", title, 47).setOrigin(0.5, 0.5));
    }

    const close = this.add.image(-width / 2 + 55, -height / 2 + 52, "GJ_GameSheet03", "GJ_closeBtn_001.png")
      .setScale(0.9)
      .setInteractive();
    this._makeBouncyButton(close, 0.9, () => this._gattoClosePanel(root));
    panel.add(close);

    return { root, panel, panelBg, close, width, height };
  };

  GameScene.prototype._gattoClosePanel = function (root) {
    if (!root || !root.active) return;
    if (this._rewardsOverlay === root) {
      if (this._dailyTimerEvent) {
        this._dailyTimerEvent.remove(false);
        this._dailyTimerEvent = null;
      }
      this._dailyTimerLabels = null;
      this._freeButtonLabels = null;
      this._rewardsOverlay = null;
      this._rewardsOverlayKind = null;
    }
    if (this._profileOverlay === root) {
      this._profileOverlay = null;
      this._profilePanel = null;
    }
    if (this._accountSettingsOverlay === root) {
      this._accountSettingsOverlay = null;
    }
    if (this._socialLinksOverlay === root) {
      this._socialLinksOverlay = null;
    }
    root.destroy(true);
  };

  GameScene.prototype._gattoButton = function (parent, x, y, width, height, label, callback, size) {
    const group = this.add.container(x, y);
    const border = (this.textures.get("GJ_button01")?.source?.[0]?.width || 100) * 0.3;
    const bg = this._drawScale9(0, 0, width, height, "GJ_button01", border, 0xffffff, 1);
    group.add(bg);

    const text = this.add.bitmapText(0, -4, "goldFont", label, size || Math.min(35, height * 0.55)).setOrigin(0.5, 0.5);
    group.add(text);

    const hit = this.add.zone(0, 0, width, height).setInteractive();
    group.add(hit);

    const base = 1;
    const press = () => {
      hit._pressed = true;
      this.tweens.killTweensOf(group);
      this.tweens.add({ targets: group, scaleX: 1.1, scaleY: 1.1, duration: 180, ease: "Bounce.Out" });
    };
    const release = () => {
      if (!hit._pressed) return;
      hit._pressed = false;
      this.tweens.killTweensOf(group);
      this.tweens.add({ targets: group, scaleX: base, scaleY: base, duration: 220, ease: "Bounce.Out" });
      callback();
    };
    hit.on("pointerdown", press);
    hit.on("pointerout", () => {
      if (!hit._pressed) return;
      hit._pressed = false;
      this.tweens.killTweensOf(group);
      this.tweens.add({ targets: group, scaleX: base, scaleY: base, duration: 250, ease: "Bounce.Out" });
    });
    hit.on("pointerup", release);
    hit.on("pointerupoutside", () => {
      hit._pressed = false;
      group.setScale(base);
    });

    parent.add(group);
    return group;
  };

  GameScene.prototype._gattoIconButton = function (parent, x, y, frame, scale, callback) {
    const icon = this.add.image(x, y, "GJ_GameSheet03", frame).setScale(scale).setInteractive();
    this._makeBouncyButton(icon, scale, callback);
    parent.add(icon);
    return icon;
  };

  GameScene.prototype._gattoChest = function (parent, x, y, bodyColor, bandColor, scale) {
    const group = this.add.container(x, y).setScale(scale || 1);
    const g = this.add.graphics();

    // Box.
    g.fillStyle(0x3a2117, 1);
    g.fillRoundedRect(-96, -15, 192, 125, 15);
    g.lineStyle(4, 0x24120d, 1);
    g.strokeRoundedRect(-96, -15, 192, 125, 15);

    // Lid.
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(-103, -73, 206, 69, 17);
    g.lineStyle(4, 0x24120d, 1);
    g.strokeRoundedRect(-103, -73, 206, 69, 17);
    g.fillStyle(0xffffff, 0.2);
    g.fillRoundedRect(-92, -65, 184, 10, 5);

    // Metal bands.
    g.fillStyle(bandColor, 1);
    g.fillRect(-73, -75, 18, 185);
    g.fillRect(55, -75, 18, 185);
    g.lineStyle(3, 0x24120d, 1);
    g.strokeRect(-73, -75, 18, 185);
    g.strokeRect(55, -75, 18, 185);

    // Lock plate and keyhole.
    g.fillStyle(0xf2b83b, 1);
    g.fillRoundedRect(-27, 17, 54, 47, 7);
    g.lineStyle(3, 0x24120d, 1);
    g.strokeRoundedRect(-27, 17, 54, 47, 7);
    g.fillStyle(0x24120d, 1);
    g.fillCircle(0, 34, 7);
    g.fillRect(-3, 34, 6, 14);

    // Rivets.
    g.fillStyle(0x2b2b2b, 0.7);
    for (const rx of [-82, 82]) {
      for (const ry of [-55, 95]) g.fillCircle(rx, ry, 4);
    }

    group.add(g);
    parent.add(group);
    return group;
  };

  GameScene.prototype._gattoCubeLabel = function (parent, x, y) {
    const group = this.add.container(x, y);
    const cube = this.add.image(-20, 0, "GJ_GameSheetIcons", "player_01_001.png").setScale(0.38).setTint(0xffd83d);
    const label = this.add.bitmapText(2, -2, "bigFont", String(this._gattoCubes()), 26).setOrigin(0, 0.5);
    group.add(cube);
    group.add(label);
    parent.add(group);
    return label;
  };

  GameScene.prototype._gattoRefreshCubeLabels = function () {
    if (!this._gattoCubeLabels) return;
    for (const label of this._gattoCubeLabels) {
      if (label && label.active) label.setText(String(this._gattoCubes()));
    }
  };

  GameScene.prototype._gattoToast = function (text) {
    if (!this._gattoToastText) {
      this._gattoToastText = this.add.text(screenWidth / 2, screenHeight - 84, "", {
        fontSize: "22px",
        fontFamily: "Arial, sans-serif",
        color: "#ffffff",
        backgroundColor: "#000000cc",
        padding: { left: 16, right: 16, top: 8, bottom: 8 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2200).setAlpha(0);
    }
    this._gattoToastText.setText(text);
    this.tweens.killTweensOf(this._gattoToastText);
    this._gattoToastText.setAlpha(1);
    this.tweens.add({
      targets: this._gattoToastText,
      alpha: 0,
      delay: 1400,
      duration: 550,
      ease: "Linear"
    });
  };

  // ---------------------------------------------------------------------------
  // Main-menu additions: Daily button, user card and animated background icon.
  // ---------------------------------------------------------------------------
  GameScene.prototype._buildGattoMenuExtras = function () {
    if (this._gattoMenuExtrasBuilt) return;
    this._gattoMenuExtrasBuilt = true;

    this._menuDailyBtn = this.add.image(0, 0, "GJ_GameSheet03", "GJ_dailyRewardBtn_001.png")
      .setScrollFactor(0)
      .setDepth(30)
      .setScale(1.15)
      .setInteractive();
    this._expandHitArea(this._menuDailyBtn, 1.2);
    this._makeBouncyButton(this._menuDailyBtn, 1.15, () => {
      this._closePausedMenuOverlays();
      this._buildDailyRewards();
    }, () => this._menuActive && !this._rewardsOverlay && !this._profileOverlay);

    this._menuProfileGroup = this.add.container(0, 0).setScrollFactor(0).setDepth(31);
    const name = this._gattoUsername();
    this._menuProfileName = this.add.bitmapText(0, -76, "goldFont", name, 19).setOrigin(0.5, 0.5);
    const circle = this.add.circle(0, 0, 43, 0x1d84c6, 1).setStrokeStyle(4, 0xffffff, 1);
    this._menuProfileBtn = this.add.image(0, 0, "GJ_GameSheet03", "GJ_profileButton_001.png").setScale(0.9);
    this._menuProfileBtn.setInteractive();
    this._expandHitArea(this._menuProfileBtn, 1.2);
    this._makeBouncyButton(this._menuProfileBtn, 0.9, () => {
      this._closePausedMenuOverlays();
      this._buildProfilePopup();
    }, () => this._menuActive && !this._profileOverlay && !this._rewardsOverlay);
    this._menuProfileGroup.add([circle, this._menuProfileBtn, this._menuProfileName]);

    // The reference main menu has no News or More Games slot.
    if (Array.isArray(this._downloadBtns)) {
      for (const button of this._downloadBtns) button.setVisible(false);
    }
    if (this._chrSelDecor) this._chrSelDecor.setVisible(false);
    if (this._lvlEditDecor) this._lvlEditDecor.setVisible(false);

    this._layoutGattoMenuExtras();
    this._queueMenuBgIcon(700);

    this.events.once("shutdown", () => this._destroyGattoMenuExtras());
  };

  GameScene.prototype._closePausedMenuOverlays = function () {
    this._closeDailyRewards && this._closeDailyRewards();
    this._closeFreeRewards && this._closeFreeRewards();
  };

  GameScene.prototype._layoutGattoMenuExtras = function () {
    if (this._menuDailyBtn) {
      this._menuDailyBtn.x = screenWidth - 105;
      this._menuDailyBtn.y = 350;
    }
    if (this._menuProfileGroup) {
      this._menuProfileGroup.x = 95;
      this._menuProfileGroup.y = 430;
    }
  };

  GameScene.prototype._destroyGattoMenuExtras = function () {
    this._clearMenuBgIcon();
    if (this._menuBgSpawnEvent) {
      this._menuBgSpawnEvent.remove(false);
      this._menuBgSpawnEvent = null;
    }
    if (this._menuDailyBtn) {
      this.tweens.killTweensOf(this._menuDailyBtn);
      this._menuDailyBtn.destroy();
      this._menuDailyBtn = null;
    }
    if (this._menuProfileGroup) {
      this.tweens.killTweensOf(this._menuProfileBtn);
      this._menuProfileGroup.destroy(true);
      this._menuProfileGroup = null;
      this._menuProfileBtn = null;
      this._menuProfileName = null;
    }
    this._gattoMenuExtrasBuilt = false;
  };

  GameScene.prototype._menuBgFrameList = function () {
    if (this._menuBgIconFrames) return this._menuBgIconFrames;
    const texture = this.textures.get("GJ_GameSheetIcons");
    const names = texture && typeof texture.getFrameNames === "function" ? texture.getFrameNames() : [];
    this._menuBgIconFrames = names.filter((name) => {
      if (!/^(player|ship|bird|robot|spider|dart|swing)_/.test(name)) return false;
      if (/(_glow_|_extra_)/.test(name)) return false;
      if (/_2_/.test(name) || /_3_/.test(name)) return false;
      return !!this.textures.getFrame("GJ_GameSheetIcons", name);
    });
    return this._menuBgIconFrames;
  };

  GameScene.prototype._spawnMenuBgIcon = function () {
    if (!this._menuActive || this._menuBgIcon) return;
    const frames = this._menuBgFrameList();
    if (!frames.length) return;

    const frame = Phaser.Utils.Array.GetRandom(frames);
    const baseY = Phaser.Math.Between(145, 455);
    const icon = this.add.image(-110, baseY, "GJ_GameSheetIcons", frame)
      .setScrollFactor(0)
      .setDepth(24)
      .setScale(Phaser.Math.FloatBetween(0.62, 0.9))
      .setInteractive({ useHandCursor: true });

    // Bright, always-readable random colour.
    icon.setTint(Phaser.Display.Color.GetColor(
      90 + Math.floor(Math.random() * 165),
      90 + Math.floor(Math.random() * 165),
      90 + Math.floor(Math.random() * 165)
    ));

    this._menuBgIcon = icon;
    this._menuBgIconBaseY = baseY;

    icon.on("pointerdown", () => this._explodeMenuBgIcon(icon));

    const travel = Phaser.Math.Between(10000, 15000);
    this.tweens.add({
      targets: icon,
      x: screenWidth + 120,
      duration: travel,
      ease: "Linear",
      onComplete: () => {
        if (this._menuBgIcon !== icon) return;
        this._clearMenuBgIcon();
        this._queueMenuBgIcon(3000);
      }
    });

    const jump = () => {
      if (this._menuBgIcon !== icon || !icon.active) return;
      const jumpHeight = Phaser.Math.Between(45, 115);
      this._menuBgJumpTimer = this.time.delayedCall(Phaser.Math.Between(260, 760), () => {
        if (this._menuBgIcon !== icon || !icon.active) return;
        this.tweens.add({
          targets: icon,
          y: this._menuBgIconBaseY - jumpHeight,
          duration: Phaser.Math.Between(170, 280),
          yoyo: true,
          ease: "Quad.Out",
          onComplete: () => {
            if (this._menuBgIcon === icon && icon.active) jump();
          }
        });
      });
    };
    this.time.delayedCall(450, jump);
  };

  GameScene.prototype._queueMenuBgIcon = function (delay) {
    if (this._menuBgSpawnEvent) {
      this._menuBgSpawnEvent.remove(false);
      this._menuBgSpawnEvent = null;
    }
    this._menuBgSpawnEvent = this.time.delayedCall(Math.max(0, delay || 3000), () => {
      this._menuBgSpawnEvent = null;
      this._spawnMenuBgIcon();
    });
  };

  GameScene.prototype._clearMenuBgIcon = function () {
    if (this._menuBgJumpTimer) {
      this._menuBgJumpTimer.remove(false);
      this._menuBgJumpTimer = null;
    }
    if (this._menuBgIcon) {
      this.tweens.killTweensOf(this._menuBgIcon);
      this._menuBgIcon.destroy();
      this._menuBgIcon = null;
    }
  };

  GameScene.prototype._explodeMenuBgIcon = function (icon) {
    if (!icon || this._menuBgIcon !== icon) return;
    const x = icon.x;
    const y = icon.y;
    this._clearMenuBgIcon();

    const emitter = this.add.particles(x, y, "GJ_WebSheet", {
      frame: "square.png",
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.75, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 350, max: 650 },
      quantity: 20,
      tint: [0xffffff, 0xffe45c, 0xff9b3d, 0xff4b3e]
    }).setScrollFactor(0).setDepth(27);
    emitter.explode(20);

    const boom = this.add.image(x, y, "GJ_GameSheet03", "explosionIcon_01_001.png")
      .setScrollFactor(0)
      .setDepth(27)
      .setScale(1.2);
    this.tweens.add({
      targets: boom,
      scale: 2.4,
      alpha: 0,
      duration: 420,
      ease: "Quad.Out",
      onComplete: () => boom.destroy()
    });
    this.time.delayedCall(900, () => {
      if (emitter && emitter.active) emitter.destroy();
    });

    this._queueMenuBgIcon(3000);
  };

  // ---------------------------------------------------------------------------
  // Daily chests
  // ---------------------------------------------------------------------------
  GameScene.prototype._dailyState = function () {
    return readJson("gd_vip_daily", {});
  };

  GameScene.prototype._refreshDailyTimers = function () {
    if (!this._dailyTimerLabels) return;
    const state = this._dailyState();
    for (const [key, label] of Object.entries(this._dailyTimerLabels)) {
      if (!label || !label.active) continue;
      const left = this._gattoTimeLeft(state[key]);
      label.setText(left ? left : "OPEN");
    }
  };

  GameScene.prototype._claimDailyChest = function (key, cooldown) {
    const state = this._dailyState();
    if (this._gattoTimeLeft(state[key])) {
      this._gattoToast(`Puoi aprirla tra ${this._gattoTimeLeft(state[key])}`);
      return;
    }
    const reward = Phaser.Math.Between(10, 30);
    state[key] = Date.now() + cooldown;
    writeJson("gd_vip_daily", state);
    this._gattoAddCubes(reward);
    this._gattoRefreshCubeLabels();
    this._refreshDailyTimers();
    this._gattoToast(`+${reward} CUBI! Ricompensa ritirata.`);
    this.cameras.main.shake(90, 0.0035);
  };

  GameScene.prototype._buildDailyRewards = function () {
    this._closeDailyRewards && this._closeDailyRewards();
    if (this._profileOverlay) return;
    const panelData = this._gattoPanel(850, 500, 0xffffff, "REWARDS", "square01_001");
    const { root, panel } = panelData;
    this._rewardsOverlay = root;
    this._rewardsOverlayKind = "daily";
    this._dailyTimerLabels = {};
    this._gattoCubeLabels = this._gattoCubeLabels || [];

    this._gattoIconButton(panel, 355, -198, "GJ_freeChestBtn_001.png", 0.92, () => {
      this._closeDailyRewards();
      this._buildFreeRewards();
    });

    const cubeLabel = this._gattoCubeLabel(panel, 0, 220);
    this._gattoCubeLabels.push(cubeLabel);

    const defs = [
      { key: "daily1", x: -190, cooldown: 4 * 60 * 60 * 1000 },
      { key: "daily2", x: 190, cooldown: 24 * 60 * 60 * 1000 }
    ];
    const state = this._dailyState();

    for (const def of defs) {
      const chestGroup = this.add.container(def.x, -14);
      const isBlue = def.key === "daily2";
      this._gattoChest(chestGroup, 0, 0, isBlue ? 0x3d8ed8 : 0x8c4b2c, isBlue ? 0xf2b83b : 0xd2d5dc, 0.86);

      const timer = this.add.bitmapText(0, 132, "bigFont", "", 25).setOrigin(0.5);
      chestGroup.add(timer);
      this._dailyTimerLabels[def.key] = timer;

      const hit = this.add.zone(0, 20, 205, 185).setInteractive();
      chestGroup.add(hit);
      let pressed = false;
      hit.on("pointerdown", () => {
        pressed = true;
        this.tweens.killTweensOf(chestGroup);
        this.tweens.add({ targets: chestGroup, scaleX: 1.04, scaleY: 1.04, duration: 170, ease: "Bounce.Out" });
      });
      hit.on("pointerout", () => {
        if (!pressed) return;
        pressed = false;
        this.tweens.add({ targets: chestGroup, scaleX: 1, scaleY: 1, duration: 220, ease: "Bounce.Out" });
      });
      hit.on("pointerup", () => {
        if (!pressed) return;
        pressed = false;
        chestGroup.setScale(1);
        this._claimDailyChest(def.key, def.cooldown);
      });
      panel.add(chestGroup);
    }

    this._refreshDailyTimers();
    this._dailyTimerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this._refreshDailyTimers()
    });

    panel.scale = 0.94;
    this.tweens.add({ targets: panel, scale: 1, duration: 260, ease: "Back.Out" });
  };

  GameScene.prototype._closeDailyRewards = function () {
    if (this._dailyTimerEvent) {
      this._dailyTimerEvent.remove(false);
      this._dailyTimerEvent = null;
    }
    this._dailyTimerLabels = null;
    if (this._rewardsOverlay && this._rewardsOverlayKind === "daily") {
      this._rewardsOverlay.destroy(true);
      this._rewardsOverlay = null;
      this._rewardsOverlayKind = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Free rewards / social follows
  // ---------------------------------------------------------------------------
  GameScene.prototype._followedToday = function () {
    const day = new Date().toISOString().slice(0, 10);
    return readJson("gd_vip_followed", { day, channels: {} });
  };

  GameScene.prototype._followChannel = function (channel) {
    const data = this._followedToday();
    const today = new Date().toISOString().slice(0, 10);
    if (data.day !== today) {
      data.day = today;
      data.channels = {};
    }
    window.open(channel.url, "_blank", "noopener");

    if (data.channels[channel.key]) {
      this._gattoToast("Ricompensa gia ritirata oggi.");
      return;
    }
    data.channels[channel.key] = true;
    writeJson("gd_vip_followed", data);
    const reward = 25;
    this._gattoAddCubes(reward);
    this._gattoRefreshCubeLabels();
    this._refreshFreeButtons();
    this._gattoToast(`+${reward} CUBI! Grazie per il follow.`);
  };

  GameScene.prototype._refreshFreeButtons = function () {
    if (!this._freeButtonLabels) return;
    const data = this._followedToday();
    const today = new Date().toISOString().slice(0, 10);
    for (const [key, label] of Object.entries(this._freeButtonLabels)) {
      if (!label || !label.active) continue;
      const claimed = data.day === today && data.channels && data.channels[key];
      label.setText(claimed ? "RISCATTATO" : "+25 CUBI");
    }
  };

  GameScene.prototype._buildFreeRewards = function () {
    this._closeFreeRewards && this._closeFreeRewards();
    const panelData = this._gattoPanel(880, 500, 0xffffff, "FOLLOW GATTO ITALIANO!", "GJ_square01");
    const { root, panel } = panelData;
    this._rewardsOverlay = root;
    this._rewardsOverlayKind = "free";
    this._freeButtonLabels = {};
    this._gattoCubeLabels = this._gattoCubeLabels || [];

    const sub = this.add.bitmapText(0, -158, "bigFont", "EARNS REWARDS!", 27).setOrigin(0.5);
    panel.add(sub);

    const cubeLabel = this._gattoCubeLabel(panel, 0, 220);
    this._gattoCubeLabels.push(cubeLabel);

    CHANNELS.forEach((channel, index) => {
      const x = -275 + index * 275;
      const card = this.add.container(x, 15);
      const cardBg = this.add.rectangle(0, 0, 235, 245, 0x5b2b1e, 0.52).setStrokeStyle(3, 0xffcf5a, 0.9);
      card.add(cardBg);
      const icon = this.add.image(0, -68, "GJ_GameSheet03", channel.frame).setScale(0.85);
      const name = this.add.bitmapText(0, 33, "goldFont", channel.name, 24).setOrigin(0.5);
      const reward = this.add.bitmapText(0, 100, "bigFont", "+25 CUBI", 20).setOrigin(0.5);
      this._gattoChest(card, 0, 43, 0x74402a, 0xc58b33, 0.45);
      const hit = this.add.zone(0, 0, 235, 245).setInteractive();
      card.add([icon, name, reward, hit]);
      panel.add(card);
      this._freeButtonLabels[channel.key] = reward;

      const base = 1;
      hit.on("pointerdown", () => {
        hit._pressed = true;
        this.tweens.killTweensOf(card);
        this.tweens.add({ targets: card, scaleX: 1.06, scaleY: 1.06, duration: 170, ease: "Bounce.Out" });
      });
      hit.on("pointerout", () => {
        if (!hit._pressed) return;
        hit._pressed = false;
        this.tweens.add({ targets: card, scaleX: base, scaleY: base, duration: 220, ease: "Bounce.Out" });
      });
      hit.on("pointerup", () => {
        if (!hit._pressed) return;
        hit._pressed = false;
        card.setScale(base);
        this._followChannel(channel);
      });
    });

    this._refreshFreeButtons();
    panel.scale = 0.94;
    this.tweens.add({ targets: panel, scale: 1, duration: 260, ease: "Back.Out" });
  };

  GameScene.prototype._closeFreeRewards = function () {
    this._freeButtonLabels = null;
    if (this._rewardsOverlay && this._rewardsOverlayKind === "free") {
      this._rewardsOverlay.destroy(true);
      this._rewardsOverlay = null;
      this._rewardsOverlayKind = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Profile / My Socials
  // ---------------------------------------------------------------------------
  GameScene.prototype._buildProfilePopup = function () {
    this._closeProfileOverlay && this._closeProfileOverlay();
    const panelData = this._gattoPanel(1000, 560, 0xffffff, null, "GJ_square01");
    const { root, panel } = panelData;
    this._profileOverlay = root;
    this._profilePanel = panel;

    const username = this._gattoUsername();
    panel.add(this.add.bitmapText(0, -242, "goldFont", username, 43).setOrigin(0.5));

    // The old My Stuff slot is replaced with the player's socials.
    const socialsLabel = this.add.bitmapText(352, -236, "bigFont", "MY SOCIALS", 22).setOrigin(0.5);
    const socialsHit = this.add.zone(352, -236, 170, 38).setInteractive();
    socialsHit.on("pointerup", () => {
      this._closeProfileOverlay();
      this._buildSocialLinks();
    });
    panel.add([socialsLabel, socialsHit]);

    const stats = [
      ["GJ_starsIcon_001.png", "8,299"],
      ["GJ_moonsIcon_001.png", "1,045"],
      ["GJ_diamondsIcon_001.png", "119"],
      ["GJ_coinsIcon_001.png", "1,056"],
      ["GJ_demonIcon_001.png", "821"],
      ["GJ_completesIcon_001.png", "4"]
    ];
    stats.forEach((entry, index) => {
      const x = -350 + index * 140;
      const icon = this.add.image(x, -195, "GJ_GameSheet03", entry[0]).setScale(0.76);
      const value = this.add.bitmapText(x + 30, -198, "bigFont", entry[1], 25).setOrigin(0, 0.5);
      panel.add([icon, value]);
    });

    const iconRow = this.add.container(0, -125);
    const iconRowBg = this.add.rectangle(0, 0, 840, 84, 0x6d3b22, 0.7).setStrokeStyle(3, 0xb97546, 1);
    iconRow.add(iconRowBg);
    const iconFrames = [
      "player_01_001.png",
      "ship_01_001.png",
      "bird_01_001.png",
      "robot_01_01_001.png",
      "spider_01_01_001.png",
      "dart_01_001.png",
      "swing_01_001.png"
    ];
    iconFrames.forEach((frame, index) => {
      if (!this.textures.getFrame("GJ_GameSheetIcons", frame)) return;
      const icon = this.add.image(-350 + index * 110, 0, "GJ_GameSheetIcons", frame)
        .setScale(0.67)
        .setTint(0xff5a46);
      iconRow.add(icon);
    });
    panel.add(iconRow);

    const commentBg = this.add.rectangle(0, 30, 820, 128, 0xa4683e, 0.95).setStrokeStyle(3, 0xc78a57, 1);
    const commentName = this.add.bitmapText(-370, -5, "goldFont", username, 24).setOrigin(0, 0.5);
    const comment = this.add.text(-370, 32, "Benvenuto nel mio profilo!", {
      fontSize: "25px",
      fontFamily: "Arial, sans-serif",
      color: "#ffffff"
    }).setOrigin(0, 0.5);
    const date = this.add.text(370, 75, "oggi", {
      fontSize: "16px",
      fontFamily: "Arial, sans-serif",
      color: "#d8ae90"
    }).setOrigin(1, 0.5);
    panel.add([commentBg, commentName, comment, date]);

    const socialIcons = this.add.container(-370, 205);
    CHANNELS.forEach((channel, index) => {
      const icon = this.add.image(index * 75, 0, "GJ_GameSheet03", channel.frame).setScale(0.62).setInteractive();
      this._makeBouncyButton(icon, 0.62, () => window.open(channel.url, "_blank", "noopener"));
      socialIcons.add(icon);
    });
    panel.add(socialIcons);

    const gear = this.add.image(380, 205, "GJ_GameSheet03", "GJ_optionsBtn_001.png").setScale(0.85).setInteractive();
    this._makeBouncyButton(gear, 0.85, () => {
      this._closeProfileOverlay();
      this._buildAccountSettings();
    });
    panel.add(gear);

    panel.scale = 0.94;
    this.tweens.add({ targets: panel, scale: 1, duration: 260, ease: "Back.Out" });
  };

  GameScene.prototype._closeProfileOverlay = function () {
    if (this._profileOverlay) {
      this._profileOverlay.destroy(true);
      this._profileOverlay = null;
      this._profilePanel = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Account settings
  // ---------------------------------------------------------------------------
  GameScene.prototype._accountSettingsState = function () {
    return readJson("gd_vip_account_settings", { dm: 0, requests: 1, invites: 0, history: 0 });
  };

  GameScene.prototype._buildAccountSettings = function () {
    this._closeAccountSettings && this._closeAccountSettings();
    const panelData = this._gattoPanel(810, 590, 0xffffff, "ACCOUNT SETTINGS", "GJ_square01");
    const { root, panel } = panelData;
    this._accountSettingsOverlay = root;
    const state = this._accountSettingsState();

    const rowDefs = [
      { key: "dm", y: -155, title: "DIRECT MESSAGES:", options: ["FRIENDS", "OFF"] },
      { key: "requests", y: -75, title: "FRIEND REQUESTS: (i)", options: ["MESSAGES", "ON", "OFF"] },
      { key: "invites", y: 5, title: "GROUP INVITES: (i)", options: ["FRIENDS", "OFF"] },
      { key: "history", y: 85, title: "SHOW COMMENT HISTORY TO:", options: ["ALL", "FRIENDS", "ME"] }
    ];

    const rowBoxes = {};
    for (const row of rowDefs) {
      panel.add(this.add.bitmapText(0, row.y - 28, "goldFont", row.title, 19).setOrigin(0.5));
      const bg = this.add.rectangle(0, row.y + 3, 730, 48, 0x6d3b22, 0.65).setStrokeStyle(2, 0xba7749, 0.7);
      panel.add(bg);

      const startX = row.options.length === 3 ? -235 : -155;
      const spacing = row.options.length === 3 ? 200 : 245;
      rowBoxes[row.key] = [];
      row.options.forEach((option, index) => {
        const group = this.add.container(startX + index * spacing, row.y + 3);
        const box = this.add.image(-55, 0, "GJ_GameSheet03", state[row.key] === index ? "GJ_checkOn_001.png" : "GJ_checkOff_001.png").setScale(0.62);
        const label = this.add.bitmapText(-20, 0, "bigFont", option, 20).setOrigin(0, 0.5);
        const hit = this.add.zone(25, 0, 180, 44).setInteractive();
        group.add([box, label, hit]);
        panel.add(group);
        rowBoxes[row.key].push(box);

        hit.on("pointerup", () => {
          state[row.key] = index;
          rowBoxes[row.key].forEach((b, i) => {
            if (b && b.active) b.setTexture("GJ_GameSheet03", i === index ? "GJ_checkOn_001.png" : "GJ_checkOff_001.png");
          });
        });
      });
    }

    this._gattoButton(panel, 0, 165, 360, 56, "SOCIAL LINK SETTINGS", () => {
      this._closeAccountSettings();
      this._buildSocialLinks();
    }, 25);

    this._gattoButton(panel, -165, 240, 250, 56, "CANCEL", () => this._closeAccountSettings(), 30);
    this._gattoButton(panel, 165, 240, 250, 56, "UPDATE", () => {
      writeJson("gd_vip_account_settings", state);
      this._closeAccountSettings();
      this._gattoToast("Impostazioni account aggiornate.");
    }, 30);

    panel.scale = 0.94;
    this.tweens.add({ targets: panel, scale: 1, duration: 260, ease: "Back.Out" });
  };

  GameScene.prototype._closeAccountSettings = function () {
    if (this._accountSettingsOverlay) {
      this._accountSettingsOverlay.destroy(true);
      this._accountSettingsOverlay = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Social links
  // ---------------------------------------------------------------------------
  GameScene.prototype._buildSocialLinks = function () {
    this._closeSocialLinks && this._closeSocialLinks();
    const panelData = this._gattoPanel(850, 540, 0xffffff, "SOCIAL LINKS", "GJ_square01");
    const { root, panel } = panelData;
    this._socialLinksOverlay = root;

    const fields = [
      { label: "YOUTUBE:", value: "GATTOITALIANO", col: -205, row: -150 },
      { label: "TWITTER:", value: "GATTO_ITALIANO", col: 205, row: -150 },
      { label: "TWITCH:", value: "GATTO_ITALIANO", col: -205, row: -55 },
      { label: "INSTAGRAM:", value: "GATTOITALIANO", col: 205, row: -55 },
      { label: "TIKTOK:", value: "GATTOITALIANO7", col: -205, row: 40 },
      { label: "DISCORD:", value: "GATTOITALIANO12", col: 205, row: 40 },
      { label: "CUSTOM:", value: "GATTOITALIANO", col: -205, row: 135 }
    ];

    for (const field of fields) {
      panel.add(this.add.bitmapText(field.col, field.row - 30, "goldFont", `${field.label} (i)`, 19).setOrigin(0.5));
      const bg = this.add.rectangle(field.col, field.row, 370, 46, 0x6d3b22, 0.75).setStrokeStyle(2, 0xba7749, 0.75);
      const value = this.add.bitmapText(field.col, field.row - 2, "bigFont", field.value, 22).setOrigin(0.5);
      panel.add([bg, value]);
    }

    this._gattoButton(panel, 205, 135, 170, 55, "OK", () => this._closeSocialLinks(), 35);

    panel.scale = 0.94;
    this.tweens.add({ targets: panel, scale: 1, duration: 260, ease: "Back.Out" });
  };

  GameScene.prototype._closeSocialLinks = function () {
    if (this._socialLinksOverlay) {
      this._socialLinksOverlay.destroy(true);
      this._socialLinksOverlay = null;
    }
  };
})();
