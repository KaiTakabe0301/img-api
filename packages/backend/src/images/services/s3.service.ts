import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import * as sharp from 'sharp';
import { FileUpload } from 'graphql-upload-minimal';

@Injectable()
export class S3Service {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      endpoint: process.env.AWS_ENDPOINT,
      s3ForcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    });
  }

  async uploadImage(
    file: FileUpload,
    userId: string,
  ): Promise<{
    originalUrl: string;
    thumbnailUrl: string;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const { createReadStream, filename, mimetype } = await file;
    const fileStream = createReadStream();
    const fileBuffer = await this.streamToBuffer(fileStream);
    const fileSize = fileBuffer.length;

    // Generate a unique filename
    const uniqueFilename = `${userId}/${uuid()}-${filename}`;
    const bucketName = process.env.BUCKET || 'img-api-bucket';

    // Upload original image
    await this.s3
      .upload({
        Bucket: bucketName,
        Key: `original/${uniqueFilename}`,
        Body: fileBuffer,
        ContentType: mimetype,
        ACL: 'public-read',
      })
      .promise();

    // Create thumbnail
    const thumbnailBuffer = await sharp(fileBuffer)
      .resize(200, 200, { fit: 'inside' })
      .toBuffer();

    // Upload thumbnail
    await this.s3
      .upload({
        Bucket: bucketName,
        Key: `thumbnail/${uniqueFilename}`,
        Body: thumbnailBuffer,
        ContentType: mimetype,
        ACL: 'public-read',
      })
      .promise();

    // Generate URLs
    const originalUrl = `https://${bucketName}.s3.amazonaws.com/original/${uniqueFilename}`;
    const thumbnailUrl = `https://${bucketName}.s3.amazonaws.com/thumbnail/${uniqueFilename}`;

    return {
      originalUrl,
      thumbnailUrl,
      filename,
      mimeType: mimetype,
      size: fileSize,
    };
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
