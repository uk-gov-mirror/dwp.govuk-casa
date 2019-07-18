/**
 * Mark a waypoint as having been viewed, and the user having made an explicit
 * action to pass through it, onto a subsequent page.
 *
 * You may also need to modify the "follow" functions on each of the out-edges
 * leading away from the skipped node, so they understand to allow the skip.
 *
 * It is important that this function overwrites _all_ other data on the
 * specified waypoint.
 *
 * NOTE: All waypoints up to the point of the one being marked must have been
 * visited beforehand, so this middleware must come after journey-rails.
 *
 * Format:
 *  /current-waypoint?skipto=next-waypoint
 */

module.exports = mountUrl => (req, res, next) => {
  const { skipto } = req.query;
  const { journeyOrigin = { originId: '' } } = req;

  // Validate arguments
  if (skipto === undefined) {
    next();
    return;
  }
  if (typeof skipto !== 'string' || !skipto.match(/^[a-z0-9-]{1,200}$/i)) {
    res.status(400).send('Invalid waypoint');
    return;
  }

  // Inject a special "__skipped__" data item into the waypoint's page data,
  // overwriting all other data therein.
  req.log.info('Marking waypoint %s as skipped', req.journeyWaypointId);
  req.journeyData.clearValidationErrorsForPage(req.journeyWaypointId);
  req.journeyData.setDataForPage(req.journeyWaypointId, {
    __skipped__: true,
  });

  // Persist changes to session
  req.session.journeyData = req.journeyData.getData();
  req.session.journeyValidationErrors = req.journeyData.getValidationErrors();

  // Save session and send user on their way
  req.session.save((err) => {
    if (err) {
      req.log.error(err);
    }
    res.status(302).redirect(`${mountUrl}/${journeyOrigin.originId || ''}/${skipto}`.replace(/\/+/g, '/'));
  });
};