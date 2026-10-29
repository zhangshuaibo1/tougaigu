# Art direction — v16 painted station

## Goal

Give the original game a more carefully finished, dimensional storybook appearance: readable silhouettes, crafted materials, restrained surface detail, atmospheric depth, and warm light that guides the eye. The user's quality references are established polished family games; their characters, logos, UI, and recognizable compositions are not reused.

The first asset is a decorative painting for 苔灯站台. Existing code continues to own the player, soul, platforms, collisions, collectibles, lamps, camera, and interaction affordances. The painting must never communicate a new traversable surface or collectible.

## Asset and provenance

- Preserved original: `docs/art/station-painted-original.png`
- Production asset: `dist/assets/station-painted-v16.webp` (quality 94 WebP, 266,328 bytes; same 2172 × 724 dimensions).
- Production SHA-256: `51406de059d3d092b0bf7c8f80f285f82dcc7fb17bcfbd77b5fcd000bb888fba`.
- Created: 2026-10-28
- Source: the built-in `image_gen.imagegen` tool, one new generation with no input or reference image.
- Generation mode: built-in tool only; no CLI or separate API request.
- Background: opaque.
- Native output: **2172 × 724 pixels**, exactly **3:1**, RGB PNG.
- Size: **1,972,511 bytes**.
- SHA-256: `4cd0c858df8efcd98ab219f44437c990b4ffad74c0a20ffd5f2ec07cc4b717c8`.
- Original generated filename: `exec-bd25f9d2-6d52-4662-947f-5bc7ae3d249d.png`.
- The prompt requested 3072 × 1024 as a target. The built-in tool returned the native dimensions above; the project copy is unchanged and has not been upscaled, cropped, recolored, or otherwise edited.
- The generated image was displayed directly from the tool result, visually inspected, and copied into the repository for use as a project asset. No extra variant was generated.

## Visual review and integration notes

The panorama has a quiet blue upper sky, a layered middle-distance station with an iron canopy and clock, amber windows, a smaller ticket kiosk, distant trees and buildings, and a subdued blue foreground. It contains no playable characters, branded elements, or interface. Its architectural lamps belong to the scenery; gameplay lamps must remain visibly distinct and be drawn by the engine.

Preserve the picture's aspect ratio. Keep architecture behind gameplay and use the calm sky and lower shadow as breathing room for the existing HUD and foreground. Do not promote painted steps, railings, or station edges into collision geometry. Check desktop and actual phone Canvas sizes after integration: readable characters, existing lamps and targets, HUD contrast, and sufficient breathing room around touch controls take priority over displaying every painted detail.

The original was recovered from the previous local v15 artwork checkpoint; it was not present in the published v15. The production WebP is 86.5% smaller than the original PNG, without resizing or altering the composition. Canvas adds the two actual poem-lamp window responses and interactive foreground. It falls back to the published v15 procedural station if loading or drawing fails. Actual validation is recorded separately in QA-v16.md; this provenance record does not stand in for browser verification.

## Exact generation prompt

```text
Use case: illustration-story.
Asset type: a production-ready, decorative panoramic background layer for an original side-scrolling 2D platform-adventure game called Moss Lantern Station. Create one new original image, approximately 3:1 landscape, target 3072 x 1024 pixels.
Primary request: high-end hand-painted family-friendly storybook game scenery with rich dimensional stylized shapes and a premium casual-game finish. The original game follows a friendly small skull postal traveler and a mint-colored soul; this image contains only their world, no characters, and must feel inviting rather than frightening.
Scene: an old whimsical railway station at deep blue and teal dusk. Gracefully curved iron station canopy, a thoughtfully designed clock, a gently crooked ticket kiosk farther back, distant trees and tiny warm windows. Architecture lives primarily in the middle distance. Use a coherent wide scenic composition with soft layered depth and strong readable silhouettes.
Materials and lighting: carefully lit weathered enamel, polished brass accents, warm wood, soft moss and subtly painted stone. Atmospheric teal and deep blue shadows balanced by amber window light. Touchable crafted surfaces, selective fine detail, pleasing rounded forms, delicate edge lighting and soft ambient depth; professional, refined game-art quality rather than flat vector art or a loose sketch.
Composition: the upper quarter is calm dark blue sky with very low detail, reserved for a separately rendered HUD. The lower third is subdued open breathing room with quiet, low-contrast shadow and haze so gameplay objects and a player can be overlaid clearly. Spread the station environment across the panoramic width, with layered background trees and warm windows providing rhythm. Keep all important architecture in the middle distance; avoid large objects intruding into the foreground. The background is decoration; all playable ground, platforms and interactions will be drawn separately in code.
Constraints: no text or letters anywhere, no typography, no UI, no borders, no watermark, no logos, no franchise references or recognizable borrowed characters, no playable characters, no animals, no skeletons, no skull imagery, no horror. No foreground platforms, no foreground tracks or barriers that resemble collision surfaces, no collectible-looking floating or glowing objects, no bright points in the gameplay breathing room. Deliver only the original painted panorama.
```
