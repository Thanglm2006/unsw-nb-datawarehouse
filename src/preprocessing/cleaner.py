"""
Module Tiền Xử Lý Dữ Liệu UNSW-NB15 (UNSW Data Preprocessing Pipeline)
Thực hiện các quy tắc làm sạch dữ liệu:
1. Nạp và chuẩn hóa 49 tên thuộc tính từ metadata.
2. Xử lý byte BOM UTF-8 (\\xef\\xbb\\xbf).
3. Làm sạch cột cổng mạng (sport, dsport): Chuyển Hex sang Dec, xử lý '-', chặn tràn dải [0, 65535].
4. Điền khuyết dữ liệu (Imputation): ct_flw_http_mthd, is_ftp_login, ct_ftp_cmd -> 0; service '-' -> 'unknown'.
5. Chuẩn hóa chuỗi nhãn tấn công: trim khoảng trắng, hợp nhất 'Backdoors' -> 'Backdoor', gán 'Normal'.
6. Chuyển đổi timestamp Unix Epoch sang UTC Datetime và trích xuất date_key, time_key.
7. Xuất dữ liệu định dạng tối ưu Parquet qua cơ chế Streaming (PyArrow ParquetWriter).
"""

import os
import glob
import json
import logging
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("UNSWCleaner")


class UNSWDataCleaner:
    def __init__(self, metadata_path: str = "data/metadata/NUSW-NB15_features.csv"):
        self.metadata_path = metadata_path
        self.column_names = self._load_column_names()
        self.metrics: Dict[str, Any] = {
            "total_raw_rows": 0,
            "total_cleaned_rows": 0,
            "before": {
                "ct_flw_http_mthd_missing": 0,
                "is_ftp_login_missing": 0,
                "ct_ftp_cmd_missing": 0,
                "service_hyphen_missing": 0,
                "attack_cat_null": 0,
                "sport_non_numeric": 0,
                "dsport_non_numeric": 0,
                "dirty_attack_cats": set(),
            },
            "after": {
                "ct_flw_http_mthd_missing": 0,
                "is_ftp_login_missing": 0,
                "ct_ftp_cmd_missing": 0,
                "service_hyphen_missing": 0,
                "attack_cat_null": 0,
                "sport_non_numeric": 0,
                "dsport_non_numeric": 0,
                "clean_attack_cats": set(),
            }
        }

    def _load_column_names(self) -> List[str]:
        """Nạp danh sách 49 tên cột và sửa lỗi chính tả metadata."""
        if not os.path.exists(self.metadata_path):
            fallback = "data/raw/NUSW-NB15_features.csv"
            if os.path.exists(fallback):
                self.metadata_path = fallback
            else:
                raise FileNotFoundError(f"Không tìm thấy metadata tại {self.metadata_path}")

        features_df = pd.read_csv(self.metadata_path, encoding="latin1")
        clean_cols = [c.strip().replace(" ", "") for c in features_df["Name"].values]
        logger.info(f"Đã nạp {len(clean_cols)} tên thuộc tính từ metadata.")
        return clean_cols

    @staticmethod
    def clean_port_value(val) -> int:
        """Làm sạch giá trị cổng: Hex sang Dec, '-' -> -1, kiểm tra dải [0, 65535]."""
        if pd.isna(val) or val == "" or val == "-":
            return -1
        val_str = str(val).strip()
        if val_str.startswith("0x") or val_str.startswith("0X"):
            try:
                dec = int(val_str, 16)
                return dec if 0 <= dec <= 65535 else -1
            except ValueError:
                return -1
        try:
            dec = int(float(val_str))
            return dec if 0 <= dec <= 65535 else -1
        except ValueError:
            return -1

    def clean_chunk(self, chunk: pd.DataFrame) -> pd.DataFrame:
        """Thực hiện toàn bộ quy tắc tiền xử lý trên một khối dữ liệu."""
        df = chunk.copy()

        # Track "BEFORE" metrics
        self.metrics["before"]["ct_flw_http_mthd_missing"] += int(df["ct_flw_http_mthd"].isna().sum() + (df["ct_flw_http_mthd"].astype(str).str.strip() == "").sum())
        self.metrics["before"]["is_ftp_login_missing"] += int(df["is_ftp_login"].isna().sum() + (df["is_ftp_login"].astype(str).str.strip() == "").sum())
        self.metrics["before"]["ct_ftp_cmd_missing"] += int(df["ct_ftp_cmd"].isna().sum() + (df["ct_ftp_cmd"].astype(str).str.strip() == "").sum())
        self.metrics["before"]["service_hyphen_missing"] += int((df["service"].astype(str).str.strip() == "-").sum())
        self.metrics["before"]["attack_cat_null"] += int(df["attack_cat"].isna().sum() + (df["attack_cat"].astype(str).str.strip() == "").sum())
        self.metrics["before"]["sport_non_numeric"] += int(pd.to_numeric(df["sport"], errors="coerce").isna().sum())
        self.metrics["before"]["dsport_non_numeric"] += int(pd.to_numeric(df["dsport"], errors="coerce").isna().sum())
        for cat in df["attack_cat"].dropna().unique():
            self.metrics["before"]["dirty_attack_cats"].add(str(cat))

        # 1. Làm sạch cột cổng mạng sport & dsport
        df["sport"] = df["sport"].apply(self.clean_port_value).astype(np.int32)
        df["dsport"] = df["dsport"].apply(self.clean_port_value).astype(np.int32)

        # 2. Chuẩn hóa chuỗi: Trim khoảng trắng thừa
        str_columns = ["srcip", "dstip", "proto", "state", "service"]
        for col in str_columns:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()

        # 3. Chuẩn hóa trường service: '-' thành 'unknown'
        df["service"] = df["service"].replace({"-": "unknown", "": "unknown"}).fillna("unknown")

        # 4. Điền khuyết dữ liệu số (Impute missing counters: HTTP, FTP, Commands)
        df["ct_flw_http_mthd"] = pd.to_numeric(df["ct_flw_http_mthd"].replace(" ", 0), errors="coerce").fillna(0).astype(np.int32)
        df["is_ftp_login"] = pd.to_numeric(df["is_ftp_login"].replace(" ", 0), errors="coerce").fillna(0).astype(np.int16)
        df["ct_ftp_cmd"] = pd.to_numeric(df["ct_ftp_cmd"].replace(" ", 0), errors="coerce").fillna(0).astype(np.int32)
        df["is_sm_ips_ports"] = pd.to_numeric(df["is_sm_ips_ports"].replace(" ", 0), errors="coerce").fillna(0).astype(np.int16)

        # 5. Chuẩn hóa nhãn tấn công attack_cat
        attack_clean = df["attack_cat"].fillna("Normal").astype(str).str.strip()
        attack_clean = attack_clean.replace({
            "Backdoors": "Backdoor",
            "": "Normal",
            "nan": "Normal"
        })
        df["attack_cat"] = attack_clean

        # Đồng bộ nhãn Label == 0 -> đảm bảo attack_cat == 'Normal'
        df.loc[df["Label"] == 0, "attack_cat"] = "Normal"

        # 6. Chuyển đổi timestamp Unix Epoch và trích xuất khóa thời gian
        start_dt = pd.to_datetime(df["Stime"], unit="s", utc=True)
        last_dt = pd.to_datetime(df["Ltime"], unit="s", utc=True)

        df["start_datetime"] = start_dt
        df["last_datetime"] = last_dt
        df["date_key"] = start_dt.dt.strftime("%Y%m%d").astype(np.int32)
        df["time_key"] = start_dt.dt.strftime("%H%M%S").astype(np.int32)

        # Track "AFTER" metrics
        self.metrics["after"]["ct_flw_http_mthd_missing"] += int(df["ct_flw_http_mthd"].isna().sum())
        self.metrics["after"]["is_ftp_login_missing"] += int(df["is_ftp_login"].isna().sum())
        self.metrics["after"]["ct_ftp_cmd_missing"] += int(df["ct_ftp_cmd"].isna().sum())
        self.metrics["after"]["service_hyphen_missing"] += int((df["service"] == "-").sum())
        self.metrics["after"]["attack_cat_null"] += int(df["attack_cat"].isna().sum())
        self.metrics["after"]["sport_non_numeric"] += int(df["sport"].isna().sum())
        self.metrics["after"]["dsport_non_numeric"] += int(df["dsport"].isna().sum())
        for cat in df["attack_cat"].unique():
            self.metrics["after"]["clean_attack_cats"].add(str(cat))

        return df

    def process_files(
        self,
        raw_pattern: str = "data/raw/UNSW-NB15_[1-4].csv",
        output_parquet: str = "data/processed/unsw_nb15_cleaned.parquet",
        chunksize: int = 250000,
        sample_limit: Optional[int] = None
    ) -> str:
        """Quét và xử lý toàn bộ các file thô theo chunks và stream trực tiếp ra Parquet."""
        raw_files = sorted(glob.glob(raw_pattern))
        if not raw_files:
            raise FileNotFoundError(f"Không tìm thấy file nào khớp mẫu {raw_pattern}")

        logger.info(f"Bắt đầu xử lý {len(raw_files)} tệp dữ liệu thô: {raw_files}")
        os.makedirs(os.path.dirname(output_parquet), exist_ok=True)

        total_processed = 0
        writer = None

        try:
            for fpath in raw_files:
                logger.info(f"Đang xử lý tệp: {fpath}...")
                reader = pd.read_csv(
                    fpath,
                    header=None,
                    names=self.column_names,
                    chunksize=chunksize,
                    encoding="utf-8-sig",
                    low_memory=False
                )

                for chunk in reader:
                    self.metrics["total_raw_rows"] += len(chunk)
                    cleaned_chunk = self.clean_chunk(chunk)
                    table = pa.Table.from_pandas(cleaned_chunk, preserve_index=False)

                    if writer is None:
                        # Khởi tạo ParquetWriter với Schema của chunk đầu tiên
                        writer = pq.ParquetWriter(
                            output_parquet,
                            table.schema,
                            compression="snappy"
                        )

                    writer.write_table(table)
                    total_processed += len(cleaned_chunk)
                    logger.info(f"  -> Đã làm sạch & ghi đĩa {total_processed:,} bản ghi...")

                    if sample_limit and total_processed >= sample_limit:
                        logger.info(f"Đã đạt giới hạn mẫu: {sample_limit}")
                        break

                if sample_limit and total_processed >= sample_limit:
                    break
        finally:
            if writer:
                writer.close()
                logger.info("Đã đóng luồng ghi ParquetWriter.")

        self.metrics["total_cleaned_rows"] = total_processed
        output_size_mb = os.path.getsize(output_parquet) / (1024 * 1024)

        # Lưu metrics ra file JSON phục vụ trực quan hóa
        metrics_save_path = "data/processed/preprocessing_metrics.json"
        serializable_metrics = {
            "total_raw_rows": self.metrics["total_raw_rows"],
            "total_cleaned_rows": self.metrics["total_cleaned_rows"],
            "output_size_mb": round(output_size_mb, 2),
            "before": {
                k: list(v) if isinstance(v, set) else v
                for k, v in self.metrics["before"].items()
            },
            "after": {
                k: list(v) if isinstance(v, set) else v
                for k, v in self.metrics["after"].items()
            }
        }
        with open(metrics_save_path, "w", encoding="utf-8") as f:
            json.dump(serializable_metrics, f, indent=2, ensure_ascii=False)

        logger.info(
            f"HOÀN THÀNH TOÀN DIỆN! Tổng cộng {total_processed:,} bản ghi sạch đã nạp vào:\n"
            f"  -> {output_parquet} (Dung lượng nén: {output_size_mb:.2f} MB)\n"
            f"  -> Metrics lưu tại: {metrics_save_path}"
        )
        return output_parquet


if __name__ == "__main__":
    cleaner = UNSWDataCleaner()
    cleaner.process_files(
        raw_pattern="data/raw/UNSW-NB15_[1-4].csv",
        output_parquet="data/processed/unsw_nb15_cleaned.parquet"
    )
