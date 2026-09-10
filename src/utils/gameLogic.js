export function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}


export function pickRandomWords(words) {
  if (!words || words.length === 0) {
    throw new Error("Database kata kosong.");
  }

  const randomIndex = Math.floor(
    Math.random() * words.length
  );

  return words[randomIndex];
}


export function getMaxImpostors(playerCount) {
  return Math.min(
    3,
    Math.floor((playerCount - 1) / 2)
  );
}


export function pickImpostorIds(
  players,
  impostorCount
) {
  const shuffledPlayers = shuffle(players);

  return shuffledPlayers
    .slice(0, impostorCount)
    .map((player) => player.id);
}


export function buildGamePlayers(
  players,
  impostorIds,
  wordPair
) {
  return players.map((player) => ({
    ...player,

    isImpostor:
      impostorIds.includes(player.id),

    word:
      impostorIds.includes(player.id)
        ? wordPair.impostor
        : wordPair.normal,

    alive: true,
  }));
}


export function getWinner(players) {
  const alivePlayers = players.filter(
    (player) => player.alive
  );

  const aliveImpostors = alivePlayers.filter(
    (player) => player.isImpostor
  );

  const aliveCrew = alivePlayers.filter(
    (player) => !player.isImpostor
  );

  if (aliveImpostors.length === 0) {
    return "crew";
  }

  if (
    aliveImpostors.length >=
    aliveCrew.length
  ) {
    return "impostor";
  }

  return null;
}


export function tallyVotes(votes) {
  const counts = {};

  Object.values(votes).forEach((targetId) => {
    counts[targetId] =
      (counts[targetId] || 0) + 1;
  });

  return counts;
}


export function getTopVotedIds(votes) {
  const counts = tallyVotes(votes);

  const entries = Object.entries(counts);

  if (entries.length === 0) {
    return [];
  }

  const highestVote = Math.max(
    ...entries.map(
      ([, count]) => count
    )
  );

  return entries
    .filter(
      ([, count]) =>
        count === highestVote
    )
    .map(([id]) => id);
}