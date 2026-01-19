"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Coffee,
  Brain,
  Volume2,
  VolumeX,
  Flame,
  Loader2,
  Zap,
  Target,
  CloudRain,
  TreePine,
  Waves,
  Wind,
  Music,
  Sparkles,
  Moon,
  Sun,
  Settings,
  Check,
  X,
} from "lucide-react";
import { timerApi } from "@/lib/api";

// Free audio URLs that work reliably (archive.org, GitHub raw, etc.)
const AUDIO_SOURCES: Record<string, string> = {
  rain: "https://archive.org/download/rain-sounds/rain-sounds.mp3",
  ocean: "https://archive.org/download/ocean-waves-sound/ocean-waves.mp3",
  forest: "https://archive.org/download/forest-birds-sounds/forest-birds.mp3",
  fire: "https://archive.org/download/fireplace-sounds/fireplace.mp3",
  cafe: "https://archive.org/download/coffee-shop-ambience/coffee-shop.mp3",
  lofi: "https://archive.org/download/lofi-hip-hop-radio/lofi-beats.mp3",
};

// Fallback: Generate ambient sounds using Web Audio API
const createAmbientSound = (type: string, audioContext: AudioContext) => {
  const bufferSize = 2 * audioContext.sampleRate;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  // Different noise patterns for different sounds
  if (type === "rain" || type === "whitenoise") {
    // White noise for rain
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  } else if (type === "ocean") {
    // Modulated noise for ocean waves
    for (let i = 0; i < bufferSize; i++) {
      const wave = Math.sin(i / (audioContext.sampleRate / 0.1)) * 0.5 + 0.5;
      output[i] = (Math.random() * 2 - 1) * wave;
    }
  } else if (type === "forest") {
    // Gentle noise with chirps
    for (let i = 0; i < bufferSize; i++) {
      const chirp = Math.sin(i / 100) * Math.sin(i / 1000) * 0.3;
      output[i] = (Math.random() * 0.5 - 0.25) + chirp;
    }
  } else if (type === "fire") {
    // Crackling fire
    for (let i = 0; i < bufferSize; i++) {
      const crackle = Math.random() > 0.995 ? (Math.random() * 2 - 1) * 0.8 : 0;
      output[i] = (Math.random() * 0.3 - 0.15) + crackle;
    }
  } else {
    // Default brown noise
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }
  }
  
  return noiseBuffer;
};

const ambientSounds = [
  { id: "rain", name: "Rain", icon: CloudRain, color: "bg-blue-500" },
  { id: "ocean", name: "Ocean", icon: Waves, color: "bg-cyan-500" },
  { id: "forest", name: "Forest", icon: TreePine, color: "bg-green-500" },
  { id: "fire", name: "Fire", icon: Flame, color: "bg-orange-500" },
  { id: "cafe", name: "Cafe", icon: Coffee, color: "bg-amber-600" },
  { id: "whitenoise", name: "White Noise", icon: Wind, color: "bg-gray-500" },
];

const presets = [
  { name: "Pomodoro", focus: 25, shortBreak: 5, longBreak: 15, icon: Target },
  { name: "Deep Work", focus: 50, shortBreak: 10, longBreak: 30, icon: Brain },
  { name: "Sprint", focus: 15, shortBreak: 3, longBreak: 10, icon: Zap },
  { name: "Extended", focus: 45, shortBreak: 10, longBreak: 20, icon: Moon },
];

export default function TimerPage() {
  const [mode, setMode] = useState<"focus" | "shortBreak" | "longBreak">("focus");
  const [settings, setSettings] = useState(presets[0]);
  const [timeLeft, setTimeLeft] = useState(presets[0].focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(30);
  const [loading, setLoading] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(false);
  
  const sessionStartTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const totalTime = mode === "focus"
    ? settings.focus * 60
    : mode === "shortBreak"
    ? settings.shortBreak * 60
    : settings.longBreak * 60;

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  // Play ambient sound using Web Audio API
  const playAudio = useCallback((soundId: string) => {
    stopAudio();
    
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      const buffer = createAmbientSound(soundId, audioContextRef.current);
      
      sourceNodeRef.current = audioContextRef.current.createBufferSource();
      sourceNodeRef.current.buffer = buffer;
      sourceNodeRef.current.loop = true;
      
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = volume / 100;
      
      // Add a low-pass filter for smoother sound
      const filter = audioContextRef.current.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = soundId === "rain" ? 1000 : soundId === "ocean" ? 600 : 800;
      
      sourceNodeRef.current.connect(filter);
      filter.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
      
      sourceNodeRef.current.start();
      setSelectedSound(soundId);
      setAudioPlaying(true);
    } catch (err) {
      console.error("Failed to play audio:", err);
    }
  }, [volume]);

  const stopAudio = useCallback(() => {
    try {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch (e) {
      // Ignore errors on stop
    }
    setAudioPlaying(false);
    setSelectedSound(null);
  }, []);

  // Load settings
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [settingsRes, sessionsRes] = await Promise.all([
          timerApi.getSettings(),
          timerApi.getSessions({ limit: 50 }),
        ]);
        
        if (settingsRes.success && settingsRes.data) {
          const s = settingsRes.data as { workDuration?: number; shortBreakDuration?: number; longBreakDuration?: number };
          if (s.workDuration) {
            const customSettings = {
              name: "Custom",
              focus: s.workDuration,
              shortBreak: s.shortBreakDuration || 5,
              longBreak: s.longBreakDuration || 15,
              icon: Settings,
            };
            setSettings(customSettings);
            setTimeLeft(s.workDuration * 60);
          }
        }
        
        if (sessionsRes.success && sessionsRes.data) {
          const today = new Date().toDateString();
          const sessionsData = sessionsRes.data as Array<{ type: string; startTime: string; duration: number }>;
          const todaySessions = sessionsData.filter((s) => 
            s.type === "WORK" && new Date(s.startTime).toDateString() === today
          );
          setSessions(todaySessions.length);
          const totalMins = todaySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
          setTotalFocusTime(totalMins * 60);
        }
      } catch (err) {
        console.error("Failed to load timer data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Save session
  const saveSession = useCallback(async (type: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK", completed: boolean) => {
    if (!sessionStartTimeRef.current) return;
    
    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartTimeRef.current.getTime();
    const durationMins = Math.round(durationMs / 60000);
    
    if (durationMins < 1) return;
    
    try {
      await timerApi.createSession({
        type,
        duration: durationMins,
        completed,
        startTime: sessionStartTimeRef.current.toISOString(),
        endTime: endTime.toISOString(),
      });
    } catch (err) {
      console.error("Failed to save session:", err);
    }
    
    sessionStartTimeRef.current = null;
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            const sessionType = mode === "focus" ? "FOCUS" : mode === "shortBreak" ? "SHORT_BREAK" : "LONG_BREAK";
            saveSession(sessionType, true);
            if (mode === "focus") {
              setSessions((s) => s + 1);
            }
            return 0;
          }
          if (mode === "focus") {
            setTotalFocusTime((t) => t + 1);
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode, saveSession]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTotalTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const toggleTimer = () => {
    if (!isRunning) {
      sessionStartTimeRef.current = new Date();
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    if (isRunning && sessionStartTimeRef.current) {
      const sessionType = mode === "focus" ? "FOCUS" : mode === "shortBreak" ? "SHORT_BREAK" : "LONG_BREAK";
      saveSession(sessionType, false);
    }
    setIsRunning(false);
    setTimeLeft(
      mode === "focus" ? settings.focus * 60
        : mode === "shortBreak" ? settings.shortBreak * 60
        : settings.longBreak * 60
    );
    sessionStartTimeRef.current = null;
  };

  const switchMode = (newMode: "focus" | "shortBreak" | "longBreak") => {
    if (isRunning && sessionStartTimeRef.current) {
      const sessionType = mode === "focus" ? "FOCUS" : mode === "shortBreak" ? "SHORT_BREAK" : "LONG_BREAK";
      saveSession(sessionType, false);
    }
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(
      newMode === "focus" ? settings.focus * 60
        : newMode === "shortBreak" ? settings.shortBreak * 60
        : settings.longBreak * 60
    );
    sessionStartTimeRef.current = null;
  };

  const skipToNext = () => {
    if (mode === "focus") {
      switchMode(sessions % 4 === 3 ? "longBreak" : "shortBreak");
    } else {
      switchMode("focus");
    }
  };

  const handleSoundToggle = (soundId: string) => {
    if (selectedSound === soundId) {
      stopAudio();
    } else {
      playAudio(soundId);
    }
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setSettings(preset);
    setTimeLeft(preset.focus * 60);
    setMode("focus");
    setIsRunning(false);
  };

  // Orange theme colors matching website
  const modeConfig = {
    focus: {
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 via-red-500/5 to-transparent",
      ring: "stroke-[#ff6b35]",
      badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      label: "Focus Mode",
      icon: Brain,
    },
    shortBreak: {
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
      ring: "stroke-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      label: "Short Break",
      icon: Coffee,
    },
    longBreak: {
      gradient: "from-blue-500 to-indigo-500",
      bgGradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
      ring: "stroke-blue-500",
      badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      label: "Long Break",
      icon: Sun,
    },
  };

  const config = modeConfig[mode];
  const ModeIcon = config.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-8rem)] bg-gradient-to-br ${config.bgGradient} rounded-2xl p-6 transition-all duration-500`}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Focus Timer</h1>
          <p className="text-muted-foreground mt-1">Stay productive with the Pomodoro technique</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Timer */}
          <div className="lg:col-span-7">
            <Card className="border-0 shadow-xl bg-card/90 backdrop-blur">
              <CardContent className="p-8">
                {/* Mode Selector */}
                <div className="flex justify-center mb-8">
                  <div className="inline-flex rounded-xl bg-muted p-1 gap-1">
                    {(["focus", "shortBreak", "longBreak"] as const).map((m) => {
                      const Icon = modeConfig[m].icon;
                      return (
                        <Button
                          key={m}
                          variant={mode === m ? "default" : "ghost"}
                          size="sm"
                          onClick={() => switchMode(m)}
                          className={`rounded-lg ${
                            mode === m ? `bg-gradient-to-r ${modeConfig[m].gradient} text-white` : ""
                          }`}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {m === "focus" ? "Focus" : m === "shortBreak" ? "Short" : "Long"}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Timer Display */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <svg className="w-64 h-64 transform -rotate-90">
                      <circle
                        cx="128"
                        cy="128"
                        r="115"
                        fill="none"
                        strokeWidth="10"
                        className="stroke-muted/30"
                      />
                      <circle
                        cx="128"
                        cy="128"
                        r="115"
                        fill="none"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${(progress / 100) * 723} 723`}
                        className={`${config.ring} transition-all duration-1000`}
                      />
                    </svg>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <ModeIcon className="h-6 w-6 mb-2 text-muted-foreground/50" />
                      <span className="text-5xl font-mono font-bold tracking-tight">
                        {formatTime(timeLeft)}
                      </span>
                      <Badge className={`mt-3 ${config.badge} border-0`}>
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={resetTimer}
                    className="h-12 w-12 rounded-xl"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    size="lg"
                    onClick={toggleTimer}
                    className={`h-16 w-32 rounded-xl bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white font-semibold`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="h-6 w-6 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-6 w-6 mr-2" />
                        Start
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={skipToNext}
                    className="h-12 w-12 rounded-xl"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>

                {/* Session Progress */}
                <div className="mt-8 flex justify-center">
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-2.5 w-8 rounded-full transition-all ${
                          i < sessions % 4
                            ? "bg-[#ff6b35]"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {sessions % 4}/4 until break
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-5 space-y-4">
            {/* Stats Card */}
            <Card className="border-0 shadow-lg bg-card/90 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-[#ff6b35]" />
                  <span className="font-semibold">Today&apos;s Progress</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#ff6b35]/10 border border-[#ff6b35]/20">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-[#ff6b35]" />
                      <span className="text-2xl font-bold">{sessions}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Sessions</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <span className="text-2xl font-bold">{formatTotalTime(totalFocusTime)}</span>
                    <p className="text-sm text-muted-foreground mt-1">Focus Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ambient Sounds */}
            <Card className="border-0 shadow-lg bg-card/90 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-[#ff6b35]" />
                    <span className="font-semibold">Ambient Sounds</span>
                  </div>
                  {audioPlaying && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Playing
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {ambientSounds.map((sound) => {
                    const Icon = sound.icon;
                    const isActive = selectedSound === sound.id;
                    return (
                      <button
                        key={sound.id}
                        onClick={() => handleSoundToggle(sound.id)}
                        className={`relative p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all border-2 ${
                          isActive
                            ? `${sound.color} text-white border-transparent`
                            : "bg-muted/50 hover:bg-muted border-transparent hover:border-muted-foreground/20"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium">{sound.name}</span>
                        {isActive && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white flex items-center justify-center shadow">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Volume Control */}
                {selectedSound && (
                  <div className="mt-4 flex items-center gap-3">
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                    <Slider
                      value={[volume]}
                      onValueChange={(v) => setVolume(v[0])}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground w-8">{volume}%</span>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Click a sound to play ambient audio while you focus
                </p>
              </CardContent>
            </Card>

            {/* Presets */}
            <Card className="border-0 shadow-lg bg-card/90 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-[#ff6b35]" />
                  <span className="font-semibold">Timer Presets</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => {
                    const Icon = preset.icon;
                    const isActive = settings.name === preset.name;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className={`p-3 rounded-xl flex items-center gap-2 transition-all border-2 ${
                          isActive
                            ? "bg-[#ff6b35]/10 border-[#ff6b35]"
                            : "bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/20"
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isActive ? "bg-[#ff6b35]/20" : "bg-muted"}`}>
                          <Icon className={`h-4 w-4 ${isActive ? "text-[#ff6b35]" : ""}`} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">{preset.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {preset.focus}/{preset.shortBreak}/{preset.longBreak}m
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
