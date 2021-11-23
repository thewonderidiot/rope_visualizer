var rope = null;
var svg = null;
var svgns = "http://www.w3.org/2000/svg";
var wire_states = {};

const CoreState = {
    Reset: 'Reset',
    Partial: 'Partial',
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
    // svg.documentElement.addEventListener("mouseup", mouse_up, false);
    // generate_names();
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

async function mouse_down() {
    reset_rope();
    set_wire('IL07/', true, 0);
    set_wire('IL06', true, 0);
    set_wire('IL05/', true, 0);
    set_wire('IL04', true, 0);
    set_wire('IL03/', true, 0);
    set_wire('IL02', true, 0);
    set_wire('IL01/', true, 0);
    set_wire('ILP', true, 0);
    set_wire('RESETA', true, 0);
    set_wire('SETAB', true, 0);
}

async function generate_names() {
    for (let i = 0; i < wires['CLEAR'].length; i++) {
        let core_num = wires['CLEAR'][i].substring(1);
        let core_id = "core" + core_num;
        let core = svg.getElementById(core_id);
        let box = core.getBBox();
        let name = document.createElementNS(svgns, 'text');
        name.setAttributeNS(null, "x", box.x + box.width/2 - 6);
        name.setAttributeNS(null, "y", box.y + box.height/2 + 2);
        name.setAttributeNS(null, "font-size", "8");
        name.setAttributeNS(null, "font-weight", "bold");
        let text_node = document.createTextNode(core_num);
        name.appendChild(text_node);
        core.parentNode.appendChild(name);
    }
}

function reset_rope() {
    for (let wire in wires) {
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
        let core = svg.getElementById(core_id);
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
            core_states[core_num] = CoreState.Set;
        } else if (core_currents[core_num] > 150) {
            if (core_states[core_num] != CoreState.Set) {
                core.style['stroke'] = '#FF0000';
                core.style['stroke-width'] = 1.75;
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
            core_states[core_num] = CoreState.Reset;
        } else if (core_currents[core_num] < -150) {
            if (core_states[core_num] == CoreState.Set) {
                core.style['stroke'] = '#FF0000';
                core.style['stroke-width'] = 1.75;
                core_states[core_num] = CoreState.Partial;
            }
        }

        core.style['fill'] = get_color(core_currents[core_num]);

        if (delay != 0) {
            await sleep(delay);
        }
    }
}
