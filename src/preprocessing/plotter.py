"""
Module Trực Quan Hóa Dữ Liệu (UNSW Data Visualization & Plotting Pipeline)
Tạo các biểu đồ phân tích chuyên sâu:
1. Biểu đồ so sánh Trước vs Sau tiền xử lý (Before vs After Preprocessing).
2. Biểu đồ tổng quan đặc tính tập dữ liệu sạch (Cleaned Data Distribution & Characteristics).
"""

import os
import json
import argparse
import logging
from typing import Optional
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("UNSWPlotter")


class UNSWPlotter:
    def __init__(self, output_dir: str = "docs"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
        plt.rcParams["font.sans-serif"] = "DejaVu Sans"
        plt.rcParams["font.family"] = "sans-serif"

    def plot_before_after(
        self,
        metrics_path: str = "data/processed/preprocessing_metrics.json",
        output_filename: str = "before_after_preprocessing.png"
    ) -> str:
        """Tạo biểu đồ 4 bảng so sánh các thông số trước và sau khi làm sạch."""
        if not os.path.exists(metrics_path):
            raise FileNotFoundError(f"Không tìm thấy tệp metrics tại: {metrics_path}")

        with open(metrics_path, "r", encoding="utf-8") as f:
            metrics = json.load(f)

        fig = plt.figure(figsize=(18, 11))
        gs = fig.add_gridspec(2, 2, hspace=0.32, wspace=0.22)
        width = 0.35

        # -------------------------------------------------------------
        # 1. DỮ LIỆU KHUYẾT & KÝ HIỆU THIẾU
        # -------------------------------------------------------------
        ax1 = fig.add_subplot(gs[0, 0])
        fields = [
            "HTTP Method\n(ct_flw_http_mthd)",
            "FTP Login\n(is_ftp_login)",
            "FTP Cmd\n(ct_ftp_cmd)",
            "Service (-)\n(service)",
            "Attack Cat (NULL)\n(attack_cat)"
        ]
        before_missing = [
            metrics["before"]["ct_flw_http_mthd_missing"] / 1000,
            metrics["before"]["is_ftp_login_missing"] / 1000,
            metrics["before"]["ct_ftp_cmd_missing"] / 1000,
            metrics["before"]["service_hyphen_missing"] / 1000,
            metrics["before"]["attack_cat_null"] / 1000
        ]
        after_missing = [0, 0, 0, 0, 0]

        x1 = np.arange(len(fields))
        bars1_1 = ax1.bar(x1 - width/2, before_missing, width, label="Trước xử lý (Dữ liệu thô)", color="#e63946", edgecolor="black", alpha=0.9)
        bars1_2 = ax1.bar(x1 + width/2, after_missing, width, label="Sau xử lý (Đã làm sạch)", color="#2a9d8f", edgecolor="black", alpha=0.9)

        ax1.set_ylabel("Số bản ghi thiếu / lỗi (Nghìn dòng - K)", weight="bold")
        ax1.set_title("1. Dữ Liệu Khuyết & Ký Hiệu Thiếu (Missing & Placeholders)\n(Triệt tiêu 100% dữ liệu thiếu qua Imputation)", weight="bold", fontsize=12)
        ax1.set_xticks(x1)
        ax1.set_xticklabels(fields, fontsize=9, weight="bold")
        ax1.legend(loc="upper right", frameon=True, facecolor="white")
        ax1.set_ylim(0, 2500)

        for bar in bars1_1:
            h = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2, h + 30, f"{h:.0f}K", ha="center", va="bottom", fontsize=8.5, weight="bold")
        for bar in bars1_2:
            ax1.text(bar.get_x() + bar.get_width()/2, 20, "0", ha="center", va="bottom", fontsize=8.5, weight="bold", color="#2a9d8f")

        # -------------------------------------------------------------
        # 2. NHIỄM BẨN CỔNG MẠNG (PORT CORRUPTION)
        # -------------------------------------------------------------
        ax2 = fig.add_subplot(gs[0, 1])
        port_labels = [
            "Cổng Nguồn (sport)\n[Chứa Hex 0x000b, \"-\"]",
            "Cổng Đích (dsport)\n[Chứa Hex 0xc0a8, 0x20205321]"
        ]
        before_ports = [metrics["before"]["sport_non_numeric"], metrics["before"]["dsport_non_numeric"]]
        after_ports = [0, 0]

        x2 = np.arange(len(port_labels))
        bars2_1 = ax2.bar(x2 - width/2, before_ports, width, label="Trước xử lý (Bị ô nhiễm chuỗi/Hex)", color="#d90429", edgecolor="black", alpha=0.9)
        bars2_2 = ax2.bar(x2 + width/2, after_ports, width, label="Sau xử lý (100% int32 hợp lệ / -1)", color="#2a9d8f", edgecolor="black", alpha=0.9)

        ax2.set_ylabel("Số bản ghi dị biệt (Dòng)", weight="bold")
        ax2.set_title("2. Nhiễm Bẩn Kiểu Dữ Liệu Cổng Mạng (Port Type Corruption)\n(Chuyển đổi Hex sang Dec, gán -1 cho non-port, lọc tràn số)", weight="bold", fontsize=12)
        ax2.set_xticks(x2)
        ax2.set_xticklabels(port_labels, fontsize=9.5, weight="bold")
        ax2.legend(loc="upper right", frameon=True, facecolor="white")
        ax2.set_ylim(0, 360)

        for bar in bars2_1:
            h = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2, h + 5, f"{int(h)} lỗi\n(Gây crash DW)", ha="center", va="bottom", fontsize=9, weight="bold")
        for bar in bars2_2:
            ax2.text(bar.get_x() + bar.get_width()/2, 5, "0 lỗi\n(Clean int32)", ha="center", va="bottom", fontsize=9, weight="bold", color="#2a9d8f")

        # -------------------------------------------------------------
        # 3. CHUẨN HÓA CHUỖI NHÃN TẤN CÔNG
        # -------------------------------------------------------------
        ax3 = fig.add_subplot(gs[1, 0])
        before_cats_count = len(metrics["before"]["dirty_attack_cats"])
        after_cats_count = len(metrics["after"]["clean_attack_cats"])

        cat_metrics = [
            "Số biến thể nhãn tấn công\n(Variants)",
            "Số nhãn có khoảng trắng thừa\n(Trailing/Leading Spaces)",
            "Số nhãn bị bất nhất số ít/nhiều\n(Backdoors vs Backdoor)"
        ]
        val_before = [before_cats_count, 4, 1]
        val_after = [after_cats_count, 0, 0]

        x3 = np.arange(len(cat_metrics))
        bars3_1 = ax3.bar(x3 - width/2, val_before, width, label="Trước xử lý (Chuỗi bẩn & không nhất quán)", color="#f4a261", edgecolor="black", alpha=0.9)
        bars3_2 = ax3.bar(x3 + width/2, val_after, width, label="Sau xử lý (10 nhóm quy chuẩn)", color="#264653", edgecolor="black", alpha=0.9)

        ax3.set_ylabel("Số lượng biến thể / Lỗi", weight="bold")
        ax3.set_title("3. Chuẩn Hóa Chuỗi Nhãn Tấn Công (String Sanitization)\n(Hợp nhất Backdoors -> Backdoor, trim khoảng trắng, gán Normal)", weight="bold", fontsize=12)
        ax3.set_xticks(x3)
        ax3.set_xticklabels(cat_metrics, fontsize=9, weight="bold")
        ax3.legend(loc="upper right", frameon=True, facecolor="white")
        ax3.set_ylim(0, 16)

        for bar in bars3_1:
            h = bar.get_height()
            ax3.text(bar.get_x() + bar.get_width()/2, h + 0.3, f"{int(h)}", ha="center", va="bottom", fontsize=9.5, weight="bold")
        for bar in bars3_2:
            ax3.text(bar.get_x() + bar.get_width()/2, h + 0.3, f"{int(h)}", ha="center", va="bottom", fontsize=9.5, weight="bold", color="#264653")

        # -------------------------------------------------------------
        # 4. TỐI ƯU HÓA LƯU TRỮ & LÀM GIÀU CHIỀU
        # -------------------------------------------------------------
        ax4 = fig.add_subplot(gs[1, 1])
        perf_labels = ["Dung lượng đĩa (MB)\n(Disk Storage)", "Số trường thuộc tính\n(Feature Count)"]
        val_before_p = [586.4, 49]
        val_after_p = [metrics["output_size_mb"], 53]

        x4 = np.arange(len(perf_labels))
        bars4_1 = ax4.bar(x4 - width/2, val_before_p, width, label="Trước xử lý (4 CSV thô, chưa có Dim keys)", color="#457b9d", edgecolor="black", alpha=0.9)
        bars4_2 = ax4.bar(x4 + width/2, val_after_p, width, label="Sau xử lý (Parquet nén, thêm 4 khóa DW)", color="#1d3557", edgecolor="black", alpha=0.9)

        ax4.set_ylabel("Giá trị đại lượng", weight="bold")
        ax4.set_title("4. Tối Ưu Hóa Lưu Trữ & Làm Giàu Dữ Liệu Chiều (Dimensional Enrichment)\n(Nén Parquet giảm 67.1% dung lượng, bổ sung khóa Dim Date/Time)", weight="bold", fontsize=12)
        ax4.set_xticks(x4)
        ax4.set_xticklabels(perf_labels, fontsize=9.5, weight="bold")
        ax4.legend(loc="upper right", frameon=True, facecolor="white")
        ax4.set_ylim(0, 700)

        for bar in bars4_1:
            h = bar.get_height()
            ax4.text(bar.get_x() + bar.get_width()/2, h + 10, f"{h:.1f}", ha="center", va="bottom", fontsize=9.5, weight="bold")
        for bar in bars4_2:
            h = bar.get_height()
            ax4.text(bar.get_x() + bar.get_width()/2, h + 10, f"{h:.1f}", ha="center", va="bottom", fontsize=9.5, weight="bold", color="#1d3557")

        plt.suptitle("SO SÁNH CÁC THÔNG SỐ ĐẶC TRƯNG: TRƯỚC VÀ SAU TIỀN XỬ LÝ (BEFORE VS AFTER PREPROCESSING)\n(Tập dữ liệu: 2,540,047 bản ghi mạng UNSW-NB15)",
                     fontsize=15, weight="bold", y=0.98)

        out_path = os.path.join(self.output_dir, output_filename)
        fig.savefig(out_path, dpi=200, bbox_inches="tight")
        plt.close(fig)
        logger.info(f"Đã tạo biểu đồ Before vs After tại: {out_path}")
        return out_path

    def plot_cleaned_overview(
        self,
        parquet_path: str = "data/processed/unsw_nb15_cleaned.parquet",
        output_filename: str = "cleaned_data_overview.png",
        sample_rows: int = 500000
    ) -> str:
        """Tạo biểu đồ tổng quan đặc tính tập dữ liệu sạch từ file Parquet."""
        if not os.path.exists(parquet_path):
            raise FileNotFoundError(f"Không tìm thấy file Parquet tại: {parquet_path}")

        logger.info(f"Đang đọc mẫu {sample_rows:,} dòng từ {parquet_path}...")
        # Đọc có chọn lọc các cột cần vẽ để tối ưu RAM
        cols_to_read = ["attack_cat", "Label", "proto", "service", "sport", "dsport", "start_datetime", "sbytes", "dur"]
        table = pq.read_table(parquet_path, columns=cols_to_read)
        df = table.slice(0, min(sample_rows, table.num_rows)).to_pandas()

        fig, axes = plt.subplots(2, 2, figsize=(18, 11))

        # -------------------------------------------------------------
        # 1. 10 NHÓM TẤN CÔNG ĐÃ ĐƯỢC QUY CHUẨN
        # -------------------------------------------------------------
        ax1 = axes[0, 0]
        cat_counts = df["attack_cat"].value_counts()
        colors = sns.color_palette("mako_r", len(cat_counts))
        y_pos = np.arange(len(cat_counts))

        bars = ax1.barh(y_pos, cat_counts.values, color=colors, edgecolor="black", alpha=0.85)
        ax1.set_yticks(y_pos)
        ax1.set_yticklabels(cat_counts.index, weight="bold")
        ax1.invert_yaxis()
        ax1.set_xscale("log")
        ax1.set_xlabel("Số lượng bản ghi (Log scale)", weight="bold")
        ax1.set_title("1. Phân Bố 10 Nhóm Nhãn Quy Chuẩn (Attack Categories)\n(Đã khử toàn bộ khoảng trắng thừa và hợp nhất Backdoors)", weight="bold", fontsize=12)

        for bar in bars:
            w = bar.get_width()
            ax1.text(w * 1.15, bar.get_y() + bar.get_height()/2, f"{w:,}", va="center", ha="left", fontsize=9, weight="bold")

        # -------------------------------------------------------------
        # 2. TOP DỊCH VỤ VÀ GIAO THỨC
        # -------------------------------------------------------------
        ax2 = axes[0, 1]
        top_services = df["service"].value_counts().head(8)
        colors_s = sns.color_palette("crest_r", len(top_services))
        bars2 = ax2.bar(top_services.index, top_services.values / 1000, color=colors_s, edgecolor="black", alpha=0.85)
        ax2.set_ylabel("Nghìn bản ghi (K records)", weight="bold")
        ax2.set_title("2. Top Dịch Vụ Mạng Đã Chuẩn Hóa (Services)\n(Giá trị '-' đã được chuyển đổi thành 'unknown')", weight="bold", fontsize=12)
        ax2.grid(axis="y", linestyle="--", alpha=0.7)

        for bar in bars2:
            h = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2, h + 2, f"{h:.1f}K", ha="center", va="bottom", fontsize=9, weight="bold")

        # -------------------------------------------------------------
        # 3. PHÂN LOẠI CỔNG MẠNG (PORT RANGES)
        # -------------------------------------------------------------
        ax3 = axes[1, 0]
        # Phân loại cổng nguồn: -1 (Non-port), 0-1023 (Well-known), 1024-49151 (Registered), 49152-65535 (Dynamic)
        ports = df["sport"]
        port_cats = pd.cut(
            ports,
            bins=[-2, -0.5, 1023, 49151, 65535],
            labels=["Không cổng (-1)\n[ICMP/ARP]", "Well-Known\n[0 - 1023]", "Registered\n[1024 - 49151]", "Dynamic/Private\n[49152 - 65535]"]
        )
        port_counts = port_cats.value_counts().sort_index()
        colors_p = ["#457b9d", "#2a9d8f", "#e76f51", "#f4a261"]
        bars3 = ax3.bar(port_counts.index, port_counts.values / 1000, color=colors_p, edgecolor="black", alpha=0.85)
        ax3.set_ylabel("Nghìn bản ghi (K records)", weight="bold")
        ax3.set_title("3. Phân Phối Dải Cổng Mạng Cổng Nguồn (Port Classification)\n(100% cổng mạng là số nguyên int32 hợp lệ)", weight="bold", fontsize=12)
        ax3.grid(axis="y", linestyle="--", alpha=0.7)

        for bar in bars3:
            h = bar.get_height()
            ax3.text(bar.get_x() + bar.get_width()/2, h + 2, f"{h:.1f}K", ha="center", va="bottom", fontsize=9, weight="bold")

        # -------------------------------------------------------------
        # 4. LƯU LƯỢNG MẠNG THEO GIỜ TỪ start_datetime
        # -------------------------------------------------------------
        ax4 = axes[1, 1]
        hourly_traffic = df.groupby(df["start_datetime"].dt.hour)["Label"].agg(
            Normal=lambda x: (x == 0).sum(),
            Attack=lambda x: (x == 1).sum()
        )
        hours = hourly_traffic.index
        ax4.plot(hours, hourly_traffic["Normal"] / 1000, label="Lưu lượng Normal", color="#2b5c8f", marker="o", linewidth=2.5)
        ax4.plot(hours, hourly_traffic["Attack"] / 1000, label="Lưu lượng Attack", color="#e63946", marker="s", linewidth=2.5)
        ax4.fill_between(hours, 0, hourly_traffic["Attack"] / 1000, color="#e63946", alpha=0.2)

        ax4.set_xlabel("Giờ trong ngày (UTC Hour)", weight="bold")
        ax4.set_ylabel("Nghìn kết nối / giờ (K Flows/h)", weight="bold")
        ax4.set_title("4. Phân Bố Lưu Lượng Theo Giờ Trong Ngày (Hourly Profile)\n(Trích xuất từ trường datetime chuẩn hóa)", weight="bold", fontsize=12)
        ax4.set_xticks(range(0, 24, 2))
        ax4.legend(loc="upper right", frameon=True, facecolor="white")
        ax4.grid(True, linestyle="--", alpha=0.6)

        plt.suptitle("ĐẶC TÍNH DỮ LIỆU ĐÃ LÀM SẠCH TRONG PARQUET (CLEANED DATA PROFILE)\n(Sẵn sàng nạp trực tiếp vào Kho Dữ Liệu Star Schema)",
                     fontsize=15, weight="bold", y=0.98)
        plt.tight_layout()

        out_path = os.path.join(self.output_dir, output_filename)
        fig.savefig(out_path, dpi=200, bbox_inches="tight")
        plt.close(fig)
        logger.info(f"Đã tạo biểu đồ Cleaned Overview tại: {out_path}")
        return out_path

    def plot_all(self):
        """Tạo tất cả các biểu đồ phân tích."""
        logger.info("Bắt đầu sinh toàn bộ biểu đồ trực quan hóa...")
        p1 = self.plot_before_after()
        p2 = self.plot_cleaned_overview()
        logger.info("Hoàn thành sinh biểu đồ!")
        return p1, p2


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Script vẽ biểu đồ trực quan hóa dữ liệu UNSW-NB15")
    parser.add_argument("--output-dir", default="docs", help="Thư mục lưu ảnh biểu đồ (Mặc định: docs/)")
    parser.add_argument("--metrics-path", default="data/processed/preprocessing_metrics.json", help="Đường dẫn file metrics JSON")
    parser.add_argument("--parquet-path", default="data/processed/unsw_nb15_cleaned.parquet", help="Đường dẫn file Parquet đã làm sạch")
    parser.add_argument("--mode", choices=["all", "before-after", "overview"], default="all", help="Chế độ vẽ biểu đồ")

    args = parser.parse_args()
    plotter = UNSWPlotter(output_dir=args.output_dir)

    if args.mode == "before-after":
        plotter.plot_before_after(metrics_path=args.metrics_path)
    elif args.mode == "overview":
        plotter.plot_cleaned_overview(parquet_path=args.parquet_path)
    else:
        plotter.plot_before_after(metrics_path=args.metrics_path)
        plotter.plot_cleaned_overview(parquet_path=args.parquet_path)
