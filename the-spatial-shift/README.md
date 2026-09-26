# The Spatial Shift — website

Marketing site for **The Spatial Shift**, an interior design studio in Lahore.
Static HTML, CSS and JavaScript with no build step. It runs on any host: Netlify, Vercel, GitHub Pages or cPanel.

## Pages

| File | Page |
|---|---|
| `index.html` | Home: hero, studio intro, services, selected work, process, areas, testimonials |
| `studio.html` | About, principles, craft, team |
| `services.html` | Five services, engagement models, FAQ |
| `portfolio.html` | Filterable project grid |
| `projects/*.html` | Eight case studies (gallery, material palette, before/after, testimonial) |
| `contact.html` | Enquiry form and studio details |
| `404.html` | Not-found page (uses root paths, so serve the site from the domain root) |

`assets/css/styles.css` holds the design system (colour tokens, type scale, components).
`assets/js/main.js` holds all interactions and motion.

## Preview

Double-click `index.html`, or serve the folder with any static server.

## Motion and performance

- GSAP 3.15 (ScrollTrigger, SplitText) and Lenis 1.3 load from jsDelivr with SRI hashes.
- Heavy effects (the pinned horizontal process, parallax, the "View" cursor, magnetic buttons, service hover previews) run only on large screens with a mouse. Phones get lighter reveals and native scrolling.
- If a visitor has set their device to reduce motion, the site shows everything with no animation. If the scripts fail to load, content still shows after 4 seconds at most.
- Images are responsive (`srcset`, AVIF/WebP via Unsplash), lazy-loaded below the fold, with the hero image preloaded.

## Scroll video

The home page hero ("Spaces that shift") is a scroll-driven scene: it opens from an arch-shaped window to full screen while the room's light plays from morning to dusk.

The video is stored as an image sequence in `assets/media/light/` rather than as an `.mp4` file, because scrubbing a video file stutters, especially on phones:

| Folder | Frames | Used on |
|---|---|---|
| `light/d/` | 80 × 1280×720 WebP (about 4MB) | tablets and desktops |
| `light/m/` | 64 × 460×720 WebP, centre crop (about 1.5MB) | phones |

Frames load coarse-to-fine, so scrubbing works almost immediately.
Visitors who have turned on reduced motion get a still golden-hour frame with no pinning.
The same component (`.xp` in the CSS, `initExpand` in `main.js`) can be reused for another scene by adding a section with its own frame folder.

To swap in new footage, regenerate the frames (ffmpeg shown) and keep the counts in `data-frames-d` / `data-frames-m` in sync:

```bash
ffmpeg -i "Claude 1.mp4" -vf "fps=80/6.016,scale=1280:720" -c:v libwebp -quality 62 assets/media/light/d/%03d.webp
ffmpeg -i "Claude 1.mp4" -vf "fps=64/6.016,crop=460:720" -c:v libwebp -quality 70 assets/media/light/m/%03d.webp
```

(Replace `6.016` with the new clip's length in seconds.)

## Before launch: replace the placeholders

Search and replace these across all HTML files:

- [ ] **Phone**: `+92 3XX XXX XXXX` (shown) and `+920000000000` (tel: links)
- [ ] **WhatsApp**: `920000000000` (country code + number, no `+`)
- [ ] **Email**: `hello@thespatialshift.pk`
- [ ] **Address**: `Studio 00, Main Boulevard`, plus the Google Maps link
- [ ] **Domain**: `https://www.thespatialshift.pk` (canonical/OG tags, `sitemap.xml`, `robots.txt`)
- [ ] **Social links**: Instagram, Pinterest, Facebook and LinkedIn currently point to the sites' home pages
- [ ] **Stats**: "Est. 2014", 12+ years, 180+ spaces, 40+ craftspeople, 3 cities
- [ ] **Team**: names, roles and portraits on `studio.html`
- [ ] **Testimonials**: sample quotes on the home page and project pages. Replace them with real client words, or remove them.
- [ ] **Projects**: names, locations, sizes, years and copy are samples
- [ ] **Photos**: all images are Unsplash placeholders. Use the studio's own photography, and for the before/after slider use two photos taken from the same angle.

## Contact form

With no backend, the form validates the fields and then opens WhatsApp with the enquiry pre-filled.
To receive enquiries by email instead, create a form at Formspree (or similar) and paste its endpoint into
`data-endpoint=""` on the `<form>` in `contact.html`.
