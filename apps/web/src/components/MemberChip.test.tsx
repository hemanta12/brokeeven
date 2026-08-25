import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MemberChip } from './MemberChip';

describe('MemberChip', () => {
  it('renders the name with no action controls', () => {
    render(<MemberChip name="Alice" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('marks the viewer\'s own chip with the Brass border', () => {
    const { container } = render(<MemberChip name="Bob" isYou />);
    expect(container.querySelector('span')).toHaveClass('border-b-brass');
  });
});
