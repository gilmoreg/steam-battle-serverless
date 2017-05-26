const SteamID = require('steamid');
const fetch = require('node-fetch');
const { STEAM_API_KEY } = require('./config');

const getIdFromVanity = vanity =>
  new Promise((resolve, reject) => {
    const url = `http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${vanity}`;
    fetch(url)
    .then(res => res.json())
    .then((res) => {
      if (res && res.response && res.response.steamid) resolve(res.response.steamid);
      else reject('getIdFromVanity malformed response');
    })
    .catch(err => reject({ message: 'getIdFromVanity error', error: Error(err) }));
  });


const getSteamID = id =>
  new Promise((resolve, reject) => {
    try {
      const sid = new SteamID(id);
      resolve(sid.getSteamID64());
    } catch (error) {
      // If SteamID threw an error, this might be a vanity URL
      getIdFromVanity(id)
        .then(sid => resolve(sid))
        .catch(err => reject({ message: 'getSteamID error', error: Error(err) }));
    }
  });


const getOwnedGames = id =>
  new Promise((resolve, reject) => {
    const url = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${id}&format=json`;
    fetch(url)
    .then(res => res.json())
    .then((res) => {
      if (res && res.response && res.response.games) resolve(res.response.games);
      else reject(`getOwnedGames: Invalid response from API: ${JSON.stringify(res)} `);
    })
    .catch(err => reject({ message: 'getOwnedGames error', error: Error(err) }));
  });

const getPlayerProfile = id =>
  new Promise((resolve, reject) => {
    const url = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${id}`;
    fetch(url)
    .then(res => res.json())
    .then((res) => {
      if (res && res.response && res.response.players) {
        const p = res.response.players[0];
        if (p.communityvisibilitystate !== 3) reject('getPlayerProfile: this profile is private.');
        const player = {
          personaname: p.personaname,
          profileurl: p.profileurl,
          avatar: p.avatar,
          avatarfull: p.avatarfull,
        };
        resolve(player);
      } else reject('getPlayerProfile: Invalid response from API');
    })
    .catch(err => reject({ message: 'getPlayerProfile error', error: Error(err) }));
  });

const score = player =>
  // Formula:
  // 1 point per game owned
  // 1 point per hour played - counts double if played in the last two weeks
  player.owned + Number.parseInt(player.playtime / 60, 10) +
    Number.parseInt(player.recent / 60, 10);

const calculateScore = (id) => {
  const player = {
    owned: 0,
    playtime: 0,
    recent: 0,
    total: 0,
  };
  return new Promise((resolve, reject) => {
    getOwnedGames(id)
    .then((games) => {
      // First score: # of games owned (will count games bought but not played)
      if (!games) reject(`no games returned for ${id}`);
      player.owned = games.length;
      games.forEach((game) => {
        // Add game time to player if they've actually played it
        if (game.playtime_forever) {
          // Second score: # of minutes played
          player.playtime += game.playtime_forever;
          // Third score: # of minutes played in last two weeks
          if (game.playtime_2weeks) player.recent += game.playtime_2weeks;
        }
      });
      player.total = score(player);
      resolve(player);
    })
    .catch(err => reject({ message: 'calculateScore error', error: Error(err) }));
  });
};

module.exports = {
  check: id =>
    new Promise((resolve, reject) => {
      getSteamID(id).then((sid) => {
        getPlayerProfile(sid).then((profile) => {
          getOwnedGames(sid).then((games) => {
            if (games && games.length > 0) resolve({ id: sid, profile });
            else reject(`No games for ${id}`);
          });
        })
        .catch(err => reject({ message: 'checkid inner error', error: new Error(err) }));
      })
      .catch(err => reject({ message: 'checkid error', error: new Error(err) }));
    }),
  player: id =>
    new Promise((resolve, reject) => {
      Promise.all([getPlayerProfile(id), calculateScore(id)])
        .then((player) => {
          resolve({ id, profile: player[0], score: player[1] });
        })
        .catch(err => reject(Error(err)));
    }),
};
