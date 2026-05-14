import { useCallback, useEffect, useState } from "react";
import { postJson } from "../api/client.js";

const UNSPLASH_API = "https://api.unsplash.com";

/**
 * @param {{ assistantText: string }} props
 */
export default function InlineImageResults({ assistantText }) {
  const [phase, setPhase] = useState("idle");
  const [photos, setPhotos] = useState([]);

  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY?.trim();

  useEffect(() => {
    const text = (assistantText || "").trim();
    if (!text || !key) {
      setPhase("idle");
      setPhotos([]);
      return;
    }

    let cancelled = false;
    setPhase("loading");
    setPhotos([]);

    (async () => {
      try {
        const intent = await postJson("/unsplash/intent", { text });
        if (cancelled) return;
        if (!intent.show_images || !intent.keyword) {
          setPhase("hidden");
          return;
        }
        const q = encodeURIComponent(intent.keyword);
        const res = await fetch(
          `${UNSPLASH_API}/search/photos?query=${q}&per_page=3&client_id=${encodeURIComponent(key)}`
        );
        if (!res.ok) {
          setPhase("hidden");
          return;
        }
        const data = await res.json();
        const list = (data.results || []).slice(0, 3);
        if (cancelled) return;
        if (!list.length) {
          setPhase("hidden");
          return;
        }
        setPhotos(list);
        setPhase("ready");
      } catch {
        if (!cancelled) setPhase("hidden");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assistantText, key]);

  const onPhotoActivate = useCallback(
    async (photo) => {
      const dl = photo?.links?.download_location;
      if (!dl || !key) return;
      try {
        await fetch(dl, {
          headers: { Authorization: `Client-ID ${key}` },
        });
      } catch {
        /* Unsplash download ping is best-effort */
      }
    },
    [key]
  );

  if (phase === "loading" && key) {
    return (
      <div className="inline-unsplash inline-unsplash--loading" aria-busy="true" aria-label="Loading related photos">
        <div className="inline-unsplash__row">
          <div className="inline-unsplash__skeleton" />
          <div className="inline-unsplash__skeleton" />
          <div className="inline-unsplash__skeleton" />
        </div>
      </div>
    );
  }

  if (phase !== "ready" || !photos.length || !key) {
    return null;
  }

  return (
    <div className="inline-unsplash" aria-label="Related photos">
      <div className="inline-unsplash__row">
        {photos.map((photo) => {
          const src = photo.urls?.small || photo.urls?.thumb || photo.urls?.regular;
          const name = photo.user?.name || "Photographer";
          const profileUrl = photo.user?.links?.html;
          const unsplashHome = "https://unsplash.com/?utm_source=rag_chat&utm_medium=referral";
          return (
            <figure key={photo.id} className="inline-unsplash__cell">
              <button
                type="button"
                className="inline-unsplash__thumb-wrap"
                onClick={() => onPhotoActivate(photo)}
                aria-label={`Photo by ${name}; trigger Unsplash download tracking`}
              >
                <img
                  className="inline-unsplash__img"
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </button>
              <figcaption className="inline-unsplash__caption">
                Photo by{" "}
                {profileUrl ? (
                  <a href={profileUrl} target="_blank" rel="noreferrer noopener">
                    {name}
                  </a>
                ) : (
                  name
                )}{" "}
                on{" "}
                <a href={unsplashHome} target="_blank" rel="noreferrer noopener">
                  Unsplash
                </a>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
