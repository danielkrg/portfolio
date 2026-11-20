# Build the multi-user seam now, defer the multi-user machinery

The Photos app has one Owner today, but may later let other people post their own photos. Rather than hardcode a single-admin assumption, we build the *seams* for multiple owners now while deferring the actual machinery. Concretely: every asset is namespaced by owner in Cloudinary (`photos/<userId>/…`, with a single user `me` for now), the auth session carries a `userId` (not an `isAdmin` boolean), and write authorization is expressed as "the authenticated user owns this asset."

We explicitly do **not** build now: user registration/signup, a user database, per-user Cloudinary credentials, or public profile pages. Those arrive in a separate effort if and when multi-user is actually wanted.

We chose this because the costly-to-reverse parts of multi-user are the asset paths and the authorization model — retrofitting ownership onto a flat, single-owner asset namespace later would mean moving files and rewriting auth — whereas registration and user management are additive and cheap to postpone.

## Consequences

- A future reader will see `userId`-bearing sessions and owner-namespaced folders for what is currently a single-user app; this is deliberate, not over-engineering.
- Login is reached by navigating directly to an unlisted `/apps/photos/login`; there is no "admin" surface in the UI to unwind later.
