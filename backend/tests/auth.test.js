// Integration tests: boots the real server against a real MySQL/MariaDB database.
//
//   TEST_DB_NAME=bloodtrack_test TEST_DB_USER=... TEST_DB_PASSWORD=... npm test
//
// SAFETY: the schema is dropped and recreated, so the database name must
// contain "test". Your real DB settings in .env are never used here.

import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const DB = {
    host: process.env.TEST_DB_HOST || "127.0.0.1",
    port: process.env.TEST_DB_PORT || "3306",
    user: process.env.TEST_DB_USER || "root",
    password: process.env.TEST_DB_PASSWORD || "",
    database: process.env.TEST_DB_NAME || "",
};
if (!/test/i.test(DB.database)) {
    throw new Error("Refusing to run: set TEST_DB_NAME to a database whose name contains 'test'.");
}

const JWT_SECRET = "test-secret-".padEnd(48, "x");
const PORT = 5100 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;
const PW = "Str0ngPass1";

let db, server, serverLogs = "";

const serverEnv = (extra = {}) => ({
    ...process.env,
    PORT: String(extra.PORT ?? PORT),
    DB_HOST: DB.host, DB_PORT: DB.port, DB_USER: DB.user,
    DB_PASSWORD: DB.password, DB_NAME: DB.database,
    JWT_SECRET,
    AUTH_RATE_LIMIT_MAX: "100000",
    ...extra,
});

const startServer = (extra = {}) =>
    new Promise((resolve, reject) => {
        const port = extra.PORT ?? PORT;
        const child = spawn("node", ["server.js"], { cwd: ROOT, env: serverEnv(extra) });
        const onData = (d) => {
            const s = d.toString();
            if (!extra.PORT) serverLogs += s;
            if (s.includes(`Server running on port ${port}`)) resolve(child);
        };
        child.stdout.on("data", onData);
        child.stderr.on("data", onData);
        child.on("exit", (c) => reject(new Error(`server exited early (${c})`)));
        setTimeout(() => reject(new Error("server start timeout")), 15000);
    });

const api = async (method, url, { body, token, headers } = {}) => {
    const res = await fetch(BASE + url, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, body: json, text };
};

const userCount = async (email) =>
    (await db.query("SELECT COUNT(*) n FROM users WHERE email = ?", [email]))[0][0].n;
const totalUsers = async () => (await db.query("SELECT COUNT(*) n FROM users"))[0][0].n;

const newHospital = async (email, name = "City Hospital") => {
    const r = await api("POST", "/api/auth/register", {
        body: { name, email, contact: "+91 98765 43210", password: PW, confirmPassword: PW },
    });
    assert.equal(r.status, 201, r.text);
    return r.body;
};

before(async () => {
    const admin = await mysql.createConnection({ ...DB, multipleStatements: true });
    db = admin;
    await db.query(readFileSync(path.join(ROOT, "tests/schema.sql"), "utf8"));
    await db.query(readFileSync(path.join(ROOT, "sql/001_users_unique_email.sql"), "utf8"));
    server = await startServer();
});

after(async () => {
    server?.kill();
    await db?.end();
});

describe("login: unknown email -> offer to create account", () => {
    test("unknown email returns ACCOUNT_NOT_FOUND with canRegister", async () => {
        const r = await api("POST", "/api/auth/login", {
            body: { email: "nobody@example.com", password: PW, role: "hospital" },
        });
        assert.equal(r.status, 404);
        assert.equal(r.body.code, "ACCOUNT_NOT_FOUND");
        assert.equal(r.body.canRegister, true);
        assert.equal(r.body.token, undefined);
        assert.equal(await totalUsers(), 0, "login must never create a user by itself");
    });

    test("unknown email while 'Login as Admin' does NOT offer registration", async () => {
        const r = await api("POST", "/api/auth/login", {
            body: { email: "nobody@example.com", password: PW, role: "admin" },
        });
        assert.equal(r.status, 404);
        assert.equal(r.body.canRegister, false);
        assert.match(r.body.error, /not created through sign-up/i);
    });

    test("missing / non-string credentials -> 400", async () => {
        for (const body of [{}, { email: "a@b.co" }, { password: PW }, { email: {}, password: PW }, { email: "a@b.co", password: ["x"] }]) {
            const r = await api("POST", "/api/auth/login", { body });
            assert.equal(r.status, 400, JSON.stringify(body));
        }
    });

    test("SQL-injection style email is treated as plain data", async () => {
        const r = await api("POST", "/api/auth/login", { body: { email: "' OR 1=1 --", password: PW } });
        assert.equal(r.status, 404);
        assert.equal(r.body.token, undefined);
    });
});

describe("registration validation (nothing is created on bad input)", () => {
    const good = { name: "City Hospital", email: "valid@example.com", contact: "9876543210", password: PW, confirmPassword: PW };
    const cases = {
        "no password": { ...good, password: undefined, confirmPassword: undefined },
        "empty password": { ...good, password: "", confirmPassword: "" },
        "whitespace password": { ...good, password: "        ", confirmPassword: "        " },
        "numeric password type": { ...good, password: 12345678, confirmPassword: 12345678 },
        "object password": { ...good, password: { $ne: 1 }, confirmPassword: undefined },
        "array password": { ...good, password: [PW], confirmPassword: undefined },
        "too short": { ...good, password: "Ab1", confirmPassword: "Ab1" },
        "no number": { ...good, password: "OnlyLetters", confirmPassword: "OnlyLetters" },
        "no letter": { ...good, password: "123456789", confirmPassword: "123456789" },
        "over 72 bytes": { ...good, password: "a1".repeat(40), confirmPassword: "a1".repeat(40) },
        "confirm mismatch": { ...good, confirmPassword: PW + "x" },
        "missing name": { ...good, name: "" },
        "1-char name": { ...good, name: "A" },
        "numeric-only name": { ...good, name: "12345" },
        "name too long": { ...good, name: "A".repeat(101) },
        "missing email": { ...good, email: "" },
        "bad email": { ...good, email: "not-an-email" },
        "email with space": { ...good, email: "a b@example.com" },
        "email too long": { ...good, email: "a".repeat(250) + "@x.com" },
        "missing contact": { ...good, contact: "" },
        "letters in contact": { ...good, contact: "call-me-maybe" },
        "short contact": { ...good, contact: "12345" },
        "long contact": { ...good, contact: "1".repeat(16) },
    };
    for (const [label, body] of Object.entries(cases)) {
        test(label, async () => {
            const before = await totalUsers();
            const r = await api("POST", "/api/auth/register", { body });
            assert.equal(r.status, 400, r.text);
            assert.equal(r.body.code, "VALIDATION_ERROR");
            assert.ok(r.body.error);
            assert.equal(r.body.token, undefined);
            assert.equal(await totalUsers(), before);
        });
    }

    test("empty / missing body -> 400", async () => {
        const r = await api("POST", "/api/auth/register", {});
        assert.equal(r.status, 400);
    });
});

describe("account creation + automatic login", () => {
    test("creates user, hashes password with bcrypt, returns a working session", async () => {
        const r = await api("POST", "/api/auth/register", {
            body: { name: "  Doon   General  Hospital ", email: "  New.User@Example.COM ", contact: "+91 (98765) 43-210", password: PW, confirmPassword: PW },
        });
        assert.equal(r.status, 201, r.text);
        assert.ok(r.body.token);
        assert.deepEqual(r.body.user, { id: r.body.userId, name: "Doon General Hospital", email: "new.user@example.com", role: "HOSPITAL" });

        const [[row]] = await db.query("SELECT * FROM users WHERE user_id = ?", [r.body.userId]);
        assert.equal(row.email, "new.user@example.com");
        assert.equal(row.contact, "+919876543210");
        assert.equal(row.role, "HOSPITAL");
        assert.notEqual(row.password, PW, "password must not be stored in plaintext");
        assert.match(row.password, /^\$2[aby]\$12\$/, "bcrypt hash, cost 12");
        assert.ok(await bcrypt.compare(PW, row.password));
        assert.ok(!r.text.includes(row.password) && !r.text.includes(PW), "response must not leak password/hash");

        // The token from sign-up is immediately usable (user is logged in)
        const dash = await api("GET", "/api/hospital/dashboard", { token: r.body.token });
        assert.equal(dash.status, 200, dash.text);
        assert.equal(dash.body.hospital.user_id, r.body.userId);
    });

    test("full flow: unknown email -> offer -> register -> later normal login", async () => {
        const email = "flow@example.com";
        const probe = await api("POST", "/api/auth/login", { body: { email, password: PW, role: "hospital" } });
        assert.equal(probe.status, 404);
        assert.equal(probe.body.canRegister, true);

        const created = await api("POST", "/api/auth/register", {
            body: { name: "Flow Hospital", email, contact: "9876501234", password: PW, confirmPassword: PW },
        });
        assert.equal(created.status, 201);

        const again = await api("POST", "/api/auth/login", { body: { email, password: PW, role: "hospital" } });
        assert.equal(again.status, 200);
        assert.equal(again.body.user.email, email);
        assert.ok(again.body.token);
    });

    test("password is not written to server logs", () => {
        assert.ok(!serverLogs.includes(PW));
    });

    test("duplicate email is rejected (case / whitespace variants too)", async () => {
        await newHospital("dup@example.com");
        for (const variant of ["dup@example.com", "DUP@example.com", "  Dup@Example.com  "]) {
            const r = await api("POST", "/api/auth/register", {
                body: { name: "Other", email: variant, contact: "9876543210", password: PW, confirmPassword: PW },
            });
            assert.equal(r.status, 409, variant);
            assert.equal(r.body.code, "EMAIL_EXISTS");
            assert.equal(r.body.token, undefined);
        }
        assert.equal(await userCount("dup@example.com"), 1);
    });

    test("10 simultaneous sign-ups for one email create exactly one account", async () => {
        const email = "race@example.com";
        const results = await Promise.all(
            Array.from({ length: 10 }, () =>
                api("POST", "/api/auth/register", {
                    body: { name: "Race Hospital", email, contact: "9876543210", password: PW, confirmPassword: PW },
                })
            )
        );
        const statuses = results.map((r) => r.status).sort();
        assert.deepEqual(statuses, [201, ...Array(9).fill(409)]);
        assert.equal(await userCount(email), 1);
    });

    test("SQL-injection style name is stored as data; tables survive", async () => {
        const r = await api("POST", "/api/auth/register", {
            body: { name: "Robert'); DROP TABLE users;--", email: "bobby@example.com", contact: "9876543210", password: PW, confirmPassword: PW },
        });
        assert.equal(r.status, 201);
        const [[row]] = await db.query("SELECT Name FROM users WHERE email = 'bobby@example.com'");
        assert.equal(row.Name, "Robert'); DROP TABLE users;--");
    });
});

describe("Admin accounts cannot be created publicly", () => {
    for (const role of ["ADMIN", "admin", "Admin", " ADMIN "]) {
        test(`body role=${JSON.stringify(role)} is ignored -> HOSPITAL`, async () => {
            const email = `sneaky${Math.random().toString(36).slice(2, 8)}@example.com`;
            const r = await api("POST", "/api/auth/register", {
                body: { name: "Sneaky", email, contact: "9876543210", password: PW, confirmPassword: PW, role, isAdmin: true, userType: "admin" },
            });
            assert.equal(r.status, 201);
            assert.equal(r.body.user.role, "HOSPITAL");
            const [[row]] = await db.query("SELECT role FROM users WHERE email = ?", [email]);
            assert.equal(row.role, "HOSPITAL");

            // ...and that account cannot use the admin portal
            const login = await api("POST", "/api/auth/login", { body: { email, password: PW, role: "admin" } });
            assert.equal(login.status, 403);
            const inv = await api("GET", "/api/blood-units/dashboard-summary", { token: r.body.token });
            assert.equal(inv.status, 403);
        });
    }
});

describe("login for existing users", () => {
    test("correct credentials -> 200 with token", async () => {
        await newHospital("login@example.com");
        const r = await api("POST", "/api/auth/login", { body: { email: "LOGIN@example.com", password: PW, role: "hospital" } });
        assert.equal(r.status, 200);
        assert.equal(r.body.user.role, "HOSPITAL");
        assert.ok(r.body.token);
        assert.equal(r.body.user.password, undefined);
    });

    test("wrong password -> 401 (no token)", async () => {
        const r = await api("POST", "/api/auth/login", { body: { email: "login@example.com", password: "WrongPass9", role: "hospital" } });
        assert.equal(r.status, 401);
        assert.equal(r.body.token, undefined);
    });

    test("existing short legacy passwords can still log in (policy applies to sign-up only)", async () => {
        const hash = await bcrypt.hash("abc123", 10);
        await db.query("INSERT INTO users (Name,email,contact,password,role) VALUES ('Legacy','legacy@example.com','9876543210',?, 'HOSPITAL')", [hash]);
        const r = await api("POST", "/api/auth/login", { body: { email: "legacy@example.com", password: "abc123", role: "hospital" } });
        assert.equal(r.status, 200);
    });

    test("wrong portal: role is not revealed without the password", async () => {
        const wrongPw = await api("POST", "/api/auth/login", { body: { email: "login@example.com", password: "WrongPass9", role: "admin" } });
        assert.equal(wrongPw.status, 401);
        const rightPw = await api("POST", "/api/auth/login", { body: { email: "login@example.com", password: PW, role: "admin" } });
        assert.equal(rightPw.status, 403);
    });
});

describe("Admin created via CLI + role-based access", () => {
    let adminToken, hospA, hospB;

    before(async () => {
        const out = spawnSync("node", ["scripts/createAdmin.js", "--email", "admin@bank.org", "--name", "Central Blood Bank", "--contact", "+911234567890"], {
            cwd: ROOT, env: serverEnv({ ADMIN_PASSWORD: "AdminPass123" }), encoding: "utf8",
        });
        assert.equal(out.status, 0, out.stderr);
        const login = await api("POST", "/api/auth/login", { body: { email: "admin@bank.org", password: "AdminPass123", role: "admin" } });
        assert.equal(login.status, 200, login.text);
        assert.equal(login.body.user.role, "ADMIN");
        adminToken = login.body.token;
        hospA = await newHospital("hosp-a@example.com", "Hospital A");
        hospB = await newHospital("hosp-b@example.com", "Hospital B");
    });

    test("createAdmin refuses duplicates and weak passwords", () => {
        const dup = spawnSync("node", ["scripts/createAdmin.js", "--email", "admin@bank.org", "--name", "X Bank", "--contact", "+911234567890"], {
            cwd: ROOT, env: serverEnv({ ADMIN_PASSWORD: "AdminPass123" }), encoding: "utf8",
        });
        assert.notEqual(dup.status, 0);
        const weak = spawnSync("node", ["scripts/createAdmin.js", "--email", "admin2@bank.org", "--name", "X Bank", "--contact", "+911234567890"], {
            cwd: ROOT, env: serverEnv({ ADMIN_PASSWORD: "weak" }), encoding: "utf8",
        });
        assert.notEqual(weak.status, 0);
    });

    test("admin selecting the Hospital portal is rejected", async () => {
        const r = await api("POST", "/api/auth/login", { body: { email: "admin@bank.org", password: "AdminPass123", role: "hospital" } });
        assert.equal(r.status, 403);
    });

    const protectedRoutes = [
        ["GET", "/api/blood-units/dashboard-summary"],
        ["GET", "/api/blood-units/daily-logs"],
        ["GET", "/api/blood-units/logs"],
        ["POST", "/api/blood-units"],
        ["POST", "/api/allocation/process"],
        ["GET", "/api/hospital/dashboard"],
        ["POST", "/api/hospital/requests"],
    ];

    test("no token -> 401 on every protected route", async () => {
        for (const [m, u] of protectedRoutes) {
            const r = await api(m, u, { body: m === "POST" ? {} : undefined });
            assert.equal(r.status, 401, `${m} ${u}`);
        }
    });

    test("forged / invalid tokens -> 401", async () => {
        const old = Buffer.from(`${hospA.userId}:hosp-a@example.com:${Date.now()}`).toString("base64"); // legacy format
        const wrongKey = jwt.sign({ role: "ADMIN" }, "some-other-secret-that-is-long-enough-123", { subject: "1", issuer: "bloodtrack" });
        const none = jwt.sign({ role: "ADMIN" }, "", { algorithm: "none", subject: "1", issuer: "bloodtrack" });
        const expired = jwt.sign({ role: "ADMIN" }, JWT_SECRET, { subject: "1", issuer: "bloodtrack", expiresIn: -10 });
        const wrongIssuer = jwt.sign({ role: "ADMIN" }, JWT_SECRET, { subject: "1", issuer: "evil" });
        for (const [label, t] of Object.entries({ old, wrongKey, none, expired, wrongIssuer, garbage: "abc.def.ghi" })) {
            const r = await api("GET", "/api/blood-units/dashboard-summary", { token: t });
            assert.equal(r.status, 401, label);
        }
        const basic = await api("GET", "/api/blood-units/dashboard-summary", { headers: { Authorization: `Basic ${adminToken}` } });
        assert.equal(basic.status, 401);
    });

    test("role comes from the database, not the token claim", async () => {
        const lying = jwt.sign({ role: "ADMIN" }, JWT_SECRET, { subject: String(hospA.userId), issuer: "bloodtrack" });
        const r = await api("GET", "/api/blood-units/dashboard-summary", { token: lying });
        assert.equal(r.status, 403);
    });

    test("token of a deleted user stops working", async () => {
        const tmp = await newHospital("ghost@example.com");
        assert.equal((await api("GET", "/api/hospital/dashboard", { token: tmp.token })).status, 200);
        await db.query("DELETE FROM users WHERE user_id = ?", [tmp.userId]);
        assert.equal((await api("GET", "/api/hospital/dashboard", { token: tmp.token })).status, 401);
    });

    test("Hospital cannot reach Admin APIs", async () => {
        for (const [m, u] of protectedRoutes.filter(([, u]) => !u.startsWith("/api/hospital"))) {
            const r = await api(m, u, { token: hospA.token, body: m === "POST" ? {} : undefined });
            assert.equal(r.status, 403, `${m} ${u}`);
        }
    });

    test("Admin cannot reach Hospital APIs", async () => {
        assert.equal((await api("GET", "/api/hospital/dashboard", { token: adminToken })).status, 403);
        assert.equal((await api("POST", "/api/hospital/requests", { token: adminToken, body: {} })).status, 403);
    });

    test("Admin can use Admin APIs", async () => {
        const sum = await api("GET", "/api/blood-units/dashboard-summary", { token: adminToken });
        assert.equal(sum.status, 200, sum.text);
        const add = await api("POST", "/api/blood-units", {
            token: adminToken,
            body: { bloodGroup: "O+", quantity: 2, collectionDate: "2026-10-01", expiryDate: "2026-12-01", batchNumber: "B-1" },
        });
        assert.equal(add.status, 201, add.text);
        assert.equal((await api("GET", "/api/blood-units/daily-logs", { token: adminToken })).status, 200);
        assert.equal((await api("POST", "/api/allocation/process", { token: adminToken })).status, 200);
    });

    test("Hospital sees its own dashboard; cannot impersonate another hospital", async () => {
        const own = await api("GET", `/api/hospital/dashboard?hospitalId=${hospA.userId}`, { token: hospA.token });
        assert.equal(own.status, 200);
        assert.equal(own.body.hospital.user_id, hospA.userId);

        const noParam = await api("GET", "/api/hospital/dashboard", { token: hospA.token });
        assert.equal(noParam.body.hospital.user_id, hospA.userId, "identity comes from the token");

        const other = await api("GET", `/api/hospital/dashboard?hospitalId=${hospB.userId}`, { token: hospA.token });
        assert.equal(other.status, 403);
    });

    test("Hospital request is always recorded under the token's hospital", async () => {
        const req = { bloodGroup: "A+", quantity: 1, priority: "ROUTINE", requiredDate: "2026-12-01", reason: "test" };

        const spoof = await api("POST", "/api/hospital/requests", { token: hospA.token, body: { ...req, hospitalId: hospB.userId } });
        assert.equal(spoof.status, 403);
        assert.equal((await db.query("SELECT COUNT(*) n FROM hospital_requests WHERE hospital_id = ?", [hospB.userId]))[0][0].n, 0);

        // The existing frontend sends hospitalId (its own id) — still works
        const withId = await api("POST", "/api/hospital/requests", { token: hospA.token, body: { ...req, hospitalId: hospA.userId } });
        assert.equal(withId.status, 201, withId.text);
        const noId = await api("POST", "/api/hospital/requests", { token: hospA.token, body: req });
        assert.equal(noId.status, 201, noId.text);
        assert.equal((await db.query("SELECT COUNT(*) n FROM hospital_requests WHERE hospital_id = ?", [hospA.userId]))[0][0].n, 2);
    });
});

describe("brute-force throttling", () => {
    test("failed attempts are rate limited per IP; successes are not counted", async () => {
        const p = PORT + 500;
        const child = await startServer({ PORT: p, AUTH_RATE_LIMIT_MAX: "3" });
        try {
            const call = (body) => fetch(`http://127.0.0.1:${p}/api/auth/login`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            // successes don't count
            for (let i = 0; i < 5; i++) assert.equal((await call({ email: "login@example.com", password: PW })).status, 200);
            // failures do
            const codes = [];
            for (let i = 0; i < 5; i++) codes.push((await call({ email: "login@example.com", password: "Nope12345" })).status);
            assert.deepEqual(codes, [401, 401, 401, 429, 429]);
        } finally {
            child.kill();
        }
    });
});

describe("startup safety", () => {
    test("server refuses to start without a strong JWT_SECRET", () => {
        for (const secret of ["", "short"]) {
            const r = spawnSync("node", ["server.js"], { cwd: ROOT, env: serverEnv({ PORT: PORT + 900, JWT_SECRET: secret }), encoding: "utf8", timeout: 8000 });
            assert.notEqual(r.status, 0);
            assert.match(r.stderr, /JWT_SECRET/);
        }
    });
});
