import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const logFile = path.resolve(projectRoot, process.env.REWARDS_LOG_FILE || 'rewards-run.log')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const commandArgs = process.argv.length > 2 ? process.argv.slice(2) : [npmCommand, 'run', 'start']
const sensitivePattern = /^ACCOUNT_[1-9]\d*_(?:EMAIL|PASSWORD|TOTP_SECRET|RECOVERY_EMAIL|PROXY_(?:USERNAME|PASSWORD))$/
const sensitiveValues = Object.entries(process.env)
    .filter(([key, value]) => sensitivePattern.test(key) && value && value.length >= 3)
    .flatMap(([key, value]) => (key.endsWith('_EMAIL') && value.includes('@') ? [value, value.split('@')[0]] : [value]))
    .sort((a, b) => b.length - a.length)

let sanitizedLog = ''
let finished = false

function redact(text) {
    let output = text.replace(/\u001b\[[0-9;]*m/g, '')
    for (const value of sensitiveValues) output = output.split(value).join('[redacted]')
    return output
}

function emit(text, stream = process.stdout) {
    const clean = redact(text)
    sanitizedLog += clean
    fs.appendFileSync(logFile, clean, 'utf8')
    stream.write(clean)
}

function createLineWriter(stream) {
    let pending = ''
    return {
        write(chunk) {
            pending += chunk.toString('utf8')
            const lines = pending.split(/\r?\n/)
            pending = lines.pop() || ''
            for (const line of lines) emit(`${line}\n`, stream)
        },
        flush() {
            if (!pending) return
            emit(pending, stream)
            pending = ''
        }
    }
}

function writeRunSummary(exitCode) {
    if (!process.env.GITHUB_STEP_SUMMARY) return

    const success = exitCode === 0
    const lines = sanitizedLog.trim().split(/\r?\n/).filter(Boolean)
    const errorLines = lines.filter(line => /\[ERROR\]|\b(?:error|failed|failure|exception)\b/i.test(line))
    const recentLines = lines.slice(success ? -12 : -30)
    const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    const completedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
    const codeBlock = content => `\`\`\`text\n${content.replace(/```/g, "'''")}\n\`\`\``
    const sections = [
        '## Microsoft Rewards 运行结果',
        '',
        `- 状态：**${success ? '成功' : '失败'}**`,
        `- 完成时间（北京时间）：${completedAt}`,
        `- [查看完整运行日志](${runUrl})`
    ]

    if (!success && errorLines.length) {
        sections.push('', '### 错误摘要', codeBlock(errorLines.slice(-10).join('\n').slice(-4000)))
    }

    sections.push('', '### 最近输出', codeBlock(recentLines.join('\n').slice(-5000)), '')
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, sections.join('\n'), 'utf8')
}

fs.writeFileSync(logFile, '', 'utf8')
emit('[Actions] Starting Microsoft Rewards process. Sensitive account values will be redacted.\n')

const child = spawn(commandArgs[0], commandArgs.slice(1), {
    cwd: projectRoot,
    env: { ...process.env, CI: 'true', NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
})
const stdoutWriter = createLineWriter(process.stdout)
const stderrWriter = createLineWriter(process.stderr)

child.stdout.on('data', stdoutWriter.write)
child.stderr.on('data', stderrWriter.write)

function finish(exitCode, signal) {
    if (finished) return
    finished = true
    stdoutWriter.flush()
    stderrWriter.flush()

    const resultCode = signal ? 1 : exitCode
    const suffix = signal ? ` (signal ${signal})` : ''
    emit(`[Actions] Microsoft Rewards process exited with code ${resultCode}${suffix}.\n`)
    if (resultCode !== 0)
        emit(`::error::Microsoft Rewards failed with exit code ${resultCode}${suffix}.\n`, process.stderr)

    writeRunSummary(resultCode)
    process.exitCode = resultCode
}

child.on('error', error => {
    emit(`[Actions] Failed to start the process: ${error.message}\n`, process.stderr)
    finish(1)
})
child.on('close', (code, signal) => finish(code === null ? 1 : code, signal))
