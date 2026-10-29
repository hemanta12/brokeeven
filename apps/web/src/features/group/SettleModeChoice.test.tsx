import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettleModeChoice } from './SettleModeChoice';

function setup(overrides: Partial<React.ComponentProps<typeof SettleModeChoice>> = {}) {
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  render(
    <SettleModeChoice
      mode="direct"
      groupName="Flat 4B"
      directCount={3}
      fewestCount={2}
      offersFewest
      disabled={false}
      onConfirm={onConfirm}
      {...overrides}
    />
  );
  return { onConfirm };
}

describe('SettleModeChoice', () => {
  it('shows both options with payment counts and tags the active one Current', () => {
    setup();

    expect(screen.getByRole('radio', { name: /Each balance/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Fewest payments/ })).not.toBeChecked();
    expect(screen.getByText('3 payments')).toBeInTheDocument();
    expect(screen.getByText('2 payments')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('only stages the other option on tap; nothing is written until confirmed', () => {
    const { onConfirm } = setup();

    fireEvent.click(screen.getByRole('radio', { name: /Fewest payments/ }));

    expect(screen.getByRole('alert')).toHaveTextContent('Switch everyone to Fewest payments?');
    expect(screen.getByRole('radio', { name: /Each balance/ })).toBeChecked();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancel dismisses the strip without writing', () => {
    const { onConfirm } = setup();

    fireEvent.click(screen.getByRole('radio', { name: /Fewest payments/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Change for everyone writes the staged mode, then closes the strip', async () => {
    const { onConfirm } = setup();

    fireEvent.click(screen.getByRole('radio', { name: /Fewest payments/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Change for everyone' }));

    expect(onConfirm).toHaveBeenCalledWith('simplified');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('keeps the strip open when the write fails', async () => {
    const { onConfirm } = setup({ error: 'Network down' });
    onConfirm.mockRejectedValueOnce(new Error('Network down'));

    fireEvent.click(screen.getByRole('radio', { name: /Fewest payments/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Change for everyone' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Change for everyone' })).toBeEnabled());
    expect(screen.getByText('Switch everyone to Fewest payments?')).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();
  });

  it('shows only the current mode, read-only, when Fewest payments saves nothing', () => {
    const { onConfirm } = setup({ offersFewest: false, fewestCount: 3 });

    expect(screen.getAllByRole('radio')).toHaveLength(1);
    const only = screen.getByRole('radio', { name: /Each balance/ });
    expect(only).toBeDisabled();
    fireEvent.click(only);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables every option on a closed group', () => {
    setup({ disabled: true });

    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });
});
