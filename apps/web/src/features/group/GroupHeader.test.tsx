import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { GroupHeader } from './GroupHeader';

function setup(overrides: Partial<React.ComponentProps<typeof GroupHeader>> = {}) {
  const handlers = { onOpenPeople: vi.fn(), onOpenSettings: vi.fn() };
  render(
    <MemoryRouter>
      <GroupHeader
        name="Flat 4B"
        label="Home"
        peopleCount={4}
        closedAt={null}
        showBack
        roomForSummary
        {...handlers}
        {...overrides}
      />
    </MemoryRouter>
  );
  return handlers;
}

describe('GroupHeader', () => {
  it('shows the title with the label under it and the People pill with its count', () => {
    const { onOpenPeople } = setup();

    expect(screen.getByRole('heading', { name: 'Flat 4B' })).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    const pill = screen.getByRole('button', { name: 'People (4)' });
    expect(pill).toHaveTextContent('4');
    fireEvent.click(pill);
    expect(onOpenPeople).toHaveBeenCalledTimes(1);
  });

  it('hides the label when there is none, or it is Individual', () => {
    setup({ label: 'Individual', peopleCount: 1 });

    expect(screen.queryByText('Individual')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'People (1)' })).toBeInTheDocument();
  });

  it('has a Settings cog and no Activity bell (that lives in the navbar)', () => {
    const { onOpenSettings } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Group settings' }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Activity/ })).not.toBeInTheDocument();
  });

  it('shows a back link only when signed in', () => {
    const { unmount } = render(
      <MemoryRouter>
        <GroupHeader
          name="Flat 4B"
          label={null}
          peopleCount={2}
          closedAt={null}
          showBack={false}
          roomForSummary={false}
            onOpenPeople={vi.fn()}
          onOpenSettings={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.queryByRole('link', { name: 'Back to My groups' })).not.toBeInTheDocument();
    unmount();

    setup();
    expect(screen.getByRole('link', { name: 'Back to My groups' })).toHaveAttribute('href', '/groups');
  });

  it('says the group is closed', () => {
    setup({ closedAt: '2026-10-01T00:00:00.000Z' });

    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText(/Nothing can be added or changed/)).toBeInTheDocument();
  });
});
