# Lịch sử & backlog

## 2026-10-22 — Phase 0 (lõi)
Dựng monorepo + `captcha-core` (21 test pass, tsc sạch). Codex review (gpt-5.6-sol) → đã sửa: timestamp đơn điệu + từ chối NaN, track tách theo gesture, bỏ `click` khỏi đường đi, gộp timestamp trùng, gia tốc theo midpoint, modality `none`, bỏ `meta` tự do.

## 2026-10-22 — Phase 1A (registry có kiểu + Slider core)
Registry map compile-time, `defineCaptchaPlugin` (brand+freeze), `FeatureSet` envelope (schemaVersion+extractorVersion), schema v2 (pointerId, pointercancel, bỏ meta), gestures, `captcha-plugins/slider`. 56 test. Codex review x3: chấp nhận bug retry nối track, namespace contact, tie-break endIndex, brand chống bivariance, validate challenge; từ chối "start==target overshoot" (có chủ đích).

## 2026-10-22 — Phase 1B (web vertical slice Slider)
apps/web (Next 16, Tailwind 4), `/playground/slider`: generate→render→Pointer Events→verify→features→Inspect→trajectory SVG→replay. Core: thêm `recorder.snapshot()`; plugin: thêm `slider/geometry.ts` (nguồn sự thật cho pixel↔normalized). 26+36+31 unit test, 6 E2E (Chrome), build sạch. Codex review x2: chấp nhận challenge pin-at-mount, resize-abort nhả capture + bỏ qua pointer còn đè, replay handle không theo hover, keyup rò sau Enter, pointerType lạ bị từ chối, test privacy chặt hơn; từ chối "Try again gộp attempt" (chủ ý); hoãn transform/track-shift.

## 2026-10-22 — Phase 1C (replay + Inspect primitives + biểu đồ)
Core: `motion-series.ts` (velocity/acceleration theo track), `gestureTrack`, `recorder.elapsedMs()`; accel timestamp = tâm khoảng giữa 2 midpoint. Web: replay clock/driver (play/pause/restart/0.5-1-2x/scrub), marker reset, primitive Inspect chung, EventTimeline + EventInspector, chart SVG velocity/acceleration, selection đồng bộ (index trong session). Codex x3: sửa neo thời gian RAF (seek/speed/restart), marker ngoài miền replay/timeline, timestamp trùng → replay rỗng, closure cũ khi paused, bin highlight sai, nhãn "try again" cứng trong component chung, selection gắn theo session, memo; hoãn: bảng dữ liệu cho chart (text alt hiện có min/max/peak), MetricUnit đóng (có `format` override). 41+36+72 unit test, 10 E2E, build sạch, kiểm tra thị giác desktop/mobile (không tràn ngang).

## Nợ kỹ thuật
- Web: toạ độ lệch nếu ancestor có CSS transform hoặc track dịch ngang không đổi kích thước giữa lúc kéo (cần đo lại origin theo frame hoặc dùng offset theo pointer).
- Replay: reset handle do "Try again" không phải event nên không tái hiện; chưa có tốc độ/scrub nâng cao.
- Không có test component (jsdom không hỗ trợ Pointer Events đầy đủ); logic nằm ở controller (unit) + E2E.
- Chưa có Shift+Arrow bước lớn; screen reader chỉ nhận vị trí, không nhận vị trí target.
- Chưa dùng `getCoalescedEvents` (mẫu thô bị giới hạn bởi tần số event).
- ESLint/CI chưa thiết lập (Phase 1C bỏ qua vì phụ).
- Chart: chưa có bảng dữ liệu thay thế; mô tả chữ chỉ có min/max/đỉnh. Timeline bin chỉ dùng chuột (bàn phím dùng Previous/Next).
- Replay giả định 1 con trỏ thật; marker chỉ có `attempt-reset`.
- Chưa test component React (jsdom) — logic đã tách thuần; hook `useReplayDriver` chỉ được phủ bởi E2E.
- Grab offset: Slider giả định handle căn giữa con trỏ; thêm `grabOffset` vào SliderFeatureContext nếu UI không căn giữa.
- Session import cần validator (t không giảm, hữu hạn); extractor giả định đơn điệu (recorder đảm bảo).
- Timeline replay chưa lọc theo pointerId (một con trỏ).
- Hai họ sự kiện (pointer*/touch*) không được khử trùng; adapter chỉ phát một họ.
- Privacy: coarsen `startedAt`, xem lại thu `code` phím, export schema riêng.
- Chưa có: apps/web, eslint, CI, turbo chạy được (cần pnpm trong PATH).
