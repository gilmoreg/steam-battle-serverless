const Steam = require('./steam');

exports.checkid = (req, res) => {
  Steam.checkid(req.params.id)
  .then((response) => {
    res
    .status(200)
    .set('Access-Control-Allow-Origin', '*')
    .set('Access-Control-Allow-Methods', 'GET')
    .json({ id: response.id, profile: response.profile });
  })
  .catch(() => res.status(200).json({ error: `Unable to verify ID ${req.params.id}.` }));
};

exports.player = (req, res) => {
  Steam.player(req.params.id)
  .then((player) => {
    res
    .status(200)
    .set('Access-Control-Allow-Origin', '*')
    .set('Access-Control-Allow-Methods', 'GET')
    .json({ player });
  })
  .catch(() => res.status(200).json({ error: `Player ${req.params.id} could not be found.` }));
};
