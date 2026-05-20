/**
 * Escaneo estático: coordinador y mecánico (router ↔ navegación ↔ topbar ↔ redirect).
 * Ejecutar: npm run scan:roles
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8')
}

function uniq(arr) {
    return [...new Set(arr)]
}

function extractRouterChildPathsAndNames(sectionLabel, parentPath, nextSectionMarker) {
    const router = read('src/router/index.ts')
    const start = router.indexOf(sectionLabel)
    if (start === -1) throw new Error(`No se encontró sección: ${sectionLabel}`)
    const from = start
    const endMarker = router.indexOf(nextSectionMarker, from)
    const chunk = endMarker === -1 ? router.slice(from) : router.slice(from, endMarker)

    const pairs = []
    const blockRe = /\{\s*path:\s*'([^']+)',\s*name:\s*'([^']+)'/g
    let m
    while ((m = blockRe.exec(chunk))) {
        const relPath = m[1]
        const name = m[2]
        const full =
            relPath.startsWith('/') ? relPath : `${parentPath.replace(/\/$/, '')}/${relPath}`
        pairs.push({ path: full, name })
    }
    return pairs
}

function extractNavTos(navVar) {
    const nav = read('src/composables/useNavigation.ts')
    const start = nav.indexOf(`const ${navVar}`)
    if (start === -1) throw new Error(`No ${navVar}`)

    const afterEquals = nav.indexOf('=', start) + 1
    const bracket = nav.indexOf('[', afterEquals)
    if (bracket === -1) throw new Error(`No [ para ${navVar}`)

    let depth = 0
    let i = bracket
    for (; i < nav.length; i++) {
        const c = nav[i]
        if (c === '[') depth++
        else if (c === ']') {
            depth--
            if (depth === 0) {
                i++
                break
            }
        }
    }
    const block = nav.slice(bracket, i)
    const tos = []
    const re = /to:\s*'([^']+)'/g
    let m
    while ((m = re.exec(block))) tos.push(m[1])
    return uniq(tos)
}

function extractTopbarTitles(prefix) {
    const top = read('src/components/sidebar/AppTopbar.vue')
    const re = new RegExp(`'(${prefix}[^']+)':\\s*'`, 'g')
    const keys = []
    let m
    while ((m = re.exec(top))) keys.push(m[1])
    return uniq(keys)
}

function extractRoleRedirects() {
    const auth = read('src/stores/auth.ts')
    const out = {}
    const re = /(ROLE_COORDINADOR|ROLE_MECANICO):\s*'([^']+)'/g
    let m
    while ((m = re.exec(auth))) out[m[1]] = m[2]
    return out
}

function extractMapRoleStrings() {
    const auth = read('src/stores/auth.ts')
    const block = auth.match(/function mapRole[\s\S]*?^    }/m)
    if (!block) return []
    const re = /includes\('([^']+)'\)/g
    const roles = []
    let m
    while ((m = re.exec(block[0]))) roles.push(m[1])
    return uniq(roles)
}

function main() {
    console.log('\n=== FleetMaster — scan de roles Coordinador / Mecánico ===\n')

    const coordinatorRoutes = extractRouterChildPathsAndNames(
        "// ─── Coordinator",
        '/coordinator',
        "// ─── Mechanic",
    )
    const mechanicRoutes = extractRouterChildPathsAndNames(
        "// ─── Mechanic",
        '/mechanic',
        "// ─── Dispatcher",
    )

    const navCoord = extractNavTos('coordinatorNav')
    const navMech = extractNavTos('mechanicNav')

    const titlesCoord = extractTopbarTitles('coordinator-')
    const titlesMech = extractTopbarTitles('mechanic-')

    const redirects = extractRoleRedirects()
    const backendRoles = extractMapRoleStrings()

    const routePathsCoord = new Set(coordinatorRoutes.map(r => r.path))
    const routePathsMech = new Set(mechanicRoutes.map(r => r.path))
    const routeNamesCoord = new Set(coordinatorRoutes.map(r => r.name))
    const routeNamesMech = new Set(mechanicRoutes.map(r => r.name))

    let errors = 0

    function checkNavVsRouter(label, navTos, routePaths) {
        for (const to of navTos) {
            if (!routePaths.has(to)) {
                console.error(`  ✗ [${label}] Nav apunta a ${to} pero no hay ruta hija con ese path resuelto en el router.`)
                errors++
            } else {
                console.log(`  ✓ [${label}] Nav ${to}`)
            }
        }
    }

    function checkTitlesVsRouteNames(label, routeNames, titleKeys) {
        for (const n of routeNames) {
            if (!titleKeys.includes(n)) {
                console.error(`  ✗ [${label}] Ruta "${n}" sin título en AppTopbar.routeTitles`)
                errors++
            } else {
                console.log(`  ✓ [${label}] Topbar "${n}"`)
            }
        }
        for (const k of titleKeys) {
            if (!routeNames.has(k)) {
                console.warn(`  ? [${label}] Clave topbar "${k}" no coincide con ningún name: del router (puede ser huérfana)`)
            }
        }
    }

    console.log('1) Router → paths (coordinator)')
    coordinatorRoutes.forEach(r => console.log(`     ${r.name.padEnd(28)} ${r.path}`))
    console.log('\n2) Router → paths (mechanic)')
    mechanicRoutes.forEach(r => console.log(`     ${r.name.padEnd(28)} ${r.path}`))

    console.log('\n3) Navegación useNavigation vs router')
    checkNavVsRouter('COORD', navCoord, routePathsCoord)
    checkNavVsRouter('MECH', navMech, routePathsMech)

    console.log('\n4) AppTopbar.routeTitles vs name del router')
    checkTitlesVsRouteNames('COORD', routeNamesCoord, titlesCoord)
    checkTitlesVsRouteNames('MECH', routeNamesMech, titlesMech)

    console.log('\n5) ROLE_REDIRECT (post-login)')
    const expC = '/coordinator/dashboard'
    const expM = '/mechanic/dashboard'
    if (redirects.ROLE_COORDINADOR !== expC) {
        console.error(`  ✗ ROLE_COORDINADOR → ${redirects.ROLE_COORDINADOR} (esperado ${expC})`)
        errors++
    } else console.log(`  ✓ ROLE_COORDINADOR → ${redirects.ROLE_COORDINADOR}`)
    if (redirects.ROLE_MECANICO !== expM) {
        console.error(`  ✗ ROLE_MECANICO → ${redirects.ROLE_MECANICO} (esperado ${expM})`)
        errors++
    } else console.log(`  ✓ ROLE_MECANICO → ${redirects.ROLE_MECANICO}`)

    console.log('\n6) Strings reconocidos en auth.mapRole (backend → front)')
    console.log(`     ${backendRoles.join(', ')}`)

    console.log('\n7) Guard del router (resumen)')
    console.log(
        '     Rutas /coordinator/* exigen meta.role === ROLE_COORDINADOR y userRole igual.',
    )
    console.log('     Rutas /mechanic/* exigen meta.role === ROLE_MECANICO y userRole igual.')
    console.log('     Si no coincide → next(ROLE_REDIRECT[userRole]).\n')

    if (errors === 0) {
        console.log('Resultado: OK (sin discrepancias detectadas por este scan).\n')
        process.exit(0)
    } else {
        console.error(`Resultado: ${errors} problema(s). Revisa arriba.\n`)
        process.exit(1)
    }
}

main()
