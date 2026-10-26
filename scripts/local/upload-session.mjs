/**
 * Upload a locally created Rewards session database to GitHub Actions as a secret.
 *
 * Usage:
 *   node scripts/local/upload-session.mjs --dry-run
 *   node scripts/local/upload-session.mjs
 *   node scripts/local/upload-session.mjs --repo owner/name --db sessions/sessions.db
 *
 * The session database contains live authentication cookies. Treat it exactly like
 * a password: never commit it, never paste it into logs, and re-run the local
 * manual login to rotate it.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import zlib from 'node:zlib'

const SECRET_NAME = 'REWARDS_SESSION_DB_B64'
// GitHub Actions secrets are capped at 48 KB, so the database is gzipped first.
const SECRET_LIMIT_BYTES = 48 * 1024
const AUTH_COOKIE_NAMES = [
    'MSPAuth',
    'MSPProf',
    'WLSSC',
    'PPAuth',
    'MSNRPSAuth',
    'KievRPSAuth',
    'RPSSecAuth',
    'RPSTAuth',
    'ESTSAUTHPERSISTENT',
    '__Host-MSAAuth'
]

function getFlag(name, fallback) {
    const index = process.argv.indexOf(name)
    if (index === -1) return fallback
    const value = process.argv[index + 1]
    if (!value || value.startsWith('--')) {
        console.error(`Missing value after ${name}`)
        process.exit(1)
    }
    return value
}

function formatDate(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return 'session cookie (no expiry)'
    return new Date(seconds * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

function inspectPlatform(storageStateJson) {
    let state
    try {
        state = JSON.parse(storageStateJson)
    } catch {
        return { cookies: 0, origins: 0, authCookies: [], earliestAuthExpiry: null }
    }

    const cookies = Array.isArray(state.cookies) ? state.cookies : []
    const origins = Array.isArray(state.origins) ? state.origins : []
    const authCookies = cookies.filter(cookie => AUTH_COOKIE_NAMES.includes(cookie.name))
    const expiries = authCookies.map(cookie => cookie.expires).filter(value => Number.isFinite(value) && value > 0)

    return {
        cookies: cookies.length,
        origins: origins.length,
        authCookies: authCookies.map(cookie => cookie.name),
        earliestAuthExpiry: expiries.length ? Math.min(...expiries) : null
    }
}

function resolveRepo() {
    const explicit = getFlag('--repo', process.env.GITHUB_REPOSITORY)
    if (explicit) return explicit

    try {
        return execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim()
    } catch {
        console.error('Could not detect the target repository. Pass --repo owner/name.')
        process.exit(1)
    }
}

function main() {
    const dryRun = process.argv.includes('--dry-run')
    const dbPath = path.resolve(process.cwd(), getFlag('--db', path.join('sessions', 'sessions.db')))

    if (!fs.existsSync(dbPath)) {
        console.error(`Session database not found: ${dbPath}`)
        console.error('Run the manual login first: npm run manual-login -- <email> --platform both')
        process.exit(1)
    }

    const db = new DatabaseSync(dbPath, { readOnly: true })
    let rows
    try {
        rows = db.prepare('SELECT email, platform, storage_state, fingerprint, updated_at FROM sessions').all()
    } finally {
        db.close()
    }

    const usable = rows.filter(row => row.storage_state)
    if (!usable.length) {
        console.error('The database has no usable session rows. Complete the manual login and try again.')
        process.exit(1)
    }

    console.log(`Session database: ${dbPath}`)
    console.log(`Rows: ${usable.length}`)

    let missingFingerprint = false
    for (const row of usable) {
        const info = inspectPlatform(row.storage_state)
        const ageMinutes = Math.max(0, Math.round((Date.now() - Number(row.updated_at)) / 60000))
        if (!row.fingerprint) missingFingerprint = true

        console.log(
            `  - ${row.platform.padEnd(7)} cookies=${info.cookies} origins=${info.origins} ` +
                `age=${ageMinutes}m fingerprint=${row.fingerprint ? 'yes' : 'no'}`
        )
        console.log(`    auth cookies: ${info.authCookies.join(', ') || '(none detected)'}`)
        console.log(`    earliest auth expiry: ${formatDate(info.earliestAuthExpiry)}`)

        if (!info.authCookies.length) {
            console.warn('    WARNING: no known Microsoft auth cookie found; this session may not skip the login flow.')
        }
    }

    const platforms = new Set(usable.map(row => row.platform))
    if (!platforms.has('mobile') || !platforms.has('desktop')) {
        console.warn(
            `WARNING: only ${[...platforms].join(', ') || 'no'} session(s) present. ` +
                'Re-run manual login with --platform both so both flows can skip the login.'
        )
    }
    if (missingFingerprint) {
        console.warn(
            'WARNING: no saved fingerprint. Set ACCOUNT_1_SAVE_FINGERPRINT_MOBILE/DESKTOP=true before the manual login,\n' +
                '         otherwise GitHub Actions generates a new device fingerprint on every run.'
        )
    }

    const raw = fs.readFileSync(dbPath)
    const encoded = zlib.gzipSync(raw, { level: 9 }).toString('base64')
    const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`

    console.log(`\nSecret payload: ${kb(raw.length)} raw -> ${kb(encoded.length)} base64 (gzip)`)

    if (encoded.length > SECRET_LIMIT_BYTES) {
        console.error(
            `The compressed secret is ${kb(encoded.length)}, above GitHub's 48 KB limit.\n` +
                'Re-run the manual login for one platform at a time, or remove unused accounts from the database.'
        )
        process.exit(1)
    }

    if (dryRun) {
        console.log('Dry run: nothing uploaded.')
        return
    }

    const repo = resolveRepo()
    execFileSync('gh', ['secret', 'set', SECRET_NAME, '--repo', repo], {
        input: encoded,
        stdio: ['pipe', 'inherit', 'inherit']
    })

    console.log(`\nUploaded ${SECRET_NAME} to ${repo} (${kb(encoded.length)}).`)
    console.log(`Trigger a verification run:`)
    console.log(`  gh workflow run daily-rewards.yml --repo ${repo} --ref main`)
}

main()
