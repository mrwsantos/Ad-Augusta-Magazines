(function () {
	var mq = window.matchMedia('(min-width: 900px)');
	var main = document.querySelector('main');
	if (!main) return;
	var slides = Array.prototype.slice.call(main.querySelectorAll(':scope > .spread'));
	var header = document.querySelector('.site-header');

	function isDesktop() { return mq.matches; }

	function headerOffset() { return header ? header.offsetHeight : 0; }

	function currentIndex() {
		if (isDesktop()) {
			var w = main.clientWidth || 1;
			return Math.round(main.scrollLeft / w);
		}
		var y = window.scrollY + headerOffset() + 40;
		var idx = 0;
		for (var i = 0; i < slides.length; i++) {
			if (slides[i].offsetTop <= y) idx = i; else break;
		}
		return idx;
	}

	function goTo(i) {
		i = Math.max(0, Math.min(slides.length - 1, i));
		slides[i].scrollTop = 0;
		if (isDesktop()) {
			main.scrollTo({ left: i * main.clientWidth, behavior: 'smooth' });
		} else {
			var top = slides[i].getBoundingClientRect().top + window.scrollY - headerOffset();
			window.scrollTo({ top: top, behavior: 'smooth' });
		}
	}

	// also reset scroll-to-top when the slide changes via trackpad/swipe on
	// the desktop snap container, not just via the prev/next buttons
	var settleTimer = null;
	var lastIndex = 0;
	main.addEventListener('scroll', function () {
		if (!isDesktop()) return;
		clearTimeout(settleTimer);
		settleTimer = setTimeout(function () {
			var idx = currentIndex();
			if (idx !== lastIndex) {
				slides[idx].scrollTop = 0;
				lastIndex = idx;
			}
		}, 120);
	});

	document.getElementById('prevSlide').addEventListener('click', function () {
		goTo(currentIndex() - 1);
	});
	document.getElementById('nextSlide').addEventListener('click', function () {
		goTo(currentIndex() + 1);
	});

	document.addEventListener('keydown', function (e) {
		if (e.key === 'ArrowRight' || e.key === 'PageDown') { goTo(currentIndex() + 1); }
		else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { goTo(currentIndex() - 1); }
	});

	// delegated so it also covers the pager-sheet links, which are added to
	// the DOM after this script runs
	document.addEventListener('click', function (e) {
		var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
		if (!a) return;
		var id = a.getAttribute('href').slice(1);
		var target = document.getElementById(id);
		var idx = slides.indexOf(target);
		if (idx === -1) return;
		e.preventDefault();
		goTo(idx);
	});

	window.addEventListener('resize', function () { if (isDesktop()) goTo(currentIndex()); });
})();
