// NOTE: Before using this service, install the Supabase client:
//   cd BE_readabook && npm install @supabase/supabase-js
//
// Required environment variables (add to .env and BE_readabook/CLAUDE.md):
//   SUPABASE_URL         — Supabase project API URL
//   SUPABASE_SERVICE_KEY — Service role key (never sent to FE)

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'story-assets';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_KEY');

    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables',
      );
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Upload a file to the story-assets bucket.
   * Upserts (overwrites) if the path already exists.
   * @returns The public URL for the uploaded file
   */
  async upload(path: string, buffer: Buffer, mimeType: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to upload file to storage: ${error.message}`,
      );
    }

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Delete a file from the story-assets bucket.
   * Silently ignores "not found" errors — caller decides whether to re-throw.
   */
  async delete(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      // Log but do not throw — deletion of old assets is best-effort
      console.warn(`StorageService.delete: ${error.message} (path: ${path})`);
    }
  }
}
