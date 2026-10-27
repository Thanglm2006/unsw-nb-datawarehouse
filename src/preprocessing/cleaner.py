"""
Module Tiền Xử Lý Dữ Liệu UNSW-NB15 (UNSW Data Preprocessing Pipeline)
Thực hiện các quy tắc làm sạch dữ liệu:
1. Nạp và chuẩn hóa 49 tên thuộc tính từ metadata.
2. Xử lý byte BOM UTF-8 (\xef\xbb\xbf).
3. Làm sạch cột cổng mạng (sport, dsport): Chuyển Hex sang Dec, xử lý '-', chặn tràn dải [0, 65535].
4. Điền khuyết dữ liệu (Imputation): ct_flw_http_mthd, is_ftp_login -> 0; service '-' -> 'unknown'.
5. Chuẩn hóa chuỗi nhãn tấn công: trim khoảng trắng, hợp nhất 'Backdoors' -> 'Backdoor', gán 'Normal'.
6. Chuyển đổi timestamp Unix Epoch sang UTC Datetime và trích xuất date_key, time_key.
7. Xuất dữ liệu định dạng tối ưu Parquet hoặc Cleaned CSV.
"""

import os
import glob
import logging
from typing import List, Optional
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("UNSWCleaner")


class UNSWDataCleaner:
    def __init__(self, metadata_path: str = "data/metadata/NUSW-NB15_features.csv"):
        self.metadata_path = metadata_path
        self.column_names = self._load_column_names()

    def _load_column_names(self) -> List[str]:
        """Nạp danh sách 49 tên cột và sửa lỗi chính tả metadata."""
        if not os.path.exists(self.metadata_path):
            # Fallback path
            fallback = "data/raw/NUSW-NB15_features.csv"
            if os.path.exists(fallback):
                self.metadata_path = fallback
            else:
                raise FileNotFoundError(f"Không tìm thấy metadata tại {self.metadata_path}")

        features_df = pd.read_csv(self.metadata_path, encoding="latin1")
        # Chuẩn hóa tên cột, loại bỏ khoảng trắng thừa (ví dụ: 'ct_src_ ltm' -> 'ct_src_ltm')
        clean_cols = [c.strip().replace(" ", "") for c in features_df["Name"].values]
        logger.info(f"Đã nạp {len(clean_cols)} tên thuộc tính từ metadata.")
        return clean_cols

    @staticmethod
    def clean_port_value(val) -> int:
        """Làm sạch giá trị cổng đơn lẻ: Hex sang Dec, '-' -> -1, kiểm tra dải [0, 65535]."""
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
        """Thực hiện toàn bộ quy tắc tiền xử lý trên một khối dữ liệu (DataFrame Chunk)."""
        df = chunk.copy()

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

        # 4. Điền khuyết dữ liệu số (Impute missing counters)
        df["ct_flw_http_mthd"] = df["ct_flw_http_mthd"].fillna(0).astype(np.int32)
        df["is_ftp_login"] = df["is_ftp_login"].fillna(0).astype(np.int16)

        # 5. Chuẩn hóa nhãn tấn công attack_cat
        # - Rỗng / NaN -> 'Normal'
        # - Trim khoảng trắng
        # - Map 'Backdoors' -> 'Backdoor'
        attack_clean = df["attack_cat"].fillna("Normal").astype(str).str.strip()
        attack_clean = attack_clean.replace({
            "Backdoors": "Backdoor",
            "": "Normal",
            "nan": "Normal"
        })
        df["attack_cat"] = attack_clean

        # Đồng bộ nhãn Label với attack_cat
        # Nếu Label == 0 -> đảm bảo attack_cat == 'Normal'
        df.loc[df["Label"] == 0, "attack_cat"] = "Normal"

        # 6. Chuyển đổi timestamp Unix Epoch và trích xuất khóa thời gian
        # Stime và Ltime là Unix seconds
        start_dt = pd.to_datetime(df["Stime"], unit="s", utc=True)
        last_dt = pd.to_datetime(df["Ltime"], unit="s", utc=True)
        
        df["start_datetime"] = start_dt
        df["last_datetime"] = last_dt
        df["date_key"] = start_dt.dt.strftime("%Y%m%d").astype(np.int32)
        df["time_key"] = start_dt.dt.strftime("%H%M%S").astype(np.int32)

        return df

    def process_files(
        self,
        raw_pattern: str = "data/raw/UNSW-NB15_*.csv",
        output_parquet: str = "data/processed/unsw_nb15_cleaned.parquet",
        chunksize: int = 200000,
        sample_limit: Optional[int] = None
    ):
        """Quét và xử lý toàn bộ các file thô theo chunks và xuất ra Parquet."""
        raw_files = sorted(glob.glob(raw_pattern))
        if not raw_files:
            raise FileNotFoundError(f"Không tìm thấy file nào khớp mẫu {raw_pattern}")

        logger.info(f"Tìm thấy {len(raw_files)} tệp dữ liệu thô: {raw_files}")
        os.makedirs(os.path.dirname(output_parquet), exist_ok=True)

        total_processed = 0
        chunks_out = []

        for fpath in raw_files:
            logger.info(f"Đang xử lý tệp: {fpath}...")
            # Sử dụng utf-8-sig để tự động loại bỏ byte BOM nếu có
            reader = pd.read_csv(
                fpath,
                header=None,
                names=self.column_names,
                chunksize=chunksize,
                encoding="utf-8-sig",
                low_memory=False
            )

            for chunk in reader:
                cleaned_chunk = self.clean_chunk(chunk)
                chunks_out.append(cleaned_chunk)
                total_processed += len(cleaned_chunk)
                logger.info(f"  -> Đã xử lý {total_processed:,} bản ghi...")

                if sample_limit and total_processed >= sample_limit:
                    logger.info(f"Đã đạt giới hạn mẫu thử nghiệm: {sample_limit}")
                    break
            if sample_limit and total_processed >= sample_limit:
                break

        logger.info("Đang hợp nhất và ghi tệp Parquet...")
        final_df = pd.concat(chunks_out, ignore_index=True)
        final_df.to_parquet(output_parquet, index=False, engine="pyarrow")
        logger.info(f"Hoàn thành! Đã lưu {len(final_df):,} bản ghi vào {output_parquet}")
        return output_parquet


if __name__ == "__main__":
    cleaner = UNSWDataCleaner()
    # Chạy thử nghiệm làm sạch một mẫu 50,000 dòng để xác thực pipeline
    cleaner.process_files(
        raw_pattern="data/raw/UNSW-NB15_1.csv",
        output_parquet="data/processed/unsw_sample_cleaned.parquet",
        sample_limit=50000
    )
