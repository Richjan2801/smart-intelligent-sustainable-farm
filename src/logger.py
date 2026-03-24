# ─── logger.py ────────────────────────────────────────────────────────────────
# Centralised, colour-coded console logger.
# Swap this out later for Python's logging module or a file logger if needed.

import time

RESET  = "\033[0m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RED    = "\033[91m"
GRAY   = "\033[90m"


def _ts() -> str:
    return time.strftime("%H:%M:%S")


def sent(data: dict):
    print(f"{GREEN}[{_ts()}] SENT      "
          f"temp={data['temperature']}°C  "
          f"humidity={data['humidity']}%  "
          f"tds={data['tds']} ppm{RESET}")


def buffered(data: dict, size: int, reason: str = "offline"):
    print(f"{YELLOW}[{_ts()}] BUFFERED  ({reason})  "
          f"temp={data['temperature']}°C  — buffer size: {size}{RESET}")


def flushing(count: int):
    print(f"\n{CYAN}[{_ts()}] FLUSH     Sending {count} buffered reading(s)...{RESET}")


def flushed(count: int):
    print(f"{CYAN}[{_ts()}] FLUSH     Done — {count} reading(s) delivered{RESET}\n")


def flush_retry():
    print(f"{YELLOW}[{_ts()}] FLUSH     Send failed mid-flush. Will retry.{RESET}")


def status(online: bool, buf_size: int):
    state = f"{GREEN}ONLINE{RESET}" if online else f"{RED}OFFLINE{RESET}"
    print(f"{GRAY}[{_ts()}] STATUS    Network: {state}  Buffer: {buf_size}{RESET}")


def control(msg: str):
    print(f"{CYAN}[CONTROL]  {msg}{RESET}")


def error(msg: str):
    print(f"{RED}[ERROR]    {msg}{RESET}")