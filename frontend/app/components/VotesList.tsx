"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TimeRemaining } from "./TimeRemaining";

interface VoteEvent {
  publicKey: string;
  account: {
    title: string;
    choices: string[];
    totalVotes: number[];
    deadline: number;
  };
}

interface VotesListProps {
  events: VoteEvent[];
}

export function VotesList({ events }: VotesListProps) {
  const [filter, setFilter] = useState<"all" | "ongoing" | "ended">("all");
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>({});

  const now = Math.floor(Date.now() / 1000);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const deadline = Number(event.account.deadline);
      const isEnded = deadline < now;

      if (filter === "ongoing") return !isEnded;
      if (filter === "ended") return isEnded;
      return true;
    });
  }, [events, filter, now]);

  const toggleResults = (publicKey: string) => {
    setShowResults((prev) => ({
      ...prev,
      [publicKey]: !prev[publicKey],
    }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Filter Buttons */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setFilter("all")}
          className={`px-6 py-2 rounded-lg border-2 transition-all duration-200 ${
            filter === "all"
              ? "border-foreground bg-foreground text-background shadow-sm"
              : "border-foreground/30 text-foreground/70 hover:border-foreground hover:bg-foreground/15 hover:text-foreground"
          }`}
        >
          All Votes
        </button>
        <button
          onClick={() => setFilter("ongoing")}
          className={`px-6 py-2 rounded-lg border-2 transition-all duration-200 ${
            filter === "ongoing"
              ? "border-foreground bg-foreground text-background shadow-sm"
              : "border-foreground/30 text-foreground/70 hover:border-foreground hover:bg-foreground/15 hover:text-foreground"
          }`}
        >
          Ongoing
        </button>
        <button
          onClick={() => setFilter("ended")}
          className={`px-6 py-2 rounded-lg border-2 transition-all duration-200 ${
            filter === "ended"
              ? "border-foreground bg-foreground text-background shadow-sm"
              : "border-foreground/30 text-foreground/70 hover:border-foreground hover:bg-foreground/15 hover:text-foreground"
          }`}
        >
          Ended
        </button>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center text-foreground/60 py-12">
          <p className="mb-4">No {filter !== "all" ? filter : ""} votes found.</p>
          <Link
            href="/create-vote"
            className="inline-block px-6 py-2 border-2 border-foreground/30 hover:border-foreground hover:bg-foreground/15 text-foreground/80 hover:text-foreground rounded-lg transition-all duration-200"
          >
            Create First Vote
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const totalVotes = event.account.totalVotes.reduce(
              (a: any, b: any) => a + Number(b),
              0
            );
            const deadline = Number(event.account.deadline);
            const isEnded = deadline < now;

            const votes = event.account.totalVotes.map((v) => Number(v));
            const maxVotes = Math.max(...votes);
            const showingResults = showResults[event.publicKey] || false;

            return (
              <div
                key={event.publicKey}
                className="rounded-lg border border-foreground/10 bg-background p-6 shadow-sm hover:shadow-md transition-all"
              >
                {/* Event Info */}
                <div className="mb-4">
                  <div className="text-xs text-foreground/40 mb-2 truncate">
                    {event.publicKey.slice(0, 8)}...{event.publicKey.slice(-6)}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {event.account.title}
                  </h3>
                  <div className="text-sm">
                    <TimeRemaining deadline={event.account.deadline} />
                  </div>
                </div>

                {/* Results Display */}
                {showingResults ? (
                  <div className="space-y-3 mb-4">
                    {event.account.choices.map((choice, idx) => {
                      const voteCount = votes[idx];
                      const percentage =
                        totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                      const isWinner = voteCount === maxVotes && totalVotes > 0;
                      const isLoser = voteCount < maxVotes && totalVotes > 0;

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground">{choice}</span>
                            <span className="text-foreground/60">
                              {voteCount} ({Math.round(percentage)}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isWinner
                                  ? "bg-green-500"
                                  : isLoser
                                  ? "bg-red-500"
                                  : "bg-foreground/20"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-xs text-foreground/40 text-center pt-2">
                      Total votes: {totalVotes}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-center text-sm text-foreground/40 py-4">
                    {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isEnded && (
                    <button
                      onClick={() => toggleResults(event.publicKey)}
                      className="flex-1 px-4 py-2 border-2 border-foreground/30 hover:border-foreground hover:bg-foreground/15 text-foreground/80 hover:text-foreground rounded-lg transition-all duration-200 text-sm"
                    >
                      {showingResults ? "Hide Results" : "See Results"}
                    </button>
                  )}
                  <Link
                    href={`/vote/${event.publicKey}`}
                    className={`${
                      isEnded ? "flex-1" : "w-full"
                    } px-4 py-2 border-2 border-foreground/30 hover:border-foreground hover:bg-foreground/15 text-foreground/80 hover:text-foreground rounded-lg transition-all duration-200 text-sm text-center`}
                  >
                    {isEnded ? "View" : "Vote Now"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
