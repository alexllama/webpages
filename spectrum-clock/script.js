document.addEventListener('DOMContentLoaded', () => {
    const lights = {
        hours: {},
        minutes: {},
        singleMinutes: {},
        amPm: {},
        month: {},
        dayTens: {},
        dayUnits: {}
    };

    // Get all the light elements
    for (let i = 1; i <= 12; i++) {
        lights.hours[`h${i}`] = document.getElementById(`h${i}`);
        lights.month[`mth${i}`] = document.getElementById(`mth${i}`);
        lights.singleMinutes[`s-min-${i}`] = document.getElementById(`s-min-${i}`);
        lights.amPm[`ap-${i}`] = document.getElementById(`ap-${i}`);
    }
    for (let i = 5; i <= 60; i += 5) {
        lights.minutes[`m${i}`] = document.getElementById(`m${i}`);
    }
    for (let i = 0; i <= 3; i++) {
        lights.dayTens[`dayT${i}`] = document.getElementById(`dayT${i}`);
    }
    for (let i = 0; i <= 9; i++) {
        lights.dayUnits[`dayU${i}`] = document.getElementById(`dayU${i}`);
    }

    // The current clock values. Also the ceiling no VU column may go past.
    const levels = {
        hours: 0,
        fiveMinutes: 0,
        singleMinutes: 0,
        amPm: 0,
        month: 0,
        dayTens: 0,
        dayUnits: 0
    };

    // A shared 128 BPM clock drives the pattern. Each column reacts to a
    // different part of the beat, like instruments in a thumping techno track.
    const BPM = 128;
    const BEAT = 60 / BPM;
    const STEP = BEAT / 4; // 16th note

    // One column per "sound". Cells are ordered bottom-to-top; "every"/"offset"
    // place its hits on the 16th-note grid, the rest shapes the meter's bounce.
    const columns = [
        {
            key: 'hours',
            cells: Array.from({ length: 12 }, (_, i) => lights.hours[`h${i + 1}`]),
            every: 4, offset: 0, sharpness: 2.2, floor: 0.12, burst: 1,
            swell: 1.1, phase: 0, jitter: 0.12,
            attack: 1, decay: 0.55, tick: 70, level: 0, held: false, timer: null
        },
        {
            key: 'fiveMinutes',
            cells: Array.from({ length: 12 }, (_, i) => lights.minutes[`m${5 * (i + 1)}`]),
            every: 4, offset: 1, sharpness: 1.1, floor: 0.12, burst: 1,
            swell: 1.7, phase: 1.2, jitter: 0.15,
            attack: 0.95, decay: 0.35, tick: 70, level: 0, held: false, timer: null
        },
        {
            key: 'singleMinutes',
            cells: Array.from({ length: 12 }, (_, i) => lights.singleMinutes[`s-min-${i + 1}`]),
            every: 2, offset: 0, sharpness: 2.5, floor: 0, burst: 1,
            swell: 3.3, phase: 2.4, jitter: 0.5,
            attack: 1, decay: 0.65, tick: 60, level: 0, held: false, timer: null
        },
        {
            key: 'amPm',
            cells: Array.from({ length: 12 }, (_, i) => lights.amPm[`ap-${i + 1}`]),
            every: 8, offset: 0, sharpness: 0.9, floor: 0.25, burst: 1,
            swell: 0.8, phase: 3.1, jitter: 0.1,
            attack: 1, decay: 0.25, tick: 80, level: 0, held: false, timer: null
        },
        {
            key: 'month',
            cells: Array.from({ length: 12 }, (_, i) => lights.month[`mth${i + 1}`]),
            every: 2, offset: 1, sharpness: 1.8, floor: 0.1, burst: 1,
            swell: 2.2, phase: 4, jitter: 0.35,
            attack: 1, decay: 0.5, tick: 70, level: 0, held: false, timer: null
        },
        {
            key: 'dayTens',
            cells: Array.from({ length: 4 }, (_, i) => lights.dayTens[`dayT${i}`]),
            every: 4, offset: 2, sharpness: 6, floor: 0.05, burst: 1,
            swell: 0.9, phase: 5, jitter: 0.12,
            attack: 1, decay: 0.7, tick: 60, level: 0, held: false, timer: null
        },
        {
            key: 'dayUnits',
            cells: Array.from({ length: 10 }, (_, i) => lights.dayUnits[`dayU${9 - i}`]),
            every: 4, offset: 3, sharpness: 2.5, floor: 0, burst: 1,
            swell: 4.1, phase: 0.6, jitter: 0.45,
            attack: 1, decay: 0.6, tick: 60, level: 0, held: false, timer: null
        }
    ];

    const bandClasses = ['band-green', 'band-amber', 'band-red'];

    function clearLights() {
        for (const type in lights) {
            for (const key in lights[type]) {
                lights[type][key].classList.remove('on', ...bandClasses);
            }
        }
    }

    // Normal display: fill each column exactly up to its current value.
    function renderRegular() {
        clearLights();
        for (const col of columns) {
            for (let i = 0; i < levels[col.key]; i++) {
                col.cells[i].classList.add('on');
            }
        }
    }

    function readTime() {
        const now = new Date();
        let hours24 = now.getHours();
        let hours = hours24 % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const minutes = now.getMinutes();
        const month = now.getMonth() + 1; // getMonth() is 0-indexed
        const day = now.getDate();

        levels.hours = hours;
        levels.fiveMinutes = Math.floor(minutes / 5);
        levels.singleMinutes = (minutes % 5) * 3;
        levels.amPm = hours24 < 12 ? 6 : 12;
        levels.month = month;
        levels.dayTens = Math.floor(day / 10) + 1;
        levels.dayUnits = (day % 10) + 1;

        // If the time rolls over mid-animation, stay within the new value.
        for (const col of columns) {
            col.level = Math.min(col.level, levels[col.key]);
        }
    }

    function bandFor(index) {
        const cellNumber = index + 1;
        if (cellNumber <= 7) return 'band-green';
        if (cellNumber <= 10) return 'band-amber';
        return 'band-red';
    }

    function paintColumn(col) {
        const ceiling = levels[col.key];
        const lit = Math.round(col.level);
        col.cells.forEach((cell, index) => {
            cell.classList.remove('on', ...bandClasses);
            // The top cell for the current time latches on once reached.
            if (index < lit || (col.held && ceiling > 0 && index === ceiling - 1)) {
                cell.classList.add('on', bandFor(index));
            }
        });
    }

    // Each hit spikes to a peak and falls away before the next one. Different
    // step patterns, decay curves and random accents make the columns move
    // like separate instruments rather than one synchronized waveform.
    function signalFor(col, t) {
        const step = Math.floor(t / STEP);
        const stepPhase = (t / STEP) - step;
        const hit = step % col.every === col.offset;
        const envelope = Math.pow(1 - stepPhase, col.sharpness);
        const swell = 0.7 + 0.3 * Math.sin(t * col.swell + col.phase);
        let value = col.floor;
        if (hit) {
            // Occasional full-scale accents give each column a real "thump".
            const accent = Math.random() < 0.15 ? 1 : envelope * swell;
            value += col.burst * accent + Math.random() * col.jitter * envelope;
        }
        return Math.max(0, Math.min(1, value));
    }

    // Snappy attack, quick fall, always clamped to the column's clock value.
    function animateColumn(col) {
        const ceiling = levels[col.key];
        const target = Math.round(ceiling * signalFor(col, Date.now() / 1000));

        if (target > col.level) {
            col.level += (target - col.level) * col.attack;
        } else {
            col.level += (target - col.level) * col.decay;
        }
        col.level = Math.max(0, Math.min(ceiling, col.level));
        if (ceiling > 0 && Math.round(col.level) >= ceiling) {
            col.held = true;
        }
        paintColumn(col);
    }

    let vuActive = false;
    let vuTimeout = null;

    function clearVuTimers() {
        clearTimeout(vuTimeout);
        vuTimeout = null;
        for (const col of columns) {
            clearInterval(col.timer);
            col.timer = null;
            col.level = 0;
            col.held = false;
        }
    }

    const clockElement = document.querySelector('.clock-container');

    function stopVu() {
        if (!vuActive) return;
        vuActive = false;
        clearVuTimers();
        clockElement.classList.remove('vu-mode');
        renderRegular();
    }

    function startVu() {
        clearVuTimers(); // Clicking again restarts the 10-second burst
        vuActive = true;
        clockElement.classList.add('vu-mode');
        for (const col of columns) {
            animateColumn(col);
            col.timer = setInterval(() => animateColumn(col), col.tick);
        }
        vuTimeout = setTimeout(stopVu, 10000);
    }

    function updateClock() {
        readTime();
        if (!vuActive) renderRegular();
    }

    clockElement.addEventListener('click', startVu);

    setInterval(updateClock, 1000);
    updateClock(); // Initial call
});
