#!/usr/bin/env bun
import { environments, getDemoAppEnvVars, scripts } from './index.ts'

// Execute script by name from command line args
const scriptName = process.argv[2]
const scriptArg = process.argv[3]

if (!scriptName) {
  console.error('Usage: bun run utils/src/run.ts <script-name> [arg]')
  process.exit(1)
}

// Handle special cases
if (scriptName === 'devApp' && scriptArg && environments.includes(scriptArg as any)) {
  const command = `cd demo-app && ${getDemoAppEnvVars(scriptArg as any)} bun run dev`
  console.log(`Running: ${command}`)
  await import('child_process').then(({ execSync }) => {
    execSync(command, { stdio: 'inherit', shell: true })
  })
  process.exit(0)
}

if (!(scriptName in scripts)) {
  console.error(`Unknown script: ${scriptName}`)
  console.error(`Available scripts: ${Object.keys(scripts).join(', ')}`)
  process.exit(1)
}

const script = scripts[scriptName as keyof typeof scripts]
const command = typeof script === 'function' ? script(scriptArg as any) : script

console.log(`Running: ${command}`)
await import('child_process').then(({ execSync }) => {
  execSync(command, { stdio: 'inherit', shell: true })
})
