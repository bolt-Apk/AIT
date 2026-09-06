import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Video, Globe, Monitor } from 'lucide-react';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9' | '3:2' | '2:3';
export type VideoResolution = '480p' | '720p' | '1080p' | '2K' | '4K';

const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  '16:9': '16:9',
  '9:16': '9:16',
  '1:1': '1:1',
  '4:3': '4:3',
  '3:4': '3:4',
  '21:9': '21:9',
  '3:2': '3:2',
  '2:3': '2:3',
};

export interface SizeOption {
  size: string;
  resolution: VideoResolution;
}

export interface VideoModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricePerSec: string;
  durations: number[];
  defaultDuration: number;
  aspectRatios: AspectRatio[];
  defaultAspectRatio: AspectRatio;
  resolutions: VideoResolution[];
  defaultResolution: VideoResolution;
  sizes: Partial<Record<AspectRatio, SizeOption[]>>;
  supportsFirstFrame: boolean;
  supportsLastFrame: boolean;
  supportsReferences: boolean;
  maxReferences?: number;
  supportsVideoRefs?: boolean;
  maxVideoRefs?: number;
  supportsAudio: boolean;
  maxAudioRefs?: number;
  popular?: boolean;
}

const RESOLUTION_QUALITY: Record<VideoResolution, { label: string; color: string }> = {
  '480p': { label: 'SD', color: 'text-slate-400 dark:text-gray-500' },
  '720p': { label: 'HD', color: 'text-blue-400' },
  '1080p': { label: 'FHD', color: 'text-emerald-400' },
  '2K': { label: '2K', color: 'text-amber-400' },
  '4K': { label: '4K', color: 'text-rose-400' },
};

const VIDEO_MODELS: VideoModelInfo[] = [
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    provider: 'Google',
    description: 'Высококачественная генерация видео до 4K с синхронным аудио.',
    pricePerSec: '34–102',
    durations: [4, 6, 8],
    defaultDuration: 4,
    aspectRatios: ['16:9', '9:16'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p', '4K'],
    defaultResolution: '1080p',
    sizes: {
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
        { size: '3840x2160', resolution: '4K' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
        { size: '2160x3840', resolution: '4K' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: false,
    supportsAudio: true,
    popular: true,
  },
  {
    id: 'veo-3.1-fast',
    name: 'Veo 3.1 Fast',
    provider: 'Google',
    description: 'Быстрая генерация видео до 4K с синхронным аудио.',
    pricePerSec: '13.60–51',
    durations: [4, 6, 8],
    defaultDuration: 4,
    aspectRatios: ['16:9', '9:16'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p', '4K'],
    defaultResolution: '1080p',
    sizes: {
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
        { size: '3840x2160', resolution: '4K' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
        { size: '2160x3840', resolution: '4K' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: false,
    supportsAudio: true,
    popular: true,
  },
  {
    id: 'veo-3.1-lite',
    name: 'Veo 3.1 Lite',
    provider: 'Google',
    description: 'Экономичная генерация видео от Google.',
    pricePerSec: '5.10–13.60',
    durations: [4, 6, 8],
    defaultDuration: 4,
    aspectRatios: ['16:9', '9:16'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: false,
    supportsAudio: true,
  },
  {
    id: 'kling-v3.0-pro',
    name: 'Kling 3.0 Pro',
    provider: 'Kuaishou',
    description: 'Мультимодальная генерация видео до 4K от Kuaishou.',
    pricePerSec: '19.04–57.12',
    durations: [3, 5, 8, 10, 15],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p', '4K'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
        { size: '3840x2160', resolution: '4K' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
        { size: '2160x3840', resolution: '4K' },
      ],
      '1:1': [
        { size: '720x720', resolution: '720p' },
        { size: '1080x1080', resolution: '1080p' },
        { size: '2160x2160', resolution: '4K' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: false,
    supportsAudio: false,
    popular: true,
  },
  {
    id: 'kling-v3.0-std',
    name: 'Kling 3.0 Std',
    provider: 'Kuaishou',
    description: 'Быстрая генерация видео до 1080p от Kuaishou.',
    pricePerSec: '14.28–28.56',
    durations: [3, 5, 8, 10, 15],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
      '1:1': [
        { size: '720x720', resolution: '720p' },
        { size: '1080x1080', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: false,
    supportsAudio: false,
  },
  {
    id: 'kling-v3.0-turbo',
    name: 'Kling 3.0 Turbo',
    provider: 'Kuaishou',
    description: 'Самая быстрая генерация видео от Kuaishou.',
    pricePerSec: '9.52–14.28',
    durations: [3, 5, 8, 10],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
      '1:1': [
        { size: '720x720', resolution: '720p' },
        { size: '1080x1080', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: false,
    supportsAudio: false,
  },
  {
    id: 'kling-video-o1',
    name: 'Kling Video o1',
    provider: 'Kuaishou',
    description: 'Модель рассуждений для видео от Kuaishou.',
    pricePerSec: '19.04',
    durations: [5, 10],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [{ size: '1280x720', resolution: '720p' }],
      '9:16': [{ size: '720x1280', resolution: '720p' }],
      '1:1': [{ size: '720x720', resolution: '720p' }],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: false,
    supportsAudio: false,
  },
  {
    id: 'seedance-2.5',
    name: 'Seedance 2.5',
    provider: 'ByteDance',
    description: 'Длинные ролики до 30 сек, референсы, правка и продление видео.',
    pricePerSec: '17.46–59.31',
    durations: [5, 10, 15, 20, 30],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    defaultAspectRatio: '16:9',
    resolutions: ['480p', '720p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [
        { size: '854x480', resolution: '480p' },
        { size: '1280x720', resolution: '720p' },
      ],
      '4:3': [
        { size: '752x560', resolution: '480p' },
        { size: '1112x834', resolution: '720p' },
      ],
      '1:1': [
        { size: '640x640', resolution: '480p' },
        { size: '960x960', resolution: '720p' },
      ],
      '3:4': [
        { size: '560x752', resolution: '480p' },
        { size: '834x1112', resolution: '720p' },
      ],
      '9:16': [
        { size: '480x854', resolution: '480p' },
        { size: '720x1280', resolution: '720p' },
      ],
      '21:9': [
        { size: '992x432', resolution: '480p' },
        { size: '1470x630', resolution: '720p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: true,
    maxReferences: 30,
    supportsVideoRefs: true,
    maxVideoRefs: 10,
    supportsAudio: true,
    maxAudioRefs: 10,
    popular: true,
  },
  {
    id: 'wan-3.0',
    name: 'Wan 3.0',
    provider: 'Alibaba',
    description: 'Видео до 30 сек с нативным аудио, omni-референсы, 480p–1080p.',
    pricePerSec: '7.23–28.90',
    durations: [5, 10, 15, 20, 30],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    defaultAspectRatio: '16:9',
    resolutions: ['480p', '720p', '1080p'],
    defaultResolution: '1080p',
    sizes: {},
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferences: true,
    maxReferences: 5,
    supportsAudio: true,
  },
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    provider: 'OpenAI',
    description: 'Генерация видео от OpenAI, 4–20 сек, до 1080p с аудио.',
    pricePerSec: '51–85',
    durations: [4, 8, 12, 16, 20],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultAspectRatio: '16:9',
    resolutions: ['480p', '720p', '1080p'],
    defaultResolution: '1080p',
    sizes: {},
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: true,
    maxReferences: 5,
    supportsAudio: true,
    popular: true,
  },
  {
    id: 'hailuo-3',
    name: 'Hailuo 3',
    provider: 'MiniMax',
    description: 'Видео до 15 сек в 2K с нативным стерео-аудио 32kHz.',
    pricePerSec: '22.10',
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultAspectRatio: '16:9',
    resolutions: ['2K'],
    defaultResolution: '2K',
    sizes: {},
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferences: true,
    maxReferences: 5,
    supportsAudio: true,
    popular: true,
  },
  {
    id: 'hailuo-2.3',
    name: 'Hailuo 2.3',
    provider: 'MiniMax',
    description: 'Экономичная генерация видео до 1080p.',
    pricePerSec: '13.89',
    durations: [5, 6, 7, 8, 9, 10],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p'],
    defaultResolution: '1080p',
    sizes: {},
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferences: false,
    supportsAudio: false,
  },
  {
    id: 'seedance-2.0',
    name: 'Seedance 2.0',
    provider: 'ByteDance',
    description: 'Видео по тексту и кадрам, мультимодальные референсы.',
    pricePerSec: '6.43–75.91',
    durations: [5, 10, 15],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    defaultAspectRatio: '16:9',
    resolutions: ['480p', '720p', '1080p'],
    defaultResolution: '720p',
    sizes: {
      '1:1': [
        { size: '480x480', resolution: '480p' },
        { size: '720x720', resolution: '720p' },
        { size: '1080x1080', resolution: '1080p' },
      ],
      '3:4': [
        { size: '480x640', resolution: '480p' },
        { size: '720x960', resolution: '720p' },
        { size: '1080x1440', resolution: '1080p' },
      ],
      '9:16': [
        { size: '480x854', resolution: '480p' },
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
      '4:3': [
        { size: '640x480', resolution: '480p' },
        { size: '960x720', resolution: '720p' },
        { size: '1440x1080', resolution: '1080p' },
      ],
      '16:9': [
        { size: '854x480', resolution: '480p' },
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '21:9': [
        { size: '1120x480', resolution: '480p' },
        { size: '1680x720', resolution: '720p' },
        { size: '2520x1080', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: true,
    maxReferences: 8,
    supportsVideoRefs: true,
    maxVideoRefs: 5,
    supportsAudio: true,
    maxAudioRefs: 5,
  },
  {
    id: 'seedance-2.0-fast',
    name: 'Seedance 2.0 Fast',
    provider: 'ByteDance',
    description: 'Быстрая генерация видео от ByteDance.',
    pricePerSec: '5.14–26.99',
    durations: [5, 10, 15],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    defaultAspectRatio: '16:9',
    resolutions: ['480p', '720p'],
    defaultResolution: '720p',
    sizes: {
      '1:1': [
        { size: '480x480', resolution: '480p' },
        { size: '720x720', resolution: '720p' },
      ],
      '3:4': [
        { size: '480x640', resolution: '480p' },
        { size: '720x960', resolution: '720p' },
      ],
      '9:16': [
        { size: '480x854', resolution: '480p' },
        { size: '720x1280', resolution: '720p' },
      ],
      '4:3': [
        { size: '640x480', resolution: '480p' },
        { size: '960x720', resolution: '720p' },
      ],
      '16:9': [
        { size: '854x480', resolution: '480p' },
        { size: '1280x720', resolution: '720p' },
      ],
      '21:9': [
        { size: '1120x480', resolution: '480p' },
        { size: '1680x720', resolution: '720p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: true,
    maxReferences: 8,
    supportsAudio: false,
  },
  {
    id: 'seedance-2.0-mini',
    name: 'Seedance 2.0 Mini',
    provider: 'ByteDance',
    description: 'Самая дешёвая модель для быстрой генерации видео.',
    pricePerSec: '1.29–6.75',
    durations: [5, 10, 15],
    defaultDuration: 5,
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    defaultAspectRatio: '16:9',
    resolutions: ['480p', '720p'],
    defaultResolution: '480p',
    sizes: {
      '21:9': [
        { size: '1120x480', resolution: '480p' },
        { size: '1680x720', resolution: '720p' },
      ],
      '16:9': [
        { size: '854x480', resolution: '480p' },
        { size: '1280x720', resolution: '720p' },
      ],
      '4:3': [
        { size: '640x480', resolution: '480p' },
        { size: '960x720', resolution: '720p' },
      ],
      '1:1': [
        { size: '480x480', resolution: '480p' },
        { size: '720x720', resolution: '720p' },
      ],
      '3:4': [
        { size: '480x640', resolution: '480p' },
        { size: '720x960', resolution: '720p' },
      ],
      '9:16': [
        { size: '480x854', resolution: '480p' },
        { size: '720x1280', resolution: '720p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: true,
    maxReferences: 8,
    supportsAudio: true,
  },
  {
    id: 'seedance-1-5-pro',
    name: 'Seedance 1.5 Pro',
    provider: 'ByteDance',
    description: 'Видео по тексту, кадрам и референсным изображениям.',
    pricePerSec: '1.10–26.03',
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    defaultAspectRatio: '16:9',
    resolutions: ['480p', '720p', '1080p'],
    defaultResolution: '720p',
    sizes: {
      '1:1': [
        { size: '480x480', resolution: '480p' },
        { size: '720x720', resolution: '720p' },
        { size: '1080x1080', resolution: '1080p' },
      ],
      '3:4': [
        { size: '480x640', resolution: '480p' },
        { size: '720x960', resolution: '720p' },
        { size: '1080x1440', resolution: '1080p' },
      ],
      '9:16': [
        { size: '480x854', resolution: '480p' },
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
      '4:3': [
        { size: '640x480', resolution: '480p' },
        { size: '960x720', resolution: '720p' },
        { size: '1440x1080', resolution: '1080p' },
      ],
      '16:9': [
        { size: '854x480', resolution: '480p' },
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '21:9': [
        { size: '1120x480', resolution: '480p' },
        { size: '1680x720', resolution: '720p' },
        { size: '2520x1080', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: true,
    maxReferences: 8,
    supportsAudio: false,
  },
  {
    id: 'gen-4.5',
    name: 'Gen 4.5',
    provider: 'Runway',
    description: 'Генерация видео по тексту и стартовому кадру с нативным аудио.',
    pricePerSec: '20.40',
    durations: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [{ size: '1280x720', resolution: '720p' }],
      '9:16': [{ size: '720x1280', resolution: '720p' }],
    },
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferences: false,
    supportsAudio: true,
  },
  {
    id: 'aleph-2',
    name: 'Aleph 2',
    provider: 'Runway',
    description: 'Генерация и правка видео по тексту и референсам.',
    pricePerSec: '47.60',
    durations: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    defaultDuration: 5,
    aspectRatios: ['16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '21:9'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p'],
    defaultResolution: '720p',
    sizes: {},
    supportsFirstFrame: false,
    supportsLastFrame: false,
    supportsReferences: true,
    maxReferences: 5,
    supportsAudio: false,
  },
  {
    id: 'grok-imagine-video-1.5',
    name: 'Grok Imagine Video 1.5',
    provider: 'xAI',
    description: 'Видео до 15 сек с нативным аудио, референсы, до 1080p.',
    pricePerSec: '13.60–42.50',
    durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3'],
    defaultAspectRatio: '16:9',
    resolutions: ['480p', '720p', '1080p'],
    defaultResolution: '1080p',
    sizes: {
      '16:9': [
        { size: '854x480', resolution: '480p' },
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '9:16': [
        { size: '480x854', resolution: '480p' },
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
      '1:1': [
        { size: '480x480', resolution: '480p' },
        { size: '720x720', resolution: '720p' },
        { size: '1080x1080', resolution: '1080p' },
      ],
      '4:3': [
        { size: '640x480', resolution: '480p' },
        { size: '960x720', resolution: '720p' },
        { size: '1440x1080', resolution: '1080p' },
      ],
      '3:4': [
        { size: '480x640', resolution: '480p' },
        { size: '720x960', resolution: '720p' },
        { size: '1080x1440', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferences: true,
    maxReferences: 5,
    supportsAudio: true,
  },
  {
    id: 'grok-imagine-video',
    name: 'Grok Imagine Video',
    provider: 'xAI',
    description: 'Короткие креативные видео по тексту и изображениям.',
    pricePerSec: '8.50–11.90',
    durations: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3'],
    defaultAspectRatio: '16:9',
    resolutions: ['480p', '720p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [
        { size: '854x480', resolution: '480p' },
        { size: '1280x720', resolution: '720p' },
      ],
      '9:16': [
        { size: '480x854', resolution: '480p' },
        { size: '720x1280', resolution: '720p' },
      ],
      '1:1': [
        { size: '480x480', resolution: '480p' },
        { size: '720x720', resolution: '720p' },
      ],
      '4:3': [
        { size: '640x480', resolution: '480p' },
        { size: '960x720', resolution: '720p' },
      ],
      '3:4': [
        { size: '480x640', resolution: '480p' },
        { size: '720x960', resolution: '720p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferences: false,
    supportsAudio: false,
  },
  {
    id: 'flux-3-video',
    name: 'Flux 3 Video',
    provider: 'Black Forest Labs',
    description: 'Кинематографичная генерация видео с точным движением камеры.',
    pricePerSec: '28.90–90.10',
    durations: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '21:9', '4:3', '3:4'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p'],
    defaultResolution: '1080p',
    sizes: {
      '21:9': [
        { size: '1680x720', resolution: '720p' },
        { size: '2520x1080', resolution: '1080p' },
      ],
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '4:3': [
        { size: '960x720', resolution: '720p' },
        { size: '1440x1080', resolution: '1080p' },
      ],
      '1:1': [
        { size: '720x720', resolution: '720p' },
        { size: '1080x1080', resolution: '1080p' },
      ],
      '3:4': [
        { size: '720x960', resolution: '720p' },
        { size: '1080x1440', resolution: '1080p' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: true,
    maxReferences: 5,
    supportsAudio: true,
  },
  {
    id: 'avatar-iv',
    name: 'Avatar IV',
    provider: 'HeyGen',
    description: 'Оживление фото в lip-sync talking-head по тексту или аудио.',
    pricePerSec: '8.50',
    durations: [5, 10, 15, 30, 60],
    defaultDuration: 5,
    aspectRatios: ['9:16', '16:9', '1:1'],
    defaultAspectRatio: '9:16',
    resolutions: ['720p', '1080p'],
    defaultResolution: '1080p',
    sizes: {},
    supportsFirstFrame: false,
    supportsLastFrame: false,
    supportsReferences: true,
    maxReferences: 5,
    supportsAudio: true,
  },
  {
    id: 'wan-2.7',
    name: 'Wan 2.7',
    provider: 'Alibaba',
    description: 'Видео по тексту и кадрам, до 10 сек.',
    pricePerSec: '17',
    durations: [2, 5, 10],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
      '1:1': [
        { size: '720x720', resolution: '720p' },
        { size: '1080x1080', resolution: '1080p' },
      ],
      '4:3': [
        { size: '960x720', resolution: '720p' },
        { size: '1440x1080', resolution: '1080p' },
      ],
      '3:4': [
        { size: '720x960', resolution: '720p' },
        { size: '1080x1440', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferences: true,
    maxReferences: 5,
    supportsAudio: false,
  },
  {
    id: 'wan-2.6',
    name: 'Wan 2.6',
    provider: 'Alibaba',
    description: 'Видео по тексту и кадрам 5–10 сек.',
    pricePerSec: '17–25.50',
    durations: [5, 10],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferences: false,
    supportsAudio: false,
  },
  {
    id: 'happyhorse-1.1',
    name: 'Happyhorse 1.1',
    provider: 'Alibaba',
    description: 'Видео по тексту, кадрам и референсным изображениям.',
    pricePerSec: '16.80–21.73',
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
      '1:1': [
        { size: '720x720', resolution: '720p' },
        { size: '1080x1080', resolution: '1080p' },
      ],
      '4:3': [
        { size: '960x720', resolution: '720p' },
        { size: '1440x1080', resolution: '1080p' },
      ],
      '3:4': [
        { size: '720x960', resolution: '720p' },
        { size: '1080x1440', resolution: '1080p' },
      ],
      '21:9': [
        { size: '1680x720', resolution: '720p' },
        { size: '2520x1080', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferences: false,
    supportsAudio: false,
  },
  {
    id: 'happyhorse-1.0',
    name: 'Happyhorse 1.0',
    provider: 'Alibaba',
    description: 'Модель от Alibaba для динамичных сцен.',
    pricePerSec: '16.80–28.80',
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    defaultDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    defaultAspectRatio: '16:9',
    resolutions: ['720p', '1080p'],
    defaultResolution: '720p',
    sizes: {
      '16:9': [
        { size: '1280x720', resolution: '720p' },
        { size: '1920x1080', resolution: '1080p' },
      ],
      '9:16': [
        { size: '720x1280', resolution: '720p' },
        { size: '1080x1920', resolution: '1080p' },
      ],
      '1:1': [
        { size: '720x720', resolution: '720p' },
        { size: '1080x1080', resolution: '1080p' },
      ],
      '4:3': [
        { size: '960x720', resolution: '720p' },
        { size: '1440x1080', resolution: '1080p' },
      ],
      '3:4': [
        { size: '720x960', resolution: '720p' },
        { size: '1080x1440', resolution: '1080p' },
      ],
      '21:9': [
        { size: '1680x720', resolution: '720p' },
        { size: '2520x1080', resolution: '1080p' },
      ],
    },
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferences: false,
    supportsAudio: false,
  },
];

const VIDEO_PROVIDERS = ['Все', 'Google', 'OpenAI', 'Kuaishou', 'ByteDance', 'Alibaba', 'MiniMax', 'Runway', 'xAI', 'Black Forest Labs', 'HeyGen'];

const PROVIDER_COLORS: Record<string, string> = {
  'Google': 'text-blue-400',
  'OpenAI': 'text-emerald-400',
  'Kuaishou': 'text-orange-400',
  'Alibaba': 'text-orange-400',
  'ByteDance': 'text-sky-400',
  'MiniMax': 'text-rose-400',
  'Runway': 'text-slate-600 dark:text-gray-300',
  'xAI': 'text-slate-600 dark:text-gray-300',
  'Black Forest Labs': 'text-amber-400',
  'Luma Labs': 'text-cyan-400',
  'HeyGen': 'text-teal-400',
  'Pika': 'text-pink-400',
  'Tencent': 'text-blue-400',
  'Pixverse': 'text-green-400',
  'ZhipuAI': 'text-sky-400',
};

const PROVIDER_BG: Record<string, string> = {
  'Google': 'bg-blue-500/10 border-blue-500/20',
  'OpenAI': 'bg-emerald-500/10 border-emerald-500/20',
  'Kuaishou': 'bg-orange-500/10 border-orange-500/20',
  'Alibaba': 'bg-orange-500/10 border-orange-500/20',
  'ByteDance': 'bg-sky-500/10 border-sky-500/20',
  'MiniMax': 'bg-rose-500/10 border-rose-500/20',
  'Runway': 'bg-gray-500/10 border-gray-500/20',
  'xAI': 'bg-gray-500/10 border-gray-500/20',
  'Black Forest Labs': 'bg-amber-500/10 border-amber-500/20',
  'Luma Labs': 'bg-cyan-500/10 border-cyan-500/20',
  'HeyGen': 'bg-teal-500/10 border-teal-500/20',
  'Pika': 'bg-pink-500/10 border-pink-500/20',
  'Tencent': 'bg-blue-500/10 border-blue-500/20',
  'Pixverse': 'bg-green-500/10 border-green-500/20',
  'ZhipuAI': 'bg-sky-500/10 border-sky-500/20',
};

function VideoProviderIcon({ provider, size = 16 }: { provider: string; size?: number }) {
  const s = size;
  switch (provider) {
    case 'Google':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6L12 2z" fill="currentColor"/>
        </svg>
      );
    case 'OpenAI':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M22.2 8.61c.2-.6.3-1.23.3-1.86A5.25 5.25 0 0017.44 1.5a5.2 5.2 0 00-4.56 2.67A5.24 5.24 0 009 3a5.25 5.25 0 00-4.87 7.25 5.25 5.25 0 00.68 10.32 5.2 5.2 0 004.56-2.67c1.1.7 2.4 1.1 3.76 1.1a5.25 5.25 0 004.87-7.25 5.25 5.25 0 001.3-3.14z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      );
    case 'Kuaishou':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 9l5 3-5 3V9z" fill="currentColor"/>
        </svg>
      );
    case 'Alibaba':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M8 14c0 2.2 1.8 4 4 4s4-1.8 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'ByteDance':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'MiniMax':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M4 20V10l4 6 4-10 4 10 4-6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'Runway':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M4 12h16M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      );
    case 'xAI':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M6 4l6 8-6 8M18 4l-6 8 6 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'Black Forest Labs':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M12 8v8M8 10l4 2 4-2M8 14l4 2 4-2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      );
    case 'Luma Labs':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6"/>
        </svg>
      );
    case 'HeyGen':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'Pika':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 3l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6l3-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      );
    case 'Tencent':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'Pixverse':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.6"/>
          <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.4"/>
          <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.3"/>
          <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.8"/>
        </svg>
      );
    case 'ZhipuAI':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2v20M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
      );
  }
}

function AspectRatioIcon({ ratio, size = 16 }: { ratio: AspectRatio; size?: number }) {
  const s = size;
  let w: number, h: number;
  switch (ratio) {
    case '16:9': w = 14; h = 8; break;
    case '9:16': w = 7; h = 13; break;
    case '1:1': w = 10; h = 10; break;
    case '4:3': w = 12; h = 9; break;
    case '3:4': w = 9; h = 12; break;
    case '21:9': w = 15; h = 6; break;
    case '3:2': w = 13; h = 9; break;
    case '2:3': w = 9; h = 13; break;
  }
  const x = (s - w) / 2;
  const y = (s - h) / 2;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <rect x={x} y={y} width={w} height={h} rx={1.5} stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

interface VideoModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  selectedDuration: number;
  selectedAspectRatio: AspectRatio;
  selectedResolution: VideoResolution;
  onSelectModel: (modelId: string) => void;
  onSelectDuration: (duration: number) => void;
  onSelectAspectRatio: (ratio: AspectRatio) => void;
  onSelectResolution: (resolution: VideoResolution) => void;
}

export default function VideoModelSelector({
  isOpen,
  onClose,
  selectedModel,
  selectedDuration,
  selectedAspectRatio,
  selectedResolution,
  onSelectModel,
  onSelectDuration,
  onSelectAspectRatio,
  onSelectResolution,
}: VideoModelSelectorProps) {
  const [search, setSearch] = useState('');
  const [activeProvider, setActiveProvider] = useState('Все');

  const currentModelInfo = VIDEO_MODELS.find((m) => m.id === selectedModel) || VIDEO_MODELS[0];

  const filtered = useMemo(() => {
    let list = VIDEO_MODELS;
    if (activeProvider !== 'Все') {
      list = list.filter((m) => m.provider === activeProvider);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeProvider]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 md:p-8">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl max-h-[75vh] sm:max-h-[85vh] bg-white dark:bg-[#0d0d20] border-t sm:border border-slate-200/60 dark:border-gray-800/60 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-black/50 animate-in pb-[env(safe-area-inset-bottom)]">
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-gray-700 mx-auto mt-2 sm:hidden" />
        {/* Search header */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-4 border-b border-slate-200/40 dark:border-gray-800/40">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти модель видео..."
            autoFocus={window.innerWidth >= 640}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-100/60 dark:hover:bg-gray-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider tabs */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-3 overflow-x-auto border-b border-slate-200/30 dark:border-gray-800/30 scrollbar-hide">
          {VIDEO_PROVIDERS.map((provider) => (
            <button
              key={provider}
              onClick={() => setActiveProvider(provider)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeProvider === provider
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-[#1a1a2e] text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-300 dark:hover:bg-[#252540] border border-slate-200/50 dark:border-gray-800/50'
              }`}
            >
              {provider}
            </button>
          ))}
        </div>

        {/* Model list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((model) => {
            const isSelected = selectedModel === model.id;
            return (
              <button
                key={model.id}
                onClick={() => {
                  onSelectModel(model.id);
                  if (!model.durations.includes(selectedDuration)) {
                    onSelectDuration(model.defaultDuration);
                  }
                  if (!model.aspectRatios.includes(selectedAspectRatio)) {
                    onSelectAspectRatio(model.defaultAspectRatio);
                  }
                  if (!model.resolutions.includes(selectedResolution)) {
                    onSelectResolution(model.defaultResolution);
                  }
                }}
                className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200/20 dark:border-gray-800/20 hover:bg-slate-100/30 dark:hover:bg-gray-800/30 transition-colors text-left ${
                  isSelected ? 'bg-blue-500/5' : ''
                }`}
              >
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${PROVIDER_BG[model.provider] || 'bg-slate-200/50 dark:bg-gray-800/50 border-slate-300/40 dark:border-gray-700/40'}`}>
                  <span className={PROVIDER_COLORS[model.provider] || 'text-slate-500 dark:text-gray-400'}>
                    <VideoProviderIcon provider={model.provider} size={14} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] sm:text-sm font-medium text-slate-800 dark:text-gray-100">{model.name}</p>
                    {model.popular && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        ТОП
                      </span>
                    )}
                    {(model.supportsFirstFrame || model.supportsLastFrame || model.supportsReferences || model.supportsAudio) && (
                      <div className="flex items-center gap-0.5">
                        {model.supportsFirstFrame && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 leading-none">1</span>
                        )}
                        {model.supportsLastFrame && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 leading-none">2</span>
                        )}
                        {model.supportsReferences && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 leading-none">REF</span>
                        )}
                        {model.supportsAudio && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 leading-none">AUD</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400 dark:text-gray-500">{model.provider}</span>
                    <span className="text-[10px] text-slate-300 dark:text-gray-700">|</span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-600">{model.durations.join(', ')} сек</span>
                    <span className="text-[10px] text-slate-300 dark:text-gray-700">|</span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-600">{model.aspectRatios.join(', ')}</span>
                  </div>
                </div>
                <div className="hidden sm:block text-[11px] text-right shrink-0">
                  <span className="text-slate-600 dark:text-gray-300 font-medium">{model.pricePerSec} ₽</span>
                  <span className="text-slate-400 dark:text-gray-500"> / сек</span>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="w-8 h-8 text-slate-400 dark:text-gray-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-gray-400">Модель не найдена</p>
              <p className="text-xs text-slate-400 dark:text-gray-600 mt-1">Попробуйте другой запрос</p>
            </div>
          )}
        </div>

        {/* Duration + Aspect ratio selection */}
        <div className="shrink-0 border-t border-slate-200/40 dark:border-gray-800/40 px-3 sm:px-5 py-2.5 sm:py-3">
          <p className="text-[11px] text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            Параметры — <span className="normal-case text-slate-600 dark:text-gray-300 font-medium">{currentModelInfo.name}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:flex-wrap">
            {/* Duration */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 dark:text-gray-600 mb-1.5">Длительность</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentModelInfo.durations.map((dur) => (
                  <button
                    key={dur}
                    onClick={() => onSelectDuration(dur)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      selectedDuration === dur
                        ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 ring-1 ring-blue-500/20'
                        : 'bg-slate-100/50 dark:bg-[#12122a] border-slate-200/40 dark:border-gray-800/40 text-slate-700 dark:text-gray-200 hover:border-blue-500/20 hover:bg-blue-500/5'
                    }`}
                  >
                    {dur} сек
                  </button>
                ))}
              </div>
            </div>
            {/* Aspect ratio */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 dark:text-gray-600 mb-1.5">Соотношение сторон</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentModelInfo.aspectRatios.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => onSelectAspectRatio(ratio)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      selectedAspectRatio === ratio
                        ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 ring-1 ring-blue-500/20'
                        : 'bg-slate-100/50 dark:bg-[#12122a] border-slate-200/40 dark:border-gray-800/40 text-slate-700 dark:text-gray-200 hover:border-blue-500/20 hover:bg-blue-500/5'
                    }`}
                  >
                    <AspectRatioIcon ratio={ratio} size={14} />
                    {ASPECT_RATIO_LABELS[ratio]}
                  </button>
                ))}
              </div>
            </div>
            {/* Resolution */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 dark:text-gray-600 mb-1.5">Разрешение</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(() => {
                  const sizesForAR = currentModelInfo.sizes[selectedAspectRatio];
                  if (sizesForAR && sizesForAR.length > 0) {
                    return sizesForAR.map((opt) => {
                      const q = RESOLUTION_QUALITY[opt.resolution];
                      const isActive = selectedResolution === opt.resolution;
                      return (
                        <button
                          key={opt.size}
                          onClick={() => onSelectResolution(opt.resolution)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                            isActive
                              ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 ring-1 ring-blue-500/20'
                              : 'bg-slate-100/50 dark:bg-[#12122a] border-slate-200/40 dark:border-gray-800/40 text-slate-700 dark:text-gray-200 hover:border-blue-500/20 hover:bg-blue-500/5'
                          }`}
                        >
                          <span className={`text-[9px] font-bold uppercase leading-none px-1 py-0.5 rounded ${
                            isActive ? 'bg-blue-500/20 text-blue-300' : q.color + ' bg-slate-200/60 dark:bg-gray-800/60'
                          }`}>{q.label}</span>
                          <span className="font-mono text-[11px] font-medium">{opt.size}</span>
                        </button>
                      );
                    });
                  }
                  return currentModelInfo.resolutions.map((res) => (
                    <button
                      key={res}
                      onClick={() => onSelectResolution(res)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        selectedResolution === res
                          ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 ring-1 ring-blue-500/20'
                          : 'bg-slate-100/50 dark:bg-[#12122a] border-slate-200/40 dark:border-gray-800/40 text-slate-700 dark:text-gray-200 hover:border-blue-500/20 hover:bg-blue-500/5'
                      }`}
                    >
                      {res}
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-t border-slate-200/40 dark:border-gray-800/40 bg-slate-50/50 dark:bg-[#0a0a1a]/50 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="text-[11px] text-slate-400 dark:text-gray-500 truncate mr-3">
            <span className="text-slate-700 dark:text-gray-200 font-medium">{currentModelInfo.name}</span>
            {' · '}
            <span>{selectedDuration} сек</span>
            {' · '}
            <span>{selectedAspectRatio}</span>
            {' \u00b7 '}
            <span>{(() => {
              const sizesForAR = currentModelInfo.sizes[selectedAspectRatio];
              const match = sizesForAR?.find(s => s.resolution === selectedResolution);
              return match ? `${match.size} (${selectedResolution})` : selectedResolution;
            })()}</span>
            {' · '}
            <span>{currentModelInfo.pricePerSec} ₽/сек</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 shrink-0"
          >
            Готово
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function getVideoModelDisplayName(modelId: string): string {
  const model = VIDEO_MODELS.find((m) => m.id === modelId);
  return model?.name || modelId;
}

export function getVideoModelInfo(modelId: string): VideoModelInfo | null {
  return VIDEO_MODELS.find((m) => m.id === modelId) || null;
}

function parsePriceRange(priceStr: string): [number, number] {
  const parts = priceStr.split('–').map(s => parseFloat(s.trim()));
  if (parts.length === 1) return [parts[0], parts[0]];
  return [parts[0], parts[1]];
}

export function getVideoPriceForResolution(modelId: string, resolution: VideoResolution): number {
  const model = VIDEO_MODELS.find(m => m.id === modelId);
  if (!model) return 0;
  const [min, max] = parsePriceRange(model.pricePerSec);
  const idx = model.resolutions.indexOf(resolution);
  if (idx === -1 || model.resolutions.length <= 1) return max;
  const ratio = idx / (model.resolutions.length - 1);
  return Math.round((min + ratio * (max - min)) * 100) / 100;
}

export function getVideoPixelSize(modelId: string, aspectRatio: AspectRatio, resolution: VideoResolution): string | null {
  const model = VIDEO_MODELS.find(m => m.id === modelId);
  if (!model) return null;
  const sizesForAR = model.sizes[aspectRatio];
  const match = sizesForAR?.find(s => s.resolution === resolution);
  return match?.size || null;
}

export { VIDEO_MODELS };
