import { beforeEach, describe, expect, it, vi } from 'vitest'

const nativeMocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => true),
  writeFile: vi.fn(),
  share: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: nativeMocks.isNativePlatform },
}))

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: nativeMocks.writeFile },
}))

vi.mock('@capacitor/share', () => ({
  Share: { share: nativeMocks.share },
}))

import { deliverReportImage } from '../../src/lib/reportExport'

describe('native report export', () => {
  beforeEach(() => {
    nativeMocks.isNativePlatform.mockReturnValue(true)
    nativeMocks.writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/report.png' })
    nativeMocks.share.mockReset().mockResolvedValue({ activityType: '' })
  })

  it('writes the PNG to native storage and opens the device share sheet', async () => {
    const result = await deliverReportImage('data:image/png;base64,cG5nLWRhdGE=', 'care-report.png')

    expect(nativeMocks.writeFile).toHaveBeenCalledWith({
      path: 'reports/care-report.png',
      data: 'cG5nLWRhdGE=',
      directory: 'CACHE',
      recursive: true,
    })
    expect(nativeMocks.share).toHaveBeenCalledWith(expect.objectContaining({
      files: ['file:///cache/report.png'],
    }))
    expect(result).toBe('native-share')
  })
})
