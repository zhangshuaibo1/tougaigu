// A story line must never display the previous speaker's image beside the
// next speaker's words.  This controller only owns the image element; it
// does not own dialogue, rewards, saves or the story sequence.
export function createStoryPortraitController(image, frame) {
  let revision = 0;
  const pending = () => {
    image.classList.add('story-portrait-pending');
    frame.dataset.portrait = 'loading';
  };
  return {
    show(source, name) {
      const own = ++revision;
      // Hide the old decoded frame synchronously, before the new text changes.
      pending();
      image.alt = name;
      image.src = source;
      const matches = () => own === revision && image.getAttribute('src') === source;
      const reveal = async () => {
        try { if (typeof image.decode === 'function') await image.decode(); }
        catch { /* A broken resource leaves the readable story and placeholder. */ }
        if (!matches()) return;
        if (!image.complete || image.naturalWidth <= 0) {
          frame.dataset.portrait = 'unavailable';
          return;
        }
        image.classList.remove('story-portrait-pending');
        frame.dataset.portrait = 'ready';
      };
      image.addEventListener('load', reveal, { once: true });
      image.addEventListener('error', () => {
        if (matches()) frame.dataset.portrait = 'unavailable';
      }, { once: true });
      if (image.complete && image.naturalWidth > 0) void reveal();
    },
    cancel() {
      ++revision;
      pending();
    },
  };
}
