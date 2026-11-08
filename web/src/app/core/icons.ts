import {
  LucideAudioLines, LucideAudioWaveform, LucideBinary, LucideBookOpen, LucideBot, LucideBox, LucideBraces, LucideBrush,
  LucideClapperboard, LucideCloud, LucideCode, LucideCodeXml, LucideCoins, LucideCpu, LucideDna, LucideEraser,
  LucideFastForward, LucideFileText, LucideFilm, LucideGitBranch, LucideGlobe, LucideHardDrive, LucideImage,
  LucideLaptop, LucideMemoryStick, LucideMessagesSquare, LucideMic, LucideMicrochip, LucideMonitorUp, LucidePackage,
  LucideScale, LucideScanFace, LucideScanSearch, LucideScanText, LucideShieldCheck, LucideSigma, LucideSmartphone,
  LucideSparkles, LucideSquareDashed, LucideStethoscope, LucideType, LucideUsers, LucideVideo, LucideVolume2,
  LucideWandSparkles, LucideWaypoints, LucideZap, LucideZoomIn, LucideGauge, LucideLanguages, LucideLayers,
  LucideFlaskConical, LucideBanknote,
} from '@lucide/angular';

type IconMap = Record<string, any>;

export const DOMAIN_ICON: IconMap = {
  language: LucideMessagesSquare,
  specialized: LucideFlaskConical,
  vision: LucideImage,
  video: LucideClapperboard,
  audio: LucideAudioLines,
};

/** Tile colours per domain: [background+text classes]. */
export const DOMAIN_TONE: Record<string, string> = {
  language: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
  specialized: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  vision: 'bg-amber-500/12 text-amber-600 dark:text-amber-300',
  video: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300',
  audio: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
};

export const TASK_ICON: IconMap = {
  chat: LucideMessagesSquare,
  coding: LucideCodeXml,
  reasoning: LucideSigma,
  agents: LucideBot,
  'on-device-llm': LucideSmartphone,
  embeddings: LucideWaypoints,
  medical: LucideStethoscope,
  legal: LucideScale,
  'life-sciences': LucideDna,
  cybersecurity: LucideShieldCheck,
  'image-generation': LucideWandSparkles,
  'image-editing': LucideBrush,
  segmentation: LucideScanSearch,
  'background-removal': LucideEraser,
  ocr: LucideScanText,
  'face-restoration': LucideScanFace,
  'image-upscaling': LucideZoomIn,
  'video-upscaling': LucideMonitorUp,
  'video-restoration': LucideFilm,
  'frame-interpolation': LucideFastForward,
  'speech-to-text': LucideMic,
  diarization: LucideUsers,
  'text-to-speech': LucideVolume2,
  'voice-cloning': LucideAudioWaveform,
};

export const IO_ICON: IconMap = {
  text: LucideType,
  code: LucideCode,
  image: LucideImage,
  video: LucideVideo,
  audio: LucideAudioLines,
  embedding: LucideBinary,
  mask: LucideSquareDashed,
  structured: LucideBraces,
};

export const PLATFORM_ICON: IconMap = {
  cuda: LucideMicrochip,
  rocm: LucideMicrochip,
  'apple-silicon': LucideLaptop,
  cpu: LucideCpu,
  onnx: LucideBox,
  browser: LucideGlobe,
  api: LucideCloud,
};

export const LINK_ICON: IconMap = {
  repo: LucideGitBranch,
  paper: LucideFileText,
  weights: LucidePackage,
  homepage: LucideGlobe,
  docs: LucideBookOpen,
  pricing: LucideCoins,
  demo: LucideSparkles,
};

export const ASPECT_ICON: IconMap = {
  speed: LucideZap,
  memory: LucideMemoryStick,
  quality: LucideSparkles,
  license: LucideScale,
  cost: LucideBanknote,
  size: LucideHardDrive,
  modalities: LucideLayers,
  languages: LucideLanguages,
  hardware: LucideGauge,
};
