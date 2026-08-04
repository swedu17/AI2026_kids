# 전국 어린이보호구역 지도 웹 애플리케이션 PRD (Product Requirement Document)

## 1. 프로젝트 개요 (Project Overview)
본 웹 애플리케이션은 `전국어린이보호구역표준데이터.csv` 데이터를 기반으로 전국의 어린이 보호구역 위치, 시설 종류, CCTV 설치 여부를 지도 상에 직관적으로 시각화하고 탐색할 수 있는 인터랙티브 지도 서비스입니다.

---

## 2. 목표 및 요구사항 (Goals & Requirements)

### 2.1 지도 시각화 (Map Visualization)
- **위도/경도 데이터 기반 위치 마킹**: CSV 파일 내 `위도`, `경도` 좌표를 이용해 정확한 지점 마핑.
- **CCTV 설치 여부별 마커 색상 구분**:
  - **CCTV 설치 (Y)**: 파란색 마커 (`#2563eb` / `#3b82f6`)
  - **CCTV 미설치 (N)**: 빨간색 마커 (`#dc2626` / `#ef4444`)
- **마커 클러스터링**: 14,000건 이상의 대용량 마커를 렌더링 시 브라우저 성능 지연을 방지하기 위한 Marker Cluster 적용.

### 2.2 사이드바 & 필터링 (Sidebar & Filtering System)
- **시설종류 필터**: 어린이집, 유치원, 초등학교, 특수학교, 학원 등 원하는 시설 유형별 필터 선택.
- **CCTV 설치여부 필터**: 전체 / CCTV 설치(Y) / CCTV 미설치(N) 빠른 필터링.
- **실시간 시설명/주소 검색**: 키워드 입력에 따른 즉시 필터링.
- **대시보드 통계 카드**:
  - 필터된 보호구역 총 건수
  - CCTV 설치 건수 및 미설치 건수
  - CCTV 설치 비율 (%)

### 2.3 상세 정보 팝업 (Interactive Popup)
- 지도 상 마커 클릭 시 해당 보호구역의 상세 정보를 커스텀 팝업으로 제공.
- **표시 항목**:
  1. **대상시설명** (`대상시설명`)
  2. **주소** (`소재지도로명주소` 또는 `소재지지번주소`)
  3. **보호구역도로폭** (`보호구역도로폭`)
  4. **관할경찰서명** (`관할경찰서명`)
  5. **CCTV 설치 상태 및 대수** (`CCTV설치여부`, `CCTV설치대수`)

---

## 3. 사용자 경험 및 UI/UX 디자인 (UI/UX Design)
- **프리미엄 미학**: 모던하고 세련된 글래스모피즘(Glassmorphism) 및 다크/라이트 카드 스타일링.
- **반응형 레이아웃**: 대형 모니터 및 모바일 기기에서도 원활하게 탐색 가능한 사이드바 접기/열기 지원.
- **빠른 데이터 로딩**: CSV 파일 파싱 최적화 또는 JSON 변환을 통한 즉각적인 초동 로딩.

---

## 4. 기술 스택 (Tech Stack)
- **Core**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3
- **Map & Visuals**: Leaflet.js v1.9.4, Leaflet.markercluster
- **Data Handling**: PapaParse CSV Reader / Preparsed JSON
- **Fonts & Graphics**: Noto Sans KR, Custom SVG Icons
