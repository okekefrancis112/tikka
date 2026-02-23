import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AllowedUploadMimeType,
  RAFFLE_IMAGE_BUCKET,
} from '../config/upload.config';
import { env } from '../config/env.config';

interface UploadRaffleImageInput {
  fileBuffer: Buffer;
  mimeType: AllowedUploadMimeType;
  raffleId: string;
  uploaderId: string;
}

interface UploadRaffleImageResult {
  url: string;
  path: string;
  bucket: string;
}

const MIME_TO_EXTENSION: Record<AllowedUploadMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class StorageService {
  private readonly client: SupabaseClient;

  constructor() {
    const { url, serviceRoleKey } = env.supabase;
    if (!url || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment',
      );
    }
    this.client = createClient(url, serviceRoleKey);
  }

  async uploadRaffleImage(
    input: UploadRaffleImageInput,
  ): Promise<UploadRaffleImageResult> {
    const extension = MIME_TO_EXTENSION[input.mimeType];
    const fileName = `${randomUUID()}.${extension}`;
    const raffleSegment = this.sanitizePathSegment(input.raffleId);
    const uploaderSegment = this.sanitizePathSegment(input.uploaderId);
    const path = `${raffleSegment}/${uploaderSegment}/${fileName}`;

    const { error } = await this.client.storage
      .from(RAFFLE_IMAGE_BUCKET)
      .upload(path, input.fileBuffer, {
        contentType: input.mimeType,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to upload image to storage: ${error.message}`,
      );
    }

    const { data } = this.client.storage
      .from(RAFFLE_IMAGE_BUCKET)
      .getPublicUrl(path);

    return {
      url: data.publicUrl,
      path,
      bucket: RAFFLE_IMAGE_BUCKET,
    };
  }

  private sanitizePathSegment(raw: string): string {
    const sanitized = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    return sanitized.length > 0 ? sanitized : 'unknown';
  }
}
