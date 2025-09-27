const path = require('path');
const { findAssetByMention } = require('../services/AssetLookup');

function makeFsMap(map) {
  return async (dir) => {
    const key = dir.replace(/\\/g, '/');
    if (map[key]) return map[key];
    return [];
  };
}

describe('AssetLookup.findAssetByMention', () => {
  test('falls back to disk scan (year/month) and returns fileUrl', async () => {
    const root = '/repo/uploads/company-assets';
    const fsReaddir = makeFsMap({
      [root]: ['2025', 'ignore.txt'],
      [path.join(root, '2025').replace(/\\/g, '/')]: ['09'],
      [path.join(root, '2025', '09').replace(/\\/g, '/')]: ['upfrontstartthedaychecklist.pdf', 'other.docx']
    });

    const prisma = {
      companyAsset: {
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => [])
      }
    };

    const result = await findAssetByMention(prisma, 'Send upfrontstartthedaychecklist.pdf to the team', {
      fsReaddir,
      uploadRoots: [root]
    });

    expect(result).toBeTruthy();
    expect(result.fileUrl).toBe('/uploads/company-assets/2025/09/upfrontstartthedaychecklist.pdf');
  });

  test('picks direct root file when present', async () => {
    const root = '/repo/uploads/company-assets';
    const fsReaddir = makeFsMap({
      [root]: ['mydoc.pdf']
    });

    const prisma = {
      companyAsset: {
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => [])
      }
    };

    const result = await findAssetByMention(prisma, 'Please send mydoc.pdf', {
      fsReaddir,
      uploadRoots: [root]
    });

    expect(result).toBeTruthy();
    expect(result.fileUrl).toBe('/uploads/company-assets/mydoc.pdf');
  });

  test('prefers candidate with matching extension when multiple DB candidates', async () => {
    const prisma = {
      companyAsset: {
        // first exact-ish contains
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null) // contains
          .mockResolvedValueOnce(null) // heads startsWith
          .mockResolvedValueOnce(null), // heads contains
        findMany: jest.fn(async () => ([
          { title: 'upfront.docx', versions: [{ isCurrent: true, fileUrl: '/uploads/company-assets/2025/09/upfront.docx' }] },
          { title: 'upfront.pdf', versions: [{ isCurrent: true, fileUrl: '/uploads/company-assets/2025/09/upfront.pdf' }] },
        ]))
      }
    };

    const result = await findAssetByMention(prisma, 'upfrontstartthedaychecklist.pdf');
    expect(result).toBeTruthy();
    expect(result.title).toBe('upfront.pdf');
  });

  test('uses heads startsWith path via DB when available', async () => {
    const prisma = {
      companyAsset: {
        // 1) contains -> null
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null) // contains
          .mockResolvedValueOnce({ title: 'upfront.pdf', versions: [{ isCurrent: true, fileUrl: '/uploads/company-assets/2025/08/upfront.pdf' }] }), // heads startsWith
        findMany: jest.fn(async () => [])
      }
    };

    const result = await findAssetByMention(prisma, 'upfrontstartthedaychecklist.pdf');
    expect(result).toBeTruthy();
    expect(result.title).toBe('upfront.pdf');
  });
});
