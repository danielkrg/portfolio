import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

/**
 * A Photo as served by the public API. Dimensions are carried raw so the client
 * can keep true aspect ratios and derive Orientation; Master Order is `position`.
 */
export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  tags: string[];
  caption: string | null;
  alt: string | null;
  position: number;
}

/**
 * A processed image ready to become a new Photo. The bytes have already been
 * downscaled and EXIF-stripped in the browser (issue #8); the server only
 * relays them to Cloudinary and seeds their place in Master Order.
 */
export interface UploadInput {
  /** The processed image bytes (a web-friendly JPEG/WebP; never raw HEIC). */
  data: Buffer;
  /**
   * The Master Order `position` to seed this Photo at. New uploads sort ahead
   * of existing Photos (newest-first) until the Owner reorders; see the route.
   */
  position: number;
}

/**
 * The single seam through which the rest of the server reaches Cloudinary
 * (ADR-0001). Server code depends on this interface; tests fake it.
 */
export interface PhotoGateway {
  listPhotos(): Promise<Photo[]>;
  /**
   * Permanently remove a Photo's underlying Cloudinary asset by its public_id.
   * Idempotent: deleting an already-gone asset resolves rather than throwing.
   */
  deletePhoto(publicId: string): Promise<void>;
  /**
   * Upload processed image bytes as a new Photo under the Owner's asset folder,
   * returning it with the width/height Cloudinary derived — the dimensions the
   * client reads Orientation from (GLOSSARY: Orientation).
   */
  uploadPhoto(input: UploadInput): Promise<Photo>;
}

// Owner-namespaced asset folder (ADR-0002: photos/<userId>/…, single user `me`
// for now). This is a Cloudinary *asset folder*, not a public_id prefix: the
// account uses dynamic folders, where an asset's public_id is independent of the
// folder it lives in (a Media-Library upload to photos/me keeps a bare public_id
// like "DSCF6913"), so we list by asset_folder, not by public_id prefix.
const OWNER_FOLDER = 'photos/me';

// Unpositioned Photos sort after positioned ones, deterministically by id.
const UNSET_POSITION = Number.MAX_SAFE_INTEGER;

// Shape of the Cloudinary Admin API resources we consume.
interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  tags?: string[];
  context?: { custom?: Record<string, string> };
}

let configured = false;

// Configure the SDK lazily (at first call), after dotenv has populated env.
function ensureConfigured(): void {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

function toPhoto(resource: CloudinaryResource): Photo {
  const custom = resource.context?.custom ?? {};
  const rawPosition = custom.position;
  return {
    id: resource.public_id,
    url: resource.secure_url,
    thumbnailUrl: cloudinary.url(resource.public_id, {
      secure: true,
      // Larger + higher quality than a true thumbnail: the grid trades a longer
      // initial load for images that look sharp without opening the viewer.
      transformation: [{ width: 1600, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
    }),
    width: resource.width,
    height: resource.height,
    tags: resource.tags ?? [],
    caption: custom.caption ?? null,
    alt: custom.alt ?? null,
    position: rawPosition != null && rawPosition !== '' ? Number(rawPosition) : UNSET_POSITION,
  };
}

function byMasterOrder(a: Photo, b: Photo): number {
  return a.position - b.position || a.id.localeCompare(b.id);
}

export const cloudinaryGateway: PhotoGateway = {
  async listPhotos(): Promise<Photo[]> {
    ensureConfigured();
    const result = await cloudinary.api.resources_by_asset_folder(OWNER_FOLDER, {
      max_results: 500,
      context: true,
      tags: true,
    });
    const resources = (result.resources ?? []) as unknown as CloudinaryResource[];
    return resources.map(toPhoto).sort(byMasterOrder);
  },

  async deletePhoto(publicId: string): Promise<void> {
    ensureConfigured();
    // destroy() addresses the asset by public_id. Under dynamic folders the
    // public_id is bare (decoupled from asset_folder), which is exactly the id
    // the list endpoint already hands the client, so no translation is needed.
    // `result: 'not found'` means it was already gone — treat that as success.
    const res = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    if (res.result !== 'ok' && res.result !== 'not found') {
      throw new Error(`Cloudinary destroy failed for ${publicId}: ${res.result}`);
    }
  },

  async uploadPhoto({ data, position }: UploadInput): Promise<Photo> {
    ensureConfigured();
    // Stream the buffer to Cloudinary. We target the Owner's *asset_folder* (not
    // a public_id prefix) because the account uses dynamic folders — the same
    // namespace listPhotos reads back from. `position` is seeded as contextual
    // metadata so the new Photo sorts into Master Order on the next list.
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          asset_folder: OWNER_FOLDER,
          resource_type: 'image',
          context: { position: String(position) },
        },
        (error, uploaded) => {
          if (uploaded) resolve(uploaded);
          else reject(error ?? new Error('Cloudinary upload returned no result'));
        },
      );
      stream.end(data);
    });

    // Build the Photo from the upload result (Cloudinary supplies width/height),
    // reusing the same mapper the list endpoint uses so the contract is identical.
    return toPhoto({
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      tags: result.tags ?? [],
      context: { custom: { position: String(position) } },
    });
  },
};
