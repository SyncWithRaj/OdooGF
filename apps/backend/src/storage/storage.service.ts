import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: Minio.Client;
  public readonly bucketName = process.env.MINIO_BUCKET || 'dealflow-media';
  public readonly publicUrl = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';
  private isInitialized = false;

  async onModuleInit() {
    const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = parseInt(process.env.MINIO_PORT || '9000', 10);
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

    try {
      this.client = new Minio.Client({
        endPoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });

      // Ensure bucket exists
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Created MinIO bucket: ${this.bucketName}`);
      }

      // Configure read-only public policy for avatars and banners
      const publicReadPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };

      await this.client.setBucketPolicy(this.bucketName, JSON.stringify(publicReadPolicy));
      this.isInitialized = true;
      this.logger.log(`MinIO Storage ready on ${endPoint}:${port}, bucket '${this.bucketName}' configured.`);
    } catch (err: any) {
      this.logger.error(`Failed to initialize MinIO client: ${err.message}`);
    }
  }

  get isReady(): boolean {
    return this.isInitialized;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: 'avatars' | 'banners' | 'media' = 'media',
    ownerId?: string,
  ): Promise<{ url: string; objectName: string; size: number; mimeType: string }> {
    if (!this.client || !this.isInitialized) {
      throw new Error('MinIO storage service is not ready');
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueId = ownerId ? `${ownerId}-${Date.now()}` : crypto.randomUUID();
    const objectName = `${folder}/${uniqueId}${ext}`;

    const metaData = {
      'Content-Type': file.mimetype || 'application/octet-stream',
      'X-Original-Filename': encodeURIComponent(file.originalname),
    };

    await this.client.putObject(
      this.bucketName,
      objectName,
      file.buffer,
      file.size,
      metaData,
    );

    const fileUrl = `${this.publicUrl}/${this.bucketName}/${objectName}`;
    this.logger.log(`Uploaded ${folder} object to MinIO: ${objectName} (${file.size} bytes)`);

    return {
      url: fileUrl,
      objectName,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async deleteFile(objectName: string): Promise<void> {
    if (!this.client || !this.isInitialized || !objectName) return;

    try {
      // If full URL was passed, extract objectName
      let cleanObjectName = objectName;
      if (objectName.startsWith('http')) {
        const parts = objectName.split(`${this.bucketName}/`);
        if (parts.length > 1) {
          cleanObjectName = parts[1];
        }
      }

      await this.client.removeObject(this.bucketName, cleanObjectName);
      this.logger.log(`Deleted MinIO object: ${cleanObjectName}`);
    } catch (err: any) {
      this.logger.warn(`Failed to delete MinIO object ${objectName}: ${err.message}`);
    }
  }

  async healthCheck(): Promise<{ status: string; bucket: string; isReady: boolean }> {
    return {
      status: this.isInitialized ? 'connected' : 'disconnected',
      bucket: this.bucketName,
      isReady: this.isInitialized,
    };
  }
}
