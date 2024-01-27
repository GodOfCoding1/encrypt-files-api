import * as crypto from "crypto";
import * as fs from "fs";

const algorithm = "aes-256-ctr";
const privateKeyPath = "keys/private.pem";
const publicKeyPath = "keys/public.pem";
const AESKeyPath = "keys/public.key";
const PADDING = 16;

export const generateLocalKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
  });
  fs.writeFileSync("keys/public.pem", publicKey);
  fs.writeFileSync("keys/private.pem", privateKey);
  console.log("loaded keys to pem file in keys folder");
};
const generateAesKey = (pass) =>
  crypto.createHash("sha256").update(pass).digest("base64").substr(0, 32);

const generateRandomPassword = () => crypto.randomBytes(20).toString("hex");

const aesEncrypt = (buffer, key) => {
  // Create an initialization vector
  const iv = crypto.randomBytes(PADDING);
  // Create a new cipher using the algorithm, key, and iv
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  // Create the new (encrypted) buffer
  const result = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
  return result;
};

export const aesDecrypt = (encrypted, key) => {
  // Get the iv: the first 16 bytes
  const iv = encrypted.slice(0, PADDING);
  // Get the rest
  encrypted = encrypted.slice(PADDING);
  // Create a decipher
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  // Actually decrypt it
  const result = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return result;
};

const encryptPrivateKey = async (password) => {
  //encrypts generated local private key with aes
  const key = generateAesKey(password);
  const fileBuffer = await fs.promises.readFile(privateKeyPath);
  const encryptedBuffer = aesEncrypt(fileBuffer, key);
  fs.writeFileSync(privateKeyPath, encryptedBuffer);
};

const decryptPrivateKey = async (password) => {
  const key = generateAesKey(password);
  const fileBuffer = await fs.promises.readFile(privateKeyPath);
  const privateKey = aesDecrypt(fileBuffer, key).toString("utf8");
  return privateKey; //returns text of decrypted private key
};

const encryptWithPublicKey = (buffer) => {
  const publicKey = fs.readFileSync(publicKeyPath, "utf8");
  return crypto.publicEncrypt(publicKey, buffer); //returns buffer
};

const decryptBufferWithPrivateKey = async (buffer, password) => {
  try {
    const privateKey = await decryptPrivateKey(password);
    return crypto.privateDecrypt(privateKey, buffer); //returns buffer
  } catch (error) {
    console.log(error);
  }
};

export const encryptImageBuffer = (buffer) => {
  const password = generateRandomPassword();
  return {
    buffer: aesEncrypt(buffer, generateAesKey(password)),
    encryptedHash: encryptWithPublicKey(password),
  };
};

export const decryptImageBuffer = async (buffer, encryptedHash, password) => {
  const passwordOfImage = await decryptBufferWithPrivateKey(
    encryptedHash,
    password
  );
  return aesDecrypt(buffer, generateAesKey(passwordOfImage));
};