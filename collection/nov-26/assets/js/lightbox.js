(function () {
	// Per-page gallery: every photo on a page opens in a lightbox with its own
	// caption (data-caption). Prev/next stay within the same page.
	var SEL = '.photo-grid img, img.hero-photo';

	var box, figImg, figCap, counter, btnClose, btnPrev, btnNext, btnZoomIn, btnZoomOut;
	var items = [];
	var idx = 0;
	var lastFocus = null;
	var touchX = null;

	// pan/zoom state for the currently displayed image - reset whenever
	// the image changes (show()) or the lightbox closes.
	var ZOOM_STEP = 0.5, ZOOM_MAX = 4;
	var zoomScale = 1, panX = 0, panY = 0;
	var dragging = false, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;
	var touchDragging = false;

	function applyZoom() {
		figImg.style.transform = zoomScale === 1
			? ''
			: 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoomScale + ')';
		figImg.classList.toggle('zoomed', zoomScale > 1);
		btnZoomOut.disabled = zoomScale <= 1;
		btnZoomIn.disabled = zoomScale >= ZOOM_MAX;
	}

	function resetZoom() {
		zoomScale = 1;
		panX = 0;
		panY = 0;
		applyZoom();
	}

	function zoomBy(delta) {
		zoomScale = Math.max(1, Math.min(ZOOM_MAX, zoomScale + delta));
		if (zoomScale === 1) { panX = 0; panY = 0; }
		applyZoom();
	}

	function build() {
		if (box) return;
		box = document.createElement('div');
		box.className = 'lightbox';
		box.setAttribute('role', 'dialog');
		box.setAttribute('aria-modal', 'true');
		box.setAttribute('aria-label', 'Photo gallery');
		box.hidden = true;
		box.innerHTML =
			'<button type="button" class="lb-btn lb-close" aria-label="Close">&times;</button>' +
			'<button type="button" class="lb-btn lb-prev" aria-label="Previous photo">&#8249;</button>' +
			'<button type="button" class="lb-btn lb-next" aria-label="Next photo">&#8250;</button>' +
			'<div class="lb-zoom-controls">' +
			'<button type="button" class="lb-btn lb-zoom-out" aria-label="Zoom out">&minus;</button>' +
			'<button type="button" class="lb-btn lb-zoom-in" aria-label="Zoom in">+</button>' +
			'</div>' +
			'<figure class="lb-figure"><img class="lb-img" alt="">' +
			'<figcaption class="lb-caption"></figcaption></figure>' +
			'<div class="lb-count" aria-live="polite"></div>';
		document.body.appendChild(box);
		figImg = box.querySelector('.lb-img');
		figCap = box.querySelector('.lb-caption');
		counter = box.querySelector('.lb-count');
		btnClose = box.querySelector('.lb-close');
		btnPrev = box.querySelector('.lb-prev');
		btnNext = box.querySelector('.lb-next');
		btnZoomIn = box.querySelector('.lb-zoom-in');
		btnZoomOut = box.querySelector('.lb-zoom-out');

		btnClose.addEventListener('click', close);
		btnPrev.addEventListener('click', function () { show(idx - 1); });
		btnNext.addEventListener('click', function () { show(idx + 1); });
		btnZoomIn.addEventListener('click', function (e) { e.stopPropagation(); zoomBy(ZOOM_STEP); });
		btnZoomOut.addEventListener('click', function (e) { e.stopPropagation(); zoomBy(-ZOOM_STEP); });
		box.addEventListener('click', function (e) {
			if (e.target === box || e.target === figImg.parentNode) close();
		});

		// drag-to-pan once zoomed in (mouse) - only engages past 1x so a
		// plain click at the default size still just does nothing special.
		figImg.addEventListener('mousedown', function (e) {
			if (zoomScale <= 1) return;
			dragging = true;
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			panStartX = panX;
			panStartY = panY;
			figImg.classList.add('dragging');
			e.preventDefault();
		});
		window.addEventListener('mousemove', function (e) {
			if (!dragging) return;
			panX = panStartX + (e.clientX - dragStartX);
			panY = panStartY + (e.clientY - dragStartY);
			applyZoom();
		});
		window.addEventListener('mouseup', function () {
			if (!dragging) return;
			dragging = false;
			figImg.classList.remove('dragging');
		});

		// touch: swipe prev/next at 1x (existing behaviour), drag-to-pan
		// once zoomed in instead - the two gestures share the same fingers
		// so which one applies depends on the current zoom level.
		box.addEventListener('touchstart', function (e) {
			if (e.touches.length !== 1) return;
			if (zoomScale > 1) {
				touchDragging = true;
				dragStartX = e.touches[0].clientX;
				dragStartY = e.touches[0].clientY;
				panStartX = panX;
				panStartY = panY;
			} else {
				touchX = e.touches[0].clientX;
			}
		}, { passive: true });
		box.addEventListener('touchmove', function (e) {
			if (!touchDragging) return;
			panX = panStartX + (e.touches[0].clientX - dragStartX);
			panY = panStartY + (e.touches[0].clientY - dragStartY);
			applyZoom();
			e.preventDefault();
		}, { passive: false });
		box.addEventListener('touchend', function (e) {
			if (touchDragging) { touchDragging = false; return; }
			if (touchX === null) return;
			var dx = e.changedTouches[0].clientX - touchX;
			touchX = null;
			if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
		}, { passive: true });
	}

	function show(i) {
		if (!items.length) return;
		idx = (i + items.length) % items.length;
		var el = items[idx];
		resetZoom();
		figImg.src = el.currentSrc || el.src;
		figImg.alt = el.alt || '';
		var cap = el.getAttribute('data-caption') || '';
		figCap.textContent = cap;
		figCap.hidden = !cap;
		counter.textContent = (idx + 1) + ' / ' + items.length;
		var multi = items.length > 1;
		btnPrev.hidden = !multi;
		btnNext.hidden = !multi;
		counter.hidden = !multi;
		if (multi) {
			[items[(idx + 1) % items.length], items[(idx - 1 + items.length) % items.length]].forEach(function (n) {
				var pre = new Image();
				pre.src = n.currentSrc || n.src;
			});
		}
	}

	function galleryFor(img) {
		var page = img.closest('.spread');
		var list = page ? page.querySelectorAll(SEL) : [img];
		return Array.prototype.slice.call(list);
	}

	function open(img) {
		build();
		items = galleryFor(img);
		lastFocus = document.activeElement;
		box.hidden = false;
		document.documentElement.classList.add('lb-open');
		show(Math.max(0, items.indexOf(img)));
		btnClose.focus();
	}

	function close() {
		if (!box || box.hidden) return;
		box.hidden = true;
		resetZoom();
		figImg.removeAttribute('src');
		document.documentElement.classList.remove('lb-open');
		if (lastFocus && lastFocus.focus) lastFocus.focus();
	}

	function isOpen() { return box && !box.hidden; }

	document.addEventListener('click', function (e) {
		if (isOpen() && box.contains(e.target)) return;
		var t = e.target;
		if (!t.closest) return;
		var wrap = t.closest('.photo-grid-num');
		var img = wrap ? wrap.querySelector('img') : t.closest('img');
		if (img && img.matches(SEL)) {
			e.preventDefault();
			open(img);
		}
	});

	// capture phase so the desktop slider's arrow-key handler doesn't also fire
	document.addEventListener('keydown', function (e) {
		if (isOpen()) {
			if (e.key === 'Escape') { close(); }
			else if (e.key === 'ArrowRight') { show(idx + 1); }
			else if (e.key === 'ArrowLeft') { show(idx - 1); }
			else if (e.key === 'Tab') {
				var f = [btnClose, btnPrev, btnNext, btnZoomOut, btnZoomIn].filter(function (b) { return !b.hidden && !b.disabled; });
				var i = f.indexOf(document.activeElement);
				var n = e.shiftKey ? i - 1 : i + 1;
				f[(n + f.length) % f.length].focus();
			} else { return; }
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		var a = document.activeElement;
		if ((e.key === 'Enter' || e.key === ' ') && a && a.matches && a.matches(SEL)) {
			e.preventDefault();
			open(a);
		}
	}, true);

	Array.prototype.forEach.call(document.querySelectorAll(SEL), function (img) {
		img.setAttribute('tabindex', '0');
		img.setAttribute('role', 'button');
		img.setAttribute('aria-label', 'View larger: ' + (img.alt || 'photo'));
	});
})();
