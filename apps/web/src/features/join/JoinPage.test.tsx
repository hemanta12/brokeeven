import { fireEvent, render, screen } from '@testing-library/react';
import type * as ReactRouterDom from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => navigate };
});

import { JoinPage } from './JoinPage';

describe('JoinPage', () => {
  it('navigates to the uppercased group code on submit', () => {
    render(<JoinPage />);

    fireEvent.change(screen.getByLabelText('Group code'), { target: { value: 'abc123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    expect(navigate).toHaveBeenCalledWith('/g/ABC123');
  });
});
