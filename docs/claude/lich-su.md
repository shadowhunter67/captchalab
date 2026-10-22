# Lịch sử & backlog

## 2026-10-22 — Phase 0 (lõi)
Dựng monorepo + `captcha-core` (21 test pass, tsc sạch). Codex review (gpt-5.6-sol) → đã sửa: timestamp đơn điệu + từ chối NaN, track tách theo gesture, bỏ `click` khỏi đường đi, gộp timestamp trùng, gia tốc theo midpoint, modality `none`, bỏ `meta` tự do.

## 2026-10-22 — Phase 1A (registry có kiểu + Slider core)
Registry map compile-time, `defineCaptchaPlugin` (brand+freeze), `FeatureSet` envelope (schemaVersion+extractorVersion), schema v2 (pointerId, pointercancel, bỏ meta), gestures, `captcha-plugins/slider`. 56 test. Codex review x3: chấp nhận bug retry nối track, namespace contact, tie-break endIndex, brand chống bivariance, validate challenge; từ chối "start==target overshoot" (có chủ đích).

## Nợ kỹ thuật
- Grab offset: Slider giả định handle căn giữa con trỏ; thêm `grabOffset` vào SliderFeatureContext nếu UI không căn giữa.
- Session import cần validator (t không giảm, hữu hạn); extractor giả định đơn điệu (recorder đảm bảo).
- Timeline replay chưa lọc theo pointerId (một con trỏ).
- Hai họ sự kiện (pointer*/touch*) không được khử trùng; adapter chỉ phát một họ.
- Privacy: coarsen `startedAt`, xem lại thu `code` phím, export schema riêng.
- Chưa có: apps/web, eslint, CI, turbo chạy được (cần pnpm trong PATH).
