# Cloudinary as the system of record for the Photos app

The Photos app has no database and writes nothing to the server's disk. Cloudinary is the single source of truth: it hosts and serves the images, supplies each image's dimensions on upload (from which Orientation is derived), and stores all per-photo metadata — Tags via its native tags, and caption, alt text, and Master Order `position` via contextual metadata. The gallery fetches the photo list from Cloudinary's Admin API and filters/sorts client-side.

We chose this because the deployment target (Render) has an ephemeral filesystem that wipes local files on every redeploy, so a server-side SQLite/JSON store or on-disk image folder would not survive; Cloudinary's free tier covers a personal-scale library and removes the need to run or back up a database.

## Considered Options

- **Object storage (S3/R2) + a hosted database (Neon Postgres / Mongo Atlas)** for metadata — rejected for now as more moving parts than a solo portfolio warrants.
- **Server filesystem + SQLite/JSON** — rejected: does not persist on Render's ephemeral disk.

## Consequences

- Querying/listing is bounded by Cloudinary Admin API behavior and rate limits; acceptable at personal scale because the full list is fetched once and filtered client-side.
- Free tier caps images at 10 MB, so uploads are downscaled in the browser before sending.
- Migrating off Cloudinary later means moving both the assets and the metadata, not just swapping a storage client.
