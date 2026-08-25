import {
	DeleteObjectCommand,
	HeadBucketCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireEnv } from '@/src/shared/utils/require-env.util';

@Injectable()
export class StorageService {
	private readonly logger = new Logger(StorageService.name);

	private readonly client: S3Client;
	private readonly bucket: string;
	private readonly publicUrl: string;

	public constructor(private readonly configService: ConfigService) {
		this.client = new S3Client({
			forcePathStyle: true,
			region: requireEnv(configService, 'S3_REGION'),
			endpoint: requireEnv(configService, 'S3_ENDPOINT'),
			credentials: {
				accessKeyId: requireEnv(configService, 'S3_ACCESS_KEY_ID'),
				secretAccessKey: requireEnv(configService, 'S3_SECRET_ACCESS_KEY')
			}
		});

		this.bucket = requireEnv(configService, 'S3_BUCKET');
		this.publicUrl = requireEnv(configService, 'S3_PUBLIC_URL').replace(
			/\/$/,
			''
		);
	}

	public async upload(
		buffer: Buffer,
		key: string,
		mimetype: string
	): Promise<string> {
		try {
			await this.client.send(
				new PutObjectCommand({
					Bucket: this.bucket,
					Key: key,
					Body: buffer,
					ContentType: mimetype
				})
			);
		} catch (error) {
			this.logger.error(`Failed to upload ${key}`, error);

			throw new InternalServerErrorException('Failed to upload the file');
		}

		return key;
	}

	public async remove(key: string): Promise<void> {
		try {
			await this.client.send(
				new DeleteObjectCommand({
					Bucket: this.bucket,
					Key: key
				})
			);
		} catch (error) {
			this.logger.error(`Failed to remove ${key}`, error);

			throw new InternalServerErrorException('Failed to remove the file');
		}
	}

	public getPublicUrl(key: string): string {
		return `${this.publicUrl}/${this.bucket}/${key}`;
	}

	public async ping(): Promise<void> {
		await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
	}
}
