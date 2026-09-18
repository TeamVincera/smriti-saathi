import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('native privacy boundaries', () => {
  it('disables Android backups and data extraction', () => {
    const manifest = source('android/app/src/main/AndroidManifest.xml')
    const backupRules = source('android/app/src/main/res/xml/backup_rules.xml')
    const extractionRules = source('android/app/src/main/res/xml/data_extraction_rules.xml')
    expect(manifest).toContain('android:allowBackup="false"')
    expect(manifest).toContain('android:fullBackupContent="@xml/backup_rules"')
    expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"')
    expect(manifest).toContain('android:usesCleartextTraffic="false"')
    expect(backupRules).toContain('<exclude domain="root" path="." />')
    expect(extractionRules).toContain('<device-transfer>')
    expect(extractionRules).toContain('<exclude domain="root" path="." />')
  })

  it('keeps FileProvider paths inside app-owned files and cache', () => {
    const paths = source('android/app/src/main/res/xml/file_paths.xml')
    expect(paths).not.toContain('<external-path')
    expect(paths).toContain('<files-path')
    expect(paths).toContain('<cache-path')
    expect(paths).not.toMatch(/path="\."/)
  })
})
