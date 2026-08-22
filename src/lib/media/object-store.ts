export type CompletedPart = { partNumber: number; etag: string };

export type ObjectHead = {
  size: number;
  contentType: string | null;
};

export type ObjectStore = {
  presignPut(key: string, mime: string, expiresSeconds: number): Promise<string>;
  presignGet(key: string, expiresSeconds: number): Promise<string>;
  createMultipart(key: string, mime: string): Promise<{ uploadId: string }>;
  presignPart(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresSeconds: number,
  ): Promise<string>;
  completeMultipart(
    key: string,
    uploadId: string,
    parts: CompletedPart[],
  ): Promise<void>;
  abortMultipart(key: string, uploadId: string): Promise<void>;
  head(key: string): Promise<ObjectHead | null>;
  copy(fromKey: string, toKey: string): Promise<void>;
  delete(key: string): Promise<void>;
};

export class MemoryObjectStore implements ObjectStore {
  objects = new Map<string, { body: Buffer; mime: string }>();
  multipart = new Map<
    string,
    { key: string; mime: string; parts: Map<number, Buffer> }
  >();
  copies: Array<{ from: string; to: string }> = [];
  deleted: string[] = [];
  putUrls: string[] = [];
  denied = false;

  async presignPut(key: string, mime: string): Promise<string> {
    if (this.denied) throw new Error("Unauthorized");
    const url = `https://s3.test/put/${key}?mime=${encodeURIComponent(mime)}`;
    this.putUrls.push(url);
    return url;
  }

  async presignGet(key: string): Promise<string> {
    if (this.denied) throw new Error("Unauthorized");
    return `https://s3.test/get/${key}?sig=1`;
  }

  async createMultipart(key: string, mime: string): Promise<{ uploadId: string }> {
    const uploadId = `mp-${crypto.randomUUID()}`;
    this.multipart.set(uploadId, { key, mime, parts: new Map() });
    return { uploadId };
  }

  async presignPart(
    key: string,
    uploadId: string,
    partNumber: number,
  ): Promise<string> {
    return `https://s3.test/part/${key}?uploadId=${uploadId}&part=${partNumber}`;
  }

  async completeMultipart(
    key: string,
    uploadId: string,
    parts: CompletedPart[],
  ): Promise<void> {
    const session = this.multipart.get(uploadId);
    if (!session) throw new Error("Unknown multipart upload");
    const body = Buffer.concat(
      parts
        .sort((a, b) => a.partNumber - b.partNumber)
        .map((part) => session.parts.get(part.partNumber) ?? Buffer.alloc(0)),
    );
    if (body.length > 0 || !this.objects.has(key)) {
      this.objects.set(key, { body, mime: session.mime });
    }
    this.multipart.delete(uploadId);
  }

  async abortMultipart(_key: string, uploadId: string): Promise<void> {
    this.multipart.delete(uploadId);
  }

  async head(key: string): Promise<ObjectHead | null> {
    const object = this.objects.get(key);
    if (!object) return null;
    return { size: object.body.length, contentType: object.mime };
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    const object = this.objects.get(fromKey);
    if (!object) throw new Error("Missing source object");
    this.objects.set(toKey, { ...object });
    this.copies.push({ from: fromKey, to: toKey });
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
    this.deleted.push(key);
  }

  putObject(key: string, body: Buffer, mime: string) {
    this.objects.set(key, { body, mime });
  }
}
