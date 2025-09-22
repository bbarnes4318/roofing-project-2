const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const getSpacesConfig = () => {
  const region = process.env.DO_SPACES_REGION;
  const endpoint = region ? `https://${region}.digitaloceanspaces.com` : process.env.DO_SPACES_ENDPOINT;
  return {
    region: region || 'us-east-1',
    endpoint,
    forcePathStyle: false,
    credentials: process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET ? {
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
    } : undefined,
  };
};

const getBucket = () => process.env.DO_SPACES_NAME;

let s3 = null;

const getS3 = () => {
  if (!s3) {
    s3 = new S3Client(getSpacesConfig());
  }
  return s3;
};

async function createPresignedPutUrl(key, contentType, expiresInSeconds = 900) {
  const Bucket = getBucket();
  if (!Bucket) throw new Error('DO_SPACES_NAME not configured');
  const s3 = getS3();
  const command = new PutObjectCommand({ Bucket, Key: key, ContentType: contentType, ACL: 'private' });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  return { uploadUrl, expiresAt };
}

async function getObjectPresignedUrl(key, expiresInSeconds = 900) {
  const Bucket = getBucket();
  if (!Bucket) throw new Error('DO_SPACES_NAME not configured');
  const s3 = getS3();
  const command = new GetObjectCommand({ Bucket, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  return url;
}

module.exports = {
  getS3,
  createPresignedPutUrl,
  getObjectPresignedUrl,
};
