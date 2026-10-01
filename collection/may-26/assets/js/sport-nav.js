(function () {
	var navs = document.querySelectorAll('.sport-nav, .academia-nav, .arts-nav, .events-nav');
	if (!navs.length) return;

	var desktopMq = window.matchMedia('(min-width: 900px)');

	navs.forEach(function (nav) {
		var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
		var pairs = links.map(function (a) {
			var el = document.getElementById(a.getAttribute('href').slice(1));
			return el ? { a: a, el: el } : null;
		}).filter(Boolean);
		if (!pairs.length) return;

		var spread = nav.closest('.spread');
		var navList = nav.querySelector('ul');

		function scrollTarget() {
			return desktopMq.matches && spread ? spread : window;
		}

		function topOf(el) {
			if (desktopMq.matches && spread) {
				return el.getBoundingClientRect().top - spread.getBoundingClientRect().top;
			}
			return el.getBoundingClientRect().top;
		}

		function computeActiveIndex() {
			var refY = desktopMq.matches ? 20 : 120;
			var active = 0;
			for (var i = 0; i < pairs.length; i++) {
				if (topOf(pairs[i].el) <= refY) {
					active = i;
				} else {
					break;
				}
			}
			return active;
		}

		var lastActive = -1;
		function setActive(i) {
			pairs.forEach(function (p, idx) {
				p.a.classList.toggle('active', idx === i);
			});
			// only nudge the horizontal nav scroller when the active item actually
			// changes — calling scrollIntoView on every scroll tick (even when i is
			// unchanged) re-triggers the scroll listener each time its smooth-scroll
			// animation moves the viewport, creating a feedback loop that reads as
			// the page scrolling itself uncontrollably on mobile.
			if (i === lastActive) return;
			lastActive = i;
			// scroll only the nav's own horizontal track (never scrollIntoView —
			// it can walk up to a vertical ancestor like window/.spread and nudge
			// page scroll too, which re-fires this same scroll listener and
			// creates a runaway feedback loop on mobile).
			if (!desktopMq.matches && navList && pairs[i]) {
				var link = pairs[i].a;
				var target = link.offsetLeft - (navList.clientWidth - link.offsetWidth) / 2;
				navList.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
			}
		}

		var ticking = false;
		function onScroll() {
			ticking = false;
			setActive(computeActiveIndex());
		}
		function requestTick() {
			if (!ticking) {
				requestAnimationFrame(onScroll);
				ticking = true;
			}
		}

		var currentTarget = null;
		function attach() {
			var target = scrollTarget();
			if (target === currentTarget) return;
			if (currentTarget) currentTarget.removeEventListener('scroll', requestTick);
			currentTarget = target;
			currentTarget.addEventListener('scroll', requestTick, { passive: true });
			requestTick();
		}

		attach();
		desktopMq.addEventListener('change', attach);
		window.addEventListener('resize', requestTick);
	});
})();
