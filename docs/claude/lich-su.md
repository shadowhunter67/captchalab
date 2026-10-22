# Lịch sử & backlog

## 2026-10-22 — Phase 0 (lõi)
Dựng monorepo + `captcha-core` (21 test pass, tsc sạch). Codex review (gpt-5.6-sol) → đã sửa: timestamp đơn điệu + từ chối NaN, track tách theo gesture, bỏ `click` khỏi đường đi, gộp timestamp trùng, gia tốc theo midpoint, modality `none`, bỏ `meta` tự do.

## Backlog từ review chưa làm (làm cùng lát Slider)
- Registry typed theo id literal (hiện `AnyCaptchaPlugin` = `never` params; không gọi được generate/verify sau `get`). Cân nhắc map id→plugin hoặc adapter `unknown` + validator. Viết ADR 0002.
- Feature kèm version (`definitionsVersion`) trong envelope hoặc base contract.
- `pointerId` cho đa chạm; chọn track của lần kéo trong plugin Slider.
- Privacy: coarsen `startedAt`, xem lại việc thu `code` phím, export schema riêng.
- Chưa có: apps/web Next.js, eslint, CI.
