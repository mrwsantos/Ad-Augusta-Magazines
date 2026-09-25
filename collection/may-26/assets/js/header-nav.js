(function () {
	var toggle = document.querySelector('.menu-toggle');
	var nav = document.querySelector('.toc-nav');
	if (!toggle || !nav) return;
	var label = toggle.querySelector('.menu-text');
	var headerWrapper = document.querySelector('.header-wrapper');

	function setOpen(open) {
		toggle.classList.toggle('is-open', open);
		toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		nav.classList.toggle('opened', open);
		if (headerWrapper) headerWrapper.classList.toggle('opened', open);
		if (label) label.textContent = open ? 'MENU' : 'MENU';
	}

	toggle.addEventListener('click', function (e) {
		e.stopPropagation();
		setOpen(!nav.classList.contains('opened'));
	});

	nav.addEventListener('click', function (e) {
		if (e.target.closest('a')) setOpen(false);
	});

	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') setOpen(false);
	});

	document.addEventListener('click', function (e) {
		if (!nav.classList.contains('opened')) return;
		if (nav.contains(e.target) || toggle.contains(e.target)) return;
		setOpen(false);
	});

	window.matchMedia('(max-width: 899px)').addEventListener('change', function (mq) {
		if (mq.matches) setOpen(false);
	});

	// active-link tracking, based on the desktop horizontal slider's current slide
	var main = document.querySelector('main');
	var slides = main ? Array.prototype.slice.call(main.querySelectorAll(':scope > .spread')) : [];
	var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
	var categoryEl = document.getElementById('headerCategory');

	function currentSlideId() {
		if (!main || !slides.length) return null;
		var w = main.clientWidth || 1;
		var idx = Math.round(main.scrollLeft / w);
		idx = Math.max(0, Math.min(slides.length - 1, idx));
		return slides[idx].id;
	}

	// on the cover (page 1) the header only shows the menu toggle
	var cover = document.getElementById('page-01');
	function updateCover() {
		if (!headerWrapper || !cover) return;
		var onCover;
		if (window.matchMedia('(max-width: 899px)').matches) {
			onCover = cover.getBoundingClientRect().bottom > 100;
		} else {
			onCover = currentSlideId() === 'page-01';
		}
		headerWrapper.classList.toggle('on-cover', onCover);
		var sh = document.querySelector('.site-header');
		if (sh) sh.classList.toggle('on-cover', onCover);
	}

	function updateActive() {
		updateCover();
		var id = currentSlideId();
		navLinks.forEach(function (a) {
			a.classList.toggle('active', !!id && a.getAttribute('href') === '#' + id);
		});
		if (categoryEl) {
			var slide = id ? document.getElementById(id) : null;
			var kicker = slide ? (slide.querySelector('.page-kicker') || slide.querySelector('h1')) : null;
			var label = '';
				if (kicker) {
					var copy = kicker.cloneNode(true);
					Array.prototype.forEach.call(copy.querySelectorAll('.hero-num'), function (n) { n.remove(); });
					label = copy.textContent.replace(/\s+/g, ' ').trim();
				}
				categoryEl.textContent = label;
		}
	}

	if (main && slides.length) {
		updateActive();
		var settleTimer = null;
		main.addEventListener('scroll', function () {
			clearTimeout(settleTimer);
			settleTimer = setTimeout(updateActive, 100);
		});
		window.addEventListener('resize', function () {
			clearTimeout(settleTimer);
			settleTimer = setTimeout(updateActive, 100);
		});
	}

	updateCover();
	window.addEventListener('resize', updateCover);

	// mobile/tablet: hide the header on scroll down past 300px, show it
	// immediately on any scroll up
	var siteHeader = document.querySelector('.site-header');
	var mobileMq = window.matchMedia('(max-width: 899px)');
	if (siteHeader) {
		var lastY = window.scrollY;
		var scrollTicking = false;

		function onScroll() {
			scrollTicking = false;
			if (!mobileMq.matches) {
				siteHeader.classList.remove('header-hidden');
				lastY = window.scrollY;
				return;
			}
			var y = window.scrollY;
			if (y > lastY && y > 300) {
				siteHeader.classList.add('header-hidden');
			} else if (y < lastY) {
				siteHeader.classList.remove('header-hidden');
			}
			lastY = y;
			updateCover();
		}

		window.addEventListener('scroll', function () {
			if (!scrollTicking) {
				requestAnimationFrame(onScroll);
				scrollTicking = true;
			}
		}, { passive: true });

		mobileMq.addEventListener('change', function (mq) {
			if (!mq.matches) siteHeader.classList.remove('header-hidden');
		});
	}
})();
