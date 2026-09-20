/**
 * YouTube Shorts & AI Video Player & Exporter Engine
 * 60 FPS HTML5 Canvas Renderer with Audio Synthesis & MP4/WebM Video Exporter
 */

class ShortsVideoEngine {
  constructor(canvasElement, options = {}) {
    this.canvas = typeof canvasElement === 'string' ? document.getElementById(canvasElement) : canvasElement;
    if (!this.canvas) {
      console.warn('ShortsVideoEngine: Canvas element not found.');
      return;
    }
    this.ctx = this.canvas.getContext('2d');
    this.options = Object.assign({
      width: 540,
      height: 960,
      showWatermark: true,
      onTimeUpdate: null,
      onEnded: null,
      onSceneChange: null,
    }, options);

    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;

    this.videoData = null;
    this.currentTime = 0;
    this.duration = 30;
    this.isPlaying = false;
    this.isMuted = false;
    this.isExporting = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.currentSceneIndex = 0;

    // Particle systems
    this.fireflies = [];
    this.stars = [];
    this.emojis = [];
    this.initParticles();

    // Audio & Speech
    this.audioCtx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.isSpeechSupported = ('speechSynthesis' in window);
    this.speechUtterance = null;

    // Set initial canvas display
    this.drawCoverPoster();
  }

  initParticles() {
    // 50 ambient stars
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * this.options.width,
        y: Math.random() * (this.options.height * 0.7),
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 0.05 + 0.02,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // 25 fireflies / sparks
    this.fireflies = [];
    for (let i = 0; i < 28; i++) {
      this.fireflies.push({
        x: Math.random() * this.options.width,
        y: Math.random() * this.options.height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -Math.random() * 1.5 - 0.4,
        size: Math.random() * 3.5 + 2,
        alpha: Math.random() * 0.8 + 0.2,
        pulseSpeed: Math.random() * 0.08 + 0.04,
        hue: 45 + Math.random() * 25, // golden/amber
      });
    }

    // Comedy floating emojis
    const emojiList = ['😂', '⏰', '💀', '👀', '🔥', '🍕', '🏃', '😱'];
    this.emojis = [];
    for (let i = 0; i < 12; i++) {
      this.emojis.push({
        char: emojiList[i % emojiList.length],
        x: Math.random() * this.options.width,
        y: this.options.height + Math.random() * 200,
        vy: -(Math.random() * 1.8 + 0.8),
        size: Math.floor(Math.random() * 16 + 24),
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.05,
      });
    }
  }

  loadVideoData(data) {
    this.videoData = data;
    this.duration = data.duration_seconds || 30;
    this.currentTime = 0;
    this.currentSceneIndex = 0;
    this.drawCoverPoster();
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.bgmGain = this.audioCtx.createGain();
        this.bgmGain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
        this.bgmGain.connect(this.audioCtx.destination);

        this.sfxGain = this.audioCtx.createGain();
        this.sfxGain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
        this.sfxGain.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playSoundEffect(type) {
    if (this.isMuted || !this.audioCtx) return;
    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.sfxGain);

      if (type === 'sparkle' || type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1760, t + 0.3);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
      } else if (type === 'pop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
      } else if (type === 'whoosh') {
        // Filtered noise or pitch dive
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.25);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
      }
    } catch (e) {
      console.warn('Audio FX error:', e);
    }
  }

  playBgmChord(index, isKids) {
    if (this.isMuted || !this.audioCtx) return;
    try {
      const t = this.audioCtx.currentTime;
      // Soft gentle pentatonic chords for bedtime lullaby, or funky intervals for comedy
      const kidsFrequencies = [261.63, 329.63, 392.0, 523.25, 659.25]; // C, E, G, C, E
      const comedyFrequencies = [196.0, 246.94, 293.66, 392.0, 440.0]; // G, B, D, G, A
      const freqs = isKids ? kidsFrequencies : comedyFrequencies;

      freqs.forEach((f, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = isKids ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f * (isKids ? 1.0 : 0.8), t + i * 0.08);
        gain.gain.setValueAtTime(0.06, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(t + i * 0.08);
        osc.stop(t + 1.9);
      });
    } catch (e) {
      // Ignore background audio glitch
    }
  }

  speakNarration(scene) {
    if (this.isMuted || !scene || !scene.narration) return;

    // 1. If real AI studio speech file is attached to the scene, play real studio audio
    if (scene.audio_url) {
      try {
        if (this.currentAudioEl) {
          this.currentAudioEl.pause();
          this.currentAudioEl.currentTime = 0;
        }
        if (this.isSpeechSupported) {
          window.speechSynthesis.cancel();
        }
        const audio = new Audio(scene.audio_url);
        audio.volume = this.isMuted ? 0 : 1.0;
        audio.play().catch((e) => {
          console.warn('Real AI voice playback notice:', e.message);
        });
        this.currentAudioEl = audio;
        return;
      } catch (audioErr) {
        console.warn('Real AI audio play failed, falling back:', audioErr);
      }
    }

    // 2. If no audio_url exists yet, request real Gemini AI voice in the background for caching
    const isKids = this.isKidsTheme();
    if (!scene.audio_url && !scene._fetchingVoice) {
      scene._fetchingVoice = true;
      fetch('/api/generate-ai-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scene.narration,
          voice_name: isKids ? 'Kore' : 'Zephyr',
          style_prompt: isKids
            ? 'Speak in a soft, gentle, whispering bedtime storyteller voice'
            : 'Speak with lively, energetic comedic timing',
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.success && data.audio_url) {
            scene.audio_url = data.audio_url;
            // If still on this scene and playing, transition smoothly to real voice
            const activeScene = this.getCurrentScene();
            if (activeScene && activeScene.scene_number === scene.scene_number && this.isPlaying && !this.isMuted) {
              if (this.isSpeechSupported) window.speechSynthesis.cancel();
              const realAudio = new Audio(data.audio_url);
              realAudio.volume = 1.0;
              realAudio.play().catch(() => {});
              this.currentAudioEl = realAudio;
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          scene._fetchingVoice = false;
        });
    }

    // 3. Fallback to browser SpeechSynthesis while real audio is fetching or if offline
    if (!this.isSpeechSupported) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(scene.narration);
      utterance.rate = isKids ? 0.92 : 1.15;
      utterance.pitch = isKids ? 1.15 : 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel'))
        );
        if (preferred) utterance.voice = preferred;
      }

      window.speechSynthesis.speak(utterance);
      this.speechUtterance = utterance;
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  play() {
    this.initAudio();
    this.isPlaying = true;
    this.lastFrameTime = performance.now();

    // Trigger initial scene narration and sound
    const scene = this.getCurrentScene();
    if (scene) {
      this.speakNarration(scene);
      this.playSoundEffect(scene.sound_effect || 'sparkle');
      const isKids = this.isKidsTheme();
      this.playBgmChord(0, isKids);
    }

    this.tick(performance.now());
  }

  pause() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.currentAudioEl) {
      this.currentAudioEl.pause();
    }
    if (this.isSpeechSupported) {
      window.speechSynthesis.cancel();
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      if (this.currentTime >= this.duration) {
        this.currentTime = 0;
        this.currentSceneIndex = 0;
      }
      this.play();
    }
    return this.isPlaying;
  }

  seek(seconds) {
    this.currentTime = Math.max(0, Math.min(this.duration, seconds));
    this.updateCurrentSceneIndex();
    this.renderFrame(this.currentTime);
    if (this.isPlaying) {
      const scene = this.getCurrentScene();
      this.speakNarration(scene);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.currentAudioEl) {
      this.currentAudioEl.volume = this.isMuted ? 0 : 1.0;
    }
    if (this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.audioCtx.currentTime);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.audioCtx.currentTime);
    }
    if (this.isMuted && this.isSpeechSupported) {
      window.speechSynthesis.cancel();
    }
    return this.isMuted;
  }

  getCurrentScene() {
    if (!this.videoData || !this.videoData.scenes || this.videoData.scenes.length === 0) {
      return null;
    }
    const scenes = this.videoData.scenes;
    for (let i = 0; i < scenes.length; i++) {
      if (this.currentTime >= scenes[i].start_sec && this.currentTime < scenes[i].end_sec) {
        return scenes[i];
      }
    }
    return scenes[scenes.length - 1];
  }

  updateCurrentSceneIndex() {
    if (!this.videoData || !this.videoData.scenes) return;
    const scenes = this.videoData.scenes;
    for (let i = 0; i < scenes.length; i++) {
      if (this.currentTime >= scenes[i].start_sec && this.currentTime < scenes[i].end_sec) {
        if (this.currentSceneIndex !== i) {
          this.currentSceneIndex = i;
          if (this.options.onSceneChange) {
            this.options.onSceneChange(i, scenes[i]);
          }
          if (this.isPlaying) {
            this.speakNarration(scenes[i]);
            this.playSoundEffect(scenes[i].sound_effect || 'whoosh');
            this.playBgmChord(i, this.isKidsTheme());
          }
        }
        break;
      }
    }
  }

  isKidsTheme() {
    if (!this.videoData) return false;
    const str = `${this.videoData.channel_handle || ''} ${this.videoData.theme || ''} ${this.videoData.title || ''}`.toLowerCase();
    return str.includes('tiinywondertales') || str.includes('firefly') || str.includes('pip') || str.includes('bedtime') || str.includes('story') || str.includes('kids');
  }

  tick(now) {
    if (!this.isPlaying) return;

    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.currentTime += delta;

    if (this.currentTime >= this.duration) {
      this.currentTime = this.duration;
      this.isPlaying = false;
      this.renderFrame(this.currentTime);
      if (this.options.onEnded) this.options.onEnded();
      return;
    }

    this.updateCurrentSceneIndex();
    this.renderFrame(this.currentTime);

    if (this.options.onTimeUpdate) {
      this.options.onTimeUpdate(this.currentTime, this.duration);
    }

    this.animationFrameId = requestAnimationFrame((t) => this.tick(t));
  }

  renderFrame(time) {
    const ctx = this.ctx;
    const w = this.options.width;
    const h = this.options.height;
    const isKids = this.isKidsTheme();
    const scene = this.getCurrentScene();

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Background Visual Scene
    if (isKids) {
      this.renderKidsForestScene(ctx, w, h, time, scene);
    } else {
      this.renderComedyPopScene(ctx, w, h, time, scene);
    }

    // 2. Draw Dynamic Kinetic Subtitles
    this.renderKineticSubtitles(ctx, w, h, time, scene);

    // 3. Draw YouTube Shorts Overlay UI Elements
    this.renderShortsUiOverlay(ctx, w, h, time, isKids);
  }

  renderKidsForestScene(ctx, w, h, time, scene) {
    // Deep night sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#040714');
    skyGrad.addColorStop(0.4, '#0D1B2A');
    skyGrad.addColorStop(0.75, '#1B263B');
    skyGrad.addColorStop(1, '#0C1821');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Twinkling stars
    this.stars.forEach((s) => {
      const alpha = 0.3 + 0.7 * Math.sin(time * 2.5 + s.phase);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, alpha)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Gentle Crescent Moon
    ctx.save();
    ctx.shadowColor = '#FFF5B8';
    ctx.shadowBlur = 35;
    ctx.fillStyle = '#FFEAA7';
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.12, 42, 0, Math.PI * 2);
    ctx.fill();
    // Moon shadow for crescent
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#070C1B';
    ctx.beginPath();
    ctx.arc(w * 0.80, h * 0.11, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ancient Whispering Trees Silhouette
    ctx.fillStyle = '#060B12';
    // Left Tree
    ctx.beginPath();
    ctx.moveTo(0, h * 0.85);
    ctx.bezierCurveTo(w * 0.15, h * 0.75, w * 0.25, h * 0.55, w * 0.1, h * 0.35);
    ctx.bezierCurveTo(w * 0.3, h * 0.45, w * 0.35, h * 0.65, w * 0.45, h * 0.9);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Bioluminescent Moss Ground
    const groundGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
    groundGrad.addColorStop(0, '#0B2925');
    groundGrad.addColorStop(0.4, '#051815');
    groundGrad.addColorStop(1, '#020C0A');
    ctx.fillStyle = groundGrad;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.82);
    ctx.quadraticCurveTo(w * 0.35, h * 0.76, w * 0.7, h * 0.83);
    ctx.quadraticCurveTo(w * 0.88, h * 0.85, w, h * 0.81);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Bioluminescent Mushrooms on Ground
    ctx.save();
    ctx.shadowColor = '#00FFA3';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#00F0B5';
    // Shroom 1
    ctx.beginPath();
    ctx.ellipse(w * 0.25, h * 0.84, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shroom 2
    ctx.beginPath();
    ctx.ellipse(w * 0.30, h * 0.85, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Floating Fireflies with Glow Halo
    this.fireflies.forEach((f) => {
      f.y += f.vy;
      f.x += f.vx + Math.sin(time * 3 + f.alpha) * 0.6;
      if (f.y < -20) f.y = h + 20;
      if (f.x < -20) f.x = w + 20;
      if (f.x > w + 20) f.x = -20;

      const pulse = 0.5 + 0.5 * Math.sin(time * 4 + f.alpha * 10);
      ctx.save();
      ctx.shadowColor = `hsl(${f.hue}, 100%, 70%)`;
      ctx.shadowBlur = 18 * pulse;
      ctx.fillStyle = `hsla(${f.hue}, 100%, 80%, ${f.alpha})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * (0.8 + 0.4 * pulse), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // HERO CHARACTER: PIP THE FIREFLY (Center-Upper Area)
    this.renderPipCharacter(ctx, w, h, time, scene);
  }

  renderPipCharacter(ctx, w, h, time, scene) {
    // Pip floats and breathes with sine wave
    const floatY = Math.sin(time * 3) * 12;
    const floatX = Math.cos(time * 1.5) * 8;
    const cx = w * 0.5 + floatX;
    const cy = h * 0.38 + floatY;

    // Glowing Lantern / Abdomen Radiance (Dynamic Pulsing)
    const glowPulse = 0.7 + 0.3 * Math.sin(time * 5);
    const grad = ctx.createRadialGradient(cx, cy + 30, 10, cx, cy + 30, 140 * glowPulse);
    grad.addColorStop(0, 'rgba(255, 230, 100, 0.95)');
    grad.addColorStop(0.3, 'rgba(255, 180, 50, 0.5)');
    grad.addColorStop(0.7, 'rgba(255, 140, 0, 0.15)');
    grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy + 30, 140 * glowPulse, 0, Math.PI * 2);
    ctx.fill();

    // Wings (Fluttering with high-frequency sine)
    const wingFlap = Math.sin(time * 28) * 0.7;
    ctx.save();
    ctx.translate(cx, cy - 10);
    ctx.fillStyle = 'rgba(230, 245, 255, 0.65)';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    // Left Wing
    ctx.save();
    ctx.rotate(-0.4 + wingFlap * 0.3);
    ctx.beginPath();
    ctx.ellipse(-38, -15, 34, 16, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right Wing
    ctx.save();
    ctx.rotate(0.4 - wingFlap * 0.3);
    ctx.beginPath();
    ctx.ellipse(38, -15, 34, 16, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // Pip Body (Cute round bumblebee/firefly shape)
    ctx.fillStyle = '#2C3A47';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 28, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Abdomen
    ctx.save();
    ctx.shadowColor = '#FFE600';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#FFD32A';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 26, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Cute Head & Big Expressive Eyes
    ctx.fillStyle = '#1E272E';
    ctx.beginPath();
    ctx.arc(cx, cy - 30, 24, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 9, cy - 32, 8, 0, Math.PI * 2);
    ctx.arc(cx + 9, cy - 32, 8, 0, Math.PI * 2);
    ctx.fill();

    // Pupils looking curious
    const eyeLook = Math.sin(time * 2) * 2;
    ctx.fillStyle = '#0F141C';
    ctx.beginPath();
    ctx.arc(cx - 9 + eyeLook, cy - 32, 4.5, 0, Math.PI * 2);
    ctx.arc(cx + 9 + eyeLook, cy - 32, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight sparkles in eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 11 + eyeLook, cy - 34, 2, 0, Math.PI * 2);
    ctx.arc(cx + 7 + eyeLook, cy - 34, 2, 0, Math.PI * 2);
    ctx.fill();

    // Antennae with cute glowing tips
    ctx.strokeStyle = '#2C3A47';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 50);
    ctx.quadraticCurveTo(cx - 18, cy - 65, cx - 24, cy - 60);
    ctx.moveTo(cx + 8, cy - 50);
    ctx.quadraticCurveTo(cx + 18, cy - 65, cx + 24, cy - 60);
    ctx.stroke();

    // Antenna glow tips
    ctx.fillStyle = '#00F5FF';
    ctx.beginPath();
    ctx.arc(cx - 24, cy - 60, 4, 0, Math.PI * 2);
    ctx.arc(cx + 24, cy - 60, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  renderComedyPopScene(ctx, w, h, time, scene) {
    // Dynamic Studio Background with Rotating Rays
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 40, w * 0.5, h * 0.45, w * 0.85);
    bgGrad.addColorStop(0, '#FF4B2B');
    bgGrad.addColorStop(0.5, '#FF416C');
    bgGrad.addColorStop(1, '#1A0B2E');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Comic Halftone / Sunburst Rays
    ctx.save();
    ctx.translate(w * 0.5, h * 0.42);
    ctx.rotate(time * 0.15);
    const numRays = 16;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < numRays; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const a1 = (i * 2 * Math.PI) / numRays;
      const a2 = a1 + Math.PI / numRays;
      ctx.arc(0, 0, Math.max(w, h), a1, a2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Floating Animated Emojis
    this.emojis.forEach((em) => {
      em.y += em.vy;
      em.rot += em.vRot;
      if (em.y < -50) {
        em.y = h + 50;
        em.x = Math.random() * w;
      }
      ctx.save();
      ctx.translate(em.x, em.y);
      ctx.rotate(em.rot);
      ctx.font = `${em.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(em.char, 0, 0);
      ctx.restore();
    });

    // Central Comedy Visual: Vibrating Smartphone / Notification Card
    const cardBounce = Math.sin(time * 4) * 8;
    const cx = w * 0.5;
    const cy = h * 0.38 + cardBounce;

    ctx.save();
    ctx.translate(cx, cy);

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;

    // Phone body
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(-130, -180, 260, 360, [32]);
    ctx.fill();

    // Screen
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1F2937';
    ctx.beginPath();
    ctx.roundRect(-120, -170, 240, 340, [24]);
    ctx.fill();

    // Notification Card (Alarm or Calendar panic)
    const alertShake = (Math.sin(time * 30) > 0.6) ? Math.sin(time * 50) * 4 : 0;
    ctx.translate(alertShake, 0);

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.roundRect(-105, -120, 210, 100, [16]);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CALENDAR ALERT ⏰', -90, -90);

    ctx.font = '13px -apple-system, sans-serif';
    ctx.fillText('Event: "Agreed 3 weeks ago"', -90, -68);
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.fillStyle = '#FEE2E2';
    ctx.fillText('STATUS: INSTANT REGRET 💀', -90, -45);

    // Punchy Reaction Emoji inside phone
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('😱', 0, 70);

    ctx.restore();
  }

  renderKineticSubtitles(ctx, w, h, time, scene) {
    if (!scene) return;

    const narration = scene.narration || '';
    const words = narration.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;

    // Calculate word highlight based on scene duration progress
    const sceneDuration = Math.max(1, scene.end_sec - scene.start_sec);
    const sceneElapsed = Math.max(0, time - scene.start_sec);
    const progress = Math.min(1, sceneElapsed / sceneDuration);
    const activeWordIndex = Math.min(words.length - 1, Math.floor(progress * words.length));

    // Show chunk of 3-5 words around the active word
    const chunkSize = 4;
    const chunkStart = Math.floor(activeWordIndex / chunkSize) * chunkSize;
    const chunkWords = words.slice(chunkStart, chunkStart + chunkSize);

    const subY = h * 0.74;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtitle Container Pill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(w * 0.08, subY - 45, w * 0.84, 90, [18]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Measure and render words with karaoke highlight
    const fontSize = 32;
    ctx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;

    // Compute total text width of chunk
    let totalW = 0;
    const wordWidths = chunkWords.map((word) => {
      const metrics = ctx.measureText(word + ' ');
      totalW += metrics.width;
      return metrics.width;
    });

    let startX = (w - totalW) / 2;

    chunkWords.forEach((word, idx) => {
      const globalIndex = chunkStart + idx;
      const isActive = (globalIndex === activeWordIndex);
      const isPast = (globalIndex < activeWordIndex);

      ctx.save();
      const currentX = startX + wordWidths[idx] / 2;
      const currentY = subY;

      if (isActive) {
        // High-contrast neon bounce highlight
        const bounceScale = 1.15;
        ctx.translate(currentX, currentY);
        ctx.scale(bounceScale, bounceScale);
        ctx.translate(-currentX, -currentY);

        ctx.shadowColor = '#FFE600';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#FFE600'; // Bright Yellow
      } else if (isPast) {
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      }

      // Heavy black stroke for readability
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(word, currentX, currentY);
      ctx.fillText(word, currentX, currentY);

      ctx.restore();
      startX += wordWidths[idx];
    });

    ctx.restore();
  }

  renderShortsUiOverlay(ctx, w, h, time, isKids) {
    // 1. Top Channel Header Badge
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(16, 20, 220, 42, [21]);
    ctx.fill();

    // Channel Icon
    ctx.fillStyle = isKids ? '#10B981' : '#EF4444';
    ctx.beginPath();
    ctx.arc(36, 41, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isKids ? '🌟' : '⚡', 36, 41);

    // Channel Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    const channelName = isKids ? '@tiinywondertales' : '@thedailyE-shorts';
    ctx.fillText(channelName, 58, 41);

    // 2. Right Side YouTube Shorts Action Icons (Like, Comment, Share)
    const rightX = w - 46;
    const actions = [
      { icon: '❤️', label: '142K' },
      { icon: '💬', label: '1.8K' },
      { icon: '↗️', label: 'Share' },
      { icon: '🎵', label: 'Remix' },
    ];

    actions.forEach((act, idx) => {
      const actY = h * 0.48 + idx * 64;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.arc(rightX, actY, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(act.icon, rightX, actY);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(act.label, rightX, actY + 28);
    });

    // 3. Bottom Progress Bar
    const progress = Math.min(1, time / Math.max(1, this.duration));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, h - 4, w, 4);

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, h - 4, w * progress, 4);

    ctx.restore();
  }

  drawCoverPoster() {
    const ctx = this.ctx;
    const w = this.options.width;
    const h = this.options.height;
    const isKids = this.isKidsTheme();

    ctx.clearRect(0, 0, w, h);

    if (isKids) {
      this.renderKidsForestScene(ctx, w, h, 0, this.getCurrentScene());
    } else {
      this.renderComedyPopScene(ctx, w, h, 0, this.getCurrentScene());
    }

    // Centered Play Button Overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 12, h * 0.5 - 20);
    ctx.lineTo(w * 0.5 + 22, h * 0.5);
    ctx.lineTo(w * 0.5 - 12, h * 0.5 + 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Real Video Exporter (WebM / MP4)
   * Captures canvas stream and records frames with MediaRecorder
   */
  async exportVideoAsFile(onProgress) {
    if (this.isExporting) return;
    this.isExporting = true;
    this.pause();

    try {
      if (onProgress) onProgress({ percent: 5, status: 'Initializing video stream encoder...' });

      // Supported mimeTypes
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const stream = this.canvas.captureStream(30); // 30 FPS
      const recordedChunks = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3500000 });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      const recordPromise = new Promise((resolve, reject) => {
        mediaRecorder.onstop = () => resolve(recordedChunks);
        mediaRecorder.onerror = (e) => reject(e);
      });

      mediaRecorder.start(100);

      // Render through video step-by-step
      const totalSeconds = this.duration;
      const fps = 30;
      const totalFrames = Math.floor(totalSeconds * fps);
      const frameStep = 1 / fps;

      for (let f = 0; f < totalFrames; f++) {
        const renderTime = f * frameStep;
        this.currentTime = renderTime;
        this.updateCurrentSceneIndex();
        this.renderFrame(renderTime);

        if (f % 15 === 0 && onProgress) {
          const percent = Math.floor((f / totalFrames) * 85) + 10;
          onProgress({ percent, status: `Rendering frames... (${Math.floor(renderTime)}s / ${totalSeconds}s)` });
          await new Promise(r => setTimeout(r, 8));
        }
      }

      if (onProgress) onProgress({ percent: 95, status: 'Finalizing video container...' });
      mediaRecorder.stop();

      const chunks = await recordPromise;
      const videoBlob = new Blob(chunks, { type: mimeType });

      // Generate Download
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const safeTitle = (this.videoData && this.videoData.title ? this.videoData.title.slice(0, 30).replace(/[^a-z0-9]/gi, '_') : 'youtube_short');
      a.download = `${safeTitle}_short.webm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 2000);

      if (onProgress) onProgress({ percent: 100, status: 'Video Downloaded Successfully!' });
      this.isExporting = false;
      return true;
    } catch (err) {
      console.error('Error exporting video:', err);
      this.isExporting = false;
      if (onProgress) onProgress({ percent: 0, status: 'Export Error: ' + err.message });
      throw err;
    }
  }
}

// Attach to window
window.ShortsVideoEngine = ShortsVideoEngine;
