#!/usr/bin/env bun
/**
 * Script to run demo app with proper environment variables
 */

import { getDemoAppEnvVars } from '@monorepo/utils'
import { spawn } from 'bun'

const env = process.argv[2] as 'production' | 'staging' | 'development'
if (!env) {
  console.error('Usage: bun run env.ts <environment>')
  process.exit(1)
}

const envVars = getDemoAppEnvVars(env)
const [portVar, nodeEnvVar] = envVars.split(' ')
const port = portVar.split('=')[1]
const nodeEnv = nodeEnvVar.split('=')[1]

console.log(`🚀 Starting demo app for ${env} environment on port ${port}`)

// Spawn the bun process with the correct environment variables
const proc = spawn({
  cmd: ['bun', 'run', 'src/index.ts'],
  env: {
    ...process.env,
    PORT: port,
    NODE_ENV: nodeEnv,
  },
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
})

proc.exited.then((code) => {
  process.exit(code)
})
