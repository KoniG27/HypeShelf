"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";

export function PublicPage() {
  const { isSignedIn, user } = useUser();
  // Public feed intentionally reads from Convex without requiring auth.
  const latest = useQuery(api.recommendations.listLatestPublic);

  return (
    <main className="page">
      <section className="container stack-lg">
        <header className="panel">
          <p className="eyebrow">HypeShelf</p>
          <h1 className="title">Collect and share the stuff you&apos;re hyped about.</h1>
          <p className="subtitle">
            A simple shared shelf for movie recommendations from friends.
          </p>
          <div className="row">
            {!isSignedIn ? (
              <SignInButton mode="modal">
                <button className="btn-primary" type="button">
                  Sign in to add yours
                </button>
              </SignInButton>
            ) : (
              <>
                {/* Session indicator for users already authenticated on the public page. */}
                <span className="badge">Signed in as {user?.fullName ?? "User"}</span>
                <UserButton />
              </>
            )}
            <Link className="btn-ghost" href="/app">
              Go to app
            </Link>
          </div>
        </header>

        <section className="panel">
          <h2 className="section-title">Latest public recommendations</h2>
          <ul className="list">
            {(latest ?? []).map((rec) => (
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
              </li>
            ))}
            {latest?.length === 0 ? (
              <li className="empty">
                No recommendations yet. Be the first one to add one from the app.
              </li>
            ) : null}
            {latest === undefined ? (
              <li className="empty">Loading recommendations...</li>
            ) : null}
          </ul>
        </section>
      </section>
    </main>
  );
}
