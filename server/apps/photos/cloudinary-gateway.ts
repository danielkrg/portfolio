import { v2 as cloudinary } from 'cloudinary';

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
 * The single seam through which the rest of the server reaches Cloudinary
 * (ADR-0001). Server code depends on this interface; tests fake it.
 */
export interface PhotoGateway {
  listPhotos(): Promise<Photo[]>;
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
};
