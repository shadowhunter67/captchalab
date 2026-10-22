# CaptchaLab

Monorepo mã nguồn mở, mục đích giáo dục/nghiên cứu: thử nhiều loại CAPTCHA, xem sự kiện tương tác, đặc trưng hành vi, replay, so sánh người vs tương tác tổng hợp. Chạy cục bộ; KHÔNG upload dữ liệu thô mặc định.

## Rules bắt buộc

- Không đọc/in file `.env`.
- Chỉ tự động hoá (synthetic) trên CAPTCHA do CaptchaLab tự tạo. KHÔNG bypass/giải CAPTCHA bên thứ ba; không fingerprint; không gán nhãn "bot/người" tuyệt đối, không điểm "97% human".
- `captcha-core` không phụ thuộc React/Next. Không `any`. Định nghĩa feature đổi nghĩa → bump `FEATURE_DEFINITIONS_VERSION`; đổi schema event → bump `SCHEMA_VERSION`.
- Câu miễn trừ bắt buộc trong phần Learn: CaptchaLab minh hoạ tín hiệu mà hệ thống CAPTCHA có thể dùng, không tái tạo cơ chế nội bộ của CAPTCHA thương mại.

## Stack & môi trường

- pnpm 12 qua corepack (máy chưa có pnpm global): dùng `corepack pnpm ...`. Turbo cần `pnpm` trên PATH nên `pnpm typecheck/test` ở root chưa chạy được → dùng `corepack pnpm -r run typecheck` / `test`.
- TypeScript strict, Vitest 3. (Cài 2026-10-22: turbo, typescript, vitest; `allowBuilds: esbuild` trong pnpm-workspace.yaml.)

## Lệnh thường dùng

```
corepack pnpm install
corepack pnpm -r run typecheck
corepack pnpm -r run test
corepack pnpm run lint   # ESLint type-aware, --max-warnings 0; cấu hình chung ở packages/config/eslint.config.mjs
node scripts/check-workspaces.mjs   # mọi package phải có script lint/typecheck/test (pnpm -r bỏ qua im lặng package thiếu script)
corepack pnpm --filter web build
corepack pnpm --filter web test:e2e   # Playwright dùng Chrome cài sẵn (channel chrome), tự dựng next dev cổng 3100 và tắt sau test
```

- Challenge xác định: `/playground/slider?seed=12345` (dùng cho E2E).

## Kiến trúc (tóm tắt)

- `packages/captcha-core` — types/events (schema v2: pointerId, pointercancel), events (recorder, gestures), geometry, timing, features (motion, FeatureSet envelope), replay/timeline, plugin (types, defineCaptchaPlugin brand, typed registry factory, rng).
- `packages/captcha-plugins` — registry.ts (compile-time map; thêm CAPTCHA mới = thêm vào object này) + `slider/` (tham chiếu CAPTCHA kéo/chuyển động: types=định nghĩa toán học, generator, verifier, feature-extractor, plugin) + `checkbox/` (tham chiếu CAPTCHA nhấn/phím, không trajectory: `activations.ts` = định nghĩa "activation" DUY NHẤT dùng cho feature và replay).
- `packages/config` — tsconfig.base.json.
- `apps/web` — Next.js 16 + Tailwind 4 (App Router). `/` và `/playground/slider`. `features/slider/`: `slider-controller.ts` (state machine thuần, không DOM, có test), `SliderSurface` (DOM/pointer capture/ResizeObserver), `SliderSession` (1 challenge = 1 session, remount theo key), `SliderInspect` (ghép primitive), `SliderReplay`; selector/dữ liệu riêng Slider: `slider-view-data.ts`, `replay-state.ts` (handle replay từ gesture + marker). `lib/pointer-adapter.ts` = biên DOM→event chuẩn hoá. `components/inspect/` + `lib/inspect/` = primitive CHUNG (Card, VerificationSummary, MetricTable, TrajectoryView, MotionChart, EventTimeline, EventInspector, ReplayControls) — không được biết Slider. `lib/replay/` = replay-clock (state machine thuần), replay-driver (RAF), markers. Math slider KHÔNG nằm ở web (dùng `slider/geometry.ts` của plugin).
- `apps/web/features/checkbox/` — native `<input type="checkbox">` là nguồn sự thật; `checkbox-controller.ts` (ghi input ≠ chuyển trạng thái; submit trong onChange SAU pointerup/keyup), `CheckboxReplay` + `checkbox-replay-state.ts`, `CheckboxLearn`. KHÔNG có trajectory/chart (cố ý). Chung mới rút ra: `lib/useSeededChallenge.ts`, `lib/inspect/useEventSelection.ts`, `lib/replay/useReplayPanel.ts`, `components/inspect/EventExplorer.tsx`; `InspectMetric` = Numeric | Text.
- Chưa có: visualization package, synthetic, database, ui package.
- ADR: `docs/adr/` (0001–0005). Bảng dữ liệu thay thế cho chart: `MotionDataTable` + `lib/inspect/series.ts` (định nghĩa mẫu hợp lệ DUY NHẤT cho chart/summary/table).

## Bẫy đã biết

- Motion features tính theo "track" ngắt sau pointerup, bỏ `click`, gộp timestamp trùng (xem `pointerTracks`).
- Plugin phải tạo bằng `defineCaptchaPlugin` (đóng dấu + freeze); registry từ chối plugin viết tay. `extractFeatures(challenge, interaction, context)` — context là hình học UI (px).
- Slider giả định handle căn GIỮA dưới con trỏ (u = x − trackLeft − handleWidth/2); UI phải theo mapping này.
- Test compile-time = `@ts-expect-error` trong test, tsc kiểm tra; `pnpm -r typecheck` phải chạy cùng test.
- Replay: mọi thao tác đổi ánh xạ thời gian (pause/speed/seek/restart) phải `settle()` + rebase mốc RAF trước (bug thật đã gặp). Reset do "Try again" là `SessionMarker` (web), KHÔNG phải InteractionEvent.
- Chart vận tốc/gia tốc của Slider = chỉ drag handle (không hover), mỗi attempt 1 đường riêng; series tính ở core (`motion-series.ts`) trùng định nghĩa aggregate.
- CI: `.github/workflows/ci.yml` (Node từ `.nvmrc` = 24.16.0, corepack, `--frozen-lockfile`, lint→typecheck→test→build→E2E; E2E với `CI=true` dùng `next start` + Chromium của Playwright, local dùng Chrome cài sẵn + dev server). Chưa chạy trên GitHub thật (chưa có remote).
- Lint: `no-console` cấm log (chỉ error/warn) = chốt chặn riêng tư; bộ rule React Compiler của react-hooks v7 CỐ Ý chưa bật (nhiễu), backlog.
- Privacy E2E dùng helper `apps/web/e2e/privacy.ts` (`watchPrivacy`): bắt request, console, ghi storage/IndexedDB/cookie; route CAPTCHA mới phải có kịch bản riêng.
- Tài liệu cộng đồng: README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, `docs/adding-a-captcha.md` (guide thêm CAPTCHA). CHƯA có LICENSE (chủ repo chưa chọn; không tự chọn).
- `apps/web/next-env.d.ts` và `AGENTS.md` do Next sinh → gitignore, không track.
- Checkbox: Space (không phải Enter) kích hoạt; keydown lặp không ghi; mouse thả ngoài control → không có pointerup → press "open", không tính activation; KHÔNG suy "thả ngoài" từ hình học (touch có implicit capture). Feature "successful" suy từ parity của event, KHÔNG phải đáp án đã verify (kích hoạt bằng assistive tech không có event → replay rỗng).
- E2E: scrubber `fill` không chạm đúng biên → dùng `scrubToEdge` (Home/End); `ReplayControls` snap giá trị gần biên (trình duyệt làm tròn 15 chữ số).
- Playwright: SVG `line` rộng/cao 0 không bao giờ "visible" → dùng `toHaveCount`; `input[type=range]` cần `step="any"` nếu min lẻ.
- Web: một bộ handler trên track (event từ handle nổi bọt lên) → mỗi event ghi đúng 1 lần. Resize giữa lúc kéo = huỷ attempt (ghi pointercancel, nhả capture, bỏ qua phần còn lại của con trỏ đó). Không setState theo pointermove (handle dịch bằng ref/transform).
- Web giả định track không border, không CSS transform; track dịch ngang không đổi kích thước giữa lúc kéo sẽ lệch toạ độ (backlog).
- "Try again" GỘP attempt vào cùng session (cố ý, `numberOfAttempts`); lần nộp bằng bàn phím sau pointer hiển thị metric kéo của lần trước (UI có ghi chú).
- Windows: ký tự `*/` trong comment `/** */` đóng comment sớm (từng gây lỗi build); heredoc bash dài có dấu nháy hay lỗi → ghi file bằng Write rồi chạy script.
- Codex qua openai-bridge: model mặc định lỗi; dùng `model: "gpt-5.6-sol"`, read-only (cập nhật 2026-10-22).

## Tài liệu chi tiết — đọc khi cần

| File | Đọc khi |
|---|---|
| [`docs/adr/`](docs/adr) | Cần lý do các quyết định kiến trúc |
| [`docs/claude/lich-su.md`](docs/claude/lich-su.md) | Backlog / lịch sử |
