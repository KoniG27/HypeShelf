"use client";

import {
  useAuth,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const GENRE_SEED = ["action", "comedy", "drama", "horror", "thriller"];

export default function AppPage() {
  return (
    <main className="page">
      <section className="container stack-lg">
        <SignedOut>
          <section className="panel stack-md">
            <h1 className="title">Sign in required</h1>
            <p className="subtitle">
              You need an account to add and manage recommendations.
            </p>
            <div className="row">
              <SignInButton mode="modal">
                <button className="btn-primary" type="button">
                  Sign in
                </button>
              </SignInButton>
              <Link className="btn-ghost" href="/">
                Back to public page
              </Link>
            </div>
          </section>
        </SignedOut>
        <SignedIn>
          <AppContent />
        </SignedIn>
      </section>
    </main>
  );
}

function AppContent() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const [genreFilter, setGenreFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [link, setLink] = useState("");
  const [blurb, setBlurb] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"recommendations"> | null>(
    null,
  );
  const [togglingId, setTogglingId] = useState<Id<"recommendations"> | null>(
    null,
  );
  const hasSyncedProfile = useRef(false);

  const bootstrapMe = useMutation(api.users.getOrCreateMe);
  const create = useMutation(api.recommendations.create);
  const remove = useMutation(api.recommendations.deleteRecommendation);
  const setStaffPick = useMutation(api.recommendations.setStaffPick);

  const me = useQuery(api.users.me);
  const recommendations = useQuery(api.recommendations.listAll, {
    genre: genreFilter === "all" ? undefined : genreFilter,
  });

  useEffect(() => {
    if (!isUserLoaded || !isSignedIn || hasSyncedProfile.current) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        // Sync the app profile once after auth is ready (handles role bootstrap too).
        void bootstrapMe().catch(() => {
          // Clerk/Convex token propagation can be briefly eventual right after sign-in.
          // The effect will run again on auth/query state changes.
        });
        hasSyncedProfile.current = true;
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bootstrapMe, isSignedIn, isUserLoaded]);

  const genres = useMemo(() => {
    const fromData = (recommendations ?? []).map((rec) => rec.genre);
    const merged = new Set([...GENRE_SEED, ...fromData]);
    return ["all", ...Array.from(merged).sort()];
  }, [recommendations]);

  const isAdmin = me?.role === "admin";
  const currentUserId = user?.id;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);
    try {
      await create({ title, genre, link, blurb });
      setTitle("");
      setGenre("");
      setLink("");
      setBlurb("");
      setMessage("Recommendation added.");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not save.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete(recommendationId: Id<"recommendations">) {
    setError(null);
    setMessage(null);
    const confirmed = window.confirm(
      "Delete this recommendation? This action cannot be undone.",
    );
    if (!confirmed) return;
    try {
      setDeletingId(recommendationId);
      await remove({ recommendationId });
      setMessage("Recommendation deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Could not delete.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function onToggleStaffPick(
    recommendationId: Id<"recommendations">,
    value: boolean,
  ) {
    setError(null);
    setMessage(null);
    try {
      setTogglingId(recommendationId);
      await setStaffPick({ recommendationId, value });
      setMessage(value ? "Staff Pick updated." : "Staff Pick removed.");
    } catch (staffPickError) {
      setError(
        staffPickError instanceof Error
          ? staffPickError.message
          : "Could not update staff pick.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <header className="panel row-between">
        <div>
          <p className="eyebrow">HypeShelf</p>
          <h1 className="title">Recommendations app</h1>
          <p className="subtitle">
            Signed in as {me?.name ?? user?.fullName ?? "User"} ({me?.role ?? "user"})
          </p>
        </div>
        <UserButton />
      </header>

      <section className="panel">
        <h2 className="section-title">Add recommendation</h2>
        <form className="form stack-sm" onSubmit={onSubmit}>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            maxLength={120}
            required
            disabled={isSaving}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <label htmlFor="genre">Genre</label>
          <input
            id="genre"
            maxLength={32}
            required
            disabled={isSaving}
            value={genre}
            placeholder="horror, action, comedy..."
            onChange={(event) => setGenre(event.target.value)}
          />

          <label htmlFor="link">Link</label>
          <input
            id="link"
            type="url"
            required
            disabled={isSaving}
            value={link}
            onChange={(event) => setLink(event.target.value)}
          />

          <label htmlFor="blurb">Short blurb</label>
          <textarea
            id="blurb"
            maxLength={240}
            required
            disabled={isSaving}
            rows={3}
            value={blurb}
            onChange={(event) => setBlurb(event.target.value)}
          />
          <small className="hint">
            {blurb.length}/240 characters. Keep it short and useful.
          </small>

          <div className="row">
            <button
              aria-label="Add recommendation"
              className="btn-primary"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Add recommendation"}
            </button>
            <Link className="btn-ghost" href="/">
              View public page
            </Link>
          </div>
        </form>
        <div aria-live="polite" className="status-stack">
          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </div>
      </section>

      <section className="panel stack-sm">
        <div className="row-between">
          <h2 className="section-title">All recommendations</h2>
          <label className="filter">
            <span>Filter by genre</span>
            <select
              aria-label="Filter recommendations by genre"
              value={genreFilter}
              onChange={(event) => setGenreFilter(event.target.value)}
            >
              {genres.map((genreOption) => (
                <option key={genreOption} value={genreOption}>
                  {genreOption}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ul className="list">
          {(recommendations ?? []).map((rec) => {
            const isOwner = rec.userId === currentUserId;
            // UI visibility is convenience only; server still enforces authorization.
            const canDelete = isAdmin || isOwner;
            return (
              <li className="list-item" key={rec._id}>
                <div className="item-head">
                  <a href={rec.link} target="_blank" rel="noopener noreferrer">
                    {rec.title}
                  </a>
                  <div className="row">
                    <span className="badge">{rec.genre}</span>
                    {rec.staffPick ? <span className="badge pick">Staff Pick</span> : null}
                  </div>
                </div>
                <p>{rec.blurb}</p>
                <small>by {rec.userName}</small>
                <div className="row">
                  {canDelete ? (
                    <button
                      className="btn-ghost"
                      type="button"
                      disabled={deletingId === rec._id}
                      onClick={() => onDelete(rec._id)}
                    >
                      {deletingId === rec._id ? "Deleting..." : "Delete"}
                    </button>
                  ) : null}
                  {isAdmin ? (
                    <button
                      className="btn-ghost"
                      type="button"
                      disabled={togglingId === rec._id}
                      onClick={() => onToggleStaffPick(rec._id, !rec.staffPick)}
                    >
                      {togglingId === rec._id
                        ? "Updating..."
                        : rec.staffPick
                          ? "Remove Staff Pick"
                          : "Mark as Staff Pick"}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
          {recommendations?.length === 0 ? (
            <li className="empty">No recommendations match this filter.</li>
          ) : null}
          {recommendations === undefined ? (
            <li className="empty">Loading recommendations...</li>
          ) : null}
        </ul>
      </section>
    </>
  );
}
