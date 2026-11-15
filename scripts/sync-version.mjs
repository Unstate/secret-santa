import { readFileSync, writeFileSync } from 'node:fs'

const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

const frontendPath = new URL('../frontend/package.json', import.meta.url)
const frontend = JSON.parse(readFileSync(frontendPath, 'utf8'))
frontend.version = version
writeFileSync(frontendPath, JSON.stringify(frontend, null, 2) + '\n')

const lockPath = new URL('../frontend/package-lock.json', import.meta.url)
const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
lock.version = version
if (lock.packages?.[''] != null) lock.packages[''].version = version
writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n')

const cargoPath = new URL('../backend/Cargo.toml', import.meta.url)
const cargo = readFileSync(cargoPath, 'utf8')
if (!/^version = ".*"$/m.test(cargo)) {
  throw new Error('не нашёл version в backend/Cargo.toml')
}
writeFileSync(cargoPath, cargo.replace(/^version = ".*"$/m, `version = "${version}"`))

console.log(`версия ${version} синхронизирована: frontend/package.json(+lock), backend/Cargo.toml`)
