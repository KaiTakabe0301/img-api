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

const s3 = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL,
  region: "us-east-1",
  forcePathStyle: true, // LocalStack
});

const BUCKET = process.env.BUCKET!;

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

/* ---------- POST /images ---------- */
export const upload = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  console.log("------------------------------------");
  console.log("upload", event);
  console.log("------------------------------------");

  // Content‑Type ヘッダーは大小が混在することがあるので両方見る
  const contentType =
    event.headers["content-type"] ?? event.headers["Content-Type"];

  if (!event.body || !contentType) {
    return { statusCode: 400, body: "Invalid body" };
  }

  const busboy = Busboy({ headers: { "content-type": contentType } });

  const ids: string[] = [];
  const filePromises: Promise<void>[] = [];

  busboy.on("file", (_fieldname, file, info) => {
    const chunks: Buffer[] = [];
    file.on("data", (d) => chunks.push(d));
    file.on("end", () => {
      const promise = (async () => {
        const buf = Buffer.concat(chunks);
        const id = crypto.randomUUID();
        const ext = info.filename.split(".").pop()!;
        const key = `original/${id}.${ext}`;
        await uploadToS3(key, buf, info.mimeType);
        ids.push(id);
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
    statusCode: 201,    body: JSON.stringify({ ids }),
  };
};

/* ---------- GET /images/{id}?w=200&h=200&format=webp ---------- */
export const get = async (
  event: APIGatewayProxyEventV2,
  _ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  const id = event.pathParameters?.id;
  if (!id) return { statusCode: 400, body: "Missing id" };

  const w = Number(event.queryStringParameters?.w || 0);
  const h = Number(event.queryStringParameters?.h || 0);
  const format = (event.queryStringParameters?.format ||
    "jpeg") as keyof sharp.FormatEnum;

  const variantKey = `variants/${id}/${hashKey(
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
        Prefix: `original/${id}.`,
        MaxKeys: 1,
      })
    );
    const orig = listRes.Contents?.[0];
    if (!orig) return { statusCode: 404, body: "Image not found" };

    const getRes = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: orig.Key! })
    );
    if (!getRes.Body) return { statusCode: 500, body: "Failed to read image" };

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

  // その場で返す
  const variantRes = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: variantKey })
  );
  if (!variantRes.Body)
    return { statusCode: 500, body: "Failed to read variant image" };

  const dataBuf = await streamToBuffer(variantRes.Body as Readable);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": variantRes.ContentType ?? "application/octet-stream",
    },
    body: dataBuf.toString("base64"),
    isBase64Encoded: true,
  };
};
