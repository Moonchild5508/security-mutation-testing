#!/usr/bin/env node
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const CONFIG_PATH = './mutants.config.json'
const TEST_CMD = 'node --import ./test/server/helpers/test-env.mjs --import tsx --test --test-force-exit "test/server/insecurity.unit.test.ts"'

let debugShown = false

function runTests () {
  let output = ''
  try {
    output = execSync(TEST_CMD, { encoding: 'utf8', stdio: 'pipe', cwd: process.cwd() })
  } catch (err) {
    output = (err.stdout || '') + (err.stderr || '')
  }
  const result = parseResult(output)
  if (result.pass === null && !debugShown) {
    debugShown = true
    console.log('\n--- DEBUG: raw output that failed to parse (first 500 chars) ---')
    console.log(output.slice(0, 500))
    console.log('--- END DEBUG ---\n')
  }
  return result
}

function parseResult (output) {
  const passMatch = output.match(/pass\s+(\d+)/i)
  const failMatch = output.match(/fail\s+(\d+)/i)
  const pass = passMatch ? parseInt(passMatch[1]) : null
  const fail = failMatch ? parseInt(failMatch[1]) : null
  return { pass, fail, killed: fail !== null && fail > 0 }
}
function applyMutant (mutant) {
  const content = fs.readFileSync(mutant.file, 'utf8')
  if (!content.includes(mutant.find)) {
    throw new Error(`Pattern not found for ${mutant.id} in ${mutant.file}.`)
  }
  fs.writeFileSync(mutant.file, content.replace(mutant.find, mutant.replace))
}

function revertMutant (mutant) {
  const content = fs.readFileSync(mutant.file, 'utf8')
  fs.writeFileSync(mutant.file, content.replace(mutant.replace, mutant.find))
}

function main () {
  const mutants = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  const results = []

  console.log('=== Security Mutation Testing Runner ===\n')
  console.log('[baseline] Running tests on unmodified code...')
  const baseline = runTests()
  console.log(`[baseline] pass=${baseline.pass} fail=${baseline.fail}\n`)

  for (const mutant of mutants) {
    console.log(`--- ${mutant.id}: ${mutant.function}() [${mutant.category}] ---`)
    try {
      applyMutant(mutant)
      const result = runTests()
      const status = result.killed ? 'KILLED' : 'SURVIVED'
      console.log(`  pass=${result.pass} fail=${result.fail} -> ${status}`)
      results.push({ ...mutant, ...result, status })
    } catch (err) {
      console.error(`  ERROR: ${err.message}`)
      results.push({ ...mutant, status: 'ERROR' })
    } finally {
      revertMutant(mutant)
      console.log(`  mutant reverted\n`)
    }
  }

  console.log('=== SUMMARY ===')
  console.table(results.map(r => ({ ID: r.id, Function: r.function, Category: r.category, Status: r.status })))
  fs.writeFileSync('mutation_results.json', JSON.stringify(results, null, 2))
}

main()