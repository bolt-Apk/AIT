import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { getUserId } from '../lib/auth.js';
import { mkdirSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

export default function registerStorageRoutes(app: FastifyInstance, pool: Pool, storageDir: string) {

  // TTS audio upload
  app.post('/api/storage/tts-audio', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'Файл не найден' });
    const userDir = path.join(storageDir, 'tts-audio', userId);
    mkdirSync(userDir, { recursive: true });
    const fileName = `${crypto.randomUUID()}.mp3`;
    await pipeline(file.file, createWriteStream(path.join(userDir, fileName)));
    return { url: `/storage/tts-audio/${userId}/${fileName}` };
  });

  // Video input upload (images/audio for video generation)
  app.post('/api/storage/video-inputs', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'Файл не найден' });
    const ext = file.filename?.split('.').pop() || 'bin';
    const userDir = path.join(storageDir, 'video-inputs', userId);
    mkdirSync(userDir, { recursive: true });
    const fileName = `${crypto.randomUUID()}.${ext}`;
    await pipeline(file.file, createWriteStream(path.join(userDir, fileName)));
    return { url: `/storage/video-inputs/${userId}/${fileName}` };
  });

  // Support attachment upload
  app.post('/api/storage/support-attachments', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'Файл не найден' });
    const ext = file.filename?.split('.').pop() || 'bin';
    const userDir = path.join(storageDir, 'support-attachments', userId);
    mkdirSync(userDir, { recursive: true });
    const fileName = `${crypto.randomUUID()}.${ext}`;
    await pipeline(file.file, createWriteStream(path.join(userDir, fileName)));
    return { url: `/storage/support-attachments/${userId}/${fileName}` };
  });

  // Generic image upload (for ad creator etc.)
  app.post('/api/storage/images', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'Файл не найден' });
    const ext = file.filename?.split('.').pop() || 'png';
    const userDir = path.join(storageDir, 'images', userId);
    mkdirSync(userDir, { recursive: true });
    const fileName = `${crypto.randomUUID()}.${ext}`;
    await pipeline(file.file, createWriteStream(path.join(userDir, fileName)));
    return { url: `/storage/images/${userId}/${fileName}` };
  });
}
