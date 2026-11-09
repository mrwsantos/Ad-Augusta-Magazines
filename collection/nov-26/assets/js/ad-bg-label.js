(function () {
	// .ad-bg uses background-size: contain, so depending on the viewport's
	// own aspect ratio the photo can be letterboxed vertically (blank space
	// above/below it, centered) - the promo-label is meant to sit right at
	// the photo's own top edge, not the box's, so that gap has to be
	// measured against each image's real dimensions and recalculated
	// whenever the viewport (and therefore the box) changes size.
	var boxes = document.querySelectorAll('.ad-bg');
	if (!boxes.length) return;

	var items = Array.prototype.map.call(boxes, function (bg) {
		var label = bg.querySelector('.promo-label');
		if (!label) return null;
		var match = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(bg).backgroundImage);
		return { bg: bg, label: label, src: match ? match[1] : null, naturalW: 0, naturalH: 0 };
	}).filter(Boolean);

	if (!items.length) return;

	// --pad-y's value is itself a clamp(...) expression (depends on
	// viewport width), so getComputedStyle().getPropertyValue('--pad-y')
	// just hands back that raw, unresolved expression as text, not a
	// pixel number - the only reliable way to resolve any custom property
	// to an actual used-value length is to apply it to a real property on
	// a probe element and read THAT property back.
	function resolvePx(cssValue) {
		var probe = document.createElement('div');
		probe.style.position = 'absolute';
		probe.style.visibility = 'hidden';
		probe.style.height = cssValue;
		document.body.appendChild(probe);
		var px = parseFloat(getComputedStyle(probe).height) || 0;
		document.body.removeChild(probe);
		return px;
	}

	function position(item) {
		if (!item.naturalW || !item.naturalH) return;

		var boxW = item.bg.clientWidth;
		var boxH = item.bg.clientHeight;
		var imgRatio = item.naturalW / item.naturalH;
		var boxRatio = boxW / boxH;

		var topGap = 0;
		if (imgRatio > boxRatio) {
			// the image is proportionally wider than the box, so "contain"
			// fits it to the box's width and letterboxes top/bottom
			var renderedH = boxW / imgRatio;
			topGap = (boxH - renderedH) / 2;
		}

		// resolve var(--pad-y) to an actual pixel number here instead of
		// building a calc() string - string-concatenating calc() is what
		// kept silently breaking (a stray character anywhere makes the
		// whole value invalid CSS, which the browser just discards with no
		// warning, quietly falling back to the stylesheet's static value).
		// --pad-y's own clamp(...) depends on viewport width, so this is
		// re-resolved on every call rather than cached once.
		var padY = 0;
		item.label.style.top = ( topGap + 1) + 'px';
	}

	function positionAll() {
		items.forEach(position);
	}

	items.forEach(function (item) {
		if (!item.src) return;
		var preload = new Image();
		preload.onload = function () {
			item.naturalW = preload.naturalWidth;
			item.naturalH = preload.naturalHeight;
			position(item);
		};
		preload.src = item.src;
	});

	window.addEventListener('resize', positionAll);

	// fade the label out once less than 20% of the ad itself is still
	// visible on screen (scrolling down past it) - and back in if you
	// scroll back up past that same point
	var FADE_THRESHOLD = 0.2;
	var ticking = false;

	function visibleRatio(el) {
		var rect = el.getBoundingClientRect();
		var visibleH = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
		return rect.height > 0 ? visibleH / rect.height : 0;
	}

	function updateFade() {
		ticking = false;
		items.forEach(function (item) {
			item.label.style.opacity = visibleRatio(item.bg) < FADE_THRESHOLD ? '0' : '1';
		});
	}

	function requestFadeTick() {
		if (!ticking) {
			ticking = true;
			requestAnimationFrame(updateFade);
		}
	}

	window.addEventListener('scroll', requestFadeTick, { passive: true });
	window.addEventListener('resize', requestFadeTick);
	document.querySelectorAll('.spread').forEach(function (spread) {
		spread.addEventListener('scroll', requestFadeTick, { passive: true });
	});
	updateFade();
})();
