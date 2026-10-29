(function () {
	var PAGES = [
		{ id: 'page-01', title: 'Cover' },
		{ id: 'page-02', title: 'Contents' },
		{ id: 'page-03', title: 'Reflections by the Headmaster' },
		{ id: 'page-04', title: 'Report from the Board' },
		{ id: 'page-05', title: 'High Purpose & Deep Belonging' },
		{ id: 'page-06', title: 'A Second Language, Second Year' },
		{ id: 'page-07', title: 'Becoming a Good Grammar Man' },
		{ id: 'page-08', title: '10 Clive Road — the Legacy Project' },
		{ id: 'page-09', title: 'Student Leadership' },
		{ id: 'page-10', title: 'Academia' },
		{ id: 'page-11', title: 'Sports' },
		{ id: 'page-12', title: 'Extracurricular' },
		{ id: 'page-13', title: 'Arts and Culture' },
		{ id: 'page-14', title: 'Staff' },
		{ id: 'page-15', title: 'Faculty Profile — Science' },
		{ id: 'page-16', title: 'Events' },
		{ id: 'page-17', title: 'Giving to Grammar' },
		{ id: 'page-18', title: 'Farewell Shiela, Lady Graham' },
		{ id: 'page-19', title: 'President\'s Report' },
		{ id: 'page-20', title: 'Anzac Day' },
		{ id: 'page-21', title: 'Augusta and Lion Awards' },
		{ id: 'page-22', title: 'Old Boys\' News' },
		{ id: 'page-23', title: 'Grammar Families' },
		{ id: 'page-24', title: 'Obituaries' },
		{ id: 'page-25', title: 'From the Archives' },
		{ id: 'page-26', title: 'Sponsors and Partners' },
		{ id: 'page-27', title: 'Advertisement' }
	];

	var pager = document.getElementById('mobilePager');
	if (!pager) return;
	var toggle = document.getElementById('pagerToggle');
	var sheet = document.getElementById('pagerSheet');
	var currentEl = document.getElementById('pagerCurrent');
	var nameEl = document.getElementById('pagerName');
	var totalEl = document.getElementById('pagerTotal');

	function pad(n) { return n < 10 ? '0' + n : String(n); }

	totalEl.textContent = pad(PAGES.length);

	// the pager-sheet dropdown is optional — the current design may not
	// include it (#pagerSheet removed/commented from the HTML). Guard every
	// use of it so its absence can't throw and halt the rest of this script
	// (which is what was silently breaking pagerName/pagerCurrent updates).
	var links = [];
	if (sheet) {
		var list = document.createElement('ul');
		PAGES.forEach(function (p, i) {
			var li = document.createElement('li');
			var a = document.createElement('a');
			a.href = '#' + p.id;
			a.dataset.index = String(i);
			a.innerHTML = '<span class="n">' + pad(i + 1) + '</span><span class="t">' + p.title + '</span>';
			li.appendChild(a);
			list.appendChild(li);
		});
		sheet.appendChild(list);
		links = Array.prototype.slice.call(sheet.querySelectorAll('a'));
	}

	function setActive(i) {
		currentEl.textContent = pad(i + 1);
		nameEl.textContent = PAGES[i].title;
		links.forEach(function (a, li) { a.classList.toggle('active', li === i); });
	}
	setActive(0);

	function closeSheet() {
		if (!sheet) return;
		sheet.hidden = true;
		toggle.setAttribute('aria-expanded', 'false');
	}
	function openSheet() {
		if (!sheet) return;
		sheet.hidden = false;
		toggle.setAttribute('aria-expanded', 'true');
	}
	// on mobile, the pager's own center button has no page-list sheet of its
	// own anymore — it should just open the same menu the header hamburger
	// (.menu-toggle) opens, since that's reachable but out of thumb reach
	// down at the bottom pager bar.
	var menuToggle = document.querySelector('.menu-toggle');
	var mobileMq = window.matchMedia('(max-width: 899px)');
	toggle.addEventListener('click', function (e) {
		e.stopPropagation();
		if (mobileMq.matches && menuToggle) {
			menuToggle.click();
			return;
		}
		if (!sheet) return;
		if (sheet.hidden) openSheet(); else closeSheet();
	});
	links.forEach(function (a) {
		a.addEventListener('click', function () { closeSheet(); });
	});
	document.addEventListener('click', function (e) {
		if (!pager.contains(e.target)) closeSheet();
	});
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') closeSheet();
	});

	// scrollspy: the active page is whichever section's top has most recently
	// crossed a reference line near the top of the viewport. A fixed set of
	// IntersectionObserver thresholds (0.25/0.5/0.75) only fires when a
	// section's visible ratio crosses one of those exact values — for very
	// tall, photo-heavy pages (spanning several viewport heights) the ratio
	// can drift for a long time without ever crossing a threshold, so the
	// pager silently stops updating while scrolling through them.
	var sections = PAGES.map(function (p) { return document.getElementById(p.id); }).filter(Boolean);
	if (sections.length) {
		var REF_Y = 120;

		var main = document.querySelector('main');
		var desktopMq = window.matchMedia('(min-width: 900px)');

		function computeActiveIndex() {
			// desktop: horizontal slider, the window itself never scrolls
			if (desktopMq.matches && main) {
				var w = main.clientWidth || 1;
				var i = Math.round(main.scrollLeft / w);
				return Math.max(0, Math.min(sections.length - 1, i));
			}
			var active = 0;
			for (var i = 0; i < sections.length; i++) {
				if (sections[i].getBoundingClientRect().top <= REF_Y) {
					active = i;
				} else {
					break;
				}
			}
			return active;
		}

		// desktop only: the pager starts hidden (slid below the viewport) and
		// slides up near the bottom of the active .spread. On mobile the
		// pager is just permanently fixed at the bottom via CSS — no hide/
		// reveal tracking needed there at all.
		var THRESHOLD = 300;
		function updatePagerVisibility(activeIndex) {
			if (!desktopMq.matches) return;
			var active = sections[activeIndex];
			// a page whose content exactly fits its .spread (e.g. the cover,
			// height:100% with no overflow) has scrollHeight === clientHeight,
			// so there's no real "middle of reading" state to hide the pager
			// during — there's nothing more to reveal by scrolling, so it
			// should just always be visible (and usable for navigation).
			// Otherwise, only reveal it once within THRESHOLD px of the
			// actual bottom of a page that does have real scrollable content.
			var scrollable = active.scrollHeight - active.clientHeight;
			var distanceToBottom = scrollable - active.scrollTop;
			var show = scrollable <= THRESHOLD || distanceToBottom <= THRESHOLD;
			pager.classList.toggle('near-end', show);
		}

		var scrollTicking = false;
		function onScroll() {
			scrollTicking = false;
			var activeIndex = computeActiveIndex();
			setActive(activeIndex);
			updatePagerVisibility(activeIndex);
			attachSpreadScroll(activeIndex);
		}
		function requestTick() {
			if (!scrollTicking) {
				requestAnimationFrame(onScroll);
				scrollTicking = true;
			}
		}

		// desktop only: window never scrolls there, and main's own scroll
		// event only fires on the horizontal swipe between slides — the
		// active .spread's OWN vertical scroll (which is what changes
		// "distance to bottom" while reading a page) needs its own listener,
		// re-attached to whichever .spread is current whenever the active
		// slide changes.
		var currentSpreadTarget = null;
		function attachSpreadScroll(activeIndex) {
			if (!desktopMq.matches) {
				if (currentSpreadTarget) {
					currentSpreadTarget.removeEventListener('scroll', requestTick);
					currentSpreadTarget = null;
				}
				return;
			}
			var spread = sections[activeIndex];
			if (spread === currentSpreadTarget) return;
			if (currentSpreadTarget) currentSpreadTarget.removeEventListener('scroll', requestTick);
			currentSpreadTarget = spread;
			currentSpreadTarget.addEventListener('scroll', requestTick, { passive: true });
		}

		window.addEventListener('scroll', requestTick, { passive: true });
		if (main) main.addEventListener('scroll', requestTick, { passive: true });
		window.addEventListener('resize', requestTick);
		desktopMq.addEventListener('change', onScroll);
		onScroll();
	}
})();
