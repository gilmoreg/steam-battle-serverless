const Steam = require('./steam');

exports.checkid = (req, res) => {
  Steam.check(req.query.id)
  .then((response) => {
    res
    .status(200)
    .set('Access-Control-Allow-Origin', '*')
    .set('Access-Control-Allow-Methods', 'GET')
    .json({ id: response.id, profile: response.profile });
  })
  .catch(err => res.status(200).json({ error: err, message: `Unable to verify ID ${req.query.id}.` }));
};

exports.player = (req, res) => {
  Steam.player(req.query.id)
  .then((player) => {
    res
    .status(200)
    .set('Access-Control-Allow-Origin', '*')
    .set('Access-Control-Allow-Methods', 'GET')
    .json({ player });
  })
  .catch(() => res.status(200).json({ error: `Player ${req.query.id} could not be found.` }));
};
