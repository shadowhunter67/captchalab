# Lịch sử & backlog

## 2026-10-22 — Phase 0 (lõi)
Dựng monorepo + `captcha-core` (21 test pass, tsc sạch). Codex review (gpt-5.6-sol) → đã sửa: timestamp đơn điệu + từ chối NaN, track tách theo gesture, bỏ `click` khỏi đường đi, gộp timestamp trùng, gia tốc theo midpoint, modality `none`, bỏ `meta` tự do.

## 2026-10-22 — Phase 1A (registry có kiểu + Slider core)
Registry map compile-time, `defineCaptchaPlugin` (brand+freeze), `FeatureSet` envelope (schemaVersion+extractorVersion), schema v2 (pointerId, pointercancel, bỏ meta), gestures, `captcha-plugins/slider`. 56 test. Codex review x3: chấp nhận bug retry nối track, namespace contact, tie-break endIndex, brand chống bivariance, validate challenge; từ chối "start==target overshoot" (có chủ đích).

## 2026-10-22 — Phase 1B (web vertical slice Slider)
apps/web (Next 16, Tailwind 4), `/playground/slider`: generate→render→Pointer Events→verify→features→Inspect→trajectory SVG→replay. Core: thêm `recorder.snapshot()`; plugin: thêm `slider/geometry.ts` (nguồn sự thật cho pixel↔normalized). 26+36+31 unit test, 6 E2E (Chrome), build sạch. Codex review x2: chấp nhận challenge pin-at-mount, resize-abort nhả capture + bỏ qua pointer còn đè, replay handle không theo hover, keyup rò sau Enter, pointerType lạ bị từ chối, test privacy chặt hơn; từ chối "Try again gộp attempt" (chủ ý); hoãn transform/track-shift.

## 2026-10-22 — Phase 1C (replay + Inspect primitives + biểu đồ)
Core: `motion-series.ts` (velocity/acceleration theo track), `gestureTrack`, `recorder.elapsedMs()`; accel timestamp = tâm khoảng giữa 2 midpoint. Web: replay clock/driver (play/pause/restart/0.5-1-2x/scrub), marker reset, primitive Inspect chung, EventTimeline + EventInspector, chart SVG velocity/acceleration, selection đồng bộ (index trong session). Codex x3: sửa neo thời gian RAF (seek/speed/restart), marker ngoài miền replay/timeline, timestamp trùng → replay rỗng, closure cũ khi paused, bin highlight sai, nhãn "try again" cứng trong component chung, selection gắn theo session, memo; hoãn: bảng dữ liệu cho chart (text alt hiện có min/max/peak), MetricUnit đóng (có `format` override). 41+36+72 unit test, 10 E2E, build sạch, kiểm tra thị giác desktop/mobile (không tràn ngang).

## 2026-10-22 — Phase 1D (public alpha hardening)
ESLint chung (typescript-eslint recommendedTypeChecked + no-floating-promises + no-console + hooks cổ điển + Next), CI GitHub Actions, preflight workspace, bảng dữ liệu chart (MotionDataTable, trần 1000 dòng, "Showing first N of M"), helper privacy E2E, README/CONTRIBUTING/SECURITY/CODE_OF_CONDUCT, `docs/adding-a-captcha.md`, lib/seed.ts dùng chung. Lint tìm 2 lỗi nhỏ (prefer-const, cast thừa). Codex x3: nhận phần lớn (neo CI, Node pin, CI==="true", preflight, hooks/typed rules, table cap + focus, định nghĩa mẫu hợp lệ chung, verifier challenge null, privacy helper, guide: click/keyboard, marker Slider-only, vị trí util); bác dùng Turbo trong CI (cần pnpm PATH), giữ Chrome local mặc định.

## 2026-10-23 — Phase 2A (Checkbox CAPTCHA)
Plugin `checkbox` (challenge `{id, expectedChecked}`, answer `{checked}`, 7 feature riêng + FeatureSet, `activations.ts` dùng chung cho feature & replay), route `/playground/checkbox` (native input, verify ngay khi tick, bỏ tick xoá kết quả, toggle cộng dồn cùng session), Inspect dựng từ primitive chung (không trajectory/chart), replay checkbox, Learn. Rút chung vì có consumer thứ 2: useSeededChallenge, useEventSelection, useReplayPanel, EventExplorer, InspectMetric union. Sửa bug thật tìm được: scrub tới cuối đôi lúc không "finished" (làm tròn range). Codex x3: nhận thả-ngoài-không-suy-từ-hình-học, keydown lặp = cùng một lần giữ, keyup khác target kết thúc press, blur reset, độc lập pointer/key pressed, rút keo chung; hoãn: replay theo parity (assistive activation), thứ tự cùng timestamp, registry vs import plugin trực tiếp, extractFeatures context=undefined; bác: tham số tuỳ chọn cho context, bắt buộc parent key (cùng mẫu Slider).

## 2026-10-23 — Phase 2B (Drag & Drop CAPTCHA)
Cleanup: legend `click` cho timeline (`TIMELINE_LEGEND` dùng chung), `extractFeatures` không cần `undefined` (`FeatureContextArgs`, bỏ `AnyCaptchaPlugin`, registry constraint = brand+id). Plugin `drag-drop`: 3 hình + 3 vùng (toạ độ chuẩn hoá theo tâm, kích thước theo min(w,h)), luật thả hình học, bump occupant, grab offset thật, verifier chịu input độc hại (own-data, hasOwn, try/catch), feature riêng (13, `drag-drop@1;motion@1`), attempts. Web: controller thuần + surface (pointer capture), session (Verify), Inspect dùng lại toàn bộ primitive + bảng attempts, chart/table/trajectory nhiều attempt có nhãn, replay vật thể di chuyển/snap/trả về, Learn (ghi rõ không có bàn phím). 130+ unit web, 98 plugin, 40 E2E (có cảm ứng CDP). Codex x4: sửa nearest-free (rồi thay bằng bump), verifier prototype keys, overlapped/open attempts, dispose nhả capture, đánh số segment gốc, grab-offset dùng chung từ plugin; hoãn: origin lệch khi bề mặt dịch không đổi size, role=img cho draggable (chờ phương án bàn phím).

## Nợ kỹ thuật
- Drag & Drop: KHÔNG có phương án bàn phím (chọn shape → chọn vùng → đặt) — cần thiết kế riêng; draggable đang `role=img` (trung thực nhưng chưa tương tác được bằng AT).
- Drag & Drop: một session ↔ một layout; resize sau khi đã có input chỉ cảnh báo, không chuẩn hoá lại toạ độ cũ. Bề mặt bị CSS transform/dịch ngang giữa lúc kéo vẫn lệch toạ độ (như Slider).
- Replay Drag & Drop: vật thể về/snap tức thời (không hoạt ảnh); attempts chồng lấn (chỉ từ session nhập) bị coi là cancelled.
- Checkbox: replay suy trạng thái từ parity event (assistive activation không replay được); blur giữa Space làm keydown mồ côi, keydown kế tiếp bị extractor coi là lặp (pressDuration có thể phình); event cùng timestamp không phân biệt thứ tự trên trục thời gian.
- `extractFeatures(challenge, session, undefined)` là nghi thức cho plugin không cần context/challenge.
- Web: toạ độ lệch nếu ancestor có CSS transform hoặc track dịch ngang không đổi kích thước giữa lúc kéo (cần đo lại origin theo frame hoặc dùng offset theo pointer).
- Replay: reset handle do "Try again" không phải event nên không tái hiện; chưa có tốc độ/scrub nâng cao.
- Không có test component (jsdom không hỗ trợ Pointer Events đầy đủ); logic nằm ở controller (unit) + E2E.
- Chưa có Shift+Arrow bước lớn; screen reader chỉ nhận vị trí, không nhận vị trí target.
- Chưa dùng `getCoalescedEvents` (mẫu thô bị giới hạn bởi tần số event).
- Bộ rule React Compiler của eslint-plugin-react-hooks v7 chưa bật (flag setState-in-effect/refs ở vài chỗ cố ý); cân nhắc refactor rồi bật.
- CI chưa từng chạy trên GitHub (chưa có remote); mọi bước đã chạy cục bộ kể cả chế độ CI=true.
- Chưa có LICENSE (cần quyết định của chủ repo). Chưa có issue/PR template, `examples/custom-captcha-plugin`.
- Timeline bin chỉ dùng chuột (bàn phím dùng Previous/Next).
- Replay giả định 1 con trỏ thật; marker chỉ có `attempt-reset`.
- Chưa test component React (jsdom) — logic đã tách thuần; hook `useReplayDriver` chỉ được phủ bởi E2E.
- Grab offset: Slider giả định handle căn giữa con trỏ; thêm `grabOffset` vào SliderFeatureContext nếu UI không căn giữa.
- Session import cần validator (t không giảm, hữu hạn); extractor giả định đơn điệu (recorder đảm bảo).
- Timeline replay chưa lọc theo pointerId (một con trỏ).
- Hai họ sự kiện (pointer*/touch*) không được khử trùng; adapter chỉ phát một họ.
- Privacy: coarsen `startedAt`, xem lại thu `code` phím, export schema riêng.
- Chưa có: apps/web, eslint, CI, turbo chạy được (cần pnpm trong PATH).
