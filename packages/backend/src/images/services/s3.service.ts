import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import FormData from "form-data";

// FileUpload型を直接定義
interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => NodeJS.ReadableStream;
}

@Injectable()
export class S3Service {
  private apiGatewayUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.apiGatewayUrl = process.env.API_GATEWAY_URL || "http://localhost:4566/restapis/img-api/local/_user_request_";
  }

  async uploadImage(
    file: FileUpload,
    userId: string
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

    // Create form data
    const formData = new FormData();
    formData.append("file", fileBuffer, {
      filename,
      contentType: mimetype,
    });

    try {
      // Send request to API Gateway using HttpService
      const response = await lastValueFrom(
        this.httpService.post(`${this.apiGatewayUrl}/images`, formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${process.env.JWT_SECRET}`, // JWT token for authentication
          },
        })
      );

      const responseData = response.data as {
        images: Array<{
          id: string;
          filename: string;
          originalUrl: string;
          thumbnailUrl: string;
          mimeType: string;
          size: number;
        }>
      };

      // API Gateway returns an array of images, we take the first one
      const image = responseData.images[0];

      return {
        originalUrl: image.originalUrl,
        thumbnailUrl: image.thumbnailUrl,
        filename: image.filename,
        mimeType: image.mimeType,
        size: image.size,
      };
    } catch (error) {
      console.error("Error uploading image via API Gateway:", error);
      throw new HttpException(
        "Failed to upload image via API Gateway",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }
}
