#!/usr/bin/env python3
"""Matrix rain + animated Miku (center) + jam LED (bawah). Satu layar."""
import curses, time, random, os, subprocess, tempfile, glob, atexit, shutil

# --- CLOCK FONT (4x5 → scaled 2x = 8x10) ---
_F = {
    '0':['████','█  █','█  █','█  █','████'],
    '1':['  █ ','  █ ','  █ ','  █ ','  █ '],
    '2':['████','   █','████','█   ','████'],
    '3':['████','   █','████','   █','████'],
    '4':['█  █','█  █','████','   █','   █'],
    '5':['████','█   ','████','   █','████'],
    '6':['████','█   ','████','█  █','████'],
    '7':['████','   █','   █','   █','   █'],
    '8':['████','█  █','████','█  █','████'],
    '9':['████','█  █','████','   █','████'],
    ':':['    ',' ██ ','    ',' ██ ','    '],
}
FONT = {}
for k, rows in _F.items():
    # scale 1.5x horizontal (each char → char+half), 1x vertical = cleaner look
    FONT[k] = [''.join(c * 2 for c in row) for row in rows]
DWIDTH, DHEIGHT, DGAP = 8, 5, 2

RAIN_CHARS = list("01" * 8 + "アイウエオカキクケコ")

MIKU_VIDEO = os.path.expanduser("~/Downloads/hatsune-miku-eyes-moewalls-com.mp4")
MIKU_COLS, MIKU_ROWS = 64, 18  # landscape 16:9 (cell aspect ~2:1 → 64 : 36 effective)


def rgb_to_256(r, g, b):
    if abs(r - g) < 15 and abs(g - b) < 15:
        gray = (r + g + b) // 3
        if gray < 8: return 16
        if gray > 248: return 231
        return round((gray - 8) / 247 * 24) + 232
    return 16 + 36 * round(r / 255 * 5) + 6 * round(g / 255 * 5) + round(b / 255 * 5)


def extract_frames(video, cols, rows, fps=8, max_frames=80):
    """Extract video frames via ffmpeg → PIL half-block grids."""
    from PIL import Image
    tmpdir = tempfile.mkdtemp(prefix='miku_')
    atexit.register(lambda: shutil.rmtree(tmpdir, ignore_errors=True))

    subprocess.run([
        'ffmpeg', '-i', video, '-vf', f'fps={fps},scale={cols}:-1',
        '-frames:v', str(max_frames), '-y', f'{tmpdir}/f%04d.png'
    ], capture_output=True, timeout=30)

    frames = []
    for path in sorted(glob.glob(f'{tmpdir}/f*.png')):
        img = Image.open(path).convert('RGB').resize((cols, rows * 2), Image.LANCZOS)
        # quantize ke 14 warna → pair count tetap di bawah 255
        img = img.quantize(colors=14, method=Image.MEDIANCUT).convert('RGB')
        grid = []
        for y in range(0, rows * 2, 2):
            row = []
            for x in range(cols):
                r1, g1, b1 = img.getpixel((x, y))
                r2, g2, b2 = img.getpixel((x, y + 1))
                # skip pixel gelap → rain tembus, gak jadi kotak hitam
                dark1 = (r1 + g1 + b1) < 45
                dark2 = (r2 + g2 + b2) < 45
                row.append(((r1, g1, b1), (r2, g2, b2), dark1, dark2))
            grid.append(row)
        frames.append(grid)
    return frames


class Drop:
    __slots__ = ('col', 'row', 'speed', 'length', 'acc')
    def __init__(self, col, rows):
        self.col = col
        self.row = random.randint(-rows, -1)
        self.speed = random.uniform(0.4, 1.2)
        self.length = random.randint(4, 18)
        self.acc = 0.0
    def step(self):
        self.acc += self.speed
        if self.acc >= 1.0:
            self.row += int(self.acc)
            self.acc -= int(self.acc)


def main(stdscr):
    curses.curs_set(0)
    stdscr.nodelay(True)
    curses.start_color()
    curses.use_default_colors()

    curses.init_pair(1, 51, -1)
    curses.init_pair(2, 37, -1)
    curses.init_pair(3, 51, -1)
    curses.init_pair(4, 245, -1)

    h, w = stdscr.getmaxyx()
    drops = [Drop(c, h) for c in range(w)]
    prev_w = w

    # loading indicator
    stdscr.addstr(h // 2, w // 2 - 10, "Loading Miku...", curses.color_pair(3))
    stdscr.refresh()

    frames = []
    if os.path.exists(MIKU_VIDEO):
        frames = extract_frames(MIKU_VIDEO, MIKU_COLS, MIKU_ROWS)

    pair_map = {}
    next_pair = [20]
    frame_idx = 0
    frame_tick = 0

    while True:
        if stdscr.getch() == ord('q'):
            break
        h, w = stdscr.getmaxyx()
        if h < 10 or w < 40:
            time.sleep(0.1)
            continue
        # rain expand kalau window di-resize lebih lebar
        if w > prev_w:
            drops.extend(Drop(c, h) for c in range(prev_w, w))
            prev_w = w
        stdscr.erase()

        # positions
        miku_x = (w - MIKU_COLS) // 2
        miku_y = max(1, (h - MIKU_ROWS - DHEIGHT - 4) // 2)
        clock_t = time.strftime("%H:%M:%S")
        clock_w = len(clock_t) * (DWIDTH + DGAP) - DGAP
        clock_x = (w - clock_w) // 2
        clock_y = miku_y + MIKU_ROWS + 2

        # 1. RAIN
        for drop in drops:
            drop.step()
            c = drop.col
            if c >= w:
                continue
            for i in range(drop.length):
                r = drop.row - i
                if r < 0 or r >= h:
                    continue
                ch = random.choice(RAIN_CHARS)
                if i == 0:
                    attr = curses.color_pair(1) | curses.A_BOLD
                elif i < 3:
                    attr = curses.color_pair(1)
                else:
                    attr = curses.color_pair(2) | curses.A_DIM
                try:
                    stdscr.addstr(r, c, ch, attr)
                except curses.error:
                    pass
            if drop.row - drop.length > h:
                drop.__init__(drop.col, h)

        # 2. MIKU animated (cycle frames, overwrite rain)
        if frames:
            frame = frames[frame_idx]
            for ry, row in enumerate(frame):
                y = miku_y + ry
                if y >= h - 1:
                    break
                for rx, (top, bot, tt, bt) in enumerate(row):
                    x = miku_x + rx
                    if x >= w:
                        break
                    if tt and bt:
                        continue
                    if tt:
                        fg = rgb_to_256(*bot)
                        ch, key = '▄', (fg, -1)
                    elif bt:
                        fg = rgb_to_256(*top)
                        ch, key = '▀', (fg, -1)
                    else:
                        fg, bg = rgb_to_256(*top), rgb_to_256(*bot)
                        ch, key = '▀', (fg, bg)
                    if key not in pair_map:
                        pid = next_pair[0]
                        if pid >= 255:
                            continue
                        try:
                            curses.init_pair(pid, key[0], key[1])
                            pair_map[key] = pid
                            next_pair[0] += 1
                        except curses.error:
                            continue
                    try:
                        stdscr.addstr(y, x, ch, curses.color_pair(pair_map[key]))
                    except curses.error:
                        pass

            # advance frame every 3 ticks (~150ms = ~7fps animation)
            frame_tick += 1
            if frame_tick >= 3:
                frame_tick = 0
                frame_idx = (frame_idx + 1) % len(frames)

        # 3. CLOCK
        clock_attr = curses.color_pair(3) | curses.A_BOLD
        for ci, ch in enumerate(clock_t):
            glyph = FONT.get(ch)
            if not glyph:
                continue
            x = clock_x + ci * (DWIDTH + DGAP)
            for row_i, line in enumerate(glyph):
                y = clock_y + row_i
                if 0 <= y < h:
                    for j, pixel in enumerate(line):
                        if pixel != ' ' and 0 <= x + j < w:
                            try:
                                stdscr.addstr(y, x + j, '█', clock_attr)
                            except curses.error:
                                pass

        d = time.strftime("%Y-%m-%d")
        dy = clock_y + DHEIGHT + 1
        dx = (w - len(d)) // 2
        if 0 <= dy < h:
            try:
                stdscr.addstr(dy, dx, d, curses.color_pair(4))
            except curses.error:
                pass

        stdscr.refresh()
        time.sleep(0.05)


if __name__ == '__main__':
    curses.wrapper(main)
