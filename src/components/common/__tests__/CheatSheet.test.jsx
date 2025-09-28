import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CheatSheet, { CheatSheetPopover, CheatSheetModal } from '../CheatSheet';

describe('CheatSheet components', () => {
  test('popover renders phrases and copy buttons', () => {
    render(<CheatSheetPopover onOpenQuickCard={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Bubbles Quick Phrases/i)).toBeInTheDocument();
    // Should render at least one Copy button
    const copyButtons = screen.getAllByText(/Copy|Copied/);
    expect(copyButtons.length).toBeGreaterThan(0);
  });

  test('modal toggles visible prop', () => {
    const onClose = jest.fn();
    const { rerender } = render(<CheatSheetModal visible={false} onClose={onClose} />);
    expect(screen.queryByText(/Bubbles AI — Quick Start/i)).toBeNull();
    rerender(<CheatSheetModal visible={true} onClose={onClose} />);
    expect(screen.getByText(/Bubbles AI — Quick Start/i)).toBeInTheDocument();
  });

  test('public quickstart file exists in public folder', () => {
    // This is a basic file system presence test that will pass if the file was added by the patch
    const fs = require('fs');
    const path = require('path');
    const file = path.resolve(__dirname, '../../../../public/bubbles-quickstart.html');
    const exists = fs.existsSync(file);
    expect(exists).toBe(true);
  });
});
