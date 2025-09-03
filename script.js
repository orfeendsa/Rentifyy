// Simple web bot for Car-Rento
(function () {
  const chatWindow = document.getElementById('chat');
  const suggestBarEl = document.getElementById('suggestions');
  const summaryBar = document.getElementById('summaryBar');

  const state = {
    step: 'start',
    selectedDates: null, // {start, end, days}
    selectedVehicle: null,
    pickupLocation: null,
    dropoffLocation: null,
    reservationId: null,
    datesConfirmed: false,
  };

  const locations = [
    'Honolulu International Airport (HNL)',
    'Waikiki Beach',
    'Kapolei',
    'Kailua',
    'Ko Olina',
  ];

  const vehicles = [
    {
      id: 'eco-1',
      name: 'Toyota Corolla',
      type: 'Economy',
      pricePerDay: 49,
      img: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?q=80&w=1200&auto=format&fit=crop',
      desc: 'Great mileage, compact and easy to drive',
    },
    {
      id: 'suv-1',
      name: 'Jeep Wrangler',
      type: 'SUV',
      pricePerDay: 109,
      img: 'https://images.unsplash.com/photo-1517940310602-75f39d4ac1ad?q=80&w=1200&auto=format&fit=crop',
      desc: 'Perfect for adventures around Oahu',
    },
    {
      id: 'lux-1',
      name: 'BMW 4 Series Convertible',
      type: 'Luxury',
      pricePerDay: 199,
      img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200&auto=format&fit=crop',
      desc: 'Open-top cruising with style',
    },
    {
      id: 'van-1',
      name: 'Chrysler Pacifica',
      type: 'Minivan',
      pricePerDay: 129,
      img: 'https://images.unsplash.com/photo-1619762252359-97a9ef19b4b9?q=80&w=1200&auto=format&fit=crop',
      desc: 'Spacious for families and groups',
    },
  ];

  function appendMessage({ role, html }) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'bot' ? '🚗' : '🙂';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const name = role === 'bot' ? 'Car-Rento' : 'You';
    bubble.innerHTML = `<div class="name">${name}</div>` + html;
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatWindow.appendChild(wrapper);
    
   
    requestAnimationFrame(() => {
      scrollToLatest();
    });
  }

  function appendTyping() {
    const wrapper = document.createElement('div');
    wrapper.className = 'message bot typing';
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = '🚗';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = '<span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatWindow.appendChild(wrapper);
    
    requestAnimationFrame(() => {
      scrollToLatest();
    });
    return wrapper;
  }

  async function botReply(html, delay = 600) {
    const t = appendTyping();
    await new Promise(r => setTimeout(r, delay));
    t.remove();
    appendMessage({ role: 'bot', html });
  }

  // Suggestions management
  const SUGGEST_LABELS = {
    'rent': 'Book a Car',
    'offers': 'Offers',
    'contact': 'Contact Us',
    'confirm-dates': 'Confirm dates',
    'confirm-locations': 'Confirm locations & price',
    'final-confirm': 'Confirm reservation',
    'cancel': 'Cancel',
    'change-car': 'Change Car Selection',
    'change-locations': 'Change Locations',
    'change-dates': 'Change Dates',
  };

  function renderSuggestions(actionIds) {
    if (!suggestBarEl) return;
    const unique = Array.from(new Set(actionIds)).filter(Boolean);
    suggestBarEl.innerHTML = unique.map(id => `<button class="chip" data-action="${id}">${SUGGEST_LABELS[id] || id}</button>`).join('');
  }

  function showSuggestions() {
    const html = `
      <div>Welcome to Car-Rento! How can I assist you today?</div>
    `;
    appendMessage({ role: 'bot', html });
    renderSuggestions(['rent','offers','contact']);
  }

  function daysBetween(start, end) {
    const ms = Math.abs(end - start);
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  function askDates() {
    state.step = 'dates';
    const html = `
      <div>1 - Please select your Pick Dates and Drop off dates.</div>
      <div class="row" style="margin-top:8px">
        <div class="field"><label>Pick-up Date</label><input type="date" id="pickupDate"></div>
        <div class="field"><label>Drop-off Date</label><input type="date" id="dropoffDate"></div>
      </div>
      <div style="margin-top:10px">
        <button class="chip" data-action="confirm-dates">Confirm dates</button>
      </div>
    `;
    botReply(html);
    const base = ['confirm-dates','contact','cancel'];
    if (state.selectedVehicle) base.splice(1, 0, 'change-car');
    renderSuggestions(base);
  }

  // Removed auto-advance date flow (restored manual confirm)

  function toInputDate(d) {
    const pad = (n) => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function showAvailableVehicles() {
    const days = state.selectedDates?.days ?? 1;
    const slider = `
      <div>Here are vehicles available for ${days} ${days === 1 ? 'day' : 'days'}:</div>
      <div class="carousel">
        <div class="carousel-track">
          ${vehicles.map(v => `
            <div class="vehicle-card">
              <img src="${v.img}" alt="${v.name}">
              <div class="info">
                <p class="title">${v.name} · ${v.type}</p>
                <p class="desc">${v.desc}</p>
              </div>
              <div class="actions">
                <span class="price">$${v.pricePerDay}/day</span>
                <button class="select-btn" data-select-vehicle="${v.id}">Select</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="carousel-nav">
          <button class="carousel-btn prev" data-carousel="prev">❮</button>
          <button class="carousel-btn next" data-carousel="next">❯</button>
        </div>
      </div>
    `;
    botReply(slider);
    state.step = 'vehicle';
    renderSuggestions(['contact','cancel']);
  }

  function askLocationsAndPrice() {
    const days = state.selectedDates.days;
    const total = days * state.selectedVehicle.pricePerDay;
    state.quotedTotal = total;
    const html = `
      <div>Great choice! Please pick your locations:</div>
      <div class="row" style="margin-top:8px">
        <div class="field">
          <label>Pick-up Location</label>
          <select id="pickupLoc">
            <option value="" selected disabled>Select pick-up</option>
            ${locations.map(l => `<option value="${l}">${l}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Drop-off Location</label>
          <select id="dropoffLoc">
            <option value="" selected disabled>Select drop-off</option>
            ${locations.map(l => `<option value="${l}">${l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="meta">Estimated price for ${days} ${days === 1 ? 'day' : 'days'}: <strong>$${total.toFixed(2)}</strong> (taxes/fees may apply)</div>
      <div style="margin-top:10px">
        <button class="chip" data-action="confirm-locations">Confirm locations & price</button>
      </div>
    `;
    botReply(html);
    state.step = 'locations';
    renderSuggestions(['confirm-locations','change-car','change-dates','cancel']);
    renderInlineSummary();
  }

  function showSummaryAndConfirm() {
    const { selectedVehicle: v, selectedDates, pickupLocation, dropoffLocation, quotedTotal } = state;
    const html = `
      <div>Please confirm your reservation details:</div>
      <ul style="margin:8px 0 0 18px; color: var(--muted)">
        <li>Vehicle: <strong>${v.name} · ${v.type}</strong></li>
        <li>Duration: <strong>${selectedDates.days} ${selectedDates.days === 1 ? 'day' : 'days'}</strong> (${selectedDates.start.toDateString()} → ${selectedDates.end.toDateString()})</li>
        <li>Pick-up: <strong>${pickupLocation}</strong></li>
        <li>Drop-off: <strong>${dropoffLocation}</strong></li>
        <li>Total: <strong>$${quotedTotal.toFixed(2)}</strong></li>
      </ul>
      <div style="margin-top:10px">
        <button class="chip" data-action="final-confirm">Confirm reservation</button>
        <button class="chip" data-action="cancel">Cancel</button>
      </div>
    `;
    botReply(html);
    state.step = 'confirm';
    renderSuggestions(['final-confirm','change-car','change-locations','change-dates','cancel']);
    renderInlineSummary();
  }

  function finalizeReservation() {
    const rid = 'RES-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    state.reservationId = rid;
    const { selectedVehicle: v, selectedDates, pickupLocation, dropoffLocation, quotedTotal } = state;
    const summaryCard = getSummaryCardHtml();
    const html = `
      <div>🎉 Congratulations and welcome to Hawaii!</div>
      <div>Your reservation is confirmed:</div>
      ${summaryCard}
      <ul style="margin:8px 0 0 18px; color: var(--muted)">
        <li>Reservation #: <strong>${rid}</strong></li>
      </ul>
      <div style="margin-top:10px">Show this number at pickup. Need help? Call <strong>808-289-8898</strong>.</div>
    `;
    hideInlineSummary();
    appendMessage({ role: 'bot', html });
    state.step = 'done';
    botReply('Would you like to make another reservation?', 500);
    renderSuggestions(['rent','offers','contact']);
    hideInlineSummary();
  }

  function resetFlow() {
    state.step = 'start';
    state.selectedDates = null;
    state.selectedVehicle = null;
    state.pickupLocation = null;
    state.dropoffLocation = null;
    state.reservationId = null;
    state.quotedTotal = null;
    showSuggestions();
    hideInlineSummary();
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    setTimeout(() => scrollToLatest(), 0);

    // Carousel controls
    if (target.matches('[data-carousel]')) {
      const dir = target.getAttribute('data-carousel');
      const track = target.closest('.carousel')?.querySelector('.carousel-track');
      if (track) {
        const card = track.querySelector('.vehicle-card');
        const step = (card?.clientWidth || 260) + 12; // card width + gap
        track.scrollBy({ left: dir === 'next' ? step : -step, behavior: 'smooth' });
      }
      return;
    }

    const action = target.getAttribute('data-action');
    if (action === 'change-car') {
      appendMessage({ role: 'user', html: 'Change Car Selection' });
      state.selectedVehicle = null;
      hideInlineSummary();
      botReply('No problem — pick a different vehicle below.');
      showAvailableVehicles();
      return;
    }
    if (action === 'change-locations') {
      appendMessage({ role: 'user', html: 'Change Locations' });
      state.pickupLocation = null;
      state.dropoffLocation = null;
      botReply('Sure — update your pick-up and drop-off locations.');
      askLocationsAndPrice();
      return;
    }
    if (action === 'change-dates') {
      appendMessage({ role: 'user', html: 'Change Dates' });
      state.selectedDates = null;
      state.datesConfirmed = false;
      state.quotedTotal = null;
      hideInlineSummary();
      botReply("Okay — let's update your dates.");
      askDates();
      return;
    }
    if (action === 'rent') {
      appendMessage({ role: 'user', html: 'Book a Car' });
      botReply("Great! Let's get your dates first.");
      askDates();
      return;
    }
    if (action === 'offers') {
      appendMessage({ role: 'user', html: 'Offers' });
      botReply(`
        <div>Here are current specials:</div>
        <ul style="margin:6px 0 0 18px; color: var(--muted)">
          <li>Weekly Saver: 10% off 7+ day rentals</li>
          <li>Convertible Summer: $20 off/day on luxury convertibles</li>
          <li>Family Van Deal: Free child seat with minivans</li>
        </ul>
        <div style=\"margin-top:8px\">Ready to proceed? Tap <strong>Book a Car</strong> to pick dates.</div>
      `);
      return;
    }
    if (action === 'contact') {
      appendMessage({ role: 'user', html: 'Contact Us' });
      botReply('You can reach us at <strong>808-289-8898</strong> · Mon - Sun: 8:00 AM - 6:00 PM · 91-294 Kauhi Street #A Kapolei HI 96707');
      return;
    }
    if (action === 'confirm-dates') {
      const pu = document.getElementById('pickupDate');
      const dof = document.getElementById('dropoffDate');
      if (!(pu && dof)) return;
      const start = pu.value ? new Date(pu.value) : null;
      const end = dof.value ? new Date(dof.value) : null;
      // Basic min rules
      const today = new Date(); today.setHours(0,0,0,0);
      if (pu && !pu.min) pu.min = toInputDate(today);
      if (dof && !dof.min) dof.min = toInputDate(today);
      if (start && !isNaN(start)) {
        const minDrop = new Date(start.getTime() + 24*60*60*1000);
        dof.min = toInputDate(minDrop);
      }
      if (!start || !end || isNaN(start) || isNaN(end)) {
        botReply('<span style="color:#dc2626">Please select valid dates.</span>', 300);
        return;
      }
      if (end <= start) {
        botReply('<span style="color:#dc2626">Drop-off must be after pick-up date.</span>', 300);
        return;
      }
      const days = daysBetween(start, end);
      state.selectedDates = { start, end, days };
      state.datesConfirmed = true;
      appendMessage({ role: 'user', html: `${start.toDateString()} to ${end.toDateString()} (${days} ${days === 1 ? 'day' : 'days'})` });
      botReply('Awesome, checking availability for those dates...');
      showAvailableVehicles();
      return;
    }
    if (action === 'confirm-locations') {
      const pl = document.getElementById('pickupLoc');
      const dl = document.getElementById('dropoffLoc');
      if (!(pl && dl)) return;
      const pv = pl.value;
      const dv = dl.value;
      if (!pv || !dv) {
        botReply('<span style="color:#dc2626">Please choose both pick-up and drop-off locations.</span>', 300);
        return;
      }
      state.pickupLocation = pv;
      state.dropoffLocation = dv;
      appendMessage({ role: 'user', html: `Pick-up: ${pv} · Drop-off: ${dv}` });
      botReply("Got it. Here's a quick summary before we confirm.");
      showSummaryAndConfirm();
      renderSuggestions(['final-confirm','change-car','change-locations','cancel']);
      return;
    }
    if (action === 'final-confirm') {
      appendMessage({ role: 'user', html: 'Confirm reservation' });
      botReply('Finalizing your reservation...');
      setTimeout(finalizeReservation, 600);
      return;
    }
    if (action === 'cancel') {
      appendMessage({ role: 'user', html: 'Cancel' });
      botReply('No problem. Starting over.');
      resetFlow();
      return;
    }

    // Vehicle selection
    const vehId = target.getAttribute('data-select-vehicle');
    if (vehId) {
      const v = vehicles.find(v => v.id === vehId);
      if (v) {
        state.selectedVehicle = v;
        appendMessage({ role: 'user', html: `Selected: ${v.name}` });
        if (!state.datesConfirmed) {
          botReply("Great pick! Let's grab your dates next.");
          askDates();
        } else {
          botReply('Great pick! Just need your pick-up and drop-off spots.');
          askLocationsAndPrice();
        }
      }
      return;
    }
  });

  function renderInlineSummary() {
    if (!summaryBar) return;
    const v = state.selectedVehicle;
    const d = state.selectedDates;
    if (!v || !d) return;
    summaryBar.innerHTML = getSummaryCardHtml();
    summaryBar.classList.add('show');
  }

  function hideInlineSummary() {
    if (!summaryBar) return;
    summaryBar.classList.remove('show');
    summaryBar.innerHTML = '';
  }

  function moveSummaryToChat() {
    if (!summaryBar || !summaryBar.classList.contains('show')) return;
    const ghost = summaryBar.querySelector('.summary-card');
    if (!ghost) return;
    const html = ghost.outerHTML;
    // Quick visual hint of movement (fade)
    ghost.style.transition = 'transform .25s ease, opacity .25s ease';
    ghost.style.transform = 'translateY(-12px)';
    ghost.style.opacity = '0';
    setTimeout(() => {
      appendMessage({ role: 'bot', html: `<div>Reservation summary:</div>${html}` });
      hideInlineSummary();
    }, 250);
  }

  function getSummaryCardHtml() {
    const v = state.selectedVehicle;
    const d = state.selectedDates;
    if (!v || !d) return '';
    const total = state.quotedTotal ?? d.days * v.pricePerDay;
    const locLine = state.pickupLocation && state.dropoffLocation
      ? `<div class="meta">${escapeHtml(state.pickupLocation)} → ${escapeHtml(state.dropoffLocation)}</div>`
      : '';
    return `
      <div class="summary-card">
        <img src="${v.img}" alt="${v.name}">
        <div>
          <div class="title">${v.name} · ${v.type}</div>
          <div class="meta">${d.start.toDateString()} → ${d.end.toDateString()} · ${d.days} ${d.days === 1 ? 'day' : 'days'}</div>
          ${locLine}
        </div>
        <div class="total">$${total.toFixed(2)}</div>
      </div>
    `;
  }


  function escapeHtml(str) {
    return str.replace(/[&<>"]+/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  const observer = new MutationObserver(() => {
    const isNearBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 100;
    if (isNearBottom) {
      scrollToLatest();
    }
  });
  
  observer.observe(chatWindow, { 
    childList: true, 
    subtree: true, 
    characterData: true 
  });

  // Greet
  showSuggestions();
  function scrollToLatest() {
    const scrollToBottom = () => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    };
    
    // Immediate scroll
    scrollToBottom();
    
    // Delayed scrolls to handle async content loading
    setTimeout(scrollToBottom, 10);
    setTimeout(scrollToBottom, 50);
    setTimeout(scrollToBottom, 100);
  }
})();


