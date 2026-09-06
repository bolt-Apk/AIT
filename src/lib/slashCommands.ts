export type SlashCommandScope = 'image' | 'video' | 'both';

export interface SlashCommand {
  command: string;
  label: string;
  description: string;
  scope: SlashCommandScope;
  category: string;
  snippet: string;
}

export interface SlashCategory {
  id: string;
  label: string;
}

export const slashCategories: SlashCategory[] = [
  { id: 'quality', label: 'Качество' },
  { id: 'camera', label: 'Камера' },
  { id: 'lighting', label: 'Освещение' },
  { id: 'weather', label: 'Погода' },
  { id: 'style', label: 'Стиль съёмки' },
  { id: 'art', label: 'Арт-стиль' },
  { id: 'aesthetic', label: 'Эстетика' },
  { id: 'environment', label: 'Локация' },
  { id: 'effect', label: 'Эффекты' },
  { id: 'movement', label: 'Движение камеры' },
];

export const slashCommands: SlashCommand[] = [
  // ── Качество ──
  { command: '/4k', label: '4K', description: 'Высокое разрешение 4K', scope: 'both', category: 'quality', snippet: '4K ultra high resolution' },
  { command: '/8k', label: '8K', description: 'Максимальное разрешение 8K', scope: 'both', category: 'quality', snippet: '8K ultra high resolution, extremely detailed' },
  { command: '/hdr', label: 'HDR', description: 'Высокий динамический диапазон', scope: 'both', category: 'quality', snippet: 'HDR, high dynamic range, vivid colors' },
  { command: '/ultrarealistic', label: 'Ultra Realistic', description: 'Максимальная фотореалистичность', scope: 'both', category: 'quality', snippet: 'ultra realistic, photorealistic, hyperdetailed' },
  { command: '/detailed', label: 'Highly Detailed', description: 'Максимальная детализация', scope: 'both', category: 'quality', snippet: 'highly detailed, intricate details, sharp focus' },
  { command: '/masterpiece', label: 'Masterpiece', description: 'Качество шедевра', scope: 'image', category: 'quality', snippet: 'masterpiece, best quality, extremely detailed' },

  // ── Камера ──
  { command: '/cinematic', label: 'Cinematic', description: 'Кинематографический стиль', scope: 'both', category: 'camera', snippet: 'cinematic, anamorphic lens, film grain, cinematic color grading' },
  { command: '/closeup', label: 'Close-Up', description: 'Крупный план', scope: 'both', category: 'camera', snippet: 'extreme close-up shot, shallow depth of field' },
  { command: '/wideangle', label: 'Wide Angle', description: 'Широкоугольный объектив', scope: 'both', category: 'camera', snippet: 'wide angle lens, expansive view, 24mm focal length' },
  { command: '/fisheye', label: 'Fish Eye', description: 'Эффект рыбьего глаза', scope: 'both', category: 'camera', snippet: 'fisheye lens, extreme barrel distortion, ultra wide angle' },
  { command: '/lowangle', label: 'Low Angle', description: 'Съёмка снизу', scope: 'both', category: 'camera', snippet: 'low angle shot, looking up, dramatic perspective' },
  { command: '/topdown', label: 'Top-Down', description: 'Вид сверху', scope: 'both', category: 'camera', snippet: 'top-down view, overhead shot, bird\'s eye perspective' },
  { command: '/pov', label: 'POV', description: 'От первого лица', scope: 'both', category: 'camera', snippet: 'POV shot, first person perspective' },
  { command: '/droneview', label: 'Drone View', description: 'Аэросъёмка с дрона', scope: 'both', category: 'camera', snippet: 'aerial drone view, high altitude shot' },
  { command: '/bokeh', label: 'Bokeh', description: 'Размытый фон', scope: 'both', category: 'camera', snippet: 'beautiful bokeh, shallow depth of field, f/1.4' },
  { command: '/tiltshift', label: 'Tilt-Shift', description: 'Эффект миниатюры', scope: 'image', category: 'camera', snippet: 'tilt-shift photography, miniature effect' },
  { command: '/macro', label: 'Macro', description: 'Макросъёмка', scope: 'both', category: 'camera', snippet: 'macro photography, extreme close-up, fine details visible' },
  { command: '/portrait', label: 'Portrait Lens', description: 'Портретный объектив 85мм', scope: 'image', category: 'camera', snippet: 'portrait lens, 85mm f/1.4, creamy bokeh, sharp subject' },

  // ── Освещение ──
  { command: '/goldenhour', label: 'Golden Hour', description: 'Золотой час', scope: 'both', category: 'lighting', snippet: 'golden hour lighting, warm sunlight, long shadows' },
  { command: '/bluehour', label: 'Blue Hour', description: 'Синий час', scope: 'both', category: 'lighting', snippet: 'blue hour, twilight, cool blue ambient light' },
  { command: '/sunset', label: 'Sunset', description: 'Закатное освещение', scope: 'both', category: 'lighting', snippet: 'sunset lighting, warm orange and pink tones, dramatic sky' },
  { command: '/sunrise', label: 'Sunrise', description: 'Рассветное освещение', scope: 'both', category: 'lighting', snippet: 'sunrise lighting, soft morning light, pastel sky' },
  { command: '/moonlight', label: 'Moonlight', description: 'Лунный свет', scope: 'both', category: 'lighting', snippet: 'moonlight illumination, cool blue night tones' },
  { command: '/neonlights', label: 'Neon Lights', description: 'Неоновая подсветка', scope: 'both', category: 'lighting', snippet: 'neon lights, colorful neon glow, urban night lighting' },
  { command: '/softlight', label: 'Soft Lighting', description: 'Мягкий рассеянный свет', scope: 'both', category: 'lighting', snippet: 'soft diffused lighting, gentle shadows, even illumination' },
  { command: '/rimlight', label: 'Rim Light', description: 'Контровой свет', scope: 'both', category: 'lighting', snippet: 'rim lighting, backlit subject, glowing edges' },
  { command: '/godrays', label: 'God Rays', description: 'Лучи света', scope: 'both', category: 'lighting', snippet: 'god rays, volumetric light beams, crepuscular rays' },
  { command: '/volumetric', label: 'Volumetric Light', description: 'Объёмный свет', scope: 'both', category: 'lighting', snippet: 'volumetric lighting, light shafts, atmospheric haze' },
  { command: '/studio', label: 'Studio Light', description: 'Студийный свет', scope: 'both', category: 'lighting', snippet: 'professional studio lighting, three-point lighting setup' },
  { command: '/dramatic', label: 'Dramatic Light', description: 'Драматическое освещение', scope: 'both', category: 'lighting', snippet: 'dramatic lighting, harsh shadows, high contrast, chiaroscuro' },

  // ── Погода ──
  { command: '/rain', label: 'Rain', description: 'Дождливая погода', scope: 'both', category: 'weather', snippet: 'rainy weather, rain drops, wet surfaces, reflections' },
  { command: '/snow', label: 'Snow', description: 'Снег', scope: 'both', category: 'weather', snippet: 'snowy weather, falling snowflakes, winter atmosphere' },
  { command: '/fog', label: 'Fog', description: 'Туман', scope: 'both', category: 'weather', snippet: 'dense fog, misty atmosphere, low visibility, mysterious mood' },
  { command: '/storm', label: 'Storm', description: 'Гроза', scope: 'both', category: 'weather', snippet: 'dramatic storm, dark clouds, lightning, intense atmosphere' },
  { command: '/cloudy', label: 'Overcast', description: 'Облачная погода', scope: 'both', category: 'weather', snippet: 'overcast sky, soft diffused light, cloudy day' },

  // ── Стиль съёмки ──
  { command: '/filmgrain', label: 'Film Grain', description: 'Плёночная зернистость', scope: 'both', category: 'style', snippet: 'film grain, analog film texture, organic noise' },
  { command: '/35mm', label: '35mm Film', description: '35мм плёнка', scope: 'both', category: 'style', snippet: '35mm film photography, analog look, natural film colors' },
  { command: '/polaroid', label: 'Polaroid', description: 'Полароидный стиль', scope: 'image', category: 'style', snippet: 'Polaroid photo style, instant camera look, faded colors, white border' },
  { command: '/longexposure', label: 'Long Exposure', description: 'Длинная выдержка', scope: 'both', category: 'style', snippet: 'long exposure, light trails, motion blur, smooth water' },
  { command: '/motionblur', label: 'Motion Blur', description: 'Размытие в движении', scope: 'both', category: 'style', snippet: 'motion blur, sense of speed, dynamic movement' },
  { command: '/anamorphic', label: 'Anamorphic', description: 'Анаморфный формат', scope: 'both', category: 'style', snippet: 'anamorphic lens, horizontal lens flares, 2.39:1 aspect ratio, cinematic' },

  // ── Арт-стиль ──
  { command: '/anime', label: 'Anime', description: 'Аниме-стиль', scope: 'both', category: 'art', snippet: 'anime style, Japanese animation, vibrant colors, cel shading' },
  { command: '/comicbook', label: 'Comic Book', description: 'Стиль комиксов', scope: 'image', category: 'art', snippet: 'comic book style, bold outlines, halftone dots, dynamic composition' },
  { command: '/oilpainting', label: 'Oil Painting', description: 'Масляная живопись', scope: 'image', category: 'art', snippet: 'oil painting style, visible brush strokes, rich textures, painterly' },
  { command: '/watercolor', label: 'Watercolor', description: 'Акварель', scope: 'image', category: 'art', snippet: 'watercolor painting, soft washes, flowing colors, paper texture' },
  { command: '/sketch', label: 'Sketch', description: 'Рисунок карандашом', scope: 'image', category: 'art', snippet: 'pencil sketch, graphite drawing, fine lines, hatching' },
  { command: '/3drender', label: '3D Render', description: '3D-рендер', scope: 'both', category: 'art', snippet: '3D render, octane render, raytracing, subsurface scattering' },
  { command: '/isometric', label: 'Isometric', description: 'Изометрия', scope: 'image', category: 'art', snippet: 'isometric view, isometric illustration, clean geometric style' },
  { command: '/pixelart', label: 'Pixel Art', description: 'Пиксельный арт', scope: 'image', category: 'art', snippet: 'pixel art, retro game style, 8-bit, limited color palette' },
  { command: '/papercraft', label: 'Paper Craft', description: 'Бумажная поделка', scope: 'image', category: 'art', snippet: 'paper craft style, layered paper cutouts, paper texture' },
  { command: '/claymation', label: 'Claymation', description: 'Пластилиновая анимация', scope: 'both', category: 'art', snippet: 'claymation style, clay figures, stop motion look' },

  // ── Эстетика ──
  { command: '/cyberpunk', label: 'Cyberpunk', description: 'Киберпанк', scope: 'both', category: 'aesthetic', snippet: 'cyberpunk aesthetic, neon lights, futuristic city, dystopian' },
  { command: '/vintage', label: 'Vintage', description: 'Винтаж', scope: 'both', category: 'aesthetic', snippet: 'vintage look, retro colors, aged feel, nostalgic' },
  { command: '/retro', label: 'Retro', description: 'Ретро-стиль', scope: 'both', category: 'aesthetic', snippet: 'retro aesthetic, 70s/80s vibes, warm tones, groovy' },
  { command: '/noir', label: 'Film Noir', description: 'Нуар', scope: 'both', category: 'aesthetic', snippet: 'film noir style, black and white, high contrast, dramatic shadows' },
  { command: '/fantasy', label: 'Fantasy', description: 'Фэнтези', scope: 'both', category: 'aesthetic', snippet: 'fantasy world, magical atmosphere, mystical, ethereal lighting' },
  { command: '/scifi', label: 'Sci-Fi', description: 'Научная фантастика', scope: 'both', category: 'aesthetic', snippet: 'sci-fi setting, futuristic technology, space age design' },
  { command: '/luxury', label: 'Luxury', description: 'Роскошь', scope: 'both', category: 'aesthetic', snippet: 'luxury aesthetic, premium look, elegant, high-end, opulent' },
  { command: '/minimalist', label: 'Minimalist', description: 'Минимализм', scope: 'both', category: 'aesthetic', snippet: 'minimalist style, clean lines, negative space, simple composition' },
  { command: '/dreamcore', label: 'Dreamcore', description: 'Сюрреалистичные сны', scope: 'both', category: 'aesthetic', snippet: 'dreamcore aesthetic, surreal, dreamy atmosphere, liminal space' },
  { command: '/steampunk', label: 'Steampunk', description: 'Стимпанк', scope: 'both', category: 'aesthetic', snippet: 'steampunk aesthetic, Victorian era, brass gears, steam-powered machinery' },
  { command: '/vaporwave', label: 'Vaporwave', description: 'Вэйпорвейв', scope: 'image', category: 'aesthetic', snippet: 'vaporwave aesthetic, pastel gradients, retro computer graphics, neon pink and blue' },

  // ── Локация ──
  { command: '/underwater', label: 'Underwater', description: 'Под водой', scope: 'both', category: 'environment', snippet: 'underwater scene, ocean, light rays through water, marine life' },
  { command: '/space', label: 'Space', description: 'Космос', scope: 'both', category: 'environment', snippet: 'outer space, stars, nebula, cosmic background' },
  { command: '/forest', label: 'Forest', description: 'Лес', scope: 'both', category: 'environment', snippet: 'lush forest, dense trees, dappled sunlight, green foliage' },
  { command: '/desert', label: 'Desert', description: 'Пустыня', scope: 'both', category: 'environment', snippet: 'vast desert landscape, sand dunes, harsh sunlight, dry atmosphere' },
  { command: '/mountains', label: 'Mountains', description: 'Горы', scope: 'both', category: 'environment', snippet: 'majestic mountain landscape, snow-capped peaks, alpine scenery' },
  { command: '/cityscape', label: 'Cityscape', description: 'Городской пейзаж', scope: 'both', category: 'environment', snippet: 'cityscape, urban skyline, skyscrapers, architectural details' },
  { command: '/nightcity', label: 'Night City', description: 'Ночной город', scope: 'both', category: 'environment', snippet: 'night city, urban lights, glowing windows, wet streets, reflections' },
  { command: '/beach', label: 'Beach', description: 'Пляж', scope: 'both', category: 'environment', snippet: 'tropical beach, crystal clear water, white sand, palm trees' },

  // ── Эффекты ──
  { command: '/glitch', label: 'Glitch', description: 'Глитч-эффект', scope: 'both', category: 'effect', snippet: 'glitch effect, digital distortion, RGB split, corrupted data' },
  { command: '/smoke', label: 'Smoke', description: 'Дым', scope: 'both', category: 'effect', snippet: 'smoke effects, swirling smoke, atmospheric haze' },
  { command: '/fire', label: 'Fire', description: 'Огонь', scope: 'both', category: 'effect', snippet: 'fire effects, flames, sparks, warm glow, embers' },
  { command: '/doubleexposure', label: 'Double Exposure', description: 'Двойная экспозиция', scope: 'both', category: 'effect', snippet: 'double exposure effect, overlapping images, blended silhouettes' },
  { command: '/silhouette', label: 'Silhouette', description: 'Силуэт', scope: 'both', category: 'effect', snippet: 'silhouette, backlit figure, dark outline against bright background' },
  { command: '/holographic', label: 'Holographic', description: 'Голограмма', scope: 'both', category: 'effect', snippet: 'holographic effect, iridescent, rainbow reflections, prismatic' },
  { command: '/chrome', label: 'Chrome', description: 'Хромированный металл', scope: 'both', category: 'effect', snippet: 'chrome surface, highly reflective, metallic sheen, mirror finish' },
  { command: '/particles', label: 'Particles', description: 'Частицы', scope: 'both', category: 'effect', snippet: 'floating particles, dust motes, light particles, magical sparkles' },
  { command: '/reflection', label: 'Reflection', description: 'Отражения', scope: 'both', category: 'effect', snippet: 'mirror reflection, water reflection, reflective surface' },

  // ── Движение камеры (только для видео) ──
  { command: '/dollyin', label: 'Dolly In', description: 'Наезд камеры', scope: 'video', category: 'movement', snippet: 'slow dolly push-in, camera moving forward toward subject' },
  { command: '/pullback', label: 'Pull Back', description: 'Отъезд камеры', scope: 'video', category: 'movement', snippet: 'slow pull-back, camera moving backward, revealing the scene' },
  { command: '/orbit', label: 'Orbit', description: 'Облёт вокруг объекта', scope: 'video', category: 'movement', snippet: 'orbit shot, camera circling around the subject, 360 degree arc' },
  { command: '/pan', label: 'Pan', description: 'Панорамирование', scope: 'video', category: 'movement', snippet: 'smooth horizontal pan, camera turning left to right' },
  { command: '/tilt', label: 'Tilt', description: 'Наклон камеры', scope: 'video', category: 'movement', snippet: 'vertical tilt shot, camera tilting upward' },
  { command: '/crane', label: 'Crane Shot', description: 'Подъём камеры вверх', scope: 'video', category: 'movement', snippet: 'crane shot, camera rising upward, revealing overhead view' },
  { command: '/tracking', label: 'Tracking Shot', description: 'Следящая камера', scope: 'video', category: 'movement', snippet: 'tracking shot, camera following the subject, steadicam movement' },
  { command: '/handheld', label: 'Handheld', description: 'Ручная камера', scope: 'video', category: 'movement', snippet: 'handheld camera, organic movement, slight shake, documentary feel' },
  { command: '/slowmo', label: 'Slow Motion', description: 'Замедленная съёмка', scope: 'video', category: 'movement', snippet: 'slow motion, 120fps, fluid motion, time slowed down' },
  { command: '/timelapse', label: 'Timelapse', description: 'Таймлапс', scope: 'video', category: 'movement', snippet: 'timelapse, time accelerated, clouds moving fast, shifting light' },
  { command: '/hyperlapse', label: 'Hyperlapse', description: 'Гиперлапс', scope: 'video', category: 'movement', snippet: 'hyperlapse, camera moving forward, time accelerated, light trails' },
  { command: '/whippan', label: 'Whip Pan', description: 'Быстрый поворот камеры', scope: 'video', category: 'movement', snippet: 'whip pan, fast camera rotation, motion blur transition' },
  { command: '/zoomin', label: 'Zoom In', description: 'Плавное приближение', scope: 'video', category: 'movement', snippet: 'smooth zoom in, gradually closing in on the subject' },
  { command: '/static', label: 'Static', description: 'Статичная камера', scope: 'video', category: 'movement', snippet: 'locked-off static camera, no movement, tripod shot' },
];

export function filterSlashCommands(
  query: string,
  scope: 'image' | 'video' | 'chat',
): SlashCommand[] {
  const q = query.toLowerCase().replace(/^\//, '');
  const scopeFilter = scope === 'chat' ? 'both' : scope;

  return slashCommands
    .filter((cmd) => {
      if (scope === 'image' && cmd.scope === 'video') return false;
      if (scope === 'video' && cmd.scope === 'image') return false;
      if (!q) return true;
      return (
        cmd.command.toLowerCase().includes('/' + q) ||
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q)
      );
    })
    .slice(0, 12);
}
