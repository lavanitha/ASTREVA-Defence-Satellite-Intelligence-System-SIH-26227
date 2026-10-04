import ctypes
import ctypes.wintypes
import json
import os
import sys

sys.path.insert(0, "C:/Users/regin/SIH2P-2/Change-Detection-")
import backend.main as backend

import faiss
import open_clip
import torch


class MemoryCounters(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong),
        ("page_fault_count", ctypes.c_ulong),
        ("values", ctypes.c_size_t * 8),
    ]


def memory_usage():
    counters = MemoryCounters()
    counters.cb = ctypes.sizeof(counters)
    ctypes.windll.kernel32.GetCurrentProcess.restype = ctypes.wintypes.HANDLE
    ctypes.windll.psapi.GetProcessMemoryInfo.argtypes = (
        ctypes.wintypes.HANDLE,
        ctypes.POINTER(MemoryCounters),
        ctypes.wintypes.DWORD,
    )
    if not ctypes.windll.psapi.GetProcessMemoryInfo(
        ctypes.windll.kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb
    ):
        raise ctypes.WinError()
    return {
        "peak_working_set_mb": round(counters.values[0] / 1048576, 1),
        "working_set_mb": round(counters.values[1] / 1048576, 1),
    }


root = "C:/Users/regin/SIH2P-2/Change-Detection-"
model = torch.jit.load(os.path.join(root, "runtime/SIH-2026/CODE/openclip_text_fp16.pt")).eval()
tokenizer = open_clip.get_tokenizer("ViT-B-32")
tokens = tokenizer(["River water channel and sandbars"])
with torch.no_grad():
    vector = model(tokens).float().numpy()
index_dir = os.path.join(root, "runtime/SIH-2026/Dataset/Index")
index = faiss.read_index(os.path.join(index_dir, "tiles.faiss"))
with open(os.path.join(index_dir, "tile_metadata.json"), encoding="utf-8") as file:
    metadata = json.load(file)
scores, indices = index.search(vector, 5)
print(json.dumps({
    "index_vectors": index.ntotal,
    **memory_usage(),
    "results": [
        {"score": round(float(score), 4), "tile": metadata[int(idx)]["tile_file"], "date": metadata[int(idx)]["acquisition_date"]}
        for score, idx in zip(scores[0], indices[0])
    ],
}))
