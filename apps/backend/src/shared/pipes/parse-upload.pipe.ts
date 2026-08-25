import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { FileUpload } from 'graphql-upload-ts';
import convert from 'heic-convert';
import sharp from 'sharp';

import type { UploadedImage } from '@/src/shared/types/upload.types';

export interface ParseUploadOptions {
	maxSize: number;
	formats: (keyof sharp.FormatEnum)[];
}

export class ParseUploadPipe
	implements PipeTransform<Promise<FileUpload>, Promise<UploadedImage>>
{
	public constructor(private readonly options: ParseUploadOptions) {}

	public async transform(value: Promise<FileUpload>): Promise<UploadedImage> {
		const { createReadStream } = await value;

		const stream = createReadStream();
		const chunks: Buffer[] = [];
		let size = 0;

		for await (const chunk of stream) {
			size += (chunk as Buffer).length;

			if (size > this.options.maxSize) {
				stream.destroy();

				throw new BadRequestException(
					`The file must be under ${Math.round(this.options.maxSize / 1024 / 1024)} MB.`
				);
			}

			chunks.push(chunk as Buffer);
		}

		let buffer = Buffer.concat(chunks);
		let metadata: sharp.Metadata;

		try {
			metadata = await sharp(buffer).metadata();
		} catch {
			throw new BadRequestException('The file is not a valid image.');
		}

		const { compression } = metadata;
		let format = metadata.format;

		if (!format || !this.options.formats.includes(format)) {
			throw new BadRequestException(
				`Unsupported image format. Use ${this.options.formats.join(', ')}.`
			);
		}

		if (format === 'heif' && compression === 'hevc') {
			try {
				buffer = Buffer.from(
					await convert({ buffer, format: 'JPEG', quality: 1 })
				);
			} catch {
				throw new BadRequestException('The image could not be decoded.');
			}

			format = 'jpeg';
		}

		return {
			buffer,
			format,
			animated: format === 'gif' || format === 'webp'
		};
	}
}
