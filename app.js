/**
 * 전국 어린이보호구역 지도 애플리케이션 (app.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const mapElement = document.getElementById('map');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const facilityTypeList = document.getElementById('facilityTypeList');
  const selectAllTypesBtn = document.getElementById('selectAllTypesBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const recenterBtn = document.getElementById('recenterBtn');
  const cctvFilterBtns = document.querySelectorAll('.cctv-btn');

  // Stat Elements
  const statTotal = document.getElementById('statTotal');
  const statInstalled = document.getElementById('statInstalled');
  const statInstalledPct = document.getElementById('statInstalledPct');
  const statUninstalled = document.getElementById('statUninstalled');
  const statUninstalledPct = document.getElementById('statUninstalledPct');

  // Application State
  let rawData = [];
  let filteredData = [];
  let selectedTypes = new Set();
  let selectedCctv = 'all'; // 'all', 'Y', 'N'
  let searchQuery = '';

  // Leaflet Map & Cluster Group
  let map = null;
  let markerCluster = null;

  // Blue Pin SVG Icon (CCTV 설치)
  const blueSvgIcon = L.divIcon({
    className: 'custom-pin-icon',
    html: `
      <svg class="pin-svg" width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#2563EB"/>
        <circle cx="14" cy="14" r="7" fill="white"/>
        <path d="M12 10.5L16 14L12 17.5" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32]
  });

  // Red Pin SVG Icon (CCTV 미설치)
  const redSvgIcon = L.divIcon({
    className: 'custom-pin-icon',
    html: `
      <svg class="pin-svg" width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#EF4444"/>
        <circle cx="14" cy="14" r="7" fill="white"/>
        <circle cx="14" cy="14" r="3.5" fill="#EF4444"/>
      </svg>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32]
  });

  // 1. Initialize Leaflet Map
  function initMap() {
    // Center map on South Korea
    const koreaCenter = [36.2, 127.8];
    const initialZoom = 7;

    map = L.map('map', {
      center: koreaCenter,
      zoom: initialZoom,
      zoomControl: false
    });

    // Add Zoom Control to Top Right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize MarkerCluster Group
    markerCluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      disableClusteringAtZoom: 16,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false
    });

    map.addLayer(markerCluster);
  }

  // 2. Load Dataset
  async function loadData() {
    try {
      if (window.KIDS_ZONE_DATA && Array.isArray(window.KIDS_ZONE_DATA)) {
        rawData = window.KIDS_ZONE_DATA;
      } else {
        const response = await fetch('data.json');
        rawData = await response.json();
      }
      
      console.log(`Loaded ${rawData.length} records.`);
      initFacilityTypes();
      applyFilters();
    } catch (err) {
      console.error('Data loading error:', err);
      facilityTypeList.innerHTML = `
        <div style="color: var(--danger-color); padding: 1rem; text-align: center;">
          <i class="fa-solid fa-triangle-exclamation"></i> 데이터를 로드하지 못했습니다.
        </div>
      `;
    }
  }

  // 3. Dynamically Populate Facility Types Filter
  function initFacilityTypes() {
    const typeCounts = {};
    rawData.forEach(item => {
      const t = item.t || '기타';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    // Sort by count descending
    const sortedTypes = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);

    selectedTypes = new Set(sortedTypes); // All checked by default

    facilityTypeList.innerHTML = '';
    sortedTypes.forEach(t => {
      const itemEl = document.createElement('label');
      itemEl.className = 'facility-item';
      itemEl.innerHTML = `
        <div class="facility-label">
          <input type="checkbox" value="${t}" checked>
          <span>${t}</span>
        </div>
        <span class="facility-count">${typeCounts[t].toLocaleString()}</span>
      `;

      const checkbox = itemEl.querySelector('input');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedTypes.add(t);
        } else {
          selectedTypes.delete(t);
        }
        applyFilters();
      });

      facilityTypeList.appendChild(itemEl);
    });
  }

  // 4. Apply Filters Logic
  function applyFilters() {
    const q = searchQuery.trim().toLowerCase();

    filteredData = rawData.filter(item => {
      // CCTV Filter
      if (selectedCctv !== 'all' && item.c !== selectedCctv) {
        return false;
      }

      // Facility Type Filter
      const t = item.t || '기타';
      if (!selectedTypes.has(t)) {
        return false;
      }

      // Search Query Filter (Facility name or address)
      if (q !== '') {
        const nameMatch = item.n && item.n.toLowerCase().includes(q);
        const addrMatch = item.a && item.a.toLowerCase().includes(q);
        if (!nameMatch && !addrMatch) {
          return false;
        }
      }

      return true;
    });

    updateStats();
    updateMapMarkers();
  }

  // 5. Update Statistics Counter Cards
  function updateStats() {
    const total = filteredData.length;
    let installed = 0;
    let uninstalled = 0;

    filteredData.forEach(item => {
      if (item.c === 'Y') {
        installed++;
      } else {
        uninstalled++;
      }
    });

    statTotal.textContent = total.toLocaleString();
    statInstalled.textContent = installed.toLocaleString();
    statUninstalled.textContent = uninstalled.toLocaleString();

    const installedPct = total > 0 ? ((installed / total) * 100).toFixed(1) : 0;
    const uninstalledPct = total > 0 ? ((uninstalled / total) * 100).toFixed(1) : 0;

    statInstalledPct.textContent = `${installedPct}%`;
    statUninstalledPct.textContent = `${uninstalledPct}%`;
  }

  // 6. Render Map Markers
  function updateMapMarkers() {
    markerCluster.clearLayers();

    const markers = filteredData.map(item => {
      const isCctvYes = item.c === 'Y';
      const marker = L.marker([item.lat, item.lng], {
        icon: isCctvYes ? blueSvgIcon : redSvgIcon
      });

      // Bind Custom Popup
      marker.bindPopup(createPopupContent(item), {
        maxWidth: 340,
        className: 'custom-leaflet-popup'
      });

      return marker;
    });

    markerCluster.addLayers(markers);
  }

  // 7. Generate Marker Popup HTML Content
  function createPopupContent(item) {
    const isCctvYes = item.c === 'Y';
    const cctvCountText = item.cc && item.cc !== '0' ? `(${item.cc}대)` : '';
    const widthText = item.w ? `${item.w}` : '정보 없음';
    const policeText = item.p ? `${item.p}` : '미기재';

    return `
      <div class="popup-card">
        <div class="popup-header ${isCctvYes ? 'cctv-yes' : 'cctv-no'}">
          <div class="popup-title">${item.n || '보호구역 명칭 미기재'}</div>
          <div class="popup-badge-wrapper">
            <span class="popup-tag"><i class="fa-solid fa-school"></i> ${item.t || '시설구분'}</span>
          </div>
        </div>
        <div class="popup-body">
          <div class="popup-info-row">
            <i class="fa-solid fa-location-dot"></i>
            <div class="popup-info-content">
              <span class="popup-info-label">주소</span>
              <div class="popup-info-val">${item.a || '주소 정보 없음'}</div>
            </div>
          </div>

          <div class="popup-info-row">
            <i class="fa-solid fa-ruler-horizontal"></i>
            <div class="popup-info-content">
              <span class="popup-info-label">보호구역 도로폭</span>
              <div class="popup-info-val">${widthText}</div>
            </div>
          </div>

          <div class="popup-info-row">
            <i class="fa-solid fa-building-shield"></i>
            <div class="popup-info-content">
              <span class="popup-info-label">관할 경찰서</span>
              <div class="popup-info-val">${policeText}</div>
            </div>
          </div>

          <div class="cctv-status-box ${isCctvYes ? 'yes' : 'no'}">
            <span><i class="fa-solid ${isCctvYes ? 'fa-video' : 'fa-video-slash'}"></i> CCTV ${isCctvYes ? '설치 완료' : '미설치 (N)'}</span>
            <span>${isCctvYes ? cctvCountText : ''}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Event Listeners

  // Sidebar Toggle (Mobile / Desktop)
  sidebarToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  sidebarCloseBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
  });

  // CCTV Filter Group Button Click
  cctvFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      cctvFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCctv = btn.dataset.cctv;
      applyFilters();
    });
  });

  // Search Input Event
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery.trim() !== '') {
      searchClearBtn.classList.remove('hidden');
    } else {
      searchClearBtn.classList.add('hidden');
    }
    applyFilters();
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.classList.add('hidden');
    applyFilters();
  });

  // Select All / Deselect All Facility Types
  let allTypesSelected = true;
  selectAllTypesBtn.addEventListener('click', () => {
    allTypesSelected = !allTypesSelected;
    const checkboxes = facilityTypeList.querySelectorAll('input[type="checkbox"]');
    
    selectedTypes.clear();
    checkboxes.forEach(cb => {
      cb.checked = allTypesSelected;
      if (allTypesSelected) {
        selectedTypes.add(cb.value);
      }
    });

    selectAllTypesBtn.textContent = allTypesSelected ? '전체해제' : '전체선택';
    applyFilters();
  });

  // Reset Filters Button
  resetFiltersBtn.addEventListener('click', () => {
    // Reset CCTV
    selectedCctv = 'all';
    cctvFilterBtns.forEach(b => {
      if (b.dataset.cctv === 'all') b.classList.add('active');
      else b.classList.remove('active');
    });

    // Reset Search
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.classList.add('hidden');

    // Reset Checkboxes
    const checkboxes = facilityTypeList.querySelectorAll('input[type="checkbox"]');
    selectedTypes.clear();
    checkboxes.forEach(cb => {
      cb.checked = true;
      selectedTypes.add(cb.value);
    });
    allTypesSelected = true;
    selectAllTypesBtn.textContent = '전체선택';

    applyFilters();
  });

  // Recenter Map Button
  recenterBtn.addEventListener('click', () => {
    if (map) {
      map.setView([36.2, 127.8], 7, { animate: true });
    }
  });

  // Initialize Map and Load Data
  initMap();
  await loadData();
});
