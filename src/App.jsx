import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

import { DEFAULT_WORDS } from "./data/defaultWords";

import {
  buildGamePlayers,
  getMaxImpostors,
  getTopVotedIds,
  getWinner,
  pickImpostorIds,
  pickRandomWords,
} from "./utils/gameLogic";

const STORAGE_KEY = "impostor-word-database-v1";
const THEME_KEY = "impostor-theme-v1";

function loadWords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return DEFAULT_WORDS;
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_WORDS;
    }

    return parsed;
  } catch {
    return DEFAULT_WORDS;
  }
}

function createPlayers(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index + 1}`,
    name: `Pemain ${index + 1}`,
    alive: true,
  }));
}

export default function App() {
  const [screen, setScreen] = useState("home");

  const [playerCount, setPlayerCount] = useState(6);
  const [impostorCount, setImpostorCount] = useState(1);

  const [setupPlayers, setSetupPlayers] = useState(
    createPlayers(6)
  );

  const [words, setWords] = useState(loadWords);

  const [gamePlayers, setGamePlayers] = useState([]);

  const [revealIndex, setRevealIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const [voterIndex, setVoterIndex] = useState(0);
  const [votes, setVotes] = useState({});

  const [voteCandidates, setVoteCandidates] = useState([]);

  const [eliminatedId, setEliminatedId] = useState(null);
  const [winner, setWinner] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);

    if (saved === "light") {
      return false;
    }

    return true;
  });

  const mainRef = useRef(null);

  /*
    ========================================================
    LENIS SMOOTH / VELOCITY SCROLL
    ========================================================
  */

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.88,
      touchMultiplier: 1.15,
      syncTouch: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const update = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
    };
  }, []);

  /*
    ========================================================
    GSAP SCROLL / VELOCITY PARALLAX
    ========================================================
  */

  useEffect(() => {
    if (!mainRef.current) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray("[data-reveal]").forEach((element) => {
        gsap.fromTo(
          element,
          { opacity: 0, y: 42 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 88%",
              once: true,
            },
          }
        );
      });

      gsap.fromTo(
        ".parallax-bg",
        { yPercent: -4, xPercent: 0, scale: 1.08, rotation: 0 },
        {
          yPercent: 24,
          xPercent: 2.5,
          scale: 1.16,
          rotation: 0.35,
          ease: "none",
          scrollTrigger: {
            trigger: mainRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.9,
          },
        }
      );

      gsap.to(".velocity-layer", {
        y: 55,
        rotate: 1.5,
        ease: "none",
        scrollTrigger: {
          trigger: ".home-screen",
          start: "top top",
          end: "bottom top",
          scrub: 1.1,
        },
      });
    }, mainRef);

    return () => ctx.revert();
  }, [screen]);

  /*
    ========================================================
    SAVE THEME
    ========================================================
  */

  useEffect(() => {
    localStorage.setItem(
      THEME_KEY,
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  /*
    ========================================================
    GSAP PAGE TRANSITION
    ========================================================
  */

  useEffect(() => {
    if (!mainRef.current) {
      return;
    }

    const elements =
      mainRef.current.querySelectorAll(".animate-in");

    if (!elements.length) {
      return;
    }

    gsap.killTweensOf(elements);

    gsap.fromTo(
      elements,
      {
        opacity: 0,
        y: 25,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.65,
        stagger: 0.06,
        ease: "power3.out",
      }
    );
  }, [screen]);

  const alivePlayers = useMemo(
    () =>
      gamePlayers.filter(
        (player) => player.alive
      ),
    [gamePlayers]
  );

  const maxImpostors =
    getMaxImpostors(playerCount);

  /*
    ========================================================
    PLAYER COUNT
    ========================================================
  */

  function changePlayerCount(count) {
    setPlayerCount(count);

    setImpostorCount((current) =>
      Math.min(
        current,
        getMaxImpostors(count)
      )
    );

    setSetupPlayers((current) => {
      const newPlayers = [...current];

      while (newPlayers.length < count) {
        const index = newPlayers.length;

        newPlayers.push({
          id: `player-${index + 1}`,
          name: `Pemain ${index + 1}`,
          alive: true,
        });
      }

      return newPlayers.slice(0, count);
    });
  }

  /*
    ========================================================
    PLAYER NAME
    ========================================================
  */

  function updatePlayerName(id, name) {
    setSetupPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? {
              ...player,
              name,
            }
          : player
      )
    );
  }

  /*
    ========================================================
    START GAME
    ========================================================
  */

  function startGame() {
    const cleanedPlayers =
      setupPlayers.map((player, index) => ({
        ...player,
        name:
          player.name.trim() ||
          `Pemain ${index + 1}`,
      }));

    const wordPair = pickRandomWords(words);

    const impostorIds =
      pickImpostorIds(
        cleanedPlayers,
        impostorCount
      );

    const preparedPlayers =
      buildGamePlayers(
        cleanedPlayers,
        impostorIds,
        wordPair
      );

    setGamePlayers(preparedPlayers);
    setSetupPlayers(cleanedPlayers);

    setRevealIndex(0);
    setRevealed(false);

    setVoterIndex(0);
    setVotes({});

    setVoteCandidates([]);
    setEliminatedId(null);
    setWinner(null);

    setScreen("reveal");
  }

  /*
    ========================================================
    REVEAL
    ========================================================
  */

  function finishReveal() {
    setRevealed(false);

    if (
      revealIndex <
      gamePlayers.length - 1
    ) {
      setRevealIndex(
        (current) => current + 1
      );
    } else {
      setRevealIndex(0);
      setScreen("discussion");
    }
  }

  /*
    ========================================================
    START VOTING
    ========================================================
  */

  function startVoting(
    candidates = alivePlayers
  ) {
    if (
      !candidates ||
      candidates.length === 0
    ) {
      return;
    }

    setVoteCandidates(candidates);
    setVotes({});
    setVoterIndex(0);

    setScreen("voting");
  }

  /*
    ========================================================
    CAST VOTE
    ========================================================
  */

  function castVote(targetId) {
    const voter =
      alivePlayers[voterIndex];

    if (!voter) {
      return;
    }

    const newVotes = {
      ...votes,
      [voter.id]: targetId,
    };

    setVotes(newVotes);

    if (
      voterIndex <
      alivePlayers.length - 1
    ) {
      setVoterIndex(
        (current) => current + 1
      );
    } else {
      resolveVotes(newVotes);
    }
  }

  /*
    ========================================================
    RESOLVE VOTES
    ========================================================
  */

  function resolveVotes(finalVotes) {
    const topIds =
      getTopVotedIds(finalVotes);

    if (topIds.length === 1) {
      eliminatePlayer(topIds[0]);
    } else {
      setVoteCandidates(
        alivePlayers.filter(
          (player) =>
            topIds.includes(player.id)
        )
      );

      setVotes({});
      setVoterIndex(0);

      setScreen("tie");
    }
  }

  /*
    ========================================================
    ELIMINATION
    ========================================================
  */

  function eliminatePlayer(playerId) {
    const nextPlayers =
      gamePlayers.map((player) =>
        player.id === playerId
          ? {
              ...player,
              alive: false,
            }
          : player
      );

    const nextWinner =
      getWinner(nextPlayers);

    setGamePlayers(nextPlayers);
    setEliminatedId(playerId);

    if (nextWinner) {
      setWinner(nextWinner);
    }

    setScreen("elimination");
  }

  /*
    ========================================================
    CONTINUE AFTER ELIMINATION
    ========================================================
  */

  function continueAfterElimination() {
    if (winner) {
      setScreen("result");
      return;
    }

    setVotes({});
    setVoterIndex(0);

    setScreen("discussion");
  }

  /*
    ========================================================
    SAVE WORDS
    ========================================================
  */

  function saveWords(nextWords) {
    setWords(nextWords);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nextWords)
    );
  }

  /*
    ========================================================
    HOME
    ========================================================
  */

  function resetToHome() {
    setGamePlayers([]);
    setRevealIndex(0);
    setRevealed(false);
    setVoterIndex(0);
    setVotes({});
    setVoteCandidates([]);
    setEliminatedId(null);
    setWinner(null);

    setScreen("home");
  }

  return (
    <div
      ref={mainRef}
      className={`app-shell ${
        darkMode
          ? "theme-dark"
          : "theme-light"
      }`}
    >
      <div className="parallax-bg" aria-hidden="true" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">

        <button
          type="button"
          className="brand"
          onClick={resetToHome}
        >
          <span className="brand-mark">
            ✦
          </span>

          <span>
            <strong>
              IMPOSTOR
            </strong>

            <small>
              WORD GAME
            </small>
          </span>
        </button>


        <div className="topbar-right">

          <div className="topbar-status">
            <span className="status-dot" />
            Local Game
          </div>


          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setDarkMode(
                (current) => !current
              )
            }
            aria-label="Toggle theme"
          >
            <span>
              {darkMode
                ? "☾"
                : "☀"}
            </span>

            <small>
              {darkMode
                ? "Dark"
                : "Light"}
            </small>
          </button>

        </div>

      </header>


      <main className="main-content">

        {screen === "home" && (
          <Home
            playerCount={playerCount}
            impostorCount={impostorCount}
            maxImpostors={maxImpostors}
            onPlayerCountChange={
              changePlayerCount
            }
            onImpostorCountChange={
              setImpostorCount
            }
            onStart={() =>
              setScreen("setup")
            }
            onWords={() =>
              setScreen("words")
            }
          />
        )}


        {screen === "setup" && (
          <Setup
            players={setupPlayers}
            onChangeName={
              updatePlayerName
            }
            onBack={() =>
              setScreen("home")
            }
            onStart={startGame}
          />
        )}


        {screen === "reveal" && (
          <Reveal
            players={gamePlayers}
            index={revealIndex}
            revealed={revealed}
            setRevealed={setRevealed}
            onNext={finishReveal}
          />
        )}


        {screen === "discussion" && (
          <Discussion
            players={alivePlayers}
            onVote={() =>
              startVoting(
                alivePlayers
              )
            }
          />
        )}


        {screen === "voting" && (
          <Voting
            players={alivePlayers}
            voterIndex={voterIndex}
            votes={votes}
            candidates={voteCandidates}
            onVote={castVote}
          />
        )}


        {screen === "tie" && (
          <Tie
            candidates={
              voteCandidates
            }
            onRevote={() =>
              startVoting(
                voteCandidates
              )
            }
          />
        )}


        {screen === "elimination" && (
          <Elimination
            players={gamePlayers}
            eliminatedId={
              eliminatedId
            }
            winner={winner}
            onContinue={
              continueAfterElimination
            }
          />
        )}


        {screen === "result" && (
          <Result
            winner={winner}
            players={gamePlayers}
            onAgain={startGame}
            onHome={resetToHome}
          />
        )}


        {screen === "words" && (
          <WordManager
            words={words}
            onSave={saveWords}
            onBack={() =>
              setScreen("home")
            }
          />
        )}

      </main>
    </div>
  );
}


/* =========================================================
   HOME
========================================================= */

function Home({
  playerCount,
  impostorCount,
  maxImpostors,
  onPlayerCountChange,
  onImpostorCountChange,
  onStart,
  onWords,
}) {
  return (
    <><section className="home-screen">

      <div className="home-left animate-in velocity-layer">

        <div className="eyebrow">
          SOCIAL DEDUCTION GAME
        </div>

        <h1 className="hero-title">
          Find the
          <br />
          <span>Impostor.</span>
        </h1>

        <p className="hero-description">
          Everyone gets a related word.
          One or more players don't.
          Talk, observe, vote — and find
          them before it's too late.
        </p>


        <div className="feature-row">

          <div className="feature-item">
            <span>01</span>

            <div>
              <strong>
                REVEAL
              </strong>

              <small>
                Private cards
              </small>
            </div>
          </div>


          <div className="feature-item">
            <span>02</span>

            <div>
              <strong>
                DISCUSS
              </strong>

              <small>
                Find the clues
              </small>
            </div>
          </div>


          <div className="feature-item">
            <span>03</span>

            <div>
              <strong>
                VOTE
              </strong>

              <small>
                Eliminate
              </small>
            </div>
          </div>

        </div>


        <div className="scroll-indicator">
          <span />
          Scroll to setup
        </div>

      </div>


      <div className="main-room-card animate-in" data-reveal>

        <div className="room-header">

          <div>

            <span className="room-kicker">
              GAME SETUP
            </span>

            <h2>
              Main Room
            </h2>

          </div>


          <div className="room-icon">
            ✦
          </div>

        </div>


        <div className="setup-block">

          <div className="setup-label-row">

            <span>
              Players
            </span>

            <strong>
              {playerCount}
            </strong>

          </div>


          <div className="number-grid">

            {[4, 5, 6, 7, 8, 9, 10].map(
              (number) => (
                <button
                  key={number}
                  type="button"
                  className={`number-option ${playerCount === number
                      ? "active"
                      : ""}`}
                  onClick={() => onPlayerCountChange(
                    number
                  )}
                >
                  {number}
                </button>
              )
            )}

          </div>

        </div>


        <div className="setup-block">

          <div className="setup-label-row">

            <span>
              Impostors
            </span>

            <strong>
              {impostorCount}
            </strong>

          </div>


          <div className="impostor-options">

            {Array.from(
              {
                length: maxImpostors,
              },
              (_, index) => index + 1
            ).map((number) => (
              <button
                key={number}
                type="button"
                className={`impostor-option ${impostorCount ===
                    number
                    ? "active"
                    : ""}`}
                onClick={() => onImpostorCountChange(
                  number
                )}
              >
                <span className="impostor-number">
                  {number}
                </span>

                <span>
                  {number === 1
                    ? "Impostor"
                    : "Impostors"}
                </span>
              </button>
            ))}

          </div>

        </div>


        <div className="room-summary">

          <div>
            <span>
              Players
            </span>

            <strong>
              {playerCount}
            </strong>
          </div>


          <div>
            <span>
              Impostors
            </span>

            <strong>
              {impostorCount}
            </strong>
          </div>


          <div>
            <span>
              Mode
            </span>

            <strong>
              Local
            </strong>
          </div>

        </div>


        <button
          type="button"
          className="primary-button large-button start-button"
          onClick={onStart}
        >
          Start Game

          <span>
            →
          </span>
        </button>


        <button
          type="button"
          className="text-button"
          onClick={onWords}
        >
          Manage Word Database
        </button>

      </div>

    </section><section className="landing-section" data-reveal>
        <div className="landing-heading">
          <div>
            <div className="eyebrow">HOW IT WORKS</div>
            <h2>Three steps.<br /><em>One impostor.</em></h2>
          </div>
          <p>Fast to learn, tense to play, and designed for a single screen around the table.</p>
        </div>

        <div className="step-grid">
          {[
            ["01", "REVEAL", "Everyone privately receives a word. The impostor gets the wrong one."],
            ["02", "DISCUSS", "Give clues without saying the word. Watch who sounds suspicious."],
            ["03", "VOTE", "Choose the player you trust the least. Survive the final reveal."],
          ].map(([number, title, text]) => (
            <article className="step-card" key={number}>
              <span className="step-number">{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <span className="step-arrow">↗</span>
            </article>
          ))}
        </div>
      </section><section className="landing-feature-band" data-reveal>
        <div className="feature-copy">
          <div className="eyebrow">BUILT FOR THE ROOM</div>
          <h2>Minimal interface.<br /><em>Maximum suspicion.</em></h2>
        </div>
        <div className="feature-metrics">
          <div><strong>LOCAL</strong><span>No account required</span></div>
          <div><strong>PRIVATE</strong><span>One player at a time</span></div>
          <div><strong>CUSTOM</strong><span>Manage your word pairs</span></div>
        </div>
      </section></>
  );
}


/* =========================================================
   SETUP
========================================================= */

function Setup({
  players,
  onChangeName,
  onBack,
  onStart,
}) {
  return (
    <section className="page-section">

      <div className="page-heading animate-in">

        <div>

          <div className="eyebrow">
            STEP 01 • PLAYERS
          </div>

          <h1>
            Who's playing?
          </h1>

          <p>
            Enter the name of every player.
          </p>

        </div>


        <div className="page-number">
          01
        </div>

      </div>


      <div className="name-grid animate-in">

        {players.map(
          (player, index) => (
            <label
              className="name-field"
              key={player.id}
            >

              <span className="name-number">
                {String(
                  index + 1
                ).padStart(
                  2,
                  "0"
                )}
              </span>


              <input
                type="text"
                value={player.name}
                onChange={(event) =>
                  onChangeName(
                    player.id,
                    event.target.value
                  )
                }
                placeholder={`Pemain ${
                  index + 1
                }`}
                maxLength={20}
              />

            </label>
          )
        )}

      </div>


      <div className="action-row animate-in">

        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          ← Back
        </button>


        <button
          type="button"
          className="primary-button large-button"
          onClick={onStart}
        >
          Reveal Cards
          <span>
            →
          </span>
        </button>

      </div>

    </section>
  );
}


/* =========================================================
   REVEAL
========================================================= */

function Reveal({
  players,
  index,
  revealed,
  setRevealed,
  onNext,
}) {
  const player = players[index];

  const [isAnimating, setIsAnimating] =
    useState(false);

  const [canNext, setCanNext] =
    useState(false);

  if (!player) {
    return null;
  }

  const progress =
    ((index + 1) /
      players.length) *
    100;

  function handleCardClick() {
    if (isAnimating) {
      return;
    }

    const nextRevealed = !revealed;

    setIsAnimating(true);
    setRevealed(nextRevealed);

    if (nextRevealed) {
      setCanNext(false);
    } else {
      setCanNext(false);

      window.setTimeout(() => {
        setCanNext(true);
      }, 850);
    }

    window.setTimeout(() => {
      setIsAnimating(false);
    }, 850);
  }

  function handleNext() {
    if (!canNext || isAnimating) {
      return;
    }

    setCanNext(false);
    onNext();
  }

  return (
    <section className="reveal-section">

      <div className="reveal-top animate-in">

        <div>

          <div className="eyebrow">
            PRIVATE • PASS THE PHONE
          </div>

          <h2>
            {player.name}
          </h2>

          <p>
            Make sure nobody else
            is looking.
          </p>

        </div>

        <div className="reveal-counter">

          <strong>
            {String(
              index + 1
            ).padStart(
              2,
              "0"
            )}
          </strong>

          <span>
            /
            {String(
              players.length
            ).padStart(
              2,
              "0"
            )}
          </span>

        </div>

      </div>

      <div className="secret-card-wrap animate-in">

        <button
          type="button"
          className={`secret-card ${
            revealed
              ? "is-revealed"
              : ""
          }`}
          onClick={handleCardClick}
          disabled={isAnimating}
          aria-label={
            revealed
              ? "Tutup kartu"
              : "Buka kartu"
          }
        >

          <div className="secret-card-inner">

            <div className="card-face card-front">

              <div className="card-symbol">
                ✦
              </div>

              <span className="card-kicker">
                YOUR SECRET CARD
              </span>

              <strong className="card-title">
                RAHASIA
              </strong>

              <span className="card-player">
                {player.name}
              </span>

              <div className="tap-hint">
                <span>
                  ◉
                </span>

                Tap to reveal
              </div>

            </div>

            <div className="card-face card-back">

              <span className="word-label">
                YOUR WORD
              </span>

              <strong className="secret-word">
                {player.word ||
                  "KATA"}
              </strong>

              <div className="word-line" />

              <span className="card-hint">
                Remember it.
              </span>

              <span className="private-badge">
                PRIVATE
              </span>

            </div>

          </div>

        </button>

      </div>

      <div className="reveal-bottom animate-in">

        <div className="reveal-progress">
          <div
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <div className="reveal-progress-text">
          {index + 1} /{" "}
          {players.length}
        </div>

        {!revealed &&
          !canNext && (
            <div className="privacy-note">
              🔒 Tap the card to reveal your word.
            </div>
          )}

        {revealed && (
          <div className="privacy-note">
            ↩ Tap the card again to close it.
          </div>
        )}

        {canNext && (
          <button
            type="button"
            className="primary-button large-button next-player-button"
            onClick={handleNext}
          >
            {index ===
            players.length - 1
              ? "Start Discussion →"
              : "Next Player →"}
          </button>
        )}

      </div>

    </section>
  );
}

/* =========================================================
   DISCUSSION
========================================================= */

function Discussion({
  players,
  onVote,
}) {
  return (
    <section className="page-section centered-section">

      <div className="phase-icon animate-in">
        02
      </div>

      <div className="eyebrow animate-in">
        DISCUSSION
      </div>

      <h1 className="animate-in">
        Talk. Observe.
      </h1>

      <p className="phase-description animate-in">
        Give clues about your word.
        Don't say it directly.
      </p>


      <div className="alive-strip animate-in">

        {players.map(
          (player) => (
            <div
              className="alive-player"
              key={player.id}
            >
              <span className="alive-dot" />
              {player.name}
            </div>
          )
        )}

      </div>


      <button
        type="button"
        className="primary-button large-button animate-in"
        onClick={onVote}
      >
        Start Voting
        <span>
          →
        </span>
      </button>

    </section>
  );
}


/* =========================================================
   VOTING
========================================================= */

function Voting({
  players,
  voterIndex,
  candidates,
  onVote,
}) {
  const voter =
    players[voterIndex];

  return (
    <section className="page-section">

      <div className="voting-heading animate-in">

        <div>

          <div className="eyebrow">
            STEP 03 • VOTING
          </div>

          <h1>
            {voter?.name},
            <br />
            choose someone.
          </h1>

          <p>
            Your vote is private.
          </p>

        </div>


        <div className="vote-counter">
          {voterIndex + 1}
          <span>
            /
            {players.length}
          </span>
        </div>

      </div>


      <div className="vote-grid animate-in">

        {candidates.map(
          (player) => (
            <button
              type="button"
              className="vote-card"
              key={player.id}
              onClick={() =>
                onVote(
                  player.id
                )
              }
            >

              <span className="vote-avatar">
                {player.name
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <span className="vote-name">
                {player.name}
              </span>

              <span className="vote-arrow">
                →
              </span>

            </button>
          )
        )}

      </div>

    </section>
  );
}


/* =========================================================
   TIE
========================================================= */

function Tie({
  candidates,
  onRevote,
}) {
  return (
    <section className="page-section centered-section">

      <div className="phase-icon animate-in">
        =
      </div>

      <div className="eyebrow animate-in">
        VOTE TIED
      </div>

      <h1 className="animate-in">
        It's a tie.
      </h1>

      <p className="phase-description animate-in">
        These players received
        the highest number of votes.
      </p>


      <div className="tie-list animate-in">

        {candidates.map(
          (player) => (
            <div
              className="tie-player"
              key={player.id}
            >
              <span>
                {player.name}
              </span>

              <strong>
                ?
              </strong>
            </div>
          )
        )}

      </div>


      <button
        type="button"
        className="primary-button large-button animate-in"
        onClick={onRevote}
      >
        Vote Again
        <span>
          →
        </span>
      </button>

    </section>
  );
}


/* =========================================================
   ELIMINATION
========================================================= */

function Elimination({
  players,
  eliminatedId,
  winner,
  onContinue,
}) {
  const eliminated =
    players.find(
      (player) =>
        player.id ===
        eliminatedId
    );

  if (!eliminated) {
    return null;
  }

  return (
    <section className="page-section centered-section">

      <div className="elimination-icon animate-in">
        ×
      </div>

      <div className="eyebrow animate-in">
        PLAYER ELIMINATED
      </div>

      <h1 className="animate-in">
        {eliminated.name}
      </h1>

      <p className="phase-description animate-in">
        This player has been
        eliminated.
      </p>


      <div
        className={`status-reveal ${
          eliminated.isImpostor
            ? "impostor-status"
            : "crew-status"
        } animate-in`}
      >

        <span>
          {eliminated.isImpostor
            ? "I"
            : "C"}
        </span>

        <div>

          <small>
            STATUS
          </small>

          <strong>
            {eliminated.isImpostor
              ? "IMPOSTOR"
              : "NOT AN IMPOSTOR"}
          </strong>

        </div>

      </div>


      <p className="privacy-note animate-in">
        🔒 Secret word remains hidden.
      </p>


      <button
        type="button"
        className="primary-button large-button animate-in"
        onClick={onContinue}
      >
        {winner
          ? "View Result"
          : "Continue Game"}

        <span>
          →
        </span>
      </button>

    </section>
  );
}


/* =========================================================
   RESULT
========================================================= */

function Result({
  winner,
  players,
  onAgain,
  onHome,
}) {
  const impostors =
    players.filter(
      (player) =>
        player.isImpostor
    );

  return (
    <section className="page-section centered-section">

      <div className="result-icon animate-in">
        {winner === "crew"
          ? "✓"
          : "I"}
      </div>

      <div className="eyebrow animate-in">
        GAME OVER
      </div>

      <h1 className="animate-in">
        {winner === "crew"
          ? "Crew Wins."
          : "Impostor Wins."}
      </h1>

      <p className="phase-description animate-in">
        {winner === "crew"
          ? "Every impostor was found."
          : "The impostor survived."}
      </p>


      <div className="result-panel animate-in">

        <span>
          IMPOSTOR
        </span>

        <div className="result-impostors">

          {impostors.map(
            (player) => (
              <div
                key={player.id}
                className="result-player"
              >
                {player.name}
              </div>
            )
          )}

        </div>

      </div>


      <div className="result-actions animate-in">

        <button
          type="button"
          className="secondary-button large-button"
          onClick={onHome}
        >
          Main Menu
        </button>


        <button
          type="button"
          className="primary-button large-button"
          onClick={onAgain}
        >
          Play Again
          <span>
            →
          </span>
        </button>

      </div>

    </section>
  );
}


/* =========================================================
   WORD MANAGER
========================================================= */

function WordManager({
  words,
  onSave,
  onBack,
}) {
  const [normalWord, setNormalWord] =
    useState("");

  const [impostorWord, setImpostorWord] =
    useState("");

  const [editingId, setEditingId] =
    useState(null);

  const [search, setSearch] =
    useState("");


  function addWord() {
    const normal =
      normalWord.trim();

    const impostor =
      impostorWord.trim();

    if (!normal || !impostor) {
      return;
    }

    const newWord = {
      id: `word-${Date.now()}`,
      normal,
      impostor,
    };

    onSave([
      ...words,
      newWord,
    ]);

    setNormalWord("");
    setImpostorWord("");
  }


  function startEdit(word) {
    setEditingId(word.id);

    setNormalWord(
      word.normal
    );

    setImpostorWord(
      word.impostor
    );
  }


  function saveEdit() {
    const normal =
      normalWord.trim();

    const impostor =
      impostorWord.trim();

    if (!normal || !impostor) {
      return;
    }

    const updated =
      words.map((word) =>
        word.id === editingId
          ? {
              ...word,
              normal,
              impostor,
            }
          : word
      );

    onSave(updated);

    setEditingId(null);
    setNormalWord("");
    setImpostorWord("");
  }


  function cancelEdit() {
    setEditingId(null);
    setNormalWord("");
    setImpostorWord("");
  }


  function deleteWord(id) {
    const confirmed =
      window.confirm(
        "Hapus pasangan kata ini?"
      );

    if (!confirmed) {
      return;
    }

    onSave(
      words.filter(
        (word) =>
          word.id !== id
      )
    );
  }


  const filteredWords =
    words.filter((word) => {
      const query =
        search
          .toLowerCase()
          .trim();

      if (!query) {
        return true;
      }

      return (
        word.normal
          .toLowerCase()
          .includes(query) ||
        word.impostor
          .toLowerCase()
          .includes(query)
      );
    });


  return (
    <section className="page-section">

      <div className="page-heading animate-in">

        <div>

          <div className="eyebrow">
            WORD DATABASE
          </div>

          <h1>
            Word pairs.
          </h1>

          <p>
            Create related word pairs
            for your games.
          </p>

        </div>


        <div className="page-number">
          {words.length}
        </div>

      </div>


      <div className="word-form animate-in">

        <div className="word-input-group">

          <label>
            NORMAL
          </label>

          <input
            type="text"
            value={normalWord}
            onChange={(event) =>
              setNormalWord(
                event.target.value
              )
            }
            placeholder="Burger"
          />

        </div>


        <div className="word-input-group">

          <label>
            IMPOSTOR
          </label>

          <input
            type="text"
            value={impostorWord}
            onChange={(event) =>
              setImpostorWord(
                event.target.value
              )
            }
            placeholder="Pizza"
          />

        </div>


        <div className="word-form-actions">

          {editingId ? (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={cancelEdit}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={saveEdit}
              >
                Save
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={addWord}
            >
              + Add
            </button>
          )}

        </div>

      </div>


      <div className="word-list-header animate-in">

        <div>

          <strong>
            Your Words
          </strong>

          <span>
            {filteredWords.length} pairs
          </span>

        </div>


        <input
          className="search-input"
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search..."
        />

      </div>


      <div className="word-list animate-in">

        {filteredWords.length ===
        0 ? (
          <div className="empty-state">
            No words found.
          </div>
        ) : (
          filteredWords.map(
            (word, index) => (
              <div
                className="word-row"
                key={word.id}
              >

                <span className="word-index">
                  {String(
                    index + 1
                  ).padStart(
                    2,
                    "0"
                  )}
                </span>


                <div className="word-pair">

                  <div>

                    <small>
                      NORMAL
                    </small>

                    <strong>
                      {word.normal}
                    </strong>

                  </div>


                  <span className="pair-arrow">
                    ↔
                  </span>


                  <div>

                    <small>
                      IMPOSTOR
                    </small>

                    <strong>
                      {word.impostor}
                    </strong>

                  </div>

                </div>


                <div className="word-actions">

                  <button
                    type="button"
                    onClick={() =>
                      startEdit(
                        word
                      )
                    }
                  >
                    Edit
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      deleteWord(
                        word.id
                      )
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>
            )
          )
        )}

      </div>


      <div className="action-row animate-in">

        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          ← Back
        </button>

      </div>

    </section>
  );
}