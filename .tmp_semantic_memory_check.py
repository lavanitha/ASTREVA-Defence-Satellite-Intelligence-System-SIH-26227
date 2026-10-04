import ctypes
import ctypes.wintypes
import json
import sys


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
    success = ctypes.windll.psapi.GetProcessMemoryInfo(
        ctypes.windll.kernel32.GetCurrentProcess(),
        ctypes.byref(counters),
        counters.cb,
    )
    if not success:
        raise ctypes.WinError()
    return {
        "peak_working_set_mb": round(counters.values[0] / 1048576, 1),
        "working_set_mb": round(counters.values[1] / 1048576, 1),
    }


sys.path.insert(0, "C:/Users/regin/SIH2P-2/Change-Detection-")
import backend.main as app

engine = app.load_semantic_search()
vector = engine.embed_text("River water channel and sandbars")
results = engine.search(vector, top_k=5)
print(json.dumps({
    "index_vectors": engine.index.ntotal,
    "dimension": engine.index.d,
    **memory_usage(),
    "results": [
        {"score": round(score, 4), "tile": item["tile_file"], "date": item["acquisition_date"]}
        for score, item in results
    ],
}))
