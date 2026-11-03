(function () {
	var MOBILE_MAX = 899;
	var SPEED = 1.6; // pan completes over less scroll distance = feels faster
	var LERP = 0.08; // how quickly the pan catches up to its target each frame - lower = more delay/lag
	var START_AT = 0.2; // 0-1, how far the card must have scrolled through the viewport before it's allowed to start sliding - tune this

	var cards = document.querySelectorAll('.promo-card--parallax');
	if (!cards.length) return;

	var items = Array.prototype.map.call(cards, function (card) {
		return {
			card: card,
			img: card.querySelector('img'),
			current: 0,
			active: false,
			deskOn: card.classList.contains('desk-on'), // opt-in: keep running past the mobile breakpoint
		};
	}).filter(function (item) { return item.img; });

	if (!items.length) return;

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function tick() {
		var isMobile = window.innerWidth <= MOBILE_MAX;
		var viewportH = window.innerHeight;

		items.forEach(function (item) {
			if (!isMobile && !item.deskOn) {
				if (item.active) {
					item.img.style.objectPosition = '';
					item.active = false;
					item.current = 0;
				}
				return;
			}

			item.active = true;

			var rect = item.card.getBoundingClientRect();

			// 0 when the card is just entering at the bottom edge of the
			// viewport, 1 when it is just leaving at the top edge - ties the
			// image's vertical pan to scroll position (and direction) so
			// scrolling back up un-reveals/re-reveals the opposite part.
			// object-position only ever moves vertically, so the full width
			// (and the sides of the ad) is always shown.
			var raw = (viewportH - rect.top) / (viewportH + rect.height);

			// Nothing happens until raw passes START_AT, then the remaining
			// distance is rescaled to 0-1 so the slide still starts
			// smoothly from a standstill instead of jumping in.
			var eased = clamp((raw - START_AT) / (1 - START_AT), 0, 1);
			var target = clamp(eased * SPEED, 0, 1);

			// Ease the visible position toward the target instead of
			// snapping straight to it, so the pan trails scroll with a
			// short delay rather than tracking it 1:1.
			item.current += (target - item.current) * LERP;

			item.img.style.objectPosition = '50% ' + (item.current * 100) + '%';
		});

		requestAnimationFrame(tick);
	}

	requestAnimationFrame(tick);
})();
