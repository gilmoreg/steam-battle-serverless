# Steam-Battle-Serverless

A RESTful API providing a proxy for the Steam Player API. Serves as the backend for [steam-battle](https://github.com/gilmoreg/steam-battle).

steam-battle-api exposes two routes:

 * /checkid?id=<id>

Verifies the existence of a valid Steam ID. Accepts any of the [three valid Steam ID types](https://developer.valvesoftware.com/wiki/SteamID), or the name portion of a valid vanity url.

Given a valid Steam ID (as defined above), returns the following model:
```
{
  id,             // 64bit Steam ID
  profile: {
    avatar,    	  // URL for avatar image
    avatarfull,	  // URL for full size avatar image
    personaname,	// Persona name
    profileurl,	  // URL for Steam profile
  }
}
```

 * /player?id=<id>

Given a valid 64-bit Steam ID, returns the following model:
```
{
  player: {
    id,		          // 64bit Steam ID
    profile: {
      avatar,    	  // URL for avatar image
      avatarfull,	  // URL for full size avatar image
      personaname,	// Persona name
      profileurl,	  // URL for Steam profile
    },
    score: {
      owned,	      // number of games owned
      playtime,	    // number of total hours played
      recent,	      // number of hours played in the last two weeks
      total		      // a total score (owned + playtime + recent)
    }
  }
}
```

### Technical:
 * Hosted as Google Cloud Functions

### Dependencies:
 * [steamid](https://github.com/DoctorMcKay/node-steamid) for converting between Steam ID formats
