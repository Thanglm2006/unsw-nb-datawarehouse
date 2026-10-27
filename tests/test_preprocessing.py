"""
Unit Tests cho Module Preprocessing (src/preprocessing/cleaner.py)
"""

import unittest
import pandas as pd
import numpy as np
from src.preprocessing.cleaner import UNSWDataCleaner


class TestUNSWPreprocessing(unittest.TestCase):
    def setUp(self):
        self.cleaner = UNSWDataCleaner(metadata_path="data/metadata/NUSW-NB15_features.csv")

    def test_clean_port_value(self):
        # 1. Cổng Hex
        self.assertEqual(self.cleaner.clean_port_value("0x000b"), 11)
        self.assertEqual(self.cleaner.clean_port_value("0xc0a8"), 49320)
        
        # 2. Cổng '-' hoặc rỗng
        self.assertEqual(self.cleaner.clean_port_value("-"), -1)
        self.assertEqual(self.cleaner.clean_port_value(""), -1)
        self.assertEqual(self.cleaner.clean_port_value(None), -1)
        self.assertEqual(self.cleaner.clean_port_value(np.nan), -1)
        
        # 3. Cổng tràn dải (> 65535)
        self.assertEqual(self.cleaner.clean_port_value("0x20205321"), -1)
        self.assertEqual(self.cleaner.clean_port_value(70000), -1)
        
        # 4. Cổng bình thường
        self.assertEqual(self.cleaner.clean_port_value("80"), 80)
        self.assertEqual(self.cleaner.clean_port_value(443), 443)

    def test_clean_chunk(self):
        # Tạo dữ liệu giả lập có đủ các lỗi dữ liệu thô
        sample_data = {
            "srcip": ["59.166.0.0", "59.166.0.1"],
            "sport": ["0x000b", "-"],
            "dstip": ["149.171.126.0", "149.171.126.1"],
            "dsport": ["80", "0xc0a8"],
            "proto": ["tcp", "udp"],
            "state": ["FIN", "CON"],
            "dur": [0.1, 0.2],
            "sbytes": [100, 200],
            "dbytes": [300, 400],
            "sttl": [31, 31],
            "dttl": [29, 29],
            "sloss": [0, 0],
            "dloss": [0, 0],
            "service": ["-", "http"],
            "Sload": [1000.0, 2000.0],
            "Dload": [3000.0, 4000.0],
            "Spkts": [2, 4],
            "Dpkts": [2, 4],
            "swin": [255, 255],
            "dwin": [255, 255],
            "stcpb": [0, 0],
            "dtcpb": [0, 0],
            "smeansz": [50, 50],
            "dmeansz": [150, 150],
            "trans_depth": [0, 1],
            "res_bdy_len": [0, 0],
            "Sjit": [0.0, 0.0],
            "Djit": [0.0, 0.0],
            "Stime": [1421927414.0, 1421927415.0],
            "Ltime": [1421927414.1, 1421927415.2],
            "Sintpkt": [0.0, 0.0],
            "Dintpkt": [0.0, 0.0],
            "tcprtt": [0.01, 0.02],
            "synack": [0.005, 0.01],
            "ackdat": [0.005, 0.01],
            "is_sm_ips_ports": [0, 0],
            "ct_state_ttl": [0, 0],
            "ct_flw_http_mthd": [np.nan, 1.0],
            "is_ftp_login": [np.nan, 0.0],
            "ct_ftp_cmd": [0, 0],
            "ct_srv_src": [1, 2],
            "ct_srv_dst": [1, 2],
            "ct_dst_ltm": [1, 1],
            "ct_src_ltm": [1, 1],
            "ct_src_dport_ltm": [1, 1],
            "ct_dst_sport_ltm": [1, 1],
            "ct_dst_src_ltm": [1, 1],
            "attack_cat": [np.nan, " Fuzzers "],
            "Label": [0, 1]
        }
        df_raw = pd.DataFrame(sample_data)
        df_clean = self.cleaner.clean_chunk(df_raw)

        # Kiểm tra kết quả
        self.assertEqual(df_clean.loc[0, "sport"], 11)
        self.assertEqual(df_clean.loc[1, "sport"], -1)
        self.assertEqual(df_clean.loc[0, "service"], "unknown")
        self.assertEqual(df_clean.loc[0, "ct_flw_http_mthd"], 0)
        self.assertEqual(df_clean.loc[0, "attack_cat"], "Normal")
        self.assertEqual(df_clean.loc[1, "attack_cat"], "Fuzzers")
        self.assertEqual(df_clean.loc[0, "date_key"], 20150122)


if __name__ == "__main__":
    unittest.main()
