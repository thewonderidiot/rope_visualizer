var rope = null;
var svg = null;
var picked_core = null;
var svgns = "http://www.w3.org/2000/svg";
var wire_states = {};

const CoreState = {
    Reset: 'Reset',
    Partial: 'Partially Set',
    Set: 'Set'
};

var core_currents = new Array(512).fill(0);
var core_states = new Array(512).fill(CoreState.Reset);

function setup() {
    rope = document.getElementById("rope");
    try {
        svg = rope.contentDocument;
    } catch (e) {
        svg = rope.getSVGDocument();
    }

    svg.documentElement.addEventListener("mousedown", mouse_down, false);
    for (let wire in wires) {
        wire_states[wire] = false;
    }
}

async function simulate_selection() {
    let addr = document.getElementById("address").value;
    let [inhibits, reset_inhibit, set, reset] = decode_address(addr);

    reset_rope();

    await perform_select(inhibits, reset_inhibit, set);
}

async function perform_select(inhibits, reset_inhibit, set) {
    for (let i = 0; i < inhibits.length; i++) {
        set_wire(inhibits[i], true);
        await sleep(100);
    }
    set_wire(reset_inhibit, true);
    await sleep(400);
    set_wire(set, true);
}

async function simulate_cycle() {
    let addr = document.getElementById("address").value;
    let [inhibits, reset_inhibit, set, reset] = decode_address(addr);

    reset_rope();

    await perform_select(inhibits, reset_inhibit, set);

    await sleep(400);
    set_wire(set, false);
    await sleep(400);
    set_wire(reset_inhibit, false);

    for (let i = 0; i < inhibits.length; i++) {
        set_wire(inhibits[inhibits.length - i - 1], false);
        await sleep(100);
    }
    await sleep(400);
    set_wire(reset, true);
    await sleep(400);
    set_wire(reset, false);
}

function update_picked_core() {
    if (picked_core == null) {
        document.getElementById("picked_core").innerText = 'Core ---';
        document.getElementById("picked_state").innerText = '';
        document.getElementById("picked_current").innerText = '';
        document.getElementById("picked_wires").innerText = '';
        return;
    }

    let core_str = picked_core.id.substring(4);
    let core_num = parseInt(core_str, 8);
    document.getElementById("picked_core").innerText = 'Core ' + core_str;
    document.getElementById("picked_state").innerText = core_states[core_num];
    document.getElementById("picked_current").innerText = core_currents[core_num] + ' mA';

    let picked_wires = '';
    for (let wire in wires) {
        if (wire_states[wire] && (wires[wire].includes('+' + core_str) || wires[wire].includes('-' + core_str))) {
            picked_wires += wire + '<br>';
        }
    }
    document.getElementById("picked_wires").innerHTML = picked_wires;
}

function restrict_address(input) {
    input.value = input.value.replace(/[^0-7]/g, '');
    if (!input.value) {
        return;
    }
    let input_num = parseInt(input.value, 8);
    if (input_num > 0107777) {
        input.value = '107777';
    }
}

function show_names(state) {
    let numbers = svg.getElementsByClassName("core_number");
    let vis = state ? "visible" : "hidden";
    for (let num of numbers) {
        num.setAttribute("visibility", vis);
    }
}

function decode_address(raw_addr) {
    let inhibits = ['IL01', 'IL02', 'IL03', 'IL04', 'IL05', 'IL06', 'IL07'];
    let parity = 1;
    let parity_wire = 'ILP';
    let reset_inhibit = '';
    let reset = '';
    let set = '';

    let addr = parseInt(raw_addr, 8);

    for (let i = 0; i < inhibits.length; i++) {
        if ((addr & (1 << i)) == 0) {
            inhibits[i] += '/';
            parity ^= 1;
        }
    }
    if (addr & (1 << 7)) {
        parity ^= 1;
    }
    if (parity) {
        parity_wire += '/';
    }

    inhibits = inhibits.reverse();
    inhibits.push(parity_wire);

    if ((addr & 0400) == 0) {
        set = 'SETAB';
        if ((addr & 0200) == 0) {
            reset = 'RESETA';
            reset_inhibit = 'RESETB';
        } else {
            reset = 'RESETB';
            reset_inhibit = 'RESETA';
        }
    } else {
        set = 'SETCD';
        if ((addr & 0200) == 0) {
            reset = 'RESETC';
            reset_inhibit = 'RESETD';
        } else {
            reset = 'RESETD';
            reset_inhibit = 'RESETC';
        }
    }

    return [inhibits, reset_inhibit, set, reset];
}

function select_wire(button) {
    let wire = button.innerText;
    if (button.classList.contains('wire_active')) {
        set_wire(wire, false);
    } else {
        button.classList.forEach(name => {
            if (name == "wire_active" || name == "wire_button" || name == "wide") {
                return;
            }

            let other_buttons = document.getElementsByClassName(name);
            for (i = 0; i < other_buttons.length; i++) {
                set_wire(other_buttons[i].innerText, false);
            }
        });

        set_wire(wire, true);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function get_color(current)
{
    let red   = [0xAA, 0x00, 0x00];
    let green = [0x00, 0xAA, 0x00];
    let white = [0xFF, 0xFF, 0xFF];
    let interpolated = [];
    let color = '#';
    if (current >= 0) {
        interpolated = interpolate(white, green, current, 450);
    } else {
        interpolated = interpolate(white, red, Math.abs(current), 1875);
    }

    for (let i = 0; i < 3; i++) {
        color += interpolated[i].toString(16).padStart(2, '0');
    }

    return color;
}

function interpolate(color1, color2, value, max)
{
    let result = [0, 0, 0];
    let fraction = value / max;
    for (let i = 0; i < 3; i++) {
        result[i] = Math.round((color2[i] - color1[i]) * fraction + color1[i]);
    }
    return result;
}

function mouse_down(evt) {
    let core = evt.target;
    let picker = svg.getElementById('picker');

    if (!core.id.startsWith("core")) {
        picker.setAttribute('visibility', 'hidden');
        picked_core = null;
        update_picked_core();
        return;
    }

    let box = core.getBBox();
    picker.setAttribute('x', box.x);
    picker.setAttribute('y', box.y);
    picker.setAttribute('visibility', 'visible');

    picked_core = core;
    update_picked_core();
}

function reset_rope() {
    let wire_names = Object.keys(wires).sort().reverse();
    for (let wire of wire_names) {
        set_wire(wire, false);
    }
}

async function set_wire(wire, state, delay=0) {
    if (wire_states[wire] == state) {
        return;
    }

    wire_states[wire] = state;

    let button_id = wire.replace('/', 'n').toLowerCase();
    let button = document.getElementById(button_id);

    if (state) {
        button.classList.add('wire_active');
    } else {
        button.classList.remove('wire_active');
    }

    for (let i = 0; i < wires[wire].length; i++) {
        let sign = wires[wire][i][0];
        let core_numstr = wires[wire][i].substring(1);
        let core_num = parseInt(core_numstr, 8);
        let core_id = "core" + core_numstr;
        let inner_id = "inner" + core_numstr;
        let core = svg.getElementById(core_id);
        let inner = svg.getElementById(inner_id);
        let current = (state ? 1 : -1);

        if (wire.startsWith("IL0")) {
            current *= -225;
        } else if (wire.startsWith("ILP")) {
            current *= -300;
        } else if (wire.startsWith("RESET")) {
            current *= -450;
        } else if (wire.startsWith("SET")) {
            current *= 450;
        } else if (wire.startsWith("CLEAR")) {
            current *= -350;
        }
        core_currents[core_num] += current;

        if (core_currents[core_num] > 225) {
            core.style['stroke'] = '#0000FF';
            core.style['stroke-width'] = 1.75;
            inner.style['stroke'] = '#0000FF';
            inner.style['stroke-width'] = 1.75;
            core_states[core_num] = CoreState.Set;
        } else if (core_currents[core_num] > 150) {
            if (core_states[core_num] != CoreState.Set) {
                core.style['stroke'] = '#FF0000';
                core.style['stroke-width'] = 1.75;
                inner.style['stroke'] = '#FF0000';
                inner.style['stroke-width'] = 1.75;
                core_states[core_num] = CoreState.Partial;
            }
        } else if (core_currents[core_num] < -225) {
            if (core_states[core_num] == CoreState.Set) {
                console.log('Pulse from core ' + core_num + '!');
            } else if (core_states[core_num] == CoreState.Partial) {
                console.log('Garbage output from core ' + core_num + '!');
            }
            core.style['stroke'] = '#000000';
            core.style['stroke-width'] = 0.755906;
            inner.style['stroke'] = '#000000';
            inner.style['stroke-width'] = 0.755906;
            core_states[core_num] = CoreState.Reset;
        } else if (core_currents[core_num] < -150) {
            if (core_states[core_num] == CoreState.Set) {
                core.style['stroke'] = '#FF0000';
                core.style['stroke-width'] = 1.75;
                inner.style['stroke'] = '#FF0000';
                inner.style['stroke-width'] = 1.75;
                core_states[core_num] = CoreState.Partial;
            }
        }

        core.style['fill'] = get_color(core_currents[core_num]);

        if (delay != 0) {
            await sleep(delay);
        }
    }
    update_picked_core();
}

function select_tab(evt, tab) {
    var tab_displays = document.getElementsByClassName("display");
    for (var i = 0; i < tab_displays.length; i++) {
        tab_displays[i].className = tab_displays[i].className.replace(" active", "");
    }

    var tabs = document.getElementsByClassName("tab");
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].className = tabs[i].className.replace(" active", "");
    }

    document.getElementById(tab).className += " active";
    evt.currentTarget.className += " active";
}
