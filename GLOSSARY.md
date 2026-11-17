# Photos

The photography portfolio that lives inside the main portfolio application (mounted at `/apps/photos/*`, mirroring StarSync). A public, view-only gallery where the owner can privately curate images, their tags, and their order.

## Language

**Photo**:
A single uploaded image together with its metadata (dimensions, orientation, tags, caption, alt text, and position). The unit everything else is organized around.
_Avoid_: Image (reserve "image" for the raw picture file/asset), Picture, Shot

**Owner**:
An authenticated person who may curate Photos — upload, tag, reorder, and delete. Today there is exactly one Owner; the model is kept general so more can be added later.
_Avoid_: Admin, User (there is no public "user" role)

**Tag**:
A freely-chosen label from a single shared vocabulary that can be applied to any number of Photos; a Photo may carry any number of Tags. Tags are emergent (created by first use) and leave the vocabulary when no Photo carries them.
_Avoid_: Category, Label, Keyword

**Orientation**:
A Photo's shape, derived from its dimensions rather than stored as a fixed choice. One of Landscape, Portrait, or Square.
_Avoid_: Aspect, Format, Layout

**Landscape**:
An Orientation where width is greater than height (outside the Square tolerance).

**Portrait**:
An Orientation where height is greater than width (outside the Square tolerance). The UI may label this "Vertical," but Portrait is the canonical term.
_Avoid_: Vertical (as the canonical term), Tall

**Square**:
An Orientation where width and height are equal within a small tolerance (~2%), so a near-square photo still reads as Square.

**Master Order**:
The single canonical sequence of all Photos. Filtering hides non-matching Photos but never resequences the rest; the filtered view always shows its subset in Master Order. Only the Owner changes it, by reordering in Edit Mode.
_Avoid_: Sort order, Ranking
