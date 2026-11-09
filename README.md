# Manga Archive — website đọc manga cá nhân

Website đọc truyện tranh tĩnh, chạy hoàn toàn trên **GitHub Pages** — không cần backend, không cần cơ sở dữ liệu. Toàn bộ nội dung là các thư mục ảnh trong `manga/`.

## Tính năng

- **Trang chủ**: lưới các bộ truyện với ảnh bìa, số tập, số trang.
- **Trang truyện**: danh sách tập (Tap-01, Tap-02, …), mô tả, tác giả, trạng thái.
- **Trang đọc**: cuộn dọc liên tục, tải ảnh tự động khi cuộn (lazy-load), thanh tiến độ đọc, chỉ số trang hiện tại, nút chuyển chế độ hiển thị, nút về đầu trang, điều hướng tập trước/tập tiếp, hỗ trợ phím mũi tên / PageUp / PageDown / Home / End.
- **Tự động sắp xếp**: thứ tự ảnh và tập theo tên file (kiểu tự nhiên: `2` trước `10`).
- Thiết kế tối ưu cho điện thoại (responsive), giao diện tối tập trung đọc.

## Đăng lên GitHub Pages (lần đầu)

```bash
# 1. Tạo repo mới trên GitHub, ví dụ: ten-ban.github.io  (hoặc repo tên bất kỳ)
# 2. Trong thư mục project:
git init
git add .
git commit -m "Manga Archive — lần đầu"
git branch -M main
git remote add origin https://github.com/TEN_BAN/ten-ban.github.io.git
git push -u origin main
```

Vào **Settings → Pages → Source: Deploy from a branch → main / (root)**. Khoảng 1–2 phút sau site chạy tại `https://ten-ban.github.io/`.
(Nếu đặt repo tên khác, site chạy tại `https://ten-ban.github.io/ten-repo/` — code đã dùng đường dẫn tương đối nên vẫn hoạt động.)

## Thêm truyện mới

Chỉ cần thêm thư mục — ví dụ thêm truyện "Rồng Xanh":

```
manga/
└── Rong-Xanh/
    ├── info.json        (tuỳ chọn — tên hiển thị, tác giả, mô tả, trạng thái, ảnh bìa)
    ├── cover.jpg        (tuỳ chọn — bỏ trống sẽ lấy trang đầu tiên)
    ├── Tap-01/
    │   ├── 001.jpg
    │   ├── 002.jpg
    │   └── 003.jpg
    └── Tap-02/
        ├── 001.jpg
        └── ...
```

**Quy tắc quan trọng:**

1. Tên ảnh nên đánh số đệm 0: `001.jpg, 002.jpg, … 010.jpg` để thứ tự đúng.
2. Tên thư mục tập: `Tap-01, Tap-02, …` (số càng nhỏ hiện càng trước).
3. Định dạng ảnh: `.jpg .jpeg .png .webp .gif .avif .bmp`.
4. Sau khi thêm ảnh, **cập nhật danh sách** bằng 1 trong 2 cách:
   - **Tự động**: GitHub Action `.github/workflows/update-manifest.yml` đã có sẵn — chỉ cần `git push`, Action tự tạo lại `manga/manifest.json` và commit.
   - **Thủ công**: chạy `python3 tools/build_manifest.py` rồi push kèm file `manga/manifest.json`.

## Tuỳ biến

| Muốn đổi | Sửa file |
|---|---|
| Tên site, câu giới thiệu trang chủ | `config.js` |
| Màu sắc, font, bố cục | `assets/css/style.css` (biến màu ở khối `:root`) |
| Ảnh bìa / tác giả / mô tả từng truyện | `manga/<Tên truyện>/info.json` |

Ví dụ `info.json`:

```json
{
  "title": "Hành Trình Của Gió",
  "author": "Tên bạn",
  "description": "Mô tả ngắn về truyện…",
  "status": "Đang tiến hành",
  "cover": "cover.jpg"
}
```

## Cấu trúc project

```
├── index.html          ← toàn bộ giao diện (SPA, hash routing)
├── config.js           ← cấu hình site
├── assets/
│   ├── css/style.css
│   ├── js/app.js
│   └── favicon.svg
├── manga/              ← TOÀN BỘ TRUYỆN Ở ĐÂY
│   └── <Tên truyện>/<Tập>/ảnh…
├── tools/build_manifest.py
└── .github/workflows/update-manifest.yml
```
