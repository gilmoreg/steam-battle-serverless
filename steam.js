const https = require('https');
const SteamID = require('steamid');

const httpRequest = (host, path) =>
  new Promise((resolve, reject) => {
    const request = https.request({
      host,
      path,
      method: 'get',
    }, (response) => {
      const body = [];
      response.on('data', chunk => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });
    request.on('error', err => reject(Error(err)));
    request.end();
  });

const getIdFromVanity = vanity =>
  new Promise((resolve, reject) => {
    const path = `/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM_API_KEY}&vanityurl=${vanity}`;
    httpRequest('api.steampowered.com', path)
    .then((response) => {
      if (response &&
          response.data &&
          response.data.response &&
          response.data.response.steamid) resolve(response.data.response.steamid);
      reject(null);
    })
    .catch(() => reject(null));
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
        .catch(() => reject(null));
    }
  });


const getOwnedGames = id =>
  new Promise((resolve, reject) => {
    const path = `/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${id}&format=json`;
    httpRequest('api.steampowered.com', path)
    .then((response) => {
      if (response &&
          response.data &&
          response.data.response &&
          response.data.response.games) resolve(response.data.response.games);
      else reject(`getOwnedGames: Invalid response from API: ${JSON.stringify(response.data)} `);
    })
    .catch((err) => { reject(`getOwnedGames error: ${err}`); });
  });

const getPlayerProfile = id =>
  new Promise((resolve, reject) => {
    const path = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_API_KEY}&steamids=${id}`;
    httpRequest('api.steampowered.com', path)
    .then((response) => {
      if (response &&
          response.data &&
          response.data.response &&
          response.data.response.players) {
        const p = response.data.response.players[0];
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
    .catch(() => reject(null));
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
    .catch(err => reject(`calculateScore error: ${err}`));
  });
};

module.exports = {
  checkid: id =>
    new Promise((resolve, reject) => {
      getSteamID(id).then((sid) => {
        getPlayerProfile(sid).then((profile) => {
          getOwnedGames(sid).then((games) => {
            if (games && games.length > 0) resolve({ id: sid, profile });
            else reject(null);
          });
        })
        .catch(err => reject(err));
      })
      .catch(err => reject(err));
    }),
  player: id =>
    new Promise((resolve, reject) => {
      Promise.all([getPlayerProfile(id), calculateScore(id)])
        .then((player) => {
          resolve({ id, profile: player[0], score: player[1] });
        })
        .catch(err => reject(err));
    }),
};
