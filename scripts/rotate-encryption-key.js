/**
 * Encryption key rotation script.
 *
 * Decrypts every conversation's title / turns.prompt / responses[].text /
 * best.text using OLD_ENCRYPTION_KEY, then re-encrypts them using
 * NEW_ENCRYPTION_KEY, and writes them back to MongoDB.
 *
 * This bypasses the Mongoose model's automatic encrypt/decrypt hooks on
 * purpose (those only know about a single "current" key via
 * process.env.ENCRYPTION_KEY) — it talks to the MongoDB driver directly
 * so it can use two different keys at once (old to read, new to write).
 *
 * USAGE
 * -----
 * 1. Generate a new key:
 *      node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * 2. Run in DRY RUN mode first (default) — this only reports what would
 *    change, it does NOT write anything:
 *      OLD_ENCRYPTION_KEY=<current key> NEW_ENCRYPTION_KEY=<new key> \
 *        MONGODB_URI=<your uri> node scripts/rotate-encryption-key.js
 *
 * 3. Once the dry run output looks right, actually apply it:
 *      OLD_ENCRYPTION_KEY=<current key> NEW_ENCRYPTION_KEY=<new key> \
 *        MONGODB_URI=<your uri> node scripts/rotate-encryption-key.js --apply
 *
 * 4. Only after the script finishes successfully, update ENCRYPTION_KEY
 *    in .env.local / your hosting provider to the new key, and restart
 *    the app.
 *
 * SAFETY
 * ------
 * - Take a MongoDB backup/snapshot before running with --apply.
 * - Keep OLD_ENCRYPTION_KEY around until you've confirmed the app works
 *   fine against the migrated data with the new key.
 */

const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "enc:v1:";

function loadKey(envVarName) {
  const raw = process.env[envVarName];
  if (!raw) {
    console.error(`Missing ${envVarName}. Set it as an environment variable.`);
    process.exit(1);
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    console.error(`${envVarName} must decode to 32 bytes (64 hex chars).`);
    process.exit(1);
  }
  return key;
}

function encryptWith(key, plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === "") return plaintext;
  if (typeof plaintext !== "string") return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext; // shouldn't happen post-decrypt, just in case

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + [iv, authTag, encrypted].map((b) => b.toString("base64")).join(":");
}

function decryptWith(key, value) {
  if (value === null || value === undefined || value === "") return value;
  if (typeof value !== "string") return value;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext, leave as-is

  const [, , ivB64, tagB64, dataB64] = value.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

function reencryptField(oldKey, newKey, value) {
  const plain = decryptWith(oldKey, value);
  return encryptWith(newKey, plain);
}

function reencryptTurns(oldKey, newKey, turns) {
  for (const turn of turns || []) {
    if (turn.prompt) turn.prompt = reencryptField(oldKey, newKey, turn.prompt);
    for (const r of turn.responses || []) {
      if (r.text) r.text = reencryptField(oldKey, newKey, r.text);
    }
    if (turn.best && turn.best.text) {
      turn.best.text = reencryptField(oldKey, newKey, turn.best.text);
    }
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const oldKey = loadKey("OLD_ENCRYPTION_KEY");
  const newKey = loadKey("NEW_ENCRYPTION_KEY");
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI.");
    process.exit(1);
  }

  console.log(apply ? "Running in APPLY mode — this will write changes." : "Running in DRY RUN mode — no changes will be written. Pass --apply to actually migrate.");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const collection = db.collection("conversations");

  const cursor = collection.find({});
  let count = 0;
  let errors = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    try {
      const newTitle = doc.title ? reencryptField(oldKey, newKey, doc.title) : doc.title;
      const turnsCopy = JSON.parse(JSON.stringify(doc.turns || []));
      reencryptTurns(oldKey, newKey, turnsCopy);

      if (apply) {
        await collection.updateOne(
          { _id: doc._id },
          { $set: { title: newTitle, turns: turnsCopy } }
        );
      }
      count++;
      if (count % 50 === 0) console.log(`Processed ${count} conversations...`);
    } catch (err) {
      errors++;
      console.error(`Failed to migrate conversation ${doc._id}:`, err.message);
    }
  }

  console.log(`Done. ${count} conversations processed, ${errors} errors.`);
  if (!apply) {
    console.log("This was a dry run — nothing was written. Re-run with --apply to migrate for real.");
  }

  await client.close();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});