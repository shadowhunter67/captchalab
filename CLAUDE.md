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
```

## Kiến trúc (tóm tắt)

- `packages/captcha-core` — types/events (schema v2: pointerId, pointercancel), events (recorder, gestures), geometry, timing, features (motion, FeatureSet envelope), replay/timeline, plugin (types, defineCaptchaPlugin brand, typed registry factory, rng).
- `packages/captcha-plugins` — registry.ts (compile-time map; thêm CAPTCHA mới = thêm vào object này) + `slider/` (tham chiếu: types=định nghĩa toán học, generator, verifier, feature-extractor, plugin).
- `packages/config` — tsconfig.base.json.
- Chưa có: apps/web (Next.js), visualization, synthetic, database, ui.
- ADR: `docs/adr/` (0001–0004).

## Bẫy đã biết

- Motion features tính theo "track" ngắt sau pointerup, bỏ `click`, gộp timestamp trùng (xem `pointerTracks`).
- Plugin phải tạo bằng `defineCaptchaPlugin` (đóng dấu + freeze); registry từ chối plugin viết tay. `extractFeatures(challenge, interaction, context)` — context là hình học UI (px).
- Slider giả định handle căn GIỮA dưới con trỏ (u = x − trackLeft − handleWidth/2); UI phải theo mapping này.
- Test compile-time = `@ts-expect-error` trong test, tsc kiểm tra; `pnpm -r typecheck` phải chạy cùng test.
- Codex qua openai-bridge: model mặc định lỗi; dùng `model: "gpt-5.6-sol"`, read-only (cập nhật 2026-10-22).

## Tài liệu chi tiết — đọc khi cần

| File | Đọc khi |
|---|---|
| [`docs/adr/`](docs/adr) | Cần lý do các quyết định kiến trúc |
| [`docs/claude/lich-su.md`](docs/claude/lich-su.md) | Backlog / lịch sử |
