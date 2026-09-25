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
		{ id: 'page-09', title: 'The Vision of a Grammar Precinct' },
		{ id: 'page-10', title: 'Student Leadership' },
		{ id: 'page-11', title: 'Academia' },
		{ id: 'page-12', title: 'Sport' },
		{ id: 'page-13', title: 'Extracurricular' },
		{ id: 'page-14', title: 'Arts and Culture — Polyfest' },
		{ id: 'page-15', title: 'From Korea to New Zealand' },
		{ id: 'page-16', title: 'Staff' },
		{ id: 'page-17', title: 'Staff Awards' },
		{ id: 'page-18', title: 'Faculty Profile — Science' },
		{ id: 'page-19', title: 'Events — Parents\' Evenings' },
		{ id: 'page-20', title: 'Lunar New Year & Boat Naming' },
		{ id: 'page-21', title: 'Gala Dinner & Art House Tour' },
		{ id: 'page-22', title: 'Giving to Grammar' },
		{ id: 'page-23', title: 'Thank You to Our Donors' },
		{ id: 'page-24', title: 'Farewell Shiela, Lady Graham' },
		{ id: 'page-25', title: 'Anzac Day' },
		{ id: 'page-26', title: 'Augusta and Lion Awards' },
		{ id: 'page-27', title: 'Old Boys\' News' },
		{ id: 'page-28', title: 'Ben Barclay & Hamish Kerr' },
		{ id: 'page-29', title: 'Old Boys\' News' },
		{ id: 'page-30', title: 'News & History' },
		{ id: 'page-31', title: 'International News' },
		{ id: 'page-32', title: 'Grammar Families' },
		{ id: 'page-33', title: 'Obituaries' },
		{ id: 'page-34', title: 'In Memoriam' },
		{ id: 'page-35', title: 'From the Archives' },
		{ id: 'page-36', title: 'Combined Decade Reunion' },
		{ id: 'page-37', title: 'Advertisement' }
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
	var links = Array.prototype.slice.call(sheet.querySelectorAll('a'));

	function setActive(i) {
		currentEl.textContent = pad(i + 1);
		nameEl.textContent = PAGES[i].title;
		links.forEach(function (a, li) { a.classList.toggle('active', li === i); });
	}
	setActive(0);

	function closeSheet() {
		sheet.hidden = true;
		toggle.setAttribute('aria-expanded', 'false');
	}
	function openSheet() {
		sheet.hidden = false;
		toggle.setAttribute('aria-expanded', 'true');
	}
	toggle.addEventListener('click', function (e) {
		e.stopPropagation();
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

		var scrollTicking = false;
		function onScroll() {
			scrollTicking = false;
			setActive(computeActiveIndex());
		}
		window.addEventListener('scroll', function () {
			if (!scrollTicking) {
				requestAnimationFrame(onScroll);
				scrollTicking = true;
			}
		}, { passive: true });
		if (main) {
			main.addEventListener('scroll', function () {
				if (!scrollTicking) {
					requestAnimationFrame(onScroll);
					scrollTicking = true;
				}
			}, { passive: true });
		}
		window.addEventListener('resize', function () {
			if (!scrollTicking) {
				requestAnimationFrame(onScroll);
				scrollTicking = true;
			}
		});
		setActive(computeActiveIndex());
	}
})();
