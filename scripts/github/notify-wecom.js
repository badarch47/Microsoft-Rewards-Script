import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const logFile = path.resolve(projectRoot, process.env.REWARDS_LOG_FILE || 'rewards-run.log')

function readLog() {
    try {
        return fs.readFileSync(logFile, 'utf8')
    } catch {
        return ''
    }
}

function truncateUtf8(text, maxBytes = 1800) {
    if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text
    let output = ''
    for (const char of text) {
        if (Buffer.byteLength(output + char, 'utf8') > maxBytes - 4) break
        output += char
    }
    return `${output}...`
}

async function main() {
    const webhookUrl = (process.env.WECOM_WEBHOOK_URL || '').trim()
    if (!webhookUrl) {
        console.log('未配置 WECOM_WEBHOOK_URL，跳过企业微信通知。')
        return
    }

    const outcome = (process.env.REWARDS_OUTCOME || 'failure').toLowerCase()
    const success = outcome === 'success'
    const resultText = success ? '成功' : outcome === 'cancelled' ? '已取消' : '失败'
    const lines = readLog().trim().split(/\r?\n/).filter(Boolean)
    const pointsSummary = [...lines].reverse().find(line => line.includes('[RUN-END]'))
    const errors = lines.filter(line => /\[ERROR\]|\b(?:error|failed|failure|exception)\b/i.test(line)).slice(-5)
    const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    const completedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
    const message = [
        'Microsoft Rewards 每日任务',
        `运行结果：${resultText}`,
        `仓库：${process.env.GITHUB_REPOSITORY || 'unknown'}`,
        `分支：${process.env.GITHUB_REF_NAME || 'unknown'}`,
        `完成时间（北京时间）：${completedAt}`,
        pointsSummary ? `积分摘要：${pointsSummary}` : '',
        !success && errors.length ? `错误摘要：\n${errors.join('\n')}` : '',
        `查看日志：${runUrl}`
    ]
        .filter(Boolean)
        .join('\n')

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgtype: 'text', text: { content: truncateUtf8(message) } }),
        signal: AbortSignal.timeout(15000)
    })
    const raw = await response.text()
    let result
    try {
        result = JSON.parse(raw)
    } catch {
        result = {}
    }

    if (!response.ok || result.errcode !== 0) {
        const detail = result.errmsg || response.statusText || raw.slice(0, 200)
        throw new Error(`企业微信通知失败：HTTP ${response.status}，${detail}`)
    }

    console.log(`企业微信通知发送成功，任务结果：${resultText}。`)
}

main().catch(error => {
    console.error(`::error::${error.message}`)
    process.exitCode = 1
})
