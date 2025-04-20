import { APIGatewayProxyEventV2, Context, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { S3 } from "aws-sdk";
import crypto from "crypto";
import sharp from "sharp";
import Busboy from "busboy";
import { Readable } from "stream";

const s3 = new S3({ endpoint: process.env.AWS_ENDPOINT_URL }); // LocalStack なら env にセット
const BUCKET = process.env.BUCKET!;

/* ---------- 共通ユーティリティ ---------- */
const hashKey = (key: string) =>
  crypto.createHash("sha256").update(key).digest("hex");

const uploadToS3 = async (Key: string, Body: Buffer, ContentType: string) =>
  s3
    .putObject({ Bucket: BUCKET, Key, Body, ContentType })
    .promise();

/* ---------- POST /images ---------- */
export const upload = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  if (!event.body || !event.headers["content-type"]) {
    return { statusCode: 400, body: "Invalid body" };
  }

  const busboy = Busboy({
    headers: { "content-type": event.headers["content-type"] },
  });

  const files: Promise<string>[] = [];
  busboy.on("file", (fieldname, file, info) => {
    const chunks: Buffer[] = [];
    file.on("data", (d) => chunks.push(d));
    file.on("end", async () => {
      const buf = Buffer.concat(chunks);
      const id = crypto.randomUUID();
      const ext = info.filename.split(".").pop()!;
      const key = `original/${id}.${ext}`;
      await uploadToS3(key, buf, info.mimeType);
      files.push(Promise.resolve(id));
    });
  });

  busboy.end(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
  await Promise.all(files);

  return {
    statusCode: 201,
    body: JSON.stringify({ ids: await Promise.all(files) }),
  };
};

/* ---------- GET /images/{id}?w=200&h=200&format=webp ---------- */
export const get = async (
  event: APIGatewayProxyEventV2,
  _ctx: Context,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const id = event.pathParameters?.id;
  if (!id) return { statusCode: 400, body: "Missing id" };

  const w = Number(event.queryStringParameters?.w || 0);
  const h = Number(event.queryStringParameters?.h || 0);
  const format = (event.queryStringParameters?.format || "jpeg") as keyof sharp.FormatEnum;

  const variantKey = `variants/${id}/${hashKey(`${w}x${h}.${format}`)}.${format}`;

  try {
    // 既に変換済みがある？
    await s3.headObject({ Bucket: BUCKET, Key: variantKey }).promise();
  } catch {
    // 無ければ作る
    const [orig] = await s3
      .listObjectsV2({
        Bucket: BUCKET,
        Prefix: `original/${id}.`,
        MaxKeys: 1,
      })
      .promise()
      .then((r) => r.Contents || []);

    if (!orig) return { statusCode: 404, body: "Image not found" };

    const origBuf = await s3
      .getObject({ Bucket: BUCKET, Key: orig.Key! })
      .promise()
      .then((r) => r.Body as Buffer);

    const img = sharp(origBuf)
      .resize(w || undefined, h || undefined, { fit: "inside" })
      .toFormat(format);

    const outBuf = await img.toBuffer();
    await uploadToS3(
      variantKey,
      outBuf,
      `image/${format === "jpg" ? "jpeg" : format}`,
    );
  }

  // その場で返す
  const data = await s3
    .getObject({ Bucket: BUCKET, Key: variantKey })
    .promise();

  return {
    statusCode: 200,
    headers: { "Content-Type": data.ContentType ?? "application/octet-stream" },
    body: (data.Body as Buffer).toString("base64"),
    isBase64Encoded: true,
  };
};