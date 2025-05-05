import {
  APIGatewayProxyEventV2,
  Context,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import crypto from "crypto";
import sharp from "sharp";
import Busboy from "busboy";
import { Readable } from "stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize S3 client
const s3 = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL,
  region: "us-east-1",
  forcePathStyle: true, // LocalStack
});

const BUCKET = process.env.BUCKET!;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret";

/* ---------- 共通ユーティリティ ---------- */
const hashKey = (key: string) =>
  crypto.createHash("sha256").update(key).digest("hex");

const uploadToS3 = async (Key: string, Body: Buffer, ContentType: string) => {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key,
      Body,
      ContentType,
    })
  );
};

/**
 * Get the entire body of an S3 GetObject stream as a Buffer (Node.js runtime)
 */
const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.once("end", () => resolve(Buffer.concat(chunks)));
    stream.once("error", reject);
  });
};

/**
 * Extract user ID from JWT token
 */
const getUserIdFromToken = (event: APIGatewayProxyEventV2): string | null => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
};

/* ---------- POST /images ---------- */
export const upload = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  console.log("------------------------------------");
  console.log("upload", event);
  console.log("------------------------------------");

  // Verify user authentication
  const userId = getUserIdFromToken(event);
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // Content‑Type ヘッダーは大小が混在することがあるので両方見る
  const contentType =
    event.headers["content-type"] ?? event.headers["Content-Type"];

  if (!event.body || !contentType) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid body" }) };
  }

  const busboy = Busboy({ headers: { "content-type": contentType } });

  const imageResults: Array<{
    id: string;
    filename: string;
    originalUrl: string;
    thumbnailUrl: string;
    mimeType: string;
    size: number;
  }> = [];
  const filePromises: Promise<void>[] = [];

  busboy.on("file", (_fieldname, file, info) => {
    const chunks: Buffer[] = [];
    file.on("data", (d) => chunks.push(d));
    file.on("end", () => {
      const promise = (async () => {
        const buf = Buffer.concat(chunks);
        const id = crypto.randomUUID();
        const ext = info.filename.split(".").pop()!;
        const originalKey = `original/${userId}/${id}.${ext}`;
        const thumbnailKey = `thumbnail/${userId}/${id}.${ext}`;

        // Upload original image
        await uploadToS3(originalKey, buf, info.mimeType);

        // Create and upload thumbnail
        const thumbnailBuffer = await sharp(buf)
          .resize(200, 200, { fit: "inside" })
          .toBuffer();

        await uploadToS3(thumbnailKey, thumbnailBuffer, info.mimeType);

        // Generate URLs
        const originalUrl = `https://${BUCKET}.s3.amazonaws.com/${originalKey}`;
        const thumbnailUrl = `https://${BUCKET}.s3.amazonaws.com/${thumbnailKey}`;

        // Save image metadata to database
        await prisma.image.create({
          data: {
            id,
            filename: info.filename,
            originalUrl,
            thumbnailUrl,
            mimeType: info.mimeType,
            size: buf.length,
            userId,
          },
        });

        imageResults.push({
          id,
          filename: info.filename,
          originalUrl,
          thumbnailUrl,
          mimeType: info.mimeType,
          size: buf.length,
        });
      })();
      filePromises.push(promise);
    });
  });

  // ───── Lambda から渡ってくる body は
  // isBase64Encoded === true  … base64
  // isBase64Encoded === false … バイナリ(latin1)
  // として扱う
  const bodyBuf = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body, "latin1");

  // Busboy のパース完了を待ってから S3 アップロード待機
  await new Promise<void>((resolve, reject) => {
    busboy.on("finish", resolve);
    busboy.on("error", reject);
    busboy.end(bodyBuf);
  });

  await Promise.all(filePromises);

  return {
    statusCode: 201,
    body: JSON.stringify({ images: imageResults }),
  };
};

/* ---------- GET /images ---------- */
export const getImages = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  console.log("------------------------------------");
  console.log("getImages", event);
  console.log("------------------------------------");

  // Verify user authentication
  const userId = getUserIdFromToken(event);
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    // Get all images for the current user
    const images = await prisma.image.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ images }),
    };
  } catch (error) {
    console.error("Error fetching images:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch images" }),
    };
  }
};

/* ---------- GET /images/{id}?w=200&h=200&format=webp ---------- */
export const get = async (
  event: APIGatewayProxyEventV2,
  _ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  console.log("------------------------------------");
  console.log("get", event);
  console.log("------------------------------------");

  // Verify user authentication
  const userId = getUserIdFromToken(event);
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const id = event.pathParameters?.id;
  if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Missing id" }) };

  try {
    // Check if the image exists and belongs to the user
    const image = await prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      return { statusCode: 404, body: JSON.stringify({ error: "Image not found" }) };
    }

    // Check if the image belongs to the user
    if (image.userId !== userId) {
      return { statusCode: 403, body: JSON.stringify({ error: "You do not have permission to access this image" }) };
    }

    const w = Number(event.queryStringParameters?.w || 0);
    const h = Number(event.queryStringParameters?.h || 0);
    const format = (event.queryStringParameters?.format ||
      "jpeg") as keyof sharp.FormatEnum;

    const variantKey = `variants/${userId}/${id}/${hashKey(
      `${w}x${h}.${format}`
    )}.${format}`;

    try {
      // 既に変換済みがある？
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: variantKey }));
    } catch {
      // 無ければ作る
      const listRes = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: `original/${userId}/${id}.`,
          MaxKeys: 1,
        })
      );
      const orig = listRes.Contents?.[0];
      if (!orig) return { statusCode: 404, body: JSON.stringify({ error: "Image not found in S3" }) };

      const getRes = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: orig.Key! })
      );
      if (!getRes.Body) return { statusCode: 500, body: JSON.stringify({ error: "Failed to read image" }) };

      const origBuf = await streamToBuffer(getRes.Body as Readable);

      const img = sharp(origBuf)
        .resize(w || undefined, h || undefined, { fit: "inside" })
        .toFormat(format);

      const outBuf = await img.toBuffer();
      await uploadToS3(
        variantKey,
        outBuf,
        `image/${format === "jpg" ? "jpeg" : format}`
      );
    }

    // If JSON response is requested, return image metadata
    if (event.queryStringParameters?.response === "json") {
      return {
        statusCode: 200,
        body: JSON.stringify(image),
      };
    }

    // Otherwise, return the image data
    const variantRes = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: variantKey })
    );
    if (!variantRes.Body)
      return { statusCode: 500, body: JSON.stringify({ error: "Failed to read variant image" }) };

    const dataBuf = await streamToBuffer(variantRes.Body as Readable);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": variantRes.ContentType ?? "application/octet-stream",
      },
      body: dataBuf.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("Error fetching image:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch image" }),
    };
  }
};
