import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    scenarios: {
        game_test: {
            executor: 'per-vu-iterations',
            vus: 113,
            iterations: 1,
            maxDuration: '2m',
        },
    },

    thresholds: {
        http_req_failed: ['rate<0.01'],
        'http_req_duration{type:command}': ['p(95)<1000'],
    },
};

const BASE_URL = 'http://localhost:4000';

export default function () {
    const number = String(__VU).padStart(3, '0');
    const rollNo = `205125${number}`;

    // =========================
    // 1. LOGIN
    // =========================

    const login = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({
            rollNo: rollNo,
            pin: '123456',
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            },
            tags: {
                type: 'login',
            },
        }
    );

    const loginOK = check(login, {
        'login successful': (r) => r.status === 200,
    });

    if (!loginOK) {
        console.log(
            `${rollNo} -> LOGIN FAILED ${login.status}: ${login.body}`
        );
        return;
    }

    // =========================
    // 2. GET GAME STATE
    // =========================

    const state = http.get(
        `${BASE_URL}/api/game/state`,
        {
            tags: {
                type: 'game_state',
            },
        }
    );

    const stateOK = check(state, {
        'game state successful': (r) => r.status === 200,
    });

    if (!stateOK) {
        console.log(
            `${rollNo} -> GAME STATE FAILED ${state.status}: ${state.body}`
        );
        return;
    }

    // Small delay before playing
    sleep(1);

    // =========================
    // 3. SEND MULTIPLE COMMANDS
    // =========================

    const commands = [
        'pwd',
        'ls',
        'pwd',
        'ls',
        'pwd',
    ];

    for (let i = 0; i < commands.length; i++) {
        const command = http.post(
            `${BASE_URL}/api/game/command`,
            JSON.stringify({
                input: commands[i],
                commandId: `loadtest-${__VU}-${i}-${Date.now()}`,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                tags: {
                    type: 'command',
                },
            }
        );

        const commandOK = check(command, {
            'command successful': (r) => r.status === 200,
        });

        if (!commandOK) {
            console.log(
                `${rollNo} -> ${commands[i]} -> HTTP ${command.status}`
            );
            console.log(`Response: ${command.body}`);
        }

        // Simulate a player typing/reading the result
        sleep(1);
    }
}