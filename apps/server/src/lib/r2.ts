import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@pass/env/server";

function isR2Configured() {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME);
}

function getClient() {
  if (!isR2Configured()) throw new Error("Cloudflare R2 is not configured");
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/** Generate a pre-signed PUT URL valid for 5 minutes. */
export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

/** Delete an object from R2 by key. */
export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}

/** Build the public URL for an uploaded key (requires R2_PUBLIC_URL to be set). */
export function getPublicUrl(key: string): string {
  const base = env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) throw new Error("R2_PUBLIC_URL is not configured");
  return `${base}/${key}`;
}

export { isR2Configured };
