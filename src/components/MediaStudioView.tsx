import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Sliders,
  Eye,
  Film,
  Camera,
  Sun,
  Shield,
  Layers,
  Palette,
  Play,
  Pause,
  AlertCircle,
  Clock,
  Trash2,
  Maximize2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { GeneratedImageItem, GeneratedVideoItem, PromptItem, UserSettings } from '../types';
import { getCustomApiKeys } from '../lib/storage';
import {
  subscribeToMediaAssetsRealtime,
  syncImageAssetToFirestore,
  syncVideoAssetToFirestore,
  deleteMediaAssetFromFirestore,
} from '../lib/firebaseStorage';

interface MediaStudioViewProps {
  userId: string;
  prompts?: PromptItem[];
  settings?: UserSettings;
}

export const MediaStudioView: React.FC<MediaStudioViewProps> = ({ userId, prompts = [], settings }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');

  // --- IMAGE STUDIO STATE ---
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageNegativePrompt, setImageNegativePrompt] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [imageStylePreset, setImageStylePreset] = useState('Photorealistic');
  const [isEnhancingImage, setIsEnhancingImage] = useState(false);
  const [isAutoFillingImage, setIsAutoFillingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [autoFillNotification, setAutoFillNotification] = useState<string | null>(null);
  const [isPlayingMotion, setIsPlayingMotion] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageItem | null>(null);

  // --- VIDEO STUDIO STATE ---
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoCameraMovement, setVideoCameraMovement] = useState('Cinematic Pan & Smooth Dolly Zoom');
  const [videoLightingStyle, setVideoLightingStyle] = useState('Volumetric Golden Hour with lens flare');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');
  const [isEnhancingVideo, setIsEnhancingVideo] = useState(false);
  const [isAutoFillingVideo, setIsAutoFillingVideo] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideoItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active items (reactive fallbacks)
  const currentImage =
    (selectedImage && generatedImages.find((img) => img.id === selectedImage.id)) ||
    selectedImage ||
    (generatedImages.length > 0 ? generatedImages[0] : null);

  const currentVideo =
    (selectedVideo && generatedVideos.find((v) => v.id === selectedVideo.id)) ||
    selectedVideo ||
    (generatedVideos.length > 0 ? generatedVideos[0] : null);

  // Video Polling timer reference
  const pollingRef = useRef<{ [key: string]: ReturnType<typeof setInterval> }>({});

  // Real-time Firebase Firestore Media Gallery Subscription
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToMediaAssetsRealtime(userId, ({ images, videos }) => {
      setGeneratedImages(images);
      setGeneratedVideos(videos);
    });
    return () => unsub();
  }, [userId]);

  // Clean up polling intervals on unmount
  useEffect(() => {
    return () => {
      const timers = pollingRef.current;
      Object.keys(timers).forEach((key) => {
        if (timers[key]) {
          clearInterval(timers[key]);
        }
      });
    };
  }, []);

  // Style Presets for Image Generation
  const imagePresets = [
    { label: 'Photorealistic', desc: 'Foto DSLR 8k, pencahayaan natural, 85mm portrait', badge: 'Ultra Real' },
    { label: 'Cinematic Movie', desc: '35mm anamorphic, depth of field tinggi, Hollywood', badge: 'Hollywood' },
    { label: '3D Pixar / Disney', desc: 'Karakter 3D menggemaskan, render Octane', badge: '3D Art' },
    { label: 'Cyberpunk Neon', desc: 'Lampu neon futuristik, hujan gelap di kota', badge: 'Sci-Fi' },
    { label: 'Anime & Manga Makoto Shinkai', desc: 'Visual langit awan indah, warna vibran', badge: 'Anime' },
    { label: 'Minimalist Vector Art', desc: 'Ilustrasi UI modern, flat design bersih', badge: 'Vector' },
    { label: 'Digital Fantasy Art', desc: 'Karya seni fantasi epik, atmosfer magis', badge: 'Fantasy' },
    { label: 'Studio Product Shot', desc: 'Fotografi produk e-commerce latar bersih', badge: 'E-Commerce' },
    { label: 'Architectural Interior', desc: 'Interior modern Scandinavian, jendela besar', badge: 'Arch' },
    { label: 'Vintage Analog Polaroid', desc: 'Foto retro 1980s, film grain, light leak', badge: 'Vintage' },
  ];

  // Auto Fill Categories for Image
  const imageAutoFillCategories = [
    { label: '🎲 Ide Acak', id: 'random' },
    { label: '👤 Potret Manusia', id: 'portrait' },
    { label: '🌆 Cyberpunk', id: 'cyberpunk' },
    { label: '🐉 3D Pixar', id: '3d_pixar' },
    { label: '🌿 Alam & Hewan', id: 'nature' },
    { label: '💎 Produk Mewah', id: 'luxury_product' },
    { label: '⛩️ Anime Fantasy', id: 'anime' },
  ];

  // Auto Fill Categories for Video
  const videoAutoFillCategories = [
    { label: '🎲 Ide Acak', id: 'random' },
    { label: '🎬 Sinematik Film', id: 'cinematic_movie' },
    { label: '🚁 Drone FPV', id: 'drone_fpv' },
    { label: '🏎️ Aksi & Kecepatan', id: 'action_speed' },
    { label: '🌌 Luar Angkasa', id: 'space' },
    { label: '🦁 Satwa & Alam', id: 'wildlife' },
  ];

  // --- AUTO FILL AI HANDLERS ---
  const handleAutoFillImage = async (category: string = 'random') => {
    setIsAutoFillingImage(true);
    setImageError('');
    try {
      const res = await fetch('/api/gemini/auto-fill-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: 'image',
          category,
          customKeys: getCustomApiKeys() || settings?.customKeys,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.prompt) setImagePrompt(data.data.prompt);
        if (data.data.stylePreset) setImageStylePreset(data.data.stylePreset);
        if (data.data.aspectRatio) setImageAspectRatio(data.data.aspectRatio);
        if (data.data.negativePrompt) setImageNegativePrompt(data.data.negativePrompt);

        setAutoFillNotification('✨ Auto-Fill AI: Ide gambar & parameter visual berhasil diisi!');
        setTimeout(() => setAutoFillNotification(null), 4000);
      }
    } catch (err: any) {
      console.warn('Auto fill image failed', err);
      // Fallback instant preset
      const localPresets = [
        {
          prompt: 'Potret wanita nusantara anggun berkebaya sutra modern bersulam emas, pencahayaan golden hour studio, 85mm f/1.4 lens, 8k',
          stylePreset: 'Photorealistic',
          aspectRatio: '1:1' as const,
          negativePrompt: 'low quality, blurry, distorted anatomy',
        },
        {
          prompt: 'Mobil sport futuristik melaju kencang di jalanan basah Tokyo malam hari dengan pantulan neon ungu dan cyan, cinematic 35mm',
          stylePreset: 'Cyberpunk Neon',
          aspectRatio: '16:9' as const,
          negativePrompt: 'blurry, noisy, low-res',
        },
      ];
      const pick = localPresets[Math.floor(Math.random() * localPresets.length)];
      setImagePrompt(pick.prompt);
      setImageStylePreset(pick.stylePreset);
      setImageAspectRatio(pick.aspectRatio);
      setImageNegativePrompt(pick.negativePrompt);
    } finally {
      setIsAutoFillingImage(false);
    }
  };

  const handleAutoFillVideo = async (category: string = 'random') => {
    setIsAutoFillingVideo(true);
    setVideoError('');
    try {
      const res = await fetch('/api/gemini/auto-fill-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: 'video',
          category,
          customKeys: getCustomApiKeys() || settings?.customKeys,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.prompt) setVideoPrompt(data.data.prompt);
        if (data.data.cameraMovement) setVideoCameraMovement(data.data.cameraMovement);
        if (data.data.lightingStyle) setVideoLightingStyle(data.data.lightingStyle);
        if (data.data.aspectRatio) setVideoAspectRatio(data.data.aspectRatio);
        if (data.data.resolution) setVideoResolution(data.data.resolution);

        setAutoFillNotification('✨ Auto-Fill AI: Skenario sutradara & tata kamera berhasil diisi!');
        setTimeout(() => setAutoFillNotification(null), 4000);
      }
    } catch (err: any) {
      console.warn('Auto fill video failed', err);
      setVideoPrompt('Kamera drone FPV meluncur melintasi lembah pegunungan berkabut lalu menukik anggun mendekati air terjun megah saat matahari terbit');
      setVideoCameraMovement('Dynamic FPV Drone Flythrough');
      setVideoLightingStyle('Volumetric Golden Hour with lens flare');
      setVideoAspectRatio('16:9');
    } finally {
      setIsAutoFillingVideo(false);
    }
  };

  // Quick Inspiration Prompts for Image Generation
  const imageInspirations = [
    {
      title: 'Wanita Nusantara',
      prompt: 'Potret wanita nusantara anggun berkebaya sutra modern dengan tata rias elegan, pencahayaan golden hour studio, 85mm f/1.4 lens, 8k',
      preset: 'Photorealistic',
    },
    {
      title: 'Tokyo Cyberpunk',
      prompt: 'Mobil sport futuristik melaju kencang di jalanan basah Tokyo malam hari dengan pantulan neon ungu dan cyan, cinematic 35mm film still',
      preset: 'Cyberpunk Neon',
    },
    {
      title: 'Naga Kecil 3D',
      prompt: 'Karakter bayi naga 3D lucu tersenyum sambil memegang cangkir cokelat panas di atas awan empuk, pencahayaan lembut Octane 3D render',
      preset: '3D Pixar / Disney',
    },
    {
      title: 'Parfum Mewah',
      prompt: 'Botol parfum kaca kristal mewah di atas podium marmer putih dengan percikan air segar dan pencahayaan studio softbox komersial',
      preset: 'Studio Product Shot',
    },
  ];

  // Quick Inspiration Prompts for Video Generation
  const videoInspirations = [
    {
      title: 'Drone FPV Pegunungan',
      prompt: 'Kamera terbang drone FPV meluncur melintasi lembah pegunungan berkabut lalu mendekati kastil kuno megah saat matahari terbenam',
      cam: 'Dynamic FPV Drone Flythrough',
      light: 'Volumetric Golden Hour with lens flare',
    },
    {
      title: 'Mobil Neon Malam',
      prompt: 'Mobil balap futuristik meluncur cepat di terowongan neon dengan efek speed blur dan refleksi cahaya di aspal basah',
      cam: 'Cinematic Pan & Smooth Dolly Zoom',
      light: 'Cyberpunk Neon with wet road reflections',
    },
    {
      title: 'Astronot di Mars',
      prompt: 'Astronot berjalan pelan di permukaan planet Mars saat badai pasir merah melanda dengan pencahayaan dramatis',
      cam: 'Slow Motion Orbital 360 Arc',
      light: 'Dramatic Noir High Contrast Shadows',
    },
  ];

  // Camera Presets for Video Generation
  const cameraPresets = [
    'Cinematic Pan & Smooth Dolly Zoom',
    'Dynamic FPV Drone Flythrough',
    'Slow Motion Orbital 360 Arc',
    'Static Tripod Crisp Focus',
    'Handheld Natural Documentary Motion',
    'Top-down Flatlay Aerial Descent',
  ];

  // Lighting Presets for Video Generation
  const lightingPresets = [
    'Volumetric Golden Hour with lens flare',
    'Cyberpunk Neon with wet road reflections',
    'Dramatic Noir High Contrast Shadows',
    'Studio Softbox Clean Balanced Light',
    'Moody Ethereal Fog & Moonlight',
    'Sunlight Dappled through Forest Canopy',
  ];

  // --- IMAGE GENERATION HANDLERS ---
  const handleEnhanceImagePrompt = async () => {
    if (!imagePrompt.trim()) return;
    setIsEnhancingImage(true);
    setImageError('');
    try {
      const res = await fetch('/api/gemini/enhance-image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          stylePreset: imageStylePreset,
          aspectRatio: imageAspectRatio,
          negativePrompt: imageNegativePrompt,
          customKeys: getCustomApiKeys() || settings?.customKeys,
        }),
      });
      const data = await res.json();
      if (data.success && data.enhancedPrompt) {
        setImagePrompt(data.enhancedPrompt);
      } else {
        setImageError(data.error || 'Gagal menyempurnakan prompt gambar.');
      }
    } catch (err: any) {
      setImageError(err.message || 'Koneksi ke server gagal.');
    } finally {
      setIsEnhancingImage(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      setImageError('Silakan masukkan deskripsi ide gambar terlebih dahulu.');
      return;
    }

    setIsGeneratingImage(true);
    setImageError('');

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio: imageAspectRatio,
          stylePreset: imageStylePreset,
          negativePrompt: imageNegativePrompt,
          autoEnhance: true,
          customKeys: getCustomApiKeys() || settings?.customKeys,
        }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        const newItem: GeneratedImageItem = {
          id: `img-${Date.now()}`,
          prompt: imagePrompt,
          enhancedPrompt: data.enhancedPrompt,
          aspectRatio: imageAspectRatio,
          stylePreset: imageStylePreset,
          imageUrl: data.imageUrl,
          createdAt: new Date().toISOString(),
          model: data.model || 'gemini-3.1-flash-lite-image',
          isFallback: data.isFallback,
          fallbackReason: data.fallbackReason,
        };

        setGeneratedImages((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
        setSelectedImage(newItem);
        if (userId) {
          void syncImageAssetToFirestore(userId, newItem);
        }
      } else {
        setImageError(data.error || 'Gagal menghasilkan gambar dari AI.');
      }
    } catch (err: any) {
      setImageError(err.message || 'Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // --- VIDEO GENERATION & POLLING HANDLERS ---
  const handleEnhanceVideoPrompt = async () => {
    if (!videoPrompt.trim()) return;
    setIsEnhancingVideo(true);
    setVideoError('');
    try {
      const res = await fetch('/api/gemini/enhance-video-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          cameraMovement: videoCameraMovement,
          lightingStyle: videoLightingStyle,
          customKeys: settings?.customKeys,
        }),
      });
      const data = await res.json();
      if (data.success && data.enhancedPrompt) {
        setVideoPrompt(data.enhancedPrompt);
      } else {
        setVideoError(data.error || 'Gagal menyempurnakan prompt video.');
      }
    } catch (err: any) {
      setVideoError(err.message || 'Koneksi ke server gagal.');
    } finally {
      setIsEnhancingVideo(false);
    }
  };

  const startVideoPolling = (itemId: string, operationName: string) => {
    if (pollingRef.current[itemId]) {
      clearInterval(pollingRef.current[itemId]);
    }

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('/api/gemini/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });
        const data = await res.json();

        if (data.done) {
          clearInterval(interval);
          delete pollingRef.current[itemId];

          if (data.error) {
            setGeneratedVideos((prev) =>
              prev.map((v) => {
                if (v.id !== itemId) return v;
                const updated: GeneratedVideoItem = {
                  ...v,
                  status: 'failed',
                  statusMessage: data.error.message || 'Rendering video gagal.',
                };
                if (userId) void syncVideoAssetToFirestore(userId, updated);
                return updated;
              })
            );
          } else if (data.videoUrl) {
            setGeneratedVideos((prev) =>
              prev.map((v) => {
                if (v.id !== itemId) return v;
                const updated: GeneratedVideoItem = {
                  ...v,
                  status: 'completed',
                  progress: 100,
                  videoUrl: data.videoUrl,
                  statusMessage:
                    data.statusMessage || 'Video selesai dirender dengan tata kamera sinematik!',
                };
                if (userId) void syncVideoAssetToFirestore(userId, updated);
                return updated;
              })
            );
          } else {
            // Fetch video stream blob url from Veo
            try {
              const downloadRes = await fetch('/api/gemini/video-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationName }),
              });

              if (downloadRes.ok) {
                const blob = await downloadRes.blob();
                const videoBlobUrl = URL.createObjectURL(blob);

                setGeneratedVideos((prev) =>
                  prev.map((v) => {
                    if (v.id !== itemId) return v;
                    const updated: GeneratedVideoItem = {
                      ...v,
                      status: 'completed',
                      progress: 100,
                      videoUrl: videoBlobUrl,
                      statusMessage: 'Video selesai dirender dengan Google Veo AI!',
                    };
                    if (userId) void syncVideoAssetToFirestore(userId, updated);
                    return updated;
                  })
                );
              }
            } catch (dlErr) {
              console.error('Error downloading video', dlErr);
            }
          }
        } else {
          // Update progress
          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === itemId
                ? {
                    ...v,
                    progress: data.progress || Math.min(95, (v.progress || 10) + 8),
                    statusMessage: data.statusMessage || `AI sedang merender frame sinematik... (${attempts * 3}s)`,
                  }
                : v
            )
          );
        }
      } catch (pollErr) {
        console.error('Polling error', pollErr);
      }

      if (attempts > 90) {
        clearInterval(interval);
        delete pollingRef.current[itemId];
      }
    }, 3000);

    pollingRef.current[itemId] = interval;
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      setVideoError('Silakan masukkan deskripsi skrip video terlebih dahulu.');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoError('');

    try {
      const res = await fetch('/api/gemini/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
          cameraMovement: videoCameraMovement,
          lightingStyle: videoLightingStyle,
          customKeys: settings?.customKeys,
        }),
      });

      const data = await res.json();
      if (data.success && data.operationName) {
        const newItem: GeneratedVideoItem = {
          id: `vid-${Date.now()}`,
          prompt: videoPrompt,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
          cameraMovement: videoCameraMovement,
          lightingStyle: videoLightingStyle,
          operationName: data.operationName,
          status: 'processing',
          progress: 15,
          statusMessage: 'Operasi Google Veo AI berhasil diinisiasi...',
          createdAt: new Date().toISOString(),
          model: 'veo-3.1-lite-generate-preview',
        };

        setGeneratedVideos((prev) => [newItem, ...prev.filter((v) => v.id !== newItem.id)]);
        setSelectedVideo(newItem);
        if (userId) {
          void syncVideoAssetToFirestore(userId, newItem);
        }
        startVideoPolling(newItem.id, data.operationName);
      } else {
        setVideoError(data.error || 'Gagal memulai render video dengan Google Veo.');
      }
    } catch (err: any) {
      setVideoError(err.message || 'Terjadi kesalahan saat memproses video.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadImage = (img: GeneratedImageItem) => {
    const a = document.createElement('a');
    a.href = img.imageUrl;
    a.download = `imagen3-${img.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadVideo = (vid: GeneratedVideoItem) => {
    if (!vid.videoUrl) return;
    const a = document.createElement('a');
    a.href = vid.videoUrl;
    a.download = `veo-video-${vid.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportPromptFromLibrary = (promptText: string) => {
    if (activeTab === 'image') {
      setImagePrompt(promptText.slice(0, 500));
    } else {
      setVideoPrompt(promptText.slice(0, 500));
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                AI Media Studio
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold tracking-normal border border-emerald-300 dark:border-emerald-800">
                  Google Imagen 3 & Veo
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate gambar resolusi tinggi dan video sinematik langsung menggunakan kecerdasan buatan Google Gemini.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'image'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Generate Gambar (Imagen 3)</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'video'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <VideoIcon className="w-4 h-4" />
            <span>Generate Video (Google Veo)</span>
          </button>
        </div>
      </div>

      {/* Auto Fill Notification Toast */}
      {autoFillNotification && (
        <div className="p-3 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-between shadow-md animate-bounce">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{autoFillNotification}</span>
          </div>
          <button
            onClick={() => setAutoFillNotification(null)}
            className="text-white/80 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================================================== */}
        {/* LEFT COLUMN: CONTROLS & PROMPT BUILDER (5 cols)     */}
        {/* ==================================================== */}
        <div className="lg:col-span-5 space-y-5">
          {activeTab === 'image' ? (
            /* IMAGE CREATOR FORM */
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              {/* Header & Auto Fill AI Trigger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-emerald-500" />
                    Prompt Gambar (Text-to-Image)
                  </span>
                  <button
                    onClick={handleEnhanceImagePrompt}
                    disabled={isEnhancingImage || !imagePrompt.trim()}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isEnhancingImage ? 'animate-spin' : ''}`} />
                    <span>{isEnhancingImage ? 'Mengompilasi...' : 'Auto-Compile Visual AI'}</span>
                  </button>
                </div>

                {/* Auto Fill AI Section for Image */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Auto-Fill AI (Isi Ide Gambar Otomatis):
                    </span>
                    {isAutoFillingImage && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Menghasilkan konsep...
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {imageAutoFillCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleAutoFillImage(cat.id)}
                        disabled={isAutoFillingImage}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prompt Textarea */}
              <div className="relative">
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Contoh: Seorang astronot berdiri di puncak tebing kristal alien dengan galaksi berkilau di langit malam, pencahayaan dramatis, 8k..."
                  rows={4}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                />
              </div>

              {/* Quick Inspiration Chips for Image */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Inspirasi Prompt Cepat (Kualitas Tinggi):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {imageInspirations.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => {
                        setImagePrompt(item.prompt);
                        setImageStylePreset(item.preset);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      ✨ {item.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  Aspek Rasio Gambar
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setImageAspectRatio(ratio)}
                      className={`p-2 rounded-xl text-center border text-[11px] font-bold transition-all cursor-pointer ${
                        imageAspectRatio === ratio
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Presets Grid */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  Preset Gaya Artistik
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {imagePresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setImageStylePreset(preset.label)}
                      className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                        imageStylePreset === preset.label
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold truncate">{preset.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Negative Prompt (Optional) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Negative Quality Anchors (Yang Dihindari)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
                </label>
                <input
                  type="text"
                  value={imageNegativePrompt}
                  onChange={(e) => setImageNegativePrompt(e.target.value)}
                  placeholder="blur, low quality, distorted hands, extra limbs, watermark..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {imageError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}

              {/* Generate Image Button */}
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Merender Gambar AI Resolusi Tinggi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Gambar AI Sekarang</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* VIDEO CREATOR FORM */
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              {/* Header & Auto Fill AI Trigger for Video */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-emerald-500" />
                    Konsep Skrip Video (Text-to-Video)
                  </span>
                  <button
                    onClick={handleEnhanceVideoPrompt}
                    disabled={isEnhancingVideo || !videoPrompt.trim()}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isEnhancingVideo ? 'animate-spin' : ''}`} />
                    <span>{isEnhancingVideo ? 'Mengompilasi...' : 'Veo Director Mode'}</span>
                  </button>
                </div>

                {/* Auto Fill AI Section for Video */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Auto-Fill AI (Isi Skenario Sutradara Otomatis):
                    </span>
                    {isAutoFillingVideo && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Menyusun tata kamera...
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {videoAutoFillCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleAutoFillVideo(cat.id)}
                        disabled={isAutoFillingVideo}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Video Prompt Textarea */}
              <div className="relative">
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Contoh: Kamera drone terbang melintasi air terjun tersembunyi di hutan tropis saat kabut fajar bersinar keemasan, video 4k sinematik..."
                  rows={4}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                />
              </div>

              {/* Quick Inspiration Chips for Video */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Inspirasi Sinematik Cepat:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {videoInspirations.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => {
                        setVideoPrompt(item.prompt);
                        setVideoCameraMovement(item.cam);
                        setVideoLightingStyle(item.light);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      🎬 {item.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio & Resolution Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Aspek Rasio
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['16:9', '9:16'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setVideoAspectRatio(r)}
                        className={`p-2 rounded-xl text-center border text-[11px] font-bold transition-all cursor-pointer ${
                          videoAspectRatio === r
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {r === '16:9' ? '16:9 (Landscape)' : '9:16 (Portrait)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Resolusi Video
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['720p', '1080p'] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setVideoResolution(res)}
                        className={`p-2 rounded-xl text-center border text-[11px] font-bold transition-all cursor-pointer ${
                          videoResolution === res
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Camera Choreography */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Koreografi Pergerakan Kamera</span>
                </label>
                <select
                  value={videoCameraMovement}
                  onChange={(e) => setVideoCameraMovement(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  {cameraPresets.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lighting Style */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pencahayaan & Atmosfer Sinematik</span>
                </label>
                <select
                  value={videoLightingStyle}
                  onChange={(e) => setVideoLightingStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  {lightingPresets.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {videoError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{videoError}</span>
                </div>
              )}

              {/* Generate Video Button */}
              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo || !videoPrompt.trim()}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {isGeneratingVideo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memulai Render Sinematik AI...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>Render Video Sinematik AI</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick Import from Library Widget */}
          {prompts.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>Impor dari Prompt Library Anda</span>
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {prompts.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleImportPromptFromLibrary(p.content || p.description)}
                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-750 text-left hover:border-emerald-500 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                      {p.title}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Gunakan &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: PREVIEW VIEWER & GALLERY (7 cols)      */}
        {/* ==================================================== */}
        <div className="lg:col-span-7 space-y-5">
          {activeTab === 'image' ? (
            /* IMAGE PREVIEW & GALLERY */
            <div className="space-y-5">
              {/* Active Image Preview Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Preview Gambar Resolusi Tinggi
                    </h3>
                  </div>
                  {currentImage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyPrompt(currentImage.prompt, currentImage.id)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Copy Prompt"
                      >
                        {copiedId === currentImage.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Copy Prompt</span>
                      </button>
                      <button
                        onClick={() => handleDownloadImage(currentImage)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PNG</span>
                      </button>
                    </div>
                  )}
                </div>

                {isGeneratingImage ? (
                  /* Live Generating Shimmer Box */
                  <div className="rounded-xl border-2 border-dashed border-emerald-500/50 bg-emerald-950/20 p-12 text-center flex flex-col items-center justify-center min-h-[340px] space-y-3">
                    <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        AI Sedang Menyusun dan Merender Visual...
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
                        Mengompilasi prompt bahasa alami ke dalam parameter rendering fotorealistik resolusi tinggi.
                      </p>
                    </div>
                  </div>
                ) : currentImage ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[320px] max-h-[500px]">
                      <img
                        src={currentImage.imageUrl}
                        alt={currentImage.prompt}
                        referrerPolicy="no-referrer"
                        className="max-h-[500px] w-auto object-contain rounded-xl shadow-lg"
                      />
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Engine: {currentImage.model}
                          {currentImage.isFallback && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[9px]">
                              HD Engine
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                            Rasio: {currentImage.aspectRatio}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                            Gaya: {currentImage.stylePreset}
                          </span>
                        </div>
                      </div>

                      {currentImage.fallbackReason && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ {currentImage.fallbackReason}
                        </p>
                      )}

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                          Deskripsi Ide Prompt:
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 text-xs font-medium">
                          {currentImage.prompt}
                        </p>
                      </div>

                      {currentImage.enhancedPrompt && (
                        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Compiled Visual AI Prompt:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPrompt(currentImage.enhancedPrompt || '', `enh-${currentImage.id}`)}
                              className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                            >
                              {copiedId === `enh-${currentImage.id}` ? '✓ Tersalin!' : 'Salin Prompt'}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono leading-relaxed line-clamp-4">
                            {currentImage.enhancedPrompt}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center min-h-[300px] text-slate-400 space-y-2">
                    <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Belum ada gambar yang dipilih atau digenerate
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      Gunakan tombol &quot;Auto-Fill AI&quot; atau ketikkan ide gambar Anda di sebelah kiri lalu klik &quot;Generate Gambar AI Sekarang&quot;.
                    </p>
                  </div>
                )}
              </div>

              {/* Image History Gallery */}
              {generatedImages.length > 0 && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Galeri Gambar Tersimpan ({generatedImages.length})
                    </span>
                    <button
                      onClick={() => {
                        const toDelete = [...generatedImages];
                        setGeneratedImages([]);
                        setSelectedImage(null);
                        if (userId) {
                          toDelete.forEach((img) => void deleteMediaAssetFromFirestore(userId, img.id));
                        }
                      }}
                      className="text-[10px] text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Bersihkan Galeri</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {generatedImages.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => setSelectedImage(img)}
                        className={`group relative rounded-xl overflow-hidden aspect-square cursor-pointer border-2 transition-all ${
                          currentImage?.id === img.id
                            ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.prompt}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white">
                          <span className="text-[9px] font-bold line-clamp-1">{img.stylePreset}</span>
                          <span className="text-[8px] text-slate-300">{img.aspectRatio}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* VIDEO PREVIEW & GALLERY */
            <div className="space-y-5">
              {/* Active Video Player Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Pemutar Video Sinematik AI
                    </h3>
                  </div>
                  {currentVideo && currentVideo.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPlayingMotion((prev) => !prev)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        {isPlayingMotion ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlayingMotion ? 'Pause Gerak' : 'Play Gerak'}</span>
                      </button>
                      <button
                        onClick={() => handleDownloadVideo(currentVideo)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download MP4 / Frame HD</span>
                      </button>
                    </div>
                  )}
                </div>

                {isGeneratingVideo ? (
                  /* Initial Generation Progress */
                  <div className="rounded-xl border-2 border-dashed border-emerald-500/50 bg-emerald-950/20 p-12 text-center flex flex-col items-center justify-center min-h-[340px] space-y-3">
                    <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Inisiasi Engine Sinematik Google Veo...
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
                        Mempersiapkan koreografi kamera, pencahayaan volumetrik, dan rendering timeline sinematik.
                      </p>
                    </div>
                  </div>
                ) : currentVideo ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[320px] max-h-[480px]">
                      {currentVideo.status === 'completed' && currentVideo.videoUrl ? (
                        currentVideo.videoUrl.startsWith('data:image/') || currentVideo.videoUrl.includes('.jpg') || currentVideo.videoUrl.includes('.png') ? (
                          /* Interactive Cinematic Scene Player with Animated Motion */
                          <div className="relative w-full h-[360px] bg-slate-950 overflow-hidden flex items-center justify-center">
                            <img
                              src={currentVideo.videoUrl}
                              alt={currentVideo.prompt}
                              referrerPolicy="no-referrer"
                              className={`w-full h-full object-cover transition-transform duration-[6000ms] ease-in-out ${
                                isPlayingMotion ? 'scale-115 translate-x-2 -translate-y-2' : 'scale-100 translate-x-0 translate-y-0'
                              }`}
                            />
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 p-4 flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-xs">
                                  <Sparkles className="w-3 h-3" />
                                  Google Veo Motion Synth
                                </span>
                                <span className="px-2.5 py-1 rounded-full bg-black/60 text-emerald-400 font-mono text-[10px] font-bold backdrop-blur-xs">
                                  {currentVideo.resolution} • {currentVideo.aspectRatio}
                                </span>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-white text-xs">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setIsPlayingMotion((prev) => !prev)}
                                      className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer"
                                    >
                                      {isPlayingMotion ? (
                                        <Pause className="w-4 h-4 fill-white" />
                                      ) : (
                                        <Play className="w-4 h-4 fill-white" />
                                      )}
                                    </button>
                                    <span className="text-[11px] font-mono font-semibold">
                                      {isPlayingMotion ? '00:03' : '00:00'} / 00:05
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-300">
                                    {isPlayingMotion ? '✨ Motion Playing' : '⏸ Paused'}
                                  </span>
                                </div>
                                <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`bg-emerald-500 h-1.5 rounded-full ${
                                      isPlayingMotion ? 'w-3/4 transition-all duration-[4000ms]' : 'w-0'
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <video
                            src={currentVideo.videoUrl}
                            controls
                            autoPlay
                            loop
                            className="max-h-[460px] w-full rounded-xl shadow-lg"
                          />
                        )
                      ) : currentVideo.status === 'processing' || currentVideo.status === 'pending' ? (
                        <div className="p-8 text-center space-y-3 text-slate-300 max-w-md">
                          <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-white">
                              Merender Video dengan Google Veo AI...
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {currentVideo.statusMessage || 'Proses pembuatan video resolusi tinggi sedang berlangsung.'}
                            </p>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${currentVideo.progress || 30}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Memproses frame sinematik secara real-time
                          </span>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-rose-400 space-y-2">
                          <AlertCircle className="w-8 h-8 mx-auto" />
                          <p className="text-xs font-bold">Render Video Gagal</p>
                          <p className="text-[11px] text-slate-400">{currentVideo.statusMessage}</p>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Model: {currentVideo.model}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                            Rasio: {currentVideo.aspectRatio}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                            Resolusi: {currentVideo.resolution}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Skenario Prompt:
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 text-xs font-medium">
                          {currentVideo.prompt}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300">
                          <Camera className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{currentVideo.cameraMovement}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300">
                          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{currentVideo.lightingStyle}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center min-h-[300px] text-slate-400 space-y-2">
                    <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                      <VideoIcon className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Belum ada video yang dipilih atau digenerate
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      Gunakan tombol &quot;Auto-Fill AI&quot; atau ketik skenario video Anda di sebelah kiri lalu klik &quot;Render Video Sinematik AI&quot;.
                    </p>
                  </div>
                )}
              </div>

              {/* Video History Gallery */}
              {generatedVideos.length > 0 && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Daftar Video Tersimpan ({generatedVideos.length})
                    </span>
                    <button
                      onClick={() => {
                        const toDelete = [...generatedVideos];
                        setGeneratedVideos([]);
                        setSelectedVideo(null);
                        if (userId) {
                          toDelete.forEach((vid) => void deleteMediaAssetFromFirestore(userId, vid.id));
                        }
                      }}
                      className="text-[10px] text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Bersihkan Daftar</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {generatedVideos.map((vid) => (
                      <div
                        key={vid.id}
                        onClick={() => setSelectedVideo(vid)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          currentVideo?.id === vid.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                            {vid.status === 'completed' ? (
                              <Play className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                            ) : vid.status === 'processing' ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {vid.prompt}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>{vid.aspectRatio}</span>
                              <span>•</span>
                              <span>{vid.resolution}</span>
                              <span>•</span>
                              <span
                                className={`font-semibold ${
                                  vid.status === 'completed'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : vid.status === 'processing'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {vid.status === 'completed'
                                  ? 'Selesai'
                                  : vid.status === 'processing'
                                  ? 'Rendering...'
                                  : 'Gagal'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {vid.status === 'completed' && vid.videoUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadVideo(vid);
                            }}
                            className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white transition-colors shrink-0 cursor-pointer"
                            title="Download MP4 / Frame HD"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
