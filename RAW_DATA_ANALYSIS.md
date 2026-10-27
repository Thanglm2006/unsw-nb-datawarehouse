# PHÂN TÍCH CHI TIẾT DỮ LIỆU THÔ DATASET UNSW-NB15

---

## 1. TỔNG QUAN TẬP DỮ LIỆU

Dataset **UNSW-NB15** là bộ dữ liệu chuẩn quốc tế về an ninh mạng và phát hiện xâm nhập (Intrusion Detection System - IDS) được tạo bởi Phòng thí nghiệm Cyber Range thuộc Đại học New South Wales (UNSW Canberra) bằng công cụ IXIA PerfectStorm.

### 1.1 Danh mục tệp và quy mô thực tế
| Tên Tệp | Dung Lượng | Số Dòng (Records) | Vai Trò |
| :--- | :--- | :--- | :--- |
| `UNSW-NB15_1.csv` | ~168.9 MB | 700,001 | Dữ liệu luồng mạng thô (Chunk 1) |
| `UNSW-NB15_2.csv` | ~165.2 MB | 700,001 | Dữ liệu luồng mạng thô (Chunk 2) |
| `UNSW-NB15_3.csv` | ~154.6 MB | 700,001 | Dữ liệu luồng mạng thô (Chunk 3) |
| `UNSW-NB15_4.csv` | ~97.6 MB | 440,044 | Dữ liệu luồng mạng thô (Chunk 4) |
| `NUSW-NB15_features.csv` | ~4 KB | 49 dòng | Danh mục định nghĩa 49 trường dữ liệu |
| `UNSW-NB15_LIST_EVENTS.csv`| ~4.6 KB | 208 dòng | Danh mục sự kiện và phân nhóm tấn công |
| `UNSW_NB15_training-set.csv`| ~15.4 MB | 82,332 | Tập train rút gọn cho Machine Learning |
| `UNSW_NB15_testing-set.csv` | ~32.3 MB | 175,341 | Tập test rút gọn cho Machine Learning |

* **Tổng số bản ghi thô (Total Raw Flows)**: **2,540,047 dòng**.
* **Số trường thuộc tính (Features)**: **49 thuộc tính**.
* **Khung thời gian thu thập**: 2 đợt tách rời:
  * Đợt 1: `2015-01-22 11:49:37 UTC` đến `2015-01-23 03:00:00 UTC` (~16 giờ).
  * Đợt 2: `2015-02-17 22:00:00 UTC` đến `2015-02-18 12:21:09 UTC` (~14 giờ).
  * Khoảng trống gián đoạn giữa 2 đợt: gần 26 ngày.

---

## 2. PHÂN BỐ LƯU LƯỢNG VÀ ĐẶC TÍNH MẠNG

### 2.1 Phân bố nhãn (Class Distribution)
* **Lưu lượng bình thường (`Label = 0`)**: **2,218,764 bản ghi (87.35%)**.
* **Lưu lượng tấn công (`Label = 1`)**: **321,283 bản ghi (12.65%)**.

### 2.2 Phân bố 9 nhóm tấn công (`attack_cat`)
| Nhóm Tấn Công | Số Lượng Bản Ghi | Tỷ Lệ / Tổng Tấn Công | Đặc Điểm |
| :--- | :--- | :--- | :--- |
| **Generic** | 215,481 | 67.07% | Chiếm đa số tuyệt đối, tấn công mã hóa/kỹ thuật chung |
| **Exploits** | 44,525 | 13.86% | Khai thác lỗ hổng đã biết |
| **Fuzzers** | 24,246 | 7.55% | Gửi dữ liệu ngẫu nhiên làm quá tải phần mềm |
| **DoS** | 16,353 | 5.09% | Tấn công từ chối dịch vụ |
| **Reconnaissance** | 13,987 | 4.35% | Quét cổng, thăm dò thông tin hệ thống |
| **Analysis** | 2,677 | 0.83% | Dò tìm cổng, quét web và khai thác tập lệnh |
| **Backdoors** | 2,329 | 0.72% | Cửa sau, duy trì truy cập trái phép |
| **Shellcode** | 1,511 | 0.47% | Mã nhị phân tiêm vào bộ nhớ |
| **Worms** | 174 | 0.05% | Sâu mạng tự nhân bản (Số lượng cực hiếm) |

### 2.3 Phân bố giao thức mạng (Protocols)
* `tcp`: 1,495,074 dòng (58.86%)
* `udp`: 990,435 dòng (38.99%)
* Các giao thức hạ tầng khác: `unas` (16,202), `arp` (10,064), `ospf` (7,798), `sctp` (1,525), `icmp` (524), `gre` (324), v.v.

### 2.4 Phân bố dịch vụ mạng (Services)
* `None (-)`: 1,246,397 dòng (49.07%) – Không gắn với dịch vụ cụ thể ở tầng ứng dụng.
* `dns`: 781,668 dòng (30.77%)
* `http`: 206,273 dòng (8.12%)
* `ftp-data`: 125,783 dòng (4.95%)
* `smtp`: 81,645 dòng (3.21%)
* `ftp`: 49,090 dòng (1.93%)
* `ssh`: 47,160 dòng (1.86%)
* Khác (`pop3`, `dhcp`, `ssl`, `snmp`, `irc`): 2,031 dòng.

---

## 3. CÁC BẤT THƯỜNG DỮ LIỆU CỐT LÕI (DATA QUALITY ISSUES)

### 3.1 Bất thường về cấu trúc tệp (File & Schema Inconsistencies)
1. **Thiếu hoàn toàn Header**: Cả 4 tệp thô đều không có dòng tiêu đề cột. Phải nạp từ tệp `NUSW-NB15_features.csv`.
2. **Ký tự UTF-8 BOM**: Tệp `UNSW-NB15_1.csv` chứa chuỗi byte `\xef\xbb\xbf` ở đầu tệp, khiến cột đầu tiên bị lỗi nhận diện nếu parser không dùng `utf-8-sig`.
3. **Lỗi chính tả tên trường**: Trường số 43 trong tệp `features.csv` bị ghi nhầm thành `ct_src_ ltm` (chứa dấu cách thừa ở giữa). Cần chuẩn hóa thành `ct_src_ltm`.

### 3.2 Ô nhiễm kiểu dữ liệu ở cổng mạng (`sport`, `dsport`)
Cột cổng mạng về nguyên tắc phải là số nguyên `[0 - 65535]`, nhưng thực tế bị lẫn lộn các giá trị:
* **Chuỗi Hexadecimal**: `'0x000b'` (11), `'0x000c'` (12), `'0xc0a8'` (49320).
* **Ký tự gạch ngang `'-'`**: Xuất hiện khi gói tin thuộc giao thức không cổng (ICMP, ARP, OSPF).
* **Giá trị rác tràn dải cổng**: Xuất hiện giá trị `'0x20205321'` (538,997,537 > 65535).
* **Số lượng dòng dị biệt**: Có **8 dòng** ở `sport` và **304 dòng** ở `dsport`.

### 3.3 Dữ liệu khuyết và Placeholder (Missing & Blanks)
1. **`ct_flw_http_mthd`**: Thiếu **1,348,145 dòng (53.07%)** do ở các tệp 2, 3, 4 bị để trống (blank `, ,`) thay vì điền `0`.
2. **`is_ftp_login`**: Thiếu **1,429,879 dòng (56.30%)** ở các tệp 2, 3, 4 tương tự như trên.
3. **`service`**: Có **1,246,397 dòng (49.07%)** mang giá trị `'-'` thay vì chuỗi dịch vụ cụ thể.
4. **`attack_cat`**: Có **2,218,764 dòng (87.35%)** mang giá trị rỗng/NULL (toàn bộ lưu lượng bình thường `Label = 0`).

### 3.4 Bất đồng bộ chuỗi ký tự (String Anomalies)
1. **Khoảng trắng thừa đầu/cuối**:
   * `' Fuzzers '` (19,195) vs `' Fuzzers'` (5,051).
   * `' Reconnaissance '` (12,228) vs `'Reconnaissance'` (1,759).
   * `' Shellcode '` (1,288) vs `'Shellcode'` (223).
2. **Bất nhất số ít / số nhiều**:
   * `'Backdoors'` (534 dòng) và `'Backdoor'` (1,795 dòng).

### 3.5 Đặc tính phân bố lệch phải cực độ (Heavy-Tailed Skewness)
Các trường đo lường lưu lượng (`dur`, `sbytes`, `dbytes`, `Sload`, `Dload`, `Spkts`, `Dpkts`) có sự chênh lệch khổng lồ giữa trung vị và giá trị cực đại:
* `dur`: 50% kết thúc trong **0.025 giây**, nhưng 1% kéo dài tới **18.5 - 60 giây**.
* `sbytes`: 50% dưới **1,580 bytes**, nhưng cực đại lên tới **13.67 MB**.
* `dbytes`: 50% dưới **2,456 bytes**, nhưng cực đại lên tới **14.65 MB**.
* `Spkts`: 50% là 14 gói tin, cực đại lên tới **10,200 gói tin**.
* `Dpkts`: 50% là 18 gói tin, cực đại lên tới **10,970 gói tin**.

### 3.6 Trùng lặp bản ghi (Duplicates)
* Tồn tại khoảng **170,000 dòng (~6.7%)** trùng lặp 100% tất cả các trường dữ liệu (cùng IP nguồn/đích, cổng, giao thức, dấu thời gian, số byte và số gói tin).
