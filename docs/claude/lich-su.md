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

## 2026-10-23 — Phase 2C (Image Rotation) — MVP Fast-Track
Plugin `rotation` (góc độ, verifier chịu wrap 359↔0, 9 feature, `angles.ts` mô phỏng dùng chung), route `/playground/rotation` (role=slider: kéo + ←/→), Inspect dùng lại primitive + chart vận tốc góc + replay, Learn. Thêm đơn vị `deg`, `deg/s`. Codex 1 lượt: P1 phím trong lúc kéo + replay bỏ cancelled drag → đã sửa. Nợ kỹ thuật chuyển sang `docs/technical-debt.md`.

## 2026-10-23 — Phase 2D (Text CAPTCHA)
Plugin `text`, route `/playground/text`: SVG distorted text deterministic, verify trim + không phân biệt hoa/thường, 8 feature, key codes gộp (Letter/Digit/Other) để không lộ chữ gõ, text xoá khỏi ô khi đạt, kết quả huỷ khi nội dung đổi (paste cũng tính). Codex 1 lượt: 3 P1 đã sửa; thiếu phương án phi thị giác → nợ kỹ thuật.

## Nợ kỹ thuật (cũ; bản hiện hành: docs/technical-debt.md)
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

## Image Grid (Phase A3)
- Plugin `image-grid` (3x3 SVG tiles, đáp án `{selected}`), route `/playground/image-grid`; toggle = pointer down+up trên cùng ô hoặc Space/Enter keydown; chọn theo click native.
- Codex 1 lượt: sửa verifier (bắt đúng 3x3/shape/id, giới hạn độ dài), lọc ô lạ trong extractor, pointerup ngoài ô -> pointercancel, chặn Enter repeat. P2 -> technical-debt.

## Sprint B
- `/playground` + `/learn` (apps/web/lib/catalog.ts) và `/compare` (Slider người dùng vs session tổng hợp Linear/Eased/Noisy từ lib/synthetic/slider-synthetic.ts; chỉ khác biệt mô tả, không bot score).
- Codex 1 lượt cho Compare: đổi nhãn Corrections -> Overshoot, xoá kết quả người khi Try again, ghi chú a11y.

## Release prep (2026-10-23)
- LICENSE Apache-2.0 (chuẩn từ apache.org), package.json có license, branch master -> main khớp CI. Codex final: P0 LICENSE chưa track (đã add), P1 README "five" và wording typed text (đã sửa). Version package giữ 0.0.0 (private).

## v0.5 Behavioral Lab (2026-10-26)
- `/behavior`, `/compare?captcha=` (Slider, Drag & Drop, Checkbox, Image Grid, Text, Rotation), `/behavior/invisible`. Code: `apps/web/lib/behavior/*` (signals, vector, synthetic profiles, rules/normalize/classifier `behavioral-baseline@1`, compare/observations/reference, invisible task). Chi tiết: `docs/behavioral-lab.md`.
- Recorder / registry / plugin KHÔNG đổi; 5 Session thêm prop tuỳ chọn `onResult` / `onReset` / `showInspect`.
- Quy tắc cứng: chỉ 3 nhãn Human-like / Synthetic-like / Uncertain, KHÔNG phần trăm, KHÔNG "bot"; luôn kèm câu miễn trừ; vùng Uncertain phải với tới được; synthetic sinh dữ liệu trực tiếp (không DOM event, không trang bên thứ ba); không fingerprint / storage / upload.
- Bẫy: E2E phải `scrollIntoViewIfNeeded` trước khi tính toạ độ chuột (trang Compare dài, slider nằm dưới nếp gấp); bash heredoc dài có nháy hay lỗi -> dùng Write + script.

## v0.6 Research workbench (2026-10-26)
- `/builder` (challenge-definition@1), `/experiments` (experiment-bundle@1, interaction-session@1, experiment-summary@1 one-way). Code: `apps/web/lib/research/{safe,definition,experiment,formats,browser}.ts`, `features/{builder,experiments}`, `components/behavior/CohortStrips.tsx`. Docs: `docs/data-formats.md`, `docs/experiment-workbench.md`.
- Quy tắc cứng: dữ liệu import là untrusted (đo kích thước trước khi đọc; duyệt cây lặp, không đệ quy; cấm khoá __proto__/constructor/prototype; object STRICT, khoá lạ = lỗi; version sai bị từ chối, không đoán); synthetic xuất dạng công thức {profile, baseSeed, runs} (seed i = baseSeed + i) nên cùng bundle → cùng dữ liệu; `null` là thiếu, không bao giờ là 0; đếm kết quả phân loại, KHÔNG accuracy/%; classifier KHÔNG bị chỉnh bởi dữ liệu import; không storage/localStorage.
- Checksum (sha256 canonical JSON) KHÔNG gồm `createdAt`; không phải chữ ký. `startedAt` xuất = 0.
- Bẫy: `new Array(n).fill()` là any[] (lint unsafe); biến thể thật: checkbox `basic`, image-grid `basic-shapes`, drag-drop `shape-match`, text `clean|rotated|noisy`; URL builder sai biến thể -> rơi về mặc định (không sửa âm thầm).

## v0.7 Eleven-CAPTCHA coverage (2026-10-27)
- Thêm shape-matching, math-logic, sequence, memory, audio vào Behavioral Lab/Compare/Builder/Experiments (PoW loại có chủ đích: đo phép tính, không đo tương tác). Code: `lib/behavior/analysis.ts` (5 case), `synthetic/generators-more.ts`, `rules.ts` (khối "v0.7"), 5 Session thêm onResult/onReset/showInspect. Docs: mục "v0.7" trong `docs/behavioral-lab.md`.
- Classifier VẪN `behavioral-baseline@1`: luật của 6 CAPTCHA v0.5 giữ nguyên từng byte (test `v07.test.ts` ghim checksum `968990f7…`); luật mới chỉ thêm. Muốn đổi luật cũ → bump version.
- Memory là CAPTCHA duy nhất cần context ngoài layout: `{recallStartMs}`; synthetic Memory luôn đo theo context CỦA CHÍNH NÓ (bỏ qua context người dùng truyền vào).
- Biến thể thật: shape-matching `exact|pattern`, math `arithmetic|comparison`, sequence `number|visual`, memory `sequence|position`, audio `spoken-digits|noisy-digits`.

## v0.8 Labeled dataset layer (2026-10-28)
- `/experiments/dataset`, format `captchalab-labeled-dataset@1`. Code: `lib/dataset/{records,format,store}.ts`, `features/dataset/DatasetPage.tsx`, `components/dataset/AddToDataset.tsx`; "Add to dataset" trong Compare/Experiments/Builder. Docs: `docs/datasets.md`.
- Quy tắc cứng: NHÃN ≠ kết quả classifier (hai khái niệm độc lập; không hàm nào đọc classifier để đặt nhãn, classifier không nhận nhãn — test); recorded mặc định `unknown`; synthetic do CaptchaLab sinh = `synthetic` + khoá nhãn; import: envelope all-or-nothing, record xét từng cái, tín hiệu + classifier LUÔN tính lại (claims chỉ để tham khảo), nhãn KHÔNG tính lại, provenance synthetic kiểm bằng sinh lại và so khớp, id trùng thì đổi id (không ghi đè), Memory dùng lại checkMemoryContext; session gõ chữ chỉ được chứa lớp phím (KeyA/Digit5 bị từ chối ở MỌI reader).
- Classifier vẫn `behavioral-baseline@1`; checksum luật của cả 11 CAPTCHA được ghim trong `lib/dataset/__tests__/dataset.test.ts`. KHÔNG thêm accuracy/precision/recall/F1 — thuộc v0.9.
- Store là singleton module trong 1 tab (không localStorage). Điều hướng client-side giữ dữ liệu, `page.goto`/reload thì mất → E2E dùng link trong trang và `dialog.accept` cho beforeunload; privacy E2E tách phần điều hướng (request RSC của Next) khỏi phần thao tác dữ liệu.


## v0.9 Fast completion (2026-10-30)
- Thêm 4 plugin độc lập: `match-key`, `tile-game` (dùng `shared/glyph.ts` + `shared/activations.ts`), `proof-of-space` (mô phỏng; `byteAt(seed,i)` là hàm thuần nên verifier không cấp phát buffer; runner cấp phát đúng 1 `Uint8Array`, điền 64 KB/lát, giải phóng khi cancel/finish), `browser-capability` (chỉ kiểm tra tên API tồn tại, trả boolean; test quét mã nguồn cấm API vân tay/lưu trữ). KHÔNG đưa vào classifier/Compare/Builder/Dataset/synthetic; `behavioral-baseline@1` và `captchalab-labeled-dataset@1` giữ nguyên.
- Lab ghép (không phải plugin): `lib/hybrid` (PoW rồi Slider/Audio, đạt khi cả hai đạt cho ĐÚNG challenge id hiện tại), `/playground/invisible` (dùng lại `InvisibleLab`), `/playground/adaptive` (`lib/adaptive`: chỉ import classifier + `escalationFor`, test cấm luật/ngưỡng mới).
- Evaluation: `lib/evaluation`, `/experiments/evaluation` (Unknown loại; Uncertain là cột riêng; nhóm <5 mẫu = Insufficient sample; sandbox chỉ sửa bản sao của `DEFAULT_THRESHOLDS`). Điều hướng Experiments/Dataset/Evaluation: `components/ExperimentsNav.tsx`.
- Taxonomy: `lib/taxonomy.ts` là danh sách trung tâm (family, kind captcha/lab/system, cờ hỗ trợ SUY RA từ `BEHAVIOR_CAPTCHAS`/VARIANT_SETS, không gõ tay). Playground/Learn/sidebar/ma trận phủ (`components/CoverageMatrix.tsx`, `/learn#coverage`) đều đọc từ đó; số đếm trong E2E lấy từ `TAXONOMY`, đừng hardcode. Câu trung thực: "covers major ... families through generic educational implementations", không bao giờ ghi 100%.
- Bẫy: heredoc dài trong bash hay lỗi (dùng Write tool); nhiều file là CRLF (python helper phải giữ `
`); Next điều hướng client sinh request RSC nên `watchPrivacy` chỉ gọi trên trang đứng yên.

## v0.10 Stabilization + beta prep (2026-10-30)
- Không thêm CAPTCHA, không đổi classifier (`behavioral-baseline@1`), không đổi schema. Browser Capability BỎ HẲN mọi thời lượng (probeTime/computeTime/reactionTime): chỉ boolean + đếm; test cấm `performance.now`/`Date.now` trong module. Hybrid: `lib/id-scope.tsx` (`IdScope` + `useScopedId`) cho Card và Session/Inspect của PoW/Slider/Audio, tiền tố `${kind}-pow-` / `${kind}-child-`.
- `e2e/a11y.ts` (`idProblems`, `expectValidIds`) + `e2e/stability.spec.ts`: mọi route ở 1000/400/390/360px không trùng id, không ARIA hỏng, không tràn ngang, không console error. Trang mới mount 2 session → phải bọc `IdScope`.
- Tên Inspect: "Behavioral metrics" (CAPTCHA tương tác), "Computation metrics" (PoW/PoS), "Environment capabilities" (Browser Capability) — `ComputationInspect` có prop `metricsTitle`.
- Learn cho Hybrid/Invisible/Adaptive: `lib/lab-learn.ts`. Docs mới: `docs/privacy.md`, `docs/limitations.md`, `docs/releases/v0.10.0-beta.md`.
- Drag & Drop keyboard vẫn là nợ (quyết định: không viết lại controller trong beta).

## v0.11 Stabilization (2026-10-30)
- Drag & Drop bàn phím: `DragDropController.keySelect/keyPlace/keyCancel` (cùng `resolveDrop` với kéo thả, tâm vùng thả làm điểm thả), view state có `selectedItemId` + `keyNotice`; chỉ ghi `keydown` Enter/Space/Escape với target `drag-item:`/`drop-target:`. Shape và vùng thả là `role=button`, shape đứng TRƯỚC vùng thả trong DOM (Tab đi hết shape rồi mới tới vùng). Phiên chỉ-bàn-phím không có attempt con trỏ nên tín hiệu con trỏ là null, không phải 0.
- Đa trình duyệt: `playwright.config.ts` có 3 project (chromium chạy tất cả; firefox/webkit chỉ `e2e/cross/*.cross.spec.ts`), script `test:e2e` (chromium) và `test:e2e:cross`; CI cài firefox+webkit riêng. WebKit của Playwright trên Windows KHÔNG có Web Audio nên test Audio tự rẽ nhánh (`hasWebAudio`). Đã chạy `playwright install webkit` (cache `%LOCALAPPDATA%\ms-playwright`, ~60 MB).
- Test hủy PoS/PoW dùng kỹ thuật kéo dài: nhân `performance.now` x100 và đẩy `setTimeout(0)` lên 100 ms SAU khi hydrate, nên run luôn đủ dài để hủy trên mọi máy (throttle CPU làm trang đơ).
- PoW: `isPowChallenge` (cùng kiểm tra với verifier) chặn thử thách sai trước khi băm; hook `onError` tuỳ chọn.
- Audio: `AudioContext.resume()` KHÔNG bao giờ settle khi máy không có thiết bị âm thanh (Firefox trên runner Linux CI) → trước đây kẹt "Loading audio…". Giờ clip tải song song với resume, chờ resume tối đa `RESUME_WAIT_MS`=2500, sau đó `onError("unavailable")`. Lỗi này chỉ lộ ra nhờ smoke Firefox trên CI (local Windows có thiết bị âm thanh).
